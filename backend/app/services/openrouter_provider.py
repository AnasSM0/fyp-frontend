from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from typing import Iterable

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
    classify_failure_scope,
    classify_provider_failure,
    batch_evaluation_system_prompt,
    batch_evaluation_user_prompt,
    parse_structured_output,
)
from app.services.ai_call_audit import classify_ai_failure, end_ai_call, start_ai_call


CODE_CATEGORY_HINTS = ("coding", "debugging", "implementation", "code", "algorithm")


class OpenRouterProvider:
    def __init__(
        self,
        *,
        api_key: str,
        base_url: str,
        model: str,
        coder_model: str,
        fallback_model: str,
        app_name: str,
        site_url: str,
        timeout_seconds: float = 20,
        single_model_mode: bool = False,
    ):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.default_model = model
        self.coder_model = coder_model
        self.fallback_model = fallback_model
        self.app_name = app_name
        self.site_url = site_url
        self.timeout_seconds = timeout_seconds
        self.single_model_mode = single_model_mode
        self.state = ProviderState(provider="openrouter", model=model)

    def _models_for(self, *, coding: bool) -> list[str]:
        if self.single_model_mode:
            selected = self.coder_model if coding else self.default_model
            return [selected] if selected else []
        models = [
            self.coder_model if coding else self.default_model,
            self.default_model,
            self.fallback_model,
        ]
        return [model for index, model in enumerate(models) if model and model not in models[:index]]

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
        payload = {
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt or (
                        "You are XLR8Hire's assessment AI. Return only strict JSON. "
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
                "HTTP-Referer": self.site_url,
                "X-Title": self.app_name,
            },
            method="POST",
        )
        payload_chars = len(json.dumps(payload, ensure_ascii=True))
        record, started_perf = start_ai_call(
            purpose=purpose,
            provider="openrouter",
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
            end_ai_call(
                record,
                started_perf,
                success=False,
                status_code=exc.code,
                failure_reason=classify_ai_failure(exc, exc.code),
            )
            if exc.code in {401, 403}:
                raise ProviderOutputError(f"OpenRouter auth_error for model {model} (HTTP {exc.code})") from exc
            if exc.code == 404:
                raise ProviderOutputError(f"OpenRouter model_not_found for model {model} (HTTP 404)") from exc
            if exc.code == 429:
                raise ProviderOutputError(f"OpenRouter rate_limited for model {model} (HTTP 429)") from exc
            if 500 <= exc.code <= 599:
                raise ProviderOutputError(f"OpenRouter provider_error for model {model} (HTTP {exc.code})") from exc
            raise ProviderOutputError(f"OpenRouter request failed for model {model} (HTTP {exc.code})") from exc
        except (urllib.error.URLError, TimeoutError) as exc:
            end_ai_call(record, started_perf, success=False, failure_reason=classify_ai_failure(exc))
            raise ProviderOutputError(f"OpenRouter connection_error for model {model}") from exc
        except json.JSONDecodeError as exc:
            end_ai_call(record, started_perf, success=False, failure_reason=classify_ai_failure(exc))
            raise ProviderOutputError(f"OpenRouter response was not valid JSON for model {model}") from exc

        try:
            content = body["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise ProviderOutputError(f"OpenRouter response missing text content for model {model}") from exc
        if not content:
            raise ProviderOutputError(f"OpenRouter response empty for model {model}")
        return str(content)

    def _validated(
        self,
        prompt: str,
        schema_type,
        *,
        coding: bool = False,
        max_tokens: int = 4096,
        system_prompt: str | None = None,
        purpose: str = "unknown",
        question_count: int | None = None,
        answer_count: int | None = None,
    ):
        prompt_with_schema_guard = (
            f"{prompt}\n\n"
            "Return exactly one valid JSON object matching the requested schema. "
            "No markdown. No prose. No code fences. No chain-of-thought. "
            "If evidence is missing, use conservative scores and explain briefly in allowed JSON fields."
        )
        failures: list[str] = []
        attempts: list[dict] = []
        for model in self._models_for(coding=coding):
            started_at = time.perf_counter()
            try:
                kwargs = {"system_prompt": system_prompt} if system_prompt else {}
                try:
                    raw = self._chat_completion(
                        model=model,
                        prompt=prompt_with_schema_guard,
                        max_tokens=max_tokens,
                        purpose=purpose,
                        question_count=question_count,
                        answer_count=answer_count,
                        **kwargs,
                    )
                except TypeError as exc:
                    if "unexpected keyword argument" not in str(exc):
                        raise
                    raw = self._chat_completion(
                        model=model,
                        prompt=prompt_with_schema_guard,
                        max_tokens=max_tokens,
                        **kwargs,
                    )
                parsed = parse_structured_output(raw, schema_type)
                attempts.append(
                    {
                        "provider": "openrouter",
                        "model": model,
                        "status": "success",
                        "latency_ms": int((time.perf_counter() - started_at) * 1000),
                    }
                )
                self.state.model = model
                self.state.model_attempts = attempts
                if failures:
                    self.state.warnings = [*self.state.warnings, *failures]
                return parsed
            except Exception as exc:
                message = str(exc)
                reason = classify_provider_failure(exc)
                failure_scope = classify_failure_scope(exc)
                failures.append(f"OpenRouter model {model} failed: {message}")
                attempts.append(
                    {
                        "provider": "openrouter",
                        "model": model,
                        "status": "failed",
                        "reason": message,
                        "failure_reason": reason,
                        "failure_scope": failure_scope,
                        "latency_ms": int((time.perf_counter() - started_at) * 1000),
                    }
                )
                if reason == "rate_limited" or failure_scope == "account":
                    self.state.model = model
                    self.state.model_attempts = attempts
                    self.state.failure_reason = {"openrouter": "rate_limited"}
                    self.state.failure_scope = {"openrouter": "account"}
                    self.state.warnings = [
                        *self.state.warnings,
                        f"OpenRouter account-level rate limit for model {model}; skipping OpenRouter model fallback.",
                    ]
                    raise ProviderOutputError(
                        f"OpenRouter account-level rate_limited for model {model}; retry later"
                    ) from exc
        self.state.model_attempts = attempts
        self.state.warnings = [*self.state.warnings, *failures]
        raise ProviderOutputError("; ".join(failures) or "OpenRouter request failed")

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
        coding = self._is_coding_answer(answer)
        rubric_guidance = rubric_context.model_dump() if rubric_context and rubric_context.items else {}
        run_result = self._run_result_summary(answer)
        prompt = f"""
Evaluate this XLR8Hire assessment answer.
Return JSON with keys: technical_accuracy, problem_solving, communication_clarity,
reasoning_depth, code_quality, expected_concepts_covered, missing_concepts,
confidence, short_feedback, transcript_evidence.
All numeric scores must be integers from 0-100.

Rules:
- Score only from candidate answer/code, code runner result, expected concepts, and question context.
- Use retrieved rubric context as scoring guidance only. Do not treat rubric text as candidate evidence.
- If code runner tests failed, do not imply the code passed.
- For coding answers, evaluate correctness, edge cases, readability, complexity, and code quality.
- For written answers, evaluate conceptual correctness, role relevance, clarity, and completeness.
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
        return self._validated(prompt, AIAnswerEvaluation, coding=coding, max_tokens=2600, purpose="answer_evaluation")

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
Generate final XLR8Hire assessment report JSON with keys:
strengths, weaknesses, recommended_improvements, role_fit, recruiter_summary,
transcript_evidence.

Rules:
- Base the report on aggregate scores and question-wise evaluations only.
- Do not invent qualifications, scores, projects, links, GPA, or employers.
- Keep recruiter_summary concise, evidence-based, and suitable for a recruiter preview.
- strengths and weaknesses must be actionable and candidate-friendly.

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
You are XLR8Hire's profile-builder copilot. Support the form-first onboarding flow.
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
        return self._validated(coach_prompt, AICoachResponseDraft, max_tokens=1200, purpose="improvement_plan")

    def evaluate_assessment_batch(self, payload: dict) -> AIBatchEvaluationDraft:
        question_count = len(payload.get("questions") or [])
        answer_count = sum(1 for item in payload.get("questions") or [] if (item.get("answer") or {}).get("answer_status") != "skipped")
        return self._validated(
            batch_evaluation_user_prompt(payload),
            AIBatchEvaluationDraft,
            max_tokens=3600,
            system_prompt=batch_evaluation_system_prompt(payload),
            purpose="batch_evaluation",
            question_count=question_count,
            answer_count=answer_count,
        )
