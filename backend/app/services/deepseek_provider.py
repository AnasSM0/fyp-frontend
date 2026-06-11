from __future__ import annotations

import json
import time
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
from app.services.ai_call_audit import classify_ai_failure, end_ai_call, start_ai_call
from app.services.ai_provider import (
    ProviderOutputError,
    ProviderState,
    batch_evaluation_system_prompt,
    batch_evaluation_user_prompt,
    classify_failure_scope,
    classify_provider_failure,
    parse_structured_output,
    resume_parse_system_prompt,
    resume_parse_user_prompt,
)
from app.schemas.onboarding import ResumeParseDraft


CODE_CATEGORY_HINTS = ("coding", "debugging", "implementation", "code", "algorithm")


def _safe_error_body(raw_body: str) -> str:
    if not raw_body:
        return ""
    try:
        parsed = json.loads(raw_body)
    except json.JSONDecodeError:
        return raw_body[:500]
    error = parsed.get("error") if isinstance(parsed, dict) else None
    if isinstance(error, dict):
        message = error.get("message") or error.get("type") or error.get("code")
        return str(message or "")[:500]
    return raw_body[:500]


class DeepSeekProvider:
    def __init__(
        self,
        *,
        api_key: str,
        base_url: str = "https://api.deepseek.com",
        model: str = "deepseek-chat",
        reasoner_model: str = "deepseek-reasoner",
        timeout_seconds: float = 15,
    ):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.default_model = model
        self.reasoner_model = reasoner_model
        self.timeout_seconds = timeout_seconds
        self.state = ProviderState(provider="deepseek", model=model)

    def _retry_after(self, exc: urllib.error.HTTPError) -> int | None:
        value = exc.headers.get("Retry-After") if exc.headers else None
        try:
            return int(value) if value else None
        except ValueError:
            return None

    def _chat_completion(
        self,
        *,
        model: str,
        prompt: str,
        max_tokens: int,
        system_prompt: str | None = None,
        purpose: str = "unknown",
        question_count: int | None = None,
        answer_count: int | None = None,
    ) -> str:
        if not self.api_key:
            raise ProviderOutputError("DeepSeek missing_api_key; DEEPSEEK_API_KEY is not configured")

        payload = {
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt
                    or (
                        "You are HirdUp's assessment AI. Return only strict JSON. "
                        "Do not include markdown, code fences, commentary, or hidden reasoning."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.15,
            "top_p": 0.9,
            "max_tokens": max_tokens,
        }
        request = urllib.request.Request(
            f"{self.base_url}/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        payload_chars = len(json.dumps(payload, ensure_ascii=True))
        record, started_perf = start_ai_call(
            purpose=purpose,
            provider="deepseek",
            model=model,
            endpoint_path="/chat/completions",
            prompt_char_count=len(prompt) + len(system_prompt or ""),
            estimated_payload_size_chars=payload_chars,
            question_count=question_count,
            answer_count=answer_count,
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout_seconds) as response:
                body = json.loads(response.read().decode("utf-8"))
                end_ai_call(record, started_perf, success=True, status_code=getattr(response, "status", 200))
        except urllib.error.HTTPError as exc:
            raw_body = exc.read().decode("utf-8", errors="replace")
            safe_body = _safe_error_body(raw_body)
            retry_after = self._retry_after(exc)
            self.state.status_code["deepseek"] = exc.code
            if retry_after is not None:
                self.state.retry_after_seconds["deepseek"] = retry_after
            if safe_body:
                self.state.sanitized_error_body["deepseek"] = safe_body
            end_ai_call(
                record,
                started_perf,
                success=False,
                status_code=exc.code,
                failure_reason=classify_ai_failure(exc, exc.code),
                retry_after_seconds=retry_after,
            )
            if exc.code in {401, 403}:
                raise ProviderOutputError(f"DeepSeek auth_error for model {model} (HTTP {exc.code}): {safe_body}") from exc
            if exc.code == 404:
                raise ProviderOutputError(f"DeepSeek model_not_found for model {model} (HTTP 404): {safe_body}") from exc
            if exc.code == 429:
                raise ProviderOutputError(f"DeepSeek rate_limited for model {model} (HTTP 429): {safe_body}") from exc
            if 500 <= exc.code <= 599:
                raise ProviderOutputError(f"DeepSeek provider_error for model {model} (HTTP {exc.code}): {safe_body}") from exc
            raise ProviderOutputError(f"DeepSeek request failed for model {model} (HTTP {exc.code}): {safe_body}") from exc
        except (urllib.error.URLError, TimeoutError) as exc:
            end_ai_call(record, started_perf, success=False, failure_reason=classify_ai_failure(exc))
            raise ProviderOutputError(f"DeepSeek connection_error for model {model}") from exc
        except json.JSONDecodeError as exc:
            end_ai_call(record, started_perf, success=False, failure_reason=classify_ai_failure(exc))
            raise ProviderOutputError(f"DeepSeek response was not valid JSON for model {model}") from exc

        try:
            content = body["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise ProviderOutputError(f"DeepSeek response missing text content for model {model}") from exc
        if not content:
            raise ProviderOutputError(f"DeepSeek response empty for model {model}")
        return str(content)

    def _validated(
        self,
        prompt: str,
        schema_type,
        *,
        max_tokens: int = 4096,
        system_prompt: str | None = None,
        purpose: str = "unknown",
        question_count: int | None = None,
        answer_count: int | None = None,
    ):
        model = self.default_model
        started_at = time.perf_counter()
        prompt_with_schema_guard = (
            f"{prompt}\n\n"
            "Return exactly one valid JSON object matching the requested schema. "
            "No markdown. No prose. No code fences. No chain-of-thought. "
            "If evidence is missing, use conservative scores and explain briefly in allowed JSON fields."
        )
        try:
            raw = self._chat_completion(
                model=model,
                prompt=prompt_with_schema_guard,
                max_tokens=max_tokens,
                system_prompt=system_prompt,
                purpose=purpose,
                question_count=question_count,
                answer_count=answer_count,
            )
            parsed = parse_structured_output(raw, schema_type)
            self.state.model = model
            self.state.model_attempts = [
                {
                    "provider": "deepseek",
                    "model": model,
                    "status": "success",
                    "latency_ms": int((time.perf_counter() - started_at) * 1000),
                }
            ]
            return parsed
        except Exception as exc:
            reason = classify_provider_failure(exc)
            scope = classify_failure_scope(exc)
            self.state.model = model
            self.state.failure_reason["deepseek"] = reason
            self.state.failure_scope["deepseek"] = scope
            self.state.model_attempts = [
                {
                    "provider": "deepseek",
                    "model": model,
                    "status": "failed",
                    "reason": str(exc),
                    "failure_reason": reason,
                    "failure_scope": scope,
                    "latency_ms": int((time.perf_counter() - started_at) * 1000),
                }
            ]
            raise ProviderOutputError(f"DeepSeek {reason} for model {model}: {exc}") from exc

    def _is_coding_answer(self, answer: AssessmentAnswer) -> bool:
        question = answer.assessment_question
        question_type = (question.question_type or "").lower()
        category = (question.category or "").lower()
        scoring_rubric = question.scoring_rubric or {}
        execution = scoring_rubric.get("execution") if isinstance(scoring_rubric, dict) else {}
        metadata = answer.answer_metadata or {}
        return bool(
            (answer.code_text or "").strip()
            or metadata.get("latest_run_result")
            or question_type in {"coding", "debugging"}
            or any(hint in category for hint in CODE_CATEGORY_HINTS)
            or (isinstance(execution, dict) and execution.get("execution_supported"))
        )

    def _run_result_summary(self, answer: AssessmentAnswer) -> dict:
        metadata = answer.answer_metadata or {}
        run_result = metadata.get("latest_run_result")
        return run_result if isinstance(run_result, dict) else {}

    def evaluate_answer(
        self, profile: CandidateProfile, answer: AssessmentAnswer, rubric_context: AIRubricContext | None = None
    ) -> AIAnswerEvaluation:
        question = answer.assessment_question
        rubric_guidance = rubric_context.model_dump() if rubric_context and rubric_context.items else {}
        run_result = self._run_result_summary(answer)
        coding_rule = (
            "- This answer includes coding/debugging signals. Evaluate correctness, readability, edge cases, "
            "complexity, maintainability, and test results if available."
            if self._is_coding_answer(answer)
            else "- Evaluate conceptual correctness, role relevance, clarity, expected concepts, and completeness."
        )
        prompt = f"""
Evaluate this HirdUp assessment answer.
Return JSON with keys: technical_accuracy, problem_solving, communication_clarity,
reasoning_depth, code_quality, expected_concepts_covered, missing_concepts,
confidence, short_feedback, transcript_evidence.
All numeric scores must be integers from 0-100.

Rules:
- Score only from candidate answer/code, code runner result, expected concepts, and question context.
- Use retrieved rubric context as scoring guidance only. Do not treat rubric text as candidate evidence.
- If code runner tests failed, do not imply the code passed.
{coding_rule}
- Do not expose chain-of-thought.

Candidate role: {profile.target_role}
Skills: {profile.skills}
Tech stack: {profile.tech_stack}
Question type: {question.question_type}
Category: {question.category}
Question: {question.question_text}
Expected concepts: {question.expected_concepts}
Question rubric: {question.scoring_rubric}
Retrieved rubric context: {rubric_guidance}
Code runner result: {run_result}
Answer: {answer.answer_text}
Code: {answer.code_text}
Duration seconds: {answer.duration_seconds}
"""
        return self._validated(prompt, AIAnswerEvaluation, max_tokens=2600, purpose="answer_evaluation")

    def evaluate_project_profile(self, profile: CandidateProfile) -> AIProjectQualityEvaluation:
        prompt = f"""
Evaluate candidate project/profile quality using metadata only. Do not scrape URLs.
Return JSON with keys: project_quality_score, clarity_score, technical_depth_score,
role_relevance_score, stack_alignment_score, complexity_score, impact_score,
summary, limitations. Scores must be 0-100.

Name: {profile.full_name}
Target role: {profile.target_role}
Experience level: {profile.experience_level}
Skills: {profile.skills}
Tech stack: {profile.tech_stack}
Project summary: {getattr(profile, "project_summary", None)}
Career goal: {getattr(profile, "career_goal", None)}
Portfolio URL present: {bool(profile.portfolio_url)}
LinkedIn URL present: {bool(profile.linkedin_url)}
Resume URL present: {bool(profile.resume_url)}
"""
        return self._validated(prompt, AIProjectQualityEvaluation, max_tokens=1600, purpose="project_profile")

    def generate_final_report(
        self,
        profile: CandidateProfile,
        answers: list[AssessmentAnswer],
        answer_evaluations: list[AIAnswerEvaluation],
        project_quality: AIProjectQualityEvaluation,
        aggregate_scores: dict[str, int],
    ) -> AIFinalReportDraft:
        question_context = [
            {
                "question": answer.assessment_question.question_text,
                "question_type": answer.assessment_question.question_type,
                "category": answer.assessment_question.category,
                "answer_summary": (answer.answer_text or "")[:500],
                "has_code": bool(answer.code_text),
                "evaluation": evaluation.model_dump(),
            }
            for answer, evaluation in zip(answers, answer_evaluations)
        ]
        prompt = f"""
Generate final HirdUp assessment report JSON with keys:
strengths, weaknesses, recommended_improvements, role_fit, recruiter_summary,
transcript_evidence.

Rules:
- Base the report on aggregate scores and question-wise evaluations only.
- Do not invent qualifications, scores, projects, links, GPA, or employers.
- Keep recruiter_summary concise, evidence-based, and suitable for a recruiter preview.

Candidate: {profile.full_name}
Target role: {profile.target_role}
Skills: {profile.skills}
Tech stack: {profile.tech_stack}
Aggregate scores: {aggregate_scores}
Project quality: {project_quality.model_dump()}
Question context and evaluations: {question_context}
"""
        return self._validated(prompt, AIFinalReportDraft, max_tokens=2400, purpose="final_report")

    def generate_onboarding_chat(self, payload: OnboardingChatRequest) -> OnboardingAIResponseDraft:
        prompt = f"""
You are HirdUp's profile-builder copilot. Support the form-first onboarding flow.
Return JSON with keys: assistant_message, extracted_fields, suggested_skills,
inferred_target_role, inferred_experience_level, missing_fields,
profile_completion_delta, next_question, confidence.

Rules:
- Do not invent hard facts.
- Only extract full_name, university, degree, graduation_year, GPA, portfolio_url,
  linkedin_url, resume_url, or availability_status when explicitly present.
- You may infer target role, experience level, skills, tech stack, career goal, and project summary.
- Keep this as a quick suggestion, not a chatbot flow.

Current profile draft:
{payload.current_profile.model_dump()}

Conversation/history or form context:
{[item.model_dump() for item in payload.conversation_history]}

Current step:
{payload.current_step}

Candidate message:
{payload.user_message}
"""
        return self._validated(prompt, OnboardingAIResponseDraft, max_tokens=1400, purpose="onboarding")

    def parse_resume_profile(self, resume_text: str) -> ResumeParseDraft:
        return self._validated(
            resume_parse_user_prompt(resume_text),
            ResumeParseDraft,
            max_tokens=2200,
            system_prompt=resume_parse_system_prompt(),
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

Improvement request and report context:
{prompt}
"""
        return self._validated(coach_prompt, AICoachResponseDraft, max_tokens=1200, purpose="improvement_plan")

    def evaluate_assessment_batch(self, payload: dict) -> AIBatchEvaluationDraft:
        question_count = len(payload.get("questions") or [])
        answer_count = sum(
            1
            for item in payload.get("questions") or []
            if (item.get("answer") or {}).get("answer_status") != "skipped"
        )
        return self._validated(
            batch_evaluation_user_prompt(payload),
            AIBatchEvaluationDraft,
            max_tokens=3600,
            system_prompt=batch_evaluation_system_prompt(payload),
            purpose="batch_evaluation",
            question_count=question_count,
            answer_count=answer_count,
        )
