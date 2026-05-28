from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Protocol

from pydantic import ValidationError

from app.models.assessment import AssessmentAnswer
from app.models.profile import CandidateProfile
from app.schemas.ai import OnboardingAIResponseDraft, OnboardingChatRequest, OnboardingExtractedFields
from app.schemas.evaluation import (
    AIAnswerEvaluation,
    AIBatchEvaluationDraft,
    AICoachResponseDraft,
    AIFinalReportDraft,
    AIProjectQualityEvaluation,
    AIRubricContext,
    ProviderMetadata,
)
from app.services.ai_provider_health import (
    mark_provider_unhealthy,
    mark_provider_unhealthy_with_scope,
    provider_cooldown_snapshot,
    provider_health_snapshot,
)


@dataclass
class ProviderState:
    provider: str
    model: str
    fallback_used: bool = False
    warnings: list[str] = field(default_factory=list)
    requested_provider: str | None = None
    fallback_chain: list[str] = field(default_factory=list)
    skipped_providers: list[str] = field(default_factory=list)
    provider_health: dict[str, str] = field(default_factory=dict)
    cooldown_until: dict[str, str] = field(default_factory=dict)
    latency_ms: dict[str, int] = field(default_factory=dict)
    failure_reason: dict[str, str] = field(default_factory=dict)
    failure_scope: dict[str, str] = field(default_factory=dict)
    fast_mode_used: bool = False
    real_provider_attempts: int = 0
    model_attempts: list[dict] = field(default_factory=list)

    def metadata(self) -> ProviderMetadata:
        actual_provider = self.provider
        return ProviderMetadata(
            requested_provider=self.requested_provider or actual_provider,
            actual_provider=actual_provider,
            provider=actual_provider,
            model=self.model,
            fallback_used=self.fallback_used,
            fallback_chain=self.fallback_chain or [actual_provider],
            warnings=self.warnings,
            generated_at=datetime.now(timezone.utc).isoformat(),
            skipped_providers=self.skipped_providers,
            provider_health=self.provider_health,
            cooldown_until=self.cooldown_until,
            latency_ms=self.latency_ms,
            failure_reason=self.failure_reason,
            failure_scope=self.failure_scope,
            fast_mode_used=self.fast_mode_used,
            real_provider_attempts=self.real_provider_attempts,
            model_attempts=self.model_attempts,
        )


class AIProvider(Protocol):
    state: ProviderState

    def evaluate_answer(
        self, profile: CandidateProfile, answer: AssessmentAnswer, rubric_context: AIRubricContext | None = None
    ) -> AIAnswerEvaluation:
        ...

    def evaluate_project_profile(self, profile: CandidateProfile) -> AIProjectQualityEvaluation:
        ...

    def generate_final_report(
        self,
        profile: CandidateProfile,
        answers: list[AssessmentAnswer],
        answer_evaluations: list[AIAnswerEvaluation],
        project_quality: AIProjectQualityEvaluation,
        aggregate_scores: dict[str, int],
    ) -> AIFinalReportDraft:
        ...

    def generate_onboarding_chat(self, payload: OnboardingChatRequest) -> OnboardingAIResponseDraft:
        ...

    def generate_coach_response(self, prompt: str) -> AICoachResponseDraft:
        ...

    def evaluate_assessment_batch(self, payload: dict) -> AIBatchEvaluationDraft:
        ...


class ProviderOutputError(RuntimeError):
    pass


def _remove_reasoning_blocks(raw_text: str) -> str:
    return re.sub(r"<think>.*?</think>", "", raw_text, flags=re.DOTALL | re.IGNORECASE).strip()


def extract_json_object(raw_text: str) -> str:
    text = _remove_reasoning_blocks(raw_text).strip()
    fence_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, flags=re.DOTALL | re.IGNORECASE)
    if fence_match:
        return fence_match.group(1).strip()

    decoder = json.JSONDecoder()
    for index, char in enumerate(text):
        if char != "{":
            continue
        try:
            _, end_index = decoder.raw_decode(text[index:])
            return text[index : index + end_index].strip()
        except json.JSONDecodeError:
            continue
    return text


def _as_list(value) -> list:
    if value is None:
        return []
    if isinstance(value, list):
        return [item for item in value if item not in (None, "")]
    return [value] if value not in ("", None) else []


def _clamp_int(value, default: int) -> int:
    try:
        return max(0, min(100, int(value)))
    except (TypeError, ValueError):
        return default


def _coerce_onboarding_payload(data: dict) -> dict:
    extracted = data.get("extracted_fields") if isinstance(data.get("extracted_fields"), dict) else {}
    assistant = (
        data.get("assistant_message")
        or data.get("message")
        or data.get("response")
        or "I captured the profile signals you provided and kept hard facts limited to explicit evidence."
    )
    next_question = (
        data.get("next_question")
        or data.get("question")
        or "What is the strongest project you built with this stack, and what was your specific contribution?"
    )
    return {
        **data,
        "assistant_message": assistant,
        "extracted_fields": extracted,
        "suggested_skills": _as_list(data.get("suggested_skills")),
        "inferred_target_role": data.get("inferred_target_role") or extracted.get("target_role"),
        "inferred_experience_level": data.get("inferred_experience_level") or extracted.get("experience_level"),
        "missing_fields": _as_list(data.get("missing_fields")),
        "profile_completion_delta": _clamp_int(data.get("profile_completion_delta"), 0),
        "next_question": next_question,
        "confidence": _clamp_int(data.get("confidence"), 50),
    }


def parse_structured_output(raw_text: str, schema_type):
    candidates = [raw_text]
    extracted = extract_json_object(raw_text)
    if extracted != raw_text:
        candidates.append(extracted)
    last_exc: Exception | None = None
    for candidate in candidates:
        try:
            return schema_type.model_validate_json(candidate)
        except (ValidationError, ValueError, json.JSONDecodeError) as exc:
            last_exc = exc
            if schema_type is OnboardingAIResponseDraft:
                try:
                    parsed = json.loads(candidate)
                    if isinstance(parsed, dict):
                        return schema_type.model_validate(_coerce_onboarding_payload(parsed))
                except (ValidationError, ValueError, TypeError, json.JSONDecodeError) as partial_exc:
                    last_exc = partial_exc
    try:
        parsed = json.loads(extracted)
        if schema_type is OnboardingAIResponseDraft and isinstance(parsed, dict):
            return schema_type.model_validate(_coerce_onboarding_payload(parsed))
    except (ValidationError, ValueError, TypeError, json.JSONDecodeError) as exc:
        last_exc = exc
    raise ProviderOutputError("Provider returned malformed structured output") from last_exc


def classify_provider_failure(exc: Exception) -> str:
    message = str(exc).lower()
    cause = getattr(exc, "__cause__", None)
    cause_text = str(cause).lower() if cause else ""
    combined = f"{message} {cause_text}"
    if "401" in combined or "403" in combined or "auth_error" in combined or "unauthorized" in combined:
        return "auth_error"
    if "404" in combined or "model_not_found" in combined:
        return "model_not_found"
    if (
        "429" in combined
        or "rate limit" in combined
        or "rate_limited" in combined
        or "quota exceeded" in combined
        or "account limit reached" in combined
    ):
        return "rate_limited"
    if "timeout" in combined or "timed out" in combined:
        return "timeout"
    if "connection" in combined or "urlerror" in combined or "network" in combined:
        return "connection_error"
    if "malformed structured output" in combined or "json" in combined:
        return "malformed_structured_output"
    return "provider_error"


def classify_failure_scope(exc: Exception) -> str:
    combined = f"{str(exc).lower()} {str(getattr(exc, '__cause__', '')).lower()}"
    if any(token in combined for token in ["429", "rate_limited", "quota exceeded", "account limit reached", "rate limit"]):
        return "account"
    return "model"


def batch_target_role(payload: dict) -> str:
    profile = payload.get("profile") or {}
    session = payload.get("session") or {}
    return str(profile.get("target_role") or session.get("target_role") or "target role").strip() or "target role"


def batch_has_code(payload: dict) -> bool:
    for item in payload.get("questions") or []:
        answer = item.get("answer") or {}
        if (answer.get("code_text") or "").strip() or answer.get("latest_run_result"):
            return True
    return False


def batch_evaluation_system_prompt(payload: dict) -> str:
    target_role = batch_target_role(payload)
    lines = [
        (
            f"You are a senior technical interviewer evaluating a candidate for the role of {target_role}. "
            f"Assess the candidate like a hiring panel would for a junior or early-career {target_role} position. "
            "Use the candidate's selected role, tech stack, project background, submitted answers, code, "
            "code runner results, expected concepts, retrieved rubrics, and integrity signals. Be strict but fair. "
            "Do not reward vague answers. Penalize idk, blank, skipped, or irrelevant responses. Evaluate every question."
        )
    ]
    if batch_has_code(payload):
        lines.append(
            f"When code is provided, evaluate it as a senior engineer reviewing an applicant's code for {target_role}. "
            "Consider correctness, readability, edge cases, complexity, maintainability, and test results if available."
        )
    lines.append(
        "For non-code answers, evaluate conceptual correctness, clarity, expected concepts, role relevance, and explanation quality."
    )
    lines.append(
        "Return JSON only. No markdown. No code fences. No chain-of-thought. No reasoning trace. "
        "No commentary outside JSON. Evaluate every question. Penalize weak, blank, idk, skipped, or irrelevant answers."
    )
    return "\n".join(lines)


def batch_evaluation_user_prompt(payload: dict) -> str:
    return f"""
Evaluate this complete XLR8Hire assessment in one batched operation.
Return exactly one compact JSON object with this schema:
{{
  "question_evaluations": [
    {{
      "question_id": "string",
      "score": 0,
      "answer_status": "answered|insufficient|skipped",
      "skill_area": "string",
      "strengths": ["string"],
      "missing_concepts": ["string"],
      "feedback": "string",
      "improvement_tip": "string"
    }}
  ],
  "category_scores": {{
    "technical_accuracy": 0,
    "problem_solving": 0,
    "communication": 0,
    "code_quality": 0,
    "system_design": 0
  }},
  "overall_strengths": ["string"],
  "overall_growth_areas": ["string"],
  "candidate_summary": "string",
  "recruiter_summary": "string",
  "role_fit_summary": "string",
  "recommended_next_steps": ["string"],
  "improvement_plan": [
    {{
      "day": "Day 1",
      "focus": "string",
      "task": "string"
    }}
  ]
}}

Rules:
- Include every payload question exactly once in question_evaluations.
- question_id must equal question.assessment_question_id exactly.
- Scores must be integers from 0 to 100.
- Use "insufficient" for idk, blank, vague, irrelevant, or too-short answers.
- Use "skipped" only when no candidate answer/code exists.
- Do not invent facts, employers, benchmarks, hidden tests, or credentials.
- Keep strings concise and useful for a candidate report.

Payload:
{json.dumps(payload, ensure_ascii=True)}
""".strip()


class StubAIProvider:
    def __init__(self, warning: str | None = None):
        warnings = [warning] if warning else ["Deterministic stub evaluation provider used."]
        self.state = ProviderState(
            provider="stub",
            model="deterministic-phase3-stub",
            fallback_used=True,
            warnings=warnings,
        )

    def evaluate_answer(
        self, profile: CandidateProfile, answer: AssessmentAnswer, rubric_context: AIRubricContext | None = None
    ) -> AIAnswerEvaluation:
        question = answer.assessment_question
        answer_text = (answer.answer_text or "").strip()
        code_text = (answer.code_text or "").strip()
        expected = list(question.expected_concepts or [])
        for item in (rubric_context.items if rubric_context else []):
            for concept in item.expected_concepts:
                if concept not in expected:
                    expected.append(concept)
        combined = f"{answer_text} {code_text}".lower()
        covered = [
            concept for concept in expected if any(token in combined for token in concept.lower().split())
        ]
        missing = [concept for concept in expected if concept not in covered]
        word_count = len(answer_text.split())
        unique_word_count = len(set(answer_text.lower().split()))
        has_substance = word_count >= 12 or len(code_text) >= 80
        if not answer_text and not code_text:
            base = 18
        elif word_count < 6 and not code_text:
            base = 28
        elif word_count < 12 and not code_text:
            base = 42
        else:
            base = 60 + min(20, len(answer_text) // 80) + min(10, len(code_text) // 140)
        if question.category in {"system_design", "scenario_reasoning"}:
            base += 4
        if covered:
            base += min(12, len(covered) * 4)
        if unique_word_count <= 3 and word_count >= 8:
            base -= 10
        code_quality = 45 if not code_text and not has_substance else (70 if not code_text else min(92, 60 + len(code_text) // 70))
        evidence = answer_text[:180] or code_text[:180] or "No substantial transcript evidence provided."
        return AIAnswerEvaluation(
            technical_accuracy=max(0, min(100, base)),
            problem_solving=max(0, min(100, base - 2)),
            communication_clarity=max(0, min(100, 35 + min(45, word_count))),
            reasoning_depth=max(0, min(100, base - 4)),
            code_quality=max(0, min(100, code_quality)),
            expected_concepts_covered=covered,
            missing_concepts=missing,
            confidence=82,
            short_feedback=(
                "Structured answer with enough evidence for demo scoring."
                if has_substance and unique_word_count > 3
                else "Answer evidence is thin."
            ),
            transcript_evidence=[evidence],
        )

    def evaluate_project_profile(self, profile: CandidateProfile) -> AIProjectQualityEvaluation:
        has_links = bool(profile.portfolio_url or profile.linkedin_url or profile.resume_url)
        depth = 70 + min(15, len(profile.skills or []))
        raw = 72 if has_links else 58
        return AIProjectQualityEvaluation(
            project_quality_score=raw,
            clarity_score=72 if profile.target_role else 55,
            technical_depth_score=min(90, depth),
            role_relevance_score=80 if profile.target_role and profile.skills else 60,
            stack_alignment_score=82 if profile.tech_stack else 55,
            complexity_score=68 if has_links else 55,
            impact_score=64 if has_links else 50,
            summary="Profile metadata shows role and stack alignment; no repository scraping was performed.",
            limitations=["Project quality is capped because Phase 3 evaluates profile metadata only."],
        )

    def generate_final_report(
        self,
        profile: CandidateProfile,
        answers: list[AssessmentAnswer],
        answer_evaluations: list[AIAnswerEvaluation],
        project_quality: AIProjectQualityEvaluation,
        aggregate_scores: dict[str, int],
    ) -> AIFinalReportDraft:
        strongest = sorted(
            aggregate_scores.items(),
            key=lambda item: item[1],
            reverse=True,
        )[:2]
        weakest = sorted(aggregate_scores.items(), key=lambda item: item[1])[:2]
        evidence = [
            evidence
            for evaluation in answer_evaluations
            for evidence in evaluation.transcript_evidence[:1]
        ][:5]
        target_role = profile.target_role or "target role"
        return AIFinalReportDraft(
            strengths=[
                f"Strongest measured signal: {label.replace('_', ' ')} at {score}/100."
                for label, score in strongest
            ],
            weaknesses=[
                f"Growth area: {label.replace('_', ' ')} scored {score}/100."
                for label, score in weakest
            ],
            recommended_improvements=[
                "Add richer project evidence with measurable impact.",
                "Continue practicing structured technical explanations.",
            ],
            role_fit=[
                {
                    "role": target_role,
                    "score": aggregate_scores["ai_test_score"],
                    "reason": "Fit is estimated from curated interview answers and profile metadata.",
                }
            ],
            recruiter_summary=(
                f"{profile.full_name or 'Candidate'} shows a {aggregate_scores['ai_test_score']}/100 "
                f"assessment signal for {target_role}, with strongest evidence in "
                f"{strongest[0][0].replace('_', ' ')}."
            ),
            transcript_evidence=evidence,
        )

    def generate_onboarding_chat(self, payload: OnboardingChatRequest) -> OnboardingAIResponseDraft:
        message = payload.user_message.strip()
        history_text = " ".join(item.content for item in payload.conversation_history[-6:])
        combined = " ".join(
            [
                message,
                history_text,
                payload.current_profile.target_role or "",
                payload.current_profile.project_summary or "",
                payload.current_profile.career_goal or "",
                " ".join(payload.current_profile.tech_stack or []),
                " ".join(payload.current_profile.skills or []),
            ]
        )
        lowered = combined.lower()
        skill_terms = [
            "React",
            "Next.js",
            "TypeScript",
            "JavaScript",
            "FastAPI",
            "Python",
            "PostgreSQL",
            "SQL",
            "Node.js",
            "Express",
            "SQLAlchemy",
            "Pydantic",
            "Machine Learning",
            "LLM",
            "Docker",
            "JWT",
            "REST APIs",
            "Tailwind CSS",
            "Git",
            "APIs",
            "Accessibility",
        ]
        detected_skills = []
        normalized_lowered = lowered.replace(".", "").replace("-", " ")
        for skill in skill_terms:
            normalized_skill = skill.lower().replace(".", "").replace("-", " ")
            if normalized_skill in normalized_lowered:
                detected_skills.append(skill)

        inferred_role = payload.current_profile.target_role
        if any(token in lowered for token in ["react", "next", "frontend", "ui", "component"]):
            inferred_role = inferred_role or "Frontend Engineer"
        if any(token in lowered for token in ["fastapi", "api", "postgres", "backend", "database"]):
            inferred_role = "Full Stack Developer" if inferred_role == "Frontend Engineer" else inferred_role or "Backend Engineer"
        if inferred_role in {"Backend Engineer", "Frontend Engineer"} and any(
            token in lowered for token in ["full stack", "full-stack", "end to end", "frontend and backend"]
        ):
            inferred_role = "Full Stack Developer"
        if any(token in lowered for token in ["machine learning", " llm", "ai/ml", "data"]):
            inferred_role = inferred_role or "AI/ML Engineer"

        inferred_experience = payload.current_profile.experience_level
        if not inferred_experience:
            if any(token in lowered for token in ["internship", "beginner", "student", "coursework"]):
                inferred_experience = "Student / Early Career"
            elif any(token in lowered for token in ["freelance", "production", "deployed", "client"]):
                inferred_experience = "Junior"
            else:
                inferred_experience = "Student / Early Career"
        gpa_match = re.search(r"\bgpa\s*(?:is|:)?\s*(\d(?:\.\d+)?)\b", lowered)
        extracted_gpa = float(gpa_match.group(1)) if gpa_match else None
        urls = re.findall(r"https?://\S+", message)
        project_summary = None
        if any(token in lowered for token in ["project", "built", "developed", "implemented"]):
            project_summary = message[:600]
        career_goal = None
        if any(token in lowered for token in ["goal", "want to become", "target", "looking for"]):
            career_goal = message[:400]
        extracted = OnboardingExtractedFields(
            target_role=inferred_role,
            experience_level=inferred_experience,
            tech_stack=detected_skills,
            skills=detected_skills,
            gpa=extracted_gpa,
            portfolio_url=urls[0] if urls else None,
            project_summary=project_summary,
            career_goal=career_goal,
        )
        missing_fields = []
        profile = payload.current_profile
        for field_name in [
            "full_name",
            "university",
            "degree",
            "graduation_year",
            "target_role",
            "tech_stack",
            "project_summary",
            "career_goal",
        ]:
            value = getattr(profile, field_name)
            if not value and not getattr(extracted, field_name, None):
                missing_fields.append(field_name)
        completion_delta = min(
            35,
            5
            * len(
                [
                    value
                    for value in [inferred_role, detected_skills, extracted_gpa, urls, project_summary, career_goal]
                    if value
                ]
            ),
        )
        if not inferred_role:
            next_question = "What role are you targeting, and which technologies have you used hands-on?"
        elif not detected_skills and not profile.tech_stack:
            next_question = f"Which tools or frameworks have you actually used for {inferred_role} work?"
        elif not profile.project_summary and not project_summary:
            next_question = "What is the strongest project you built with this stack, and what was your specific contribution?"
        elif not profile.career_goal and not career_goal:
            next_question = "What kind of role or internship do you want this assessment to prepare you for?"
        else:
            next_question = "Which part of your stack should the assessment focus on: frontend, backend, database, debugging, or system design?"
        return OnboardingAIResponseDraft(
            assistant_message=(
                "I mapped the profile signals you provided and kept hard facts limited to explicit evidence. "
                f"Your current strongest direction is {inferred_role or 'not clear yet'}."
            ),
            extracted_fields=extracted,
            suggested_skills=detected_skills[:6],
            inferred_target_role=inferred_role,
            inferred_experience_level=inferred_experience,
            missing_fields=missing_fields,
            profile_completion_delta=completion_delta,
            next_question=next_question,
            confidence=72 if inferred_role or detected_skills else 45,
        )

    def generate_coach_response(self, prompt: str) -> AICoachResponseDraft:
        lowered = prompt.lower()
        if "practice" in lowered:
            answer = (
                "Start with one weak skill, solve two small practice tasks, then rewrite your explanation using: "
                "what I built, why it works, edge cases, and tradeoffs. Review the weakest question first and retake "
                "only after your practice answers consistently cover the missing concepts."
            )
        elif "code quality" in lowered or "code_quality" in lowered:
            answer = (
                "Focus on smaller functions, clear names, explicit input validation, and edge-case tests. After each "
                "solution, check whether another candidate could read your code without extra explanation."
            )
        else:
            answer = (
                "Use the report's lowest scoring question as the first target. Identify the missing concepts, write a "
                "better answer in five bullets, then practice one similar question under a time limit."
            )
        return AICoachResponseDraft(answer=answer)

    def evaluate_assessment_batch(self, payload: dict) -> AIBatchEvaluationDraft:
        profile = payload.get("profile") or {}
        questions = payload.get("questions") or []
        question_evaluations = []
        for item in questions:
            question = item.get("question") or {}
            answer = item.get("answer") or {}
            expected = question.get("expected_concepts") or []
            status_label = answer.get("answer_status") or "answered"
            answer_text = (answer.get("answer_text") or "").strip()
            code_text = (answer.get("code_text") or "").strip()
            if status_label in {"skipped", "insufficient_response"}:
                score = 0 if status_label == "skipped" else 12
                missing = list(expected)
                feedback = "Insufficient answer provided."
                strengths: list[str] = []
            else:
                combined = f"{answer_text} {code_text}".lower()
                strengths = [
                    concept for concept in expected if any(token in combined for token in str(concept).lower().split())
                ]
                missing = [concept for concept in expected if concept not in strengths]
                base = 55 + min(20, len(answer_text) // 80) + min(12, len(code_text) // 160)
                score = max(0, min(100, base + min(10, len(strengths) * 3)))
                feedback = "Batch evaluation found usable answer evidence." if answer_text or code_text else "Answer evidence is thin."
            question_evaluations.append(
                {
                    "question_id": str(question.get("assessment_question_id") or ""),
                    "score": score,
                    "answer_status": status_label,
                    "skill_area": question.get("category") or "General",
                    "strengths": strengths,
                    "missing_concepts": missing,
                    "feedback": feedback,
                    "improvement_tip": "Review expected concepts and practice a clearer, evidence-based answer.",
                }
            )
        aggregate_signal = int(
            sum(item["score"] for item in question_evaluations) / max(1, len(question_evaluations))
        )
        return AIBatchEvaluationDraft(
            question_evaluations=question_evaluations,
            category_scores={
                "technical_accuracy": aggregate_signal,
                "problem_solving": max(0, aggregate_signal - 2),
                "communication": max(0, aggregate_signal - 4),
                "code_quality": max(0, aggregate_signal - 5),
                "system_design": max(0, aggregate_signal - 3),
            },
            overall_strengths=["Completed the assessment with structured evidence."],
            overall_growth_areas=["Review missed concepts and low-scoring answers."],
            candidate_summary=f"Candidate shows a {aggregate_signal}/100 batch assessment signal.",
            recruiter_summary=f"Candidate shows a {aggregate_signal}/100 batch assessment signal.",
            role_fit_summary=f"Estimated fit for {profile.get('target_role') or 'target role'} from batch evidence.",
            recommended_next_steps=["Practice weak areas before retaking."],
            improvement_plan=[
                {
                    "day": "Day 1",
                    "focus": "Weakest assessment area",
                    "task": "Rewrite the lowest-scoring answer with expected concepts and concrete tradeoffs.",
                }
            ],
        )


class FallbackAIProvider:
    def __init__(
        self,
        primary: AIProvider | None,
        fallback_warning: str | None = None,
        *,
        requested_provider: str | None = None,
        fallback_providers: list[AIProvider] | None = None,
        initial_warnings: list[str] | None = None,
        fallback_chain: list[str] | None = None,
        capability: str = "evaluation",
        cooldown_seconds: int = 300,
        skipped_providers: list[str] | None = None,
        fast_mode_used: bool = False,
        allow_stub: bool = True,
    ):
        self.stub = StubAIProvider(warning=fallback_warning)
        self.providers: list[AIProvider] = []
        if primary is not None:
            self.providers.append(primary)
        self.providers.extend(fallback_providers or [])
        self.providers.append(self.stub)
        self.requested_provider = requested_provider or (
            self.providers[0].state.provider if self.providers else "stub"
        )
        self.warning_history = list(initial_warnings or [])
        self.fallback_chain = fallback_chain or [provider.state.provider for provider in self.providers]
        self.capability = capability
        self.cooldown_seconds = cooldown_seconds
        self.skipped_providers = list(skipped_providers or [])
        self.fast_mode_used = fast_mode_used
        self.allow_stub = allow_stub
        self.latency_ms: dict[str, int] = {}
        self.failure_reason: dict[str, str] = {}
        self.failure_scope: dict[str, str] = {}
        self.model_attempts: list[dict] = []
        self.real_provider_attempts = 0
        self.active_index = 0
        self.state = self._decorate_state(self.providers[self.active_index])

    def _decorate_state(self, provider: AIProvider) -> ProviderState:
        state = provider.state
        state.requested_provider = self.requested_provider
        state.fallback_chain = self.fallback_chain
        state.fallback_used = (
            state.fallback_used
            or self.active_index > 0
            or state.provider != self.requested_provider
            or bool(self.warning_history)
        )
        merged_warnings: list[str] = []
        for warning in [*self.warning_history, *state.warnings]:
            if warning and warning not in merged_warnings:
                merged_warnings.append(warning)
        state.warnings = merged_warnings
        state.skipped_providers = list(dict.fromkeys([*self.skipped_providers, *state.skipped_providers]))
        state.provider_health = provider_health_snapshot(self.capability)
        state.cooldown_until = provider_cooldown_snapshot(self.capability)
        state.latency_ms = {**self.latency_ms, **state.latency_ms}
        state.failure_reason = {**self.failure_reason, **state.failure_reason}
        state.failure_scope = {**self.failure_scope, **state.failure_scope}
        state.fast_mode_used = self.fast_mode_used or state.fast_mode_used
        state.real_provider_attempts = self.real_provider_attempts
        state.model_attempts = [*self.model_attempts, *state.model_attempts]
        return state

    def _provider_label(self, provider: AIProvider) -> str:
        return provider.state.provider.upper()

    def _fallback_warning(self, provider: AIProvider, operation: str, exc: Exception) -> str:
        return f"{self._provider_label(provider)} {operation} failed; trying fallback provider. {exc}"

    def _run(self, operation: str, method_name: str, *args):
        while self.active_index < len(self.providers):
            provider = self.providers[self.active_index]
            started_at = time.perf_counter()
            try:
                if provider.state.provider == "stub" and not self.allow_stub:
                    raise ProviderOutputError("Stub fallback disabled for required real AI evaluation")
                if provider.state.provider != "stub":
                    self.real_provider_attempts += 1
                result = getattr(provider, method_name)(*args)
                self.latency_ms[provider.state.provider] = int((time.perf_counter() - started_at) * 1000)
                self.state = self._decorate_state(provider)
                return result
            except Exception as exc:
                self.latency_ms[provider.state.provider] = int((time.perf_counter() - started_at) * 1000)
                self.model_attempts.extend(provider.state.model_attempts)
                reason = classify_provider_failure(exc)
                failure_scope = classify_failure_scope(exc)
                self.failure_reason[provider.state.provider] = reason
                self.failure_scope[provider.state.provider] = failure_scope
                if provider.state.provider != "stub":
                    mark_provider_unhealthy_with_scope(
                        provider.state.provider,
                        self.capability,
                        reason,
                        self.cooldown_seconds,
                        failure_scope=failure_scope,
                    )
                self.warning_history.append(self._fallback_warning(provider, operation, exc))
                self.active_index += 1
        if self.providers:
            self.active_index = max(0, min(self.active_index - 1, len(self.providers) - 1))
            self.state = self._decorate_state(self.providers[self.active_index])
        raise ProviderOutputError(f"All AI providers failed during {operation}")

    def evaluate_answer(
        self, profile: CandidateProfile, answer: AssessmentAnswer, rubric_context: AIRubricContext | None = None
    ) -> AIAnswerEvaluation:
        return self._run("answer evaluation", "evaluate_answer", profile, answer, rubric_context)

    def evaluate_project_profile(self, profile: CandidateProfile) -> AIProjectQualityEvaluation:
        return self._run("project/profile evaluation", "evaluate_project_profile", profile)

    def generate_final_report(
        self,
        profile: CandidateProfile,
        answers: list[AssessmentAnswer],
        answer_evaluations: list[AIAnswerEvaluation],
        project_quality: AIProjectQualityEvaluation,
        aggregate_scores: dict[str, int],
    ) -> AIFinalReportDraft:
        return self._run(
            "final report generation",
            "generate_final_report",
            profile,
            answers,
            answer_evaluations,
            project_quality,
            aggregate_scores,
        )

    def generate_onboarding_chat(self, payload: OnboardingChatRequest) -> OnboardingAIResponseDraft:
        return self._run("onboarding assistance", "generate_onboarding_chat", payload)

    def generate_coach_response(self, prompt: str) -> AICoachResponseDraft:
        return self._run("coach response", "generate_coach_response", prompt)

    def evaluate_assessment_batch(self, payload: dict) -> AIBatchEvaluationDraft:
        return self._run("assessment batch evaluation", "evaluate_assessment_batch", payload)
