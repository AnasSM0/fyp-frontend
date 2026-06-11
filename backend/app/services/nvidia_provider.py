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
    ProviderOutputError,
    ProviderState,
    batch_evaluation_system_prompt,
    batch_evaluation_user_prompt,
    parse_structured_output,
    resume_parse_system_prompt,
    resume_parse_user_prompt,
)
from app.schemas.onboarding import ResumeParseDraft
from app.services.ai_call_audit import classify_ai_failure, end_ai_call, start_ai_call


class NVIDIAProvider:
    def __init__(
        self,
        api_key: str,
        model: str,
        base_url: str,
        timeout_seconds: float = 60,
    ):
        self.api_key = api_key
        self.state = ProviderState(provider="nvidia", model=model)
        self.timeout_seconds = timeout_seconds
        from openai import OpenAI

        self.client = OpenAI(
            base_url=base_url,
            api_key=api_key,
            timeout=timeout_seconds,
        )

    def _generate_json(
        self,
        prompt: str,
        *,
        enable_thinking: bool = True,
        max_tokens: int = 8192,
        reasoning_budget: int = 2048,
        purpose: str = "unknown",
        question_count: int | None = None,
        answer_count: int | None = None,
    ) -> str:
        record, started_perf = start_ai_call(
            purpose=purpose,
            provider="nvidia",
            model=self.state.model,
            endpoint_path="/chat/completions",
            prompt_char_count=len(prompt),
            estimated_payload_size_chars=len(prompt),
            question_count=question_count,
            answer_count=answer_count,
        )
        try:
            completion = self.client.chat.completions.create(
                model=self.state.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                top_p=0.95,
                max_tokens=max_tokens,
                extra_body={
                    "chat_template_kwargs": {"enable_thinking": enable_thinking},
                    "reasoning_budget": reasoning_budget if enable_thinking else 0,
                },
                stream=False
            )
            content = completion.choices[0].message.content
            if content is None:
                raise ProviderOutputError("NVIDIA response missing text content")
                
            # Try to extract JSON from markdown block if it's there
            content = content.strip()
            if content.startswith("```json"):
                content = content[7:]
            elif content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            
            end_ai_call(record, started_perf, success=True, status_code=200)
            return content.strip()
        except ProviderOutputError:
            end_ai_call(record, started_perf, success=False, failure_reason="provider_error")
            raise
        except Exception as exc:
            status_code = getattr(exc, "status_code", None)
            end_ai_call(
                record,
                started_perf,
                success=False,
                status_code=status_code,
                failure_reason=classify_ai_failure(exc, status_code),
            )
            raise ProviderOutputError("NVIDIA request failed") from exc

    def _validated(
        self,
        prompt: str,
        schema_type,
        *,
        enable_thinking: bool = True,
        max_tokens: int = 8192,
        reasoning_budget: int = 2048,
        purpose: str = "unknown",
        question_count: int | None = None,
        answer_count: int | None = None,
    ):
        prompt_with_json = (
            f"{prompt}\n\n"
            "Return ONLY one valid JSON object matching the requested schema. "
            "Do not include markdown, code fences, explanations, prose, or hidden reasoning."
        )
        raw = self._generate_json(
            prompt_with_json,
            enable_thinking=enable_thinking,
            max_tokens=max_tokens,
            reasoning_budget=reasoning_budget,
            purpose=purpose,
            question_count=question_count,
            answer_count=answer_count,
        )
        return parse_structured_output(raw, schema_type)

    def evaluate_answer(
        self, profile: CandidateProfile, answer: AssessmentAnswer, rubric_context: AIRubricContext | None = None
    ) -> AIAnswerEvaluation:
        question = answer.assessment_question
        rubric_guidance = rubric_context.model_dump() if rubric_context and rubric_context.items else {}
        prompt = f"""
Evaluate this technical interview answer for HirdUp.
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
Generate final HirdUp assessment report JSON with keys:
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
You are HirdUp's candidate onboarding assistant.
Help a student build a structured reverse-hiring talent profile.
You must return JSON only. No markdown, no prose, no code fences.
Use exactly this top-level JSON shape:
{{
  "assistant_message": "short helpful response",
  "extracted_fields": {{
    "full_name": null,
    "university": null,
    "degree": null,
    "graduation_year": null,
    "gpa": null,
    "target_role": null,
    "experience_level": null,
    "tech_stack": [],
    "skills": [],
    "portfolio_url": null,
    "linkedin_url": null,
    "resume_url": null,
    "availability_status": null,
    "project_summary": null,
    "career_goal": null
  }},
  "suggested_skills": [],
  "inferred_target_role": null,
  "inferred_experience_level": null,
  "missing_fields": [],
  "profile_completion_delta": 0,
  "next_question": "one useful next question",
  "confidence": 0
}}

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
        return self._validated(
            prompt,
            OnboardingAIResponseDraft,
            enable_thinking=False,
            max_tokens=1600,
            reasoning_budget=0,
            purpose="onboarding",
        )

    def parse_resume_profile(self, resume_text: str) -> ResumeParseDraft:
        prompt = f"{resume_parse_system_prompt()}\n\n{resume_parse_user_prompt(resume_text)}"
        return self._validated(
            prompt,
            ResumeParseDraft,
            enable_thinking=False,
            max_tokens=2200,
            reasoning_budget=0,
            purpose="resume_parse",
        )

    def generate_coach_response(self, prompt: str) -> AICoachResponseDraft:
        coach_prompt = f"""
You are HirdUp's assessment improvement coach.
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
        return self._validated(
            coach_prompt,
            AICoachResponseDraft,
            enable_thinking=False,
            max_tokens=1400,
            reasoning_budget=0,
            purpose="improvement_plan",
        )

    def evaluate_assessment_batch(self, payload: dict) -> AIBatchEvaluationDraft:
        prompt = f"{batch_evaluation_system_prompt(payload)}\n\n{batch_evaluation_user_prompt(payload)}"
        question_count = len(payload.get("questions") or [])
        answer_count = sum(1 for item in payload.get("questions") or [] if (item.get("answer") or {}).get("answer_status") != "skipped")
        return self._validated(
            prompt,
            AIBatchEvaluationDraft,
            enable_thinking=False,
            max_tokens=5200,
            reasoning_budget=0,
            purpose="batch_evaluation",
            question_count=question_count,
            answer_count=answer_count,
        )
