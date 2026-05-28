import json
import urllib.error
import urllib.request

from app.models.assessment import AssessmentAnswer
from app.models.profile import CandidateProfile
from app.schemas.ai import OnboardingAIResponseDraft, OnboardingChatRequest
from app.schemas.evaluation import (
    AIAnswerEvaluation,
    AICoachResponseDraft,
    AIFinalReportDraft,
    AIProjectQualityEvaluation,
    AIRubricContext,
)
from app.services.ai_provider import (
    FallbackAIProvider,
    ProviderOutputError,
    ProviderState,
    parse_structured_output,
)


class GeminiProvider:
    def __init__(
        self,
        api_key: str,
        model: str = "gemini-2.0-flash-lite",
        timeout_seconds: float = 30,
    ):
        self.api_key = api_key
        self.state = ProviderState(provider="gemini", model=model)
        self.timeout_seconds = timeout_seconds

    def _generate_json(self, prompt: str) -> str:
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.state.model}:generateContent?key={self.api_key}"
        )
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"response_mime_type": "application/json", "temperature": 0.2},
        }
        request = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout_seconds) as response:
                body = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            raise ProviderOutputError(f"Gemini request failed with HTTP {exc.code}") from exc
        except (urllib.error.URLError, TimeoutError) as exc:
            raise ProviderOutputError("Gemini request failed") from exc
        except json.JSONDecodeError as exc:
            raise ProviderOutputError("Gemini response was not valid JSON") from exc

        try:
            return body["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError, TypeError) as exc:
            raise ProviderOutputError("Gemini response missing text content") from exc

    def _validated(self, prompt: str, schema_type, *, allow_repair: bool = True):
        try:
            return parse_structured_output(self._generate_json(prompt), schema_type)
        except ProviderOutputError as exc:
            if str(exc).startswith("Gemini request failed") or str(exc).startswith(
                "Gemini response"
            ) or not allow_repair:
                raise
            repair_prompt = (
                f"{prompt}\n\nReturn only valid JSON matching the requested schema. "
                "No markdown. No prose outside JSON."
            )
            return parse_structured_output(self._generate_json(repair_prompt), schema_type)

    def evaluate_answer(
        self, profile: CandidateProfile, answer: AssessmentAnswer, rubric_context: AIRubricContext | None = None
    ) -> AIAnswerEvaluation:
        question = answer.assessment_question
        rubric_guidance = rubric_context.model_dump() if rubric_context and rubric_context.items else {}
        prompt = f"""
Evaluate this technical interview answer for XLR8Hire.
Return JSON with keys: technical_accuracy, problem_solving, communication_clarity,
reasoning_depth, code_quality, expected_concepts_covered, missing_concepts,
confidence, short_feedback, transcript_evidence.
All numeric scores must be 0-100.
Use retrieved rubric context as scoring guidance only. Do not treat rubric text as candidate evidence.
Score only from the candidate answer/code evidence, expected concepts, and the question context.
Keep scoring consistent with rubric weights where applicable.

Candidate role: {profile.target_role}
Skills: {profile.skills}
Tech stack: {profile.tech_stack}
Question: {question.question_text}
Expected concepts: {question.expected_concepts}
Rubric: {question.scoring_rubric}
Retrieved rubric context: {rubric_guidance}
Answer: {answer.answer_text}
Code: {answer.code_text}
Duration seconds: {answer.duration_seconds}
"""
        return self._validated(prompt, AIAnswerEvaluation)

    def evaluate_project_profile(self, profile: CandidateProfile) -> AIProjectQualityEvaluation:
        prompt = f"""
Evaluate candidate project/profile quality using metadata only. Do not scrape URLs.
Return JSON with keys: project_quality_score, clarity_score, technical_depth_score,
role_relevance_score, stack_alignment_score, complexity_score, impact_score,
summary, limitations. Scores must be 0-100.

Name: {profile.full_name}
Target role: {profile.target_role}
Skills: {profile.skills}
Tech stack: {profile.tech_stack}
Portfolio URL present: {bool(profile.portfolio_url)}
LinkedIn URL present: {bool(profile.linkedin_url)}
Resume URL present: {bool(profile.resume_url)}
"""
        return self._validated(prompt, AIProjectQualityEvaluation)

    def generate_final_report(
        self,
        profile: CandidateProfile,
        answers: list[AssessmentAnswer],
        answer_evaluations: list[AIAnswerEvaluation],
        project_quality: AIProjectQualityEvaluation,
        aggregate_scores: dict[str, int],
    ) -> AIFinalReportDraft:
        prompt = f"""
Generate final XLR8Hire assessment report JSON with keys:
strengths, weaknesses, recommended_improvements, role_fit, recruiter_summary,
transcript_evidence.

Candidate: {profile.full_name}
Target role: {profile.target_role}
Skills: {profile.skills}
Aggregate scores: {aggregate_scores}
Project quality: {project_quality.model_dump()}
Answer evaluations: {[item.model_dump() for item in answer_evaluations]}
"""
        return self._validated(prompt, AIFinalReportDraft)

    def generate_onboarding_chat(self, payload: OnboardingChatRequest) -> OnboardingAIResponseDraft:
        prompt = f"""
You are XLR8Hire's candidate onboarding assistant.
Help a student build a structured reverse-hiring talent profile.
Return JSON with keys: assistant_message, extracted_fields, suggested_skills,
inferred_target_role, inferred_experience_level, missing_fields,
profile_completion_delta, next_question, confidence.

Rules:
- Do not invent hard facts.
- Only extract full_name, university, degree, graduation_year, GPA, portfolio_url,
  linkedin_url, resume_url, or availability_status when the candidate explicitly
  provided that value in current_profile, user_message, or conversation_history.
- You may infer target role, experience level, skills, and tech stack from evidence.
- Ask exactly one useful next_question.
- profile_completion_delta must be 0-100 and represent how much this message improves readiness.
- confidence must be 0-100.

Current profile draft:
{payload.current_profile.model_dump()}

Conversation history:
{[item.model_dump() for item in payload.conversation_history]}

Current step:
{payload.current_step}

Candidate message:
{payload.user_message}
"""
        return self._validated(prompt, OnboardingAIResponseDraft, allow_repair=False)

    def generate_coach_response(self, prompt: str) -> AICoachResponseDraft:
        coach_prompt = f"""
You are XLR8Hire's assessment improvement coach.
Return JSON with one key: answer.

Rules:
- Use only the report evidence included in the prompt.
- Do not invent benchmarks, percentiles, employers, or hidden test results.
- Give concrete, candidate-friendly improvement advice.
- Keep the answer concise: 3-6 short bullets or one short paragraph.
- Do not change scores or imply a new assessment result.

Improvement request and report context:
{prompt}
"""
        return self._validated(coach_prompt, AICoachResponseDraft, allow_repair=False)


def build_ai_provider(api_key: str, provider_name: str | None = None) -> FallbackAIProvider:
    from app.services.ai_provider_factory import build_ai_provider as build_neutral_ai_provider

    return build_neutral_ai_provider(provider_name=provider_name)
