from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Protocol

from pydantic import ValidationError

from app.models.assessment import AssessmentAnswer
from app.models.profile import CandidateProfile
from app.schemas.ai import OnboardingAIResponseDraft, OnboardingChatRequest, OnboardingExtractedFields
from app.schemas.evaluation import (
    AIAnswerEvaluation,
    AIFinalReportDraft,
    AIProjectQualityEvaluation,
    ProviderMetadata,
)


@dataclass
class ProviderState:
    provider: str
    model: str
    fallback_used: bool = False
    warnings: list[str] = field(default_factory=list)
    requested_provider: str | None = None
    fallback_chain: list[str] = field(default_factory=list)

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
        )


class AIProvider(Protocol):
    state: ProviderState

    def evaluate_answer(
        self, profile: CandidateProfile, answer: AssessmentAnswer
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


class ProviderOutputError(RuntimeError):
    pass


def parse_structured_output(raw_text: str, schema_type):
    try:
        return schema_type.model_validate_json(raw_text)
    except (ValidationError, ValueError, json.JSONDecodeError) as exc:
        raise ProviderOutputError("Provider returned malformed structured output") from exc


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
        self, profile: CandidateProfile, answer: AssessmentAnswer
    ) -> AIAnswerEvaluation:
        question = answer.assessment_question
        answer_text = (answer.answer_text or "").strip()
        code_text = (answer.code_text or "").strip()
        expected = question.expected_concepts or []
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
        combined = " ".join(
            [
                message,
                payload.current_profile.target_role or "",
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
            "Machine Learning",
            "LLM",
            "Docker",
            "APIs",
            "Accessibility",
        ]
        detected_skills = []
        for skill in skill_terms:
            if skill.lower().replace(".", "") in lowered.replace(".", ""):
                detected_skills.append(skill)

        inferred_role = payload.current_profile.target_role
        if any(token in lowered for token in ["react", "next", "frontend", "ui"]):
            inferred_role = inferred_role or "Frontend Engineer"
        if any(token in lowered for token in ["fastapi", "api", "postgres", "backend"]):
            inferred_role = "Full Stack Developer" if inferred_role == "Frontend Engineer" else inferred_role or "Backend Engineer"
        if any(token in lowered for token in ["machine learning", " llm", "ai/ml", "data"]):
            inferred_role = inferred_role or "AI/ML Engineer"

        inferred_experience = payload.current_profile.experience_level or "Student / Early Career"
        gpa_match = re.search(r"\bgpa\s*(?:is|:)?\s*(\d(?:\.\d+)?)\b", lowered)
        extracted_gpa = float(gpa_match.group(1)) if gpa_match else None
        urls = re.findall(r"https?://\S+", message)
        extracted = OnboardingExtractedFields(
            target_role=inferred_role,
            experience_level=inferred_experience,
            tech_stack=detected_skills,
            skills=detected_skills,
            gpa=extracted_gpa,
            portfolio_url=urls[0] if urls else None,
        )
        missing_fields = []
        profile = payload.current_profile
        for field_name in ["full_name", "university", "degree", "graduation_year", "target_role", "tech_stack"]:
            value = getattr(profile, field_name)
            if not value and not getattr(extracted, field_name, None):
                missing_fields.append(field_name)
        completion_delta = min(30, 5 * len([value for value in [inferred_role, detected_skills, extracted_gpa, urls] if value]))
        next_question = (
            "What is the strongest project you built with this stack, and what was your specific contribution?"
            if detected_skills or inferred_role
            else "What role are you targeting, and which technologies have you used most?"
        )
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
        return state

    def _provider_label(self, provider: AIProvider) -> str:
        return provider.state.provider.upper()

    def _fallback_warning(self, provider: AIProvider, operation: str, exc: Exception) -> str:
        return f"{self._provider_label(provider)} {operation} failed; trying fallback provider. {exc}"

    def _run(self, operation: str, method_name: str, *args):
        while self.active_index < len(self.providers):
            provider = self.providers[self.active_index]
            try:
                result = getattr(provider, method_name)(*args)
                self.state = self._decorate_state(provider)
                return result
            except Exception as exc:
                self.warning_history.append(self._fallback_warning(provider, operation, exc))
                self.active_index += 1
        raise ProviderOutputError(f"All AI providers failed during {operation}")

    def evaluate_answer(
        self, profile: CandidateProfile, answer: AssessmentAnswer
    ) -> AIAnswerEvaluation:
        return self._run("answer evaluation", "evaluate_answer", profile, answer)

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
