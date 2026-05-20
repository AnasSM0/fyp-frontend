import { EvaluationReportDetail, ProviderMetadata } from "@/lib/api/types";
import { normalizeProviderMetadata } from "@/lib/candidate-view-adapters";

export interface ResultsDisplayData {
  overallScore: number;
  xlr8Score: number;
  percentile: string;
  recruiterReadiness: string;
  aiConfidence: number;
  fit: string;
  fitColor: "emerald" | "amber" | "rose";
  headline: string;
  summary: string;
  skills: Array<{ label: string; pct: number; color: string }>;
  performance: Array<{ label: string; score: number }>;
  strengths: string[];
  weaknesses: string[];
  transcript: Array<{
    q: string;
    summary: string;
    score: number;
    verdict: string;
    ai: string;
  }>;
  roleFit: Array<{ role: string; pct: number; badge: string }>;
  providerMetadata?: ProviderMetadata;
  integrityRiskLevel?: string;
  embeddingWarning?: string;
}

function clampScore(value: unknown, fallback = 0): number {
  const score = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function readStringArray(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return fallback;
  const items = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return items.length ? items : fallback;
}

function scoreGradient(score: number): string {
  if (score >= 80) return "from-violet-500 to-indigo-500";
  if (score >= 60) return "from-amber-500 to-orange-500";
  return "from-rose-500 to-red-500";
}

function verdictForScore(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Strong";
  if (score >= 65) return "Adequate";
  if (score >= 45) return "Needs Work";
  return "Insufficient";
}

function readinessForScore(score: number): string {
  if (score >= 85) return "Strong Hire";
  if (score >= 70) return "Probable Hire";
  if (score >= 50) return "Developing";
  return "Not Ready";
}

function headlineForScore(score: number): string {
  if (score >= 85) return "Verified Marketplace Ready";
  if (score >= 70) return "Strong Verified Signal";
  if (score >= 50) return "Assessment Complete";
  return "Growth Plan Required";
}

function percentileForScore(score: number): string {
  if (score >= 90) return "Top 5%";
  if (score >= 80) return "Top 15%";
  if (score >= 70) return "Top 35%";
  if (score >= 50) return "Top 60%";
  return "Needs Growth";
}

function fitColorForScore(score: number): "emerald" | "amber" | "rose" {
  if (score >= 80) return "emerald";
  if (score >= 55) return "amber";
  return "rose";
}

function fitBadgeForScore(score: number, index: number): string {
  if (score >= 90) return index === 0 ? "Top Match" : "Excellent Fit";
  if (score >= 75) return "Good Fit";
  if (score >= 50) return "Possible Fit";
  return "Not Ready";
}

function scoreFromEvaluation(evaluation: Record<string, unknown>, fallback: number): number {
  const candidates = [
    evaluation.technical_accuracy,
    evaluation.problem_solving,
    evaluation.communication_clarity,
    evaluation.reasoning_depth,
    evaluation.code_quality,
  ].filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (!candidates.length) return fallback;
  return clampScore(candidates.reduce((sum, value) => sum + value, 0) / candidates.length, fallback);
}

function buildTranscript(report: EvaluationReportDetail): ResultsDisplayData["transcript"] {
  const rawQuestions = Array.isArray(report.report_json.question_wise_scores)
    ? report.report_json.question_wise_scores
    : [];

  const transcript = rawQuestions.map((item, index) => {
    const question = asRecord(item);
    const evaluation = asRecord(question.evaluation);
    const score = scoreFromEvaluation(evaluation, report.ai_test_score);
    const covered = readStringArray(evaluation.expected_concepts_covered);
    const missing = readStringArray(evaluation.missing_concepts);
    const evidence = readStringArray(evaluation.transcript_evidence);
    const feedback = readString(evaluation.short_feedback, "AI evaluation evidence is available for this answer.");

    const aiParts = [
      feedback,
      covered.length ? `Covered: ${covered.join(", ")}.` : "",
      missing.length ? `Missing: ${missing.join(", ")}.` : "",
    ].filter(Boolean);

    return {
      q: readString(question.question_text, `Question ${index + 1}`),
      summary: evidence[0] ?? feedback,
      score,
      verdict: verdictForScore(score),
      ai: aiParts.join(" "),
    };
  });

  if (transcript.length) return transcript;

  const evidence = readStringArray(report.report_json.transcript_evidence, [
    "Assessment answers were evaluated against the curated question rubric.",
  ]);

  return evidence.slice(0, 3).map((summary, index) => ({
    q: `Assessment evidence ${index + 1}`,
    summary,
    score: clampScore(report.ai_test_score),
    verdict: verdictForScore(report.ai_test_score),
    ai: summary,
  }));
}

function buildRoleFit(report: EvaluationReportDetail): ResultsDisplayData["roleFit"] {
  const rawRoleFit = Array.isArray(report.report_json.role_fit) ? report.report_json.role_fit : [];
  const items = rawRoleFit.map((item, index) => {
    const role = asRecord(item);
    const score = clampScore(role.score ?? role.pct ?? role.match_score, report.ai_test_score);
    return {
      role: readString(role.role, index === 0 ? "Target Role" : `Role Fit ${index + 1}`),
      pct: score,
      badge: readString(role.badge, fitBadgeForScore(score, index)),
    };
  });

  if (items.length) return items;

  const score = clampScore(report.ai_test_score);
  return [{ role: "Target Role", pct: score, badge: fitBadgeForScore(score, 0) }];
}

export function reportToResultsDisplayData(report: EvaluationReportDetail): ResultsDisplayData {
  const verifiedScore = clampScore(report.verified_score);
  const technical = clampScore(report.technical_score);
  const problemSolving = clampScore(report.problem_solving_score);
  const systemDesign = clampScore(report.system_design_score);
  const communication = clampScore(report.communication_score);
  const codeQuality = clampScore(report.code_quality_score);
  const integrity = clampScore(report.integrity_score, 100);
  const integritySummary = asRecord(report.report_json.integrity_summary);
  const providerMetadata = normalizeProviderMetadata(report.report_json.provider_metadata);
  const strengths = readStringArray(report.report_json.strengths, [
    "Completed a backend-powered AI assessment with structured scoring.",
  ]);
  const growthAreas = readStringArray(report.report_json.weaknesses, [
    "Add more project evidence to strengthen recruiter confidence.",
  ]);
  const improvements = readStringArray(report.report_json.recommended_improvements);
  const weaknesses = [
    ...growthAreas,
    ...improvements.map((item) => `Next step: ${item}`),
  ].slice(0, 5);

  return {
    overallScore: verifiedScore,
    xlr8Score: Math.round(verifiedScore * 10),
    percentile: percentileForScore(verifiedScore),
    recruiterReadiness: readinessForScore(verifiedScore),
    aiConfidence: providerMetadata?.fallback_used ? 82 : 94,
    fit: verifiedScore >= 85 ? "Expert Match" : verifiedScore >= 70 ? "Probable Match" : "Developing Signal",
    fitColor: fitColorForScore(verifiedScore),
    headline: headlineForScore(verifiedScore),
    summary:
      report.recruiter_summary ||
      "Your backend-generated AI report is ready. Recruiters can use this verified evidence after you publish your profile.",
    skills: [
      { label: "Technical Accuracy", pct: technical, color: scoreGradient(technical) },
      { label: "Problem Solving", pct: problemSolving, color: scoreGradient(problemSolving) },
      { label: "System Design", pct: systemDesign, color: scoreGradient(systemDesign) },
      { label: "Code Quality", pct: codeQuality, color: scoreGradient(codeQuality) },
    ],
    performance: [
      { label: "Technical Accuracy", score: technical },
      { label: "Problem Solving", score: problemSolving },
      { label: "System Design", score: systemDesign },
      { label: "Communication", score: communication },
      { label: "AI Integrity", score: integrity },
    ],
    strengths,
    weaknesses,
    transcript: buildTranscript(report),
    roleFit: buildRoleFit(report),
    providerMetadata,
    integrityRiskLevel: readString(integritySummary.risk_level, "clean"),
    embeddingWarning: report.report_json.embedding_rebuild_warning,
  };
}

export function visibilityScoreFromReport(report: EvaluationReportDetail | null, fallback: number): number {
  if (!report) return fallback;
  const verifiedSignal = clampScore(report.verified_score);
  const integritySignal = clampScore(report.integrity_score, 100);
  return Math.max(fallback, Math.round(verifiedSignal * 0.75 + integritySignal * 0.25));
}
