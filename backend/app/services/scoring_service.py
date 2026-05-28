from statistics import mean

from app.models.assessment import AssessmentAnswer
from app.models.profile import CandidateProfile
from app.schemas.evaluation import AIAnswerEvaluation, AIProjectQualityEvaluation


def clamp_score(value: float) -> int:
    return int(round(max(0, min(100, value))))


def normalize_gpa(gpa: float | None) -> tuple[int, str]:
    if gpa is None:
        return 70, "missing_neutral_fallback"
    if gpa <= 4.0:
        return clamp_score((gpa / 4.0) * 100), "gpa_4_scale"
    if gpa <= 10.0:
        return clamp_score((gpa / 10.0) * 100), "gpa_10_scale"
    return 70, "invalid_neutral_fallback"


def capped_project_quality(profile: CandidateProfile, raw_score: int) -> tuple[int, str]:
    has_links = bool(profile.portfolio_url or profile.linkedin_url or profile.resume_url)
    has_profile_evidence = bool(profile.target_role and profile.skills and profile.tech_stack)
    if not has_links and not has_profile_evidence:
        return min(raw_score, 55), "weak_profile_cap_55"
    if not has_links:
        return min(raw_score, 55), "missing_project_links_cap_55"
    return min(raw_score, 75), "profile_metadata_only_cap_75"


def average(values: list[int], fallback: int = 70) -> int:
    return clamp_score(mean(values)) if values else fallback


def answer_requires_code(answer: AssessmentAnswer) -> bool:
    question = answer.assessment_question
    question_type = (question.question_type or "").lower()
    category = (question.category or "").lower()
    scoring_rubric = question.scoring_rubric or {}
    execution = scoring_rubric.get("execution") if isinstance(scoring_rubric, dict) else {}
    return bool(
        answer.code_text
        or question_type in {"coding", "debugging"}
        or any(token in category for token in ["coding", "debugging", "implementation", "code"])
        or (isinstance(execution, dict) and execution.get("execution_supported"))
    )


def aggregate_answer_scores(
    answers: list[AssessmentAnswer],
    evaluations: list[AIAnswerEvaluation],
) -> dict[str, int]:
    technical_score = average([item.technical_accuracy for item in evaluations])
    communication_score = average([item.communication_clarity for item in evaluations])
    problem_solving_score = average([item.problem_solving for item in evaluations])
    reasoning_score = average([item.reasoning_depth for item in evaluations])
    code_quality_score = average(
        [item.code_quality for answer, item in zip(answers, evaluations) if answer_requires_code(answer)],
        fallback=70,
    )
    system_design_scores = [
        item.reasoning_depth
        for answer, item in zip(answers, evaluations)
        if answer.assessment_question.category == "system_design"
    ]
    system_design_score = average(
        system_design_scores,
        fallback=clamp_score((technical_score + problem_solving_score + reasoning_score) / 3),
    )
    ai_test_score = clamp_score(
        0.35 * technical_score
        + 0.25 * problem_solving_score
        + 0.15 * reasoning_score
        + 0.15 * system_design_score
        + 0.10 * code_quality_score
    )
    return {
        "ai_test_score": ai_test_score,
        "technical_score": technical_score,
        "communication_score": communication_score,
        "problem_solving_score": problem_solving_score,
        "system_design_score": system_design_score,
        "code_quality_score": code_quality_score,
    }


def calculate_verified_score(
    ai_test_score: int,
    project_quality: AIProjectQualityEvaluation,
    communication_score: int,
    academic_score: int,
    integrity_score: int = 100,
) -> int:
    integrity_penalty = 0
    if integrity_score < 90:
        integrity_penalty = 3
    if integrity_score < 75:
        integrity_penalty = 8
    if integrity_score < 60:
        integrity_penalty = 15
    return clamp_score(
        0.60 * ai_test_score
        + 0.20 * project_quality.project_quality_score
        + 0.10 * communication_score
        + 0.10 * academic_score
        - integrity_penalty
    )
