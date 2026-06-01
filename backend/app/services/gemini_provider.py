import json
import urllib.error
import urllib.request

from app.models.assessment import AssessmentAnswer
from app.models.profile import CandidateProfile
from app.schemas.ai import OnboardingAIResponseDraft, OnboardingChatRequest
from app.schemas.evaluation import (
    AIAnswerEvaluation,
    AIBatchEvaluationDraft,
    AICoachResponseDraft,
    AIFinalReportDraft,
    AIProjectQualityEvaluation,
    AIRubricContext,
)
from app.services.ai_provider import (
    FallbackAIProvider,
    ProviderOutputError,
    ProviderState,
    batch_evaluation_system_prompt,
    batch_evaluation_user_prompt,
    parse_structured_output,
)
from app.services.ai_call_audit import classify_ai_failure, end_ai_call, start_ai_call


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

    def _error_detail(self, exc: urllib.error.HTTPError) -> str:
        try:
            raw_body = exc.read().decode("utf-8", errors="replace")
            parsed = json.loads(raw_body) if raw_body else {}
        except (json.JSONDecodeError, OSError, UnicodeDecodeError):
            parsed = {}
            raw_body = ""
        error = parsed.get("error") if isinstance(parsed, dict) else {}
        status_text = error.get("status") if isinstance(error, dict) else None
        message = error.get("message") if isinstance(error, dict) else None
        if exc.code == 404:
            reason = "model_not_found"
        elif exc.code == 429:
            reason = "rate_limited"
        elif exc.code in {401, 403}:
            reason = "auth_error"
        elif exc.code >= 500:
            reason = "provider_error"
        else:
            reason = "provider_error"
        detail_parts = [f"HTTP {exc.code}", reason]
        if status_text:
            detail_parts.append(str(status_text))
        if message:
            detail_parts.append(str(message))
        elif raw_body:
            detail_parts.append(raw_body[:300])
        detail_parts.append(f"model={self.state.model}")
        return ": ".join(detail_parts)

    def _retry_after(self, exc: urllib.error.HTTPError) -> int | None:
        value = exc.headers.get("Retry-After") if exc.headers else None
        try:
            return int(value) if value else None
        except ValueError:
            return None

    def _generate_json(
        self,
        prompt: str,
        *,
        purpose: str = "unknown",
        question_count: int | None = None,
        answer_count: int | None = None,
    ) -> str:
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.state.model}:generateContent"
        )
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"responseMimeType": "application/json", "temperature": 0.2},
        }
        request = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json", "x-goog-api-key": self.api_key},
            method="POST",
        )
        payload_chars = len(json.dumps(payload, ensure_ascii=True))
        record, started_perf = start_ai_call(
            purpose=purpose,
            provider="gemini",
            model=self.state.model,
            endpoint_path=f"/v1beta/models/{self.state.model}:generateContent",
            prompt_char_count=len(prompt),
            estimated_payload_size_chars=payload_chars,
            question_count=question_count,
            answer_count=answer_count,
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout_seconds) as response:
                body = json.loads(response.read().decode("utf-8"))
                end_ai_call(record, started_perf, success=True, status_code=getattr(response, "status", 200))
        except urllib.error.HTTPError as exc:
            end_ai_call(
                record,
                started_perf,
                success=False,
                status_code=exc.code,
                failure_reason=classify_ai_failure(exc, exc.code),
                retry_after_seconds=self._retry_after(exc),
            )
            raise ProviderOutputError(f"Gemini request failed with {self._error_detail(exc)}") from exc
        except (urllib.error.URLError, TimeoutError) as exc:
            end_ai_call(
                record,
                started_perf,
                success=False,
                failure_reason=classify_ai_failure(exc),
            )
            raise ProviderOutputError("Gemini request failed") from exc
        except json.JSONDecodeError as exc:
            end_ai_call(
                record,
                started_perf,
                success=False,
                failure_reason=classify_ai_failure(exc),
            )
            raise ProviderOutputError("Gemini response was not valid JSON") from exc

        try:
            return body["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError, TypeError) as exc:
            raise ProviderOutputError("Gemini response missing text content") from exc

    def _validated(
        self,
        prompt: str,
        schema_type,
        *,
        allow_repair: bool = True,
        purpose: str = "unknown",
        question_count: int | None = None,
        answer_count: int | None = None,
    ):
        try:
            return parse_structured_output(
                self._generate_json(
                    prompt,
                    purpose=purpose,
                    question_count=question_count,
                    answer_count=answer_count,
                ),
                schema_type,
            )
        except ProviderOutputError as exc:
            if str(exc).startswith("Gemini request failed") or str(exc).startswith(
                "Gemini response"
            ) or not allow_repair:
                raise
            repair_prompt = (
                f"{prompt}\n\nReturn only valid JSON matching the requested schema. "
                "No markdown. No prose outside JSON."
            )
            return parse_structured_output(
                self._generate_json(
                    repair_prompt,
                    purpose=purpose,
                    question_count=question_count,
                    answer_count=answer_count,
                ),
                schema_type,
            )

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
        return self._validated(prompt, AIAnswerEvaluation, purpose="answer_evaluation")

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
        return self._validated(prompt, AIProjectQualityEvaluation, purpose="project_profile")

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
        return self._validated(prompt, AIFinalReportDraft, purpose="final_report")

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
        return self._validated(prompt, OnboardingAIResponseDraft, allow_repair=False, purpose="onboarding")

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
        return self._validated(coach_prompt, AICoachResponseDraft, allow_repair=False, purpose="improvement_plan")

    def evaluate_assessment_batch(self, payload: dict) -> AIBatchEvaluationDraft:
        prompt = f"{batch_evaluation_system_prompt(payload)}\n\n{batch_evaluation_user_prompt(payload)}"
        question_count = len(payload.get("questions") or [])
        answer_count = sum(1 for item in payload.get("questions") or [] if (item.get("answer") or {}).get("answer_status") != "skipped")
        return self._validated(
            prompt,
            AIBatchEvaluationDraft,
            allow_repair=False,
            purpose="batch_evaluation",
            question_count=question_count,
            answer_count=answer_count,
        )


def build_ai_provider(api_key: str, provider_name: str | None = None) -> FallbackAIProvider:
    from app.services.ai_provider_factory import build_ai_provider as build_neutral_ai_provider

    return build_neutral_ai_provider(provider_name=provider_name)
