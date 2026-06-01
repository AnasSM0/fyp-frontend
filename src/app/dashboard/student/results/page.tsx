"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  CheckCircle2, TrendingUp, Brain, ChevronDown, ChevronUp,
  ArrowRight, Zap, RefreshCw,
  Share2, Target, Users
} from "lucide-react";
import { useDemoState } from "@/components/providers/demo-provider";
import { RagDebugPanel } from "@/components/debug/rag-debug-panel";
import { DEMO_PRESETS } from "@/lib/demo-data";
import { AnimatedCounter, ScoreBar } from "@/components/ui/animated-counter";
import { useMarketplaceStore } from "@/store/useMarketplaceStore";
import {
  canUseEmbeddingDemoFallback,
  getCandidateEmbeddingStatus,
} from "@/lib/api/embedding-service";
import {
  canUseEvaluationDemoFallback,
  evaluationErrorMessage,
  evaluationRetryAfterSeconds,
  evaluationUnavailableDetails,
  generateEvaluationReport,
  getEvaluationReportBySession,
  getLatestEvaluationReport,
  isAiEvaluationUnavailable,
  isEvaluationReportMissing,
  isReportGenerationInProgress,
  publishEvaluationReport,
} from "@/lib/api/evaluation-service";
import { CandidateEmbeddingStatus, CandidateProfile, EvaluationReportDetail } from "@/lib/api/types";
import { reportToResultsDisplayData } from "@/lib/report-display-adapter";
import {
  canUseProfileDemoFallback,
  getCandidateProfile,
} from "@/lib/api/profile-service";

function questionRubricMetadata(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const question = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      question: typeof question.question_text === "string" ? question.question_text : `Question ${index + 1}`,
      rubric_document_ids: question.rubric_document_ids,
      rubric_titles: question.rubric_titles,
    };
  });
}

type ReportLoadState = "loading" | "analyzing" | "ready" | "fallback" | "empty" | "error";
type PublishState = "idle" | "publishing" | "success" | "error";

const reportGenerationRequests = new Map<string, Promise<EvaluationReportDetail>>();
const reportGenerationAttemptedSessions = new Set<string>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function clampScore(value: unknown, fallback = 0): number {
  const score = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function resultStatus(score: number) {
  if (score >= 80) {
    return {
      label: "Strong",
      eligibility: "Eligible to publish",
      tone: "text-emerald-700 bg-emerald-500/10 border-emerald-500/25 dark:text-emerald-300",
      summary: "You are showing a strong verified signal for junior-to-mid opportunities.",
    };
  }
  if (score >= 60) {
    return {
      label: "Passed",
      eligibility: "Eligible to publish",
      tone: "text-violet-700 bg-violet-500/10 border-violet-500/25 dark:text-violet-300",
      summary: "You are hire-ready for junior roles, with clear areas to keep improving.",
    };
  }
  return {
    label: "Needs Improvement",
    eligibility: "Retake recommended",
    tone: "text-amber-700 bg-amber-500/10 border-amber-500/25 dark:text-amber-300",
    summary: "You have useful evidence, but should strengthen weak areas before publishing widely.",
  };
}

function scoreExplanation(label: string, score: number): string {
  const band = score >= 80 ? "strong" : score >= 60 ? "solid" : "needs more evidence";
  const explanations: Record<string, string> = {
    "Technical Accuracy": `Your technical answer quality is ${band}.`,
    "Problem Solving": `Your approach to breaking down problems is ${band}.`,
    "System Design": `Your design tradeoff and architecture evidence is ${band}.`,
    Communication: `Your explanation clarity is ${band}.`,
    "Code Quality": `Your code structure and implementation evidence is ${band}.`,
    Integrity: `Your assessment integrity signal is ${band}.`,
    "AI Integrity": `Your assessment integrity signal is ${band}.`,
  };
  return explanations[label] ?? `This area is ${band}.`;
}

function questionReviews(
  report: EvaluationReportDetail | null,
  data: {
    overallScore: number;
    transcript: readonly { q: string; score: number; summary: string; ai: string }[];
  }
) {
  const raw = Array.isArray(report?.report_json.question_wise_scores)
    ? report?.report_json.question_wise_scores
    : [];
  if (raw.length) {
    return raw.map((item, index) => {
      const question = asRecord(item);
      const evaluation = asRecord(question.evaluation);
      const answerStatus = typeof question.answer_status === "string" ? question.answer_status : "answered";
      const covered = asStringArray(evaluation.expected_concepts_covered);
      const missing = asStringArray(evaluation.missing_concepts);
      const feedback = typeof evaluation.short_feedback === "string"
        ? evaluation.short_feedback
        : "Reviewed against the assessment rubric.";
      const scoreParts = [
        evaluation.technical_accuracy,
        evaluation.problem_solving,
        evaluation.communication_clarity,
        evaluation.reasoning_depth,
        evaluation.code_quality,
      ].filter((value): value is number => typeof value === "number");
      const score = clampScore(
        scoreParts.length
          ? scoreParts.reduce((sum, value) => sum + value, 0) / scoreParts.length
          : data.overallScore,
        data.overallScore
      );
      return {
        question: typeof question.question_text === "string" ? question.question_text : `Question ${index + 1}`,
        score,
        skill: typeof question.category === "string" ? question.category.replaceAll("_", " ") : "Assessment skill",
        wentWell: answerStatus === "answered"
          ? (covered.length ? covered.join(", ") : feedback)
          : "Insufficient response provided.",
        missing: missing.length ? missing.join(", ") : answerStatus.replaceAll("_", " "),
        improve: answerStatus !== "answered"
          ? "Review the expected concepts and attempt a complete answer before retaking."
          : missing.length
          ? `Practice ${missing.slice(0, 2).join(" and ")} with a concrete example.`
          : "Keep giving specific examples and explain tradeoffs clearly.",
      };
    });
  }

  return data.transcript.map((item, index) => ({
    question: item.q || `Question ${index + 1}`,
    score: item.score,
    skill: "Assessment skill",
    wentWell: item.summary,
    missing: item.ai,
    improve: "Use concrete examples, name tradeoffs, and connect the answer to the role.",
  }));
}

function frontendProviderDebugMetadata(extra: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return extra;
  const explicitlySelected = window.localStorage.getItem("dev_ai_provider_explicit") === "true";
  const selectedProvider = explicitlySelected ? (window.localStorage.getItem("dev_ai_provider") || "").trim() : "";
  return {
    frontend_selected_provider: selectedProvider || "backend-default",
    frontend_provider_header_sent: Boolean(selectedProvider && explicitlySelected),
    ...extra,
  };
}

async function pollReportBySession(
  sessionId: string,
  shouldCancel: () => boolean
): Promise<EvaluationReportDetail | null> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await sleep(2500);
    if (shouldCancel()) return null;
    try {
      return await getEvaluationReportBySession(sessionId);
    } catch (error) {
      if (!isEvaluationReportMissing(error)) throw error;
    }
  }
  return null;
}

export default function ResultsPage() {
  const { performance } = useDemoState();
  const { profilePublished, publishProfile, markReportReviewed } = useMarketplaceStore();
  const [backendReport, setBackendReport] = useState<EvaluationReportDetail | null>(null);
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null);
  const [embeddingStatus, setEmbeddingStatus] = useState<CandidateEmbeddingStatus | null>(null);
  const [reportLoadState, setReportLoadState] = useState<ReportLoadState>("loading");
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [publishState, setPublishState] = useState<PublishState>("idle");
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [openQ, setOpenQ] = useState<number | null>(null);
  const [reportShared, setReportShared] = useState(false);
  const [reportCanRetry, setReportCanRetry] = useState(false);
  const [reportRetryAfterSeconds, setReportRetryAfterSeconds] = useState<number | null>(null);
  const [reportRetryNonce, setReportRetryNonce] = useState(0);
  const [reportDebugInfo, setReportDebugInfo] = useState<Record<string, unknown> | null>(null);
  const retryInFlightRef = useRef(false);

  const isDemoFallbackReport = reportLoadState === "fallback";
  const backendDisplayData = backendReport ? reportToResultsDisplayData(backendReport) : null;
  const data = backendDisplayData ?? (isDemoFallbackReport ? DEMO_PRESETS[performance] : null);
  const effectiveProfilePublished = backendReport ? backendReport.published : isDemoFallbackReport ? profilePublished : false;
  const ringColor = data ? (data.overallScore >= 80 ? "#8b5cf6" : data.overallScore >= 60 ? "#f59e0b" : "#f43f5e") : "#8b5cf6";
  const decisionTrace = data
    ? data.performance.slice(0, 3).map((item, index) => ({
        label: item.label,
        weight: index === 0 ? "60%" : index === 1 ? "20%" : "10%",
        reasoning:
          data.transcript[index]?.ai ??
          data.strengths[index] ??
          "Backend report evidence contributes to this verified score.",
        status: backendReport ? "Backend verified" : "Demo fallback",
      }))
    : [];
  const reportDebugMetadata = backendReport
    ? {
        provider_metadata: backendReport.report_json.provider_metadata,
        rubric_retrieval_summary: backendReport.report_json.rubric_retrieval_summary,
        rubric_document_ids_used: backendReport.report_json.rubric_document_ids_used,
        question_rubrics: questionRubricMetadata(backendReport.report_json.question_wise_scores),
        embedding_status: embeddingStatus
          ? {
              has_embedding: embeddingStatus.has_embedding,
              profile_visible: embeddingStatus.profile_visible,
              latest_published_report_id: embeddingStatus.latest_published_report_id,
              embedding_provider: embeddingStatus.embedding?.embedding_provider,
              embedding_model: embeddingStatus.embedding?.embedding_model,
              embedding_dimensions: embeddingStatus.embedding?.embedding_dimensions,
              fallback_used: embeddingStatus.embedding?.fallback_used,
            }
          : null,
      }
    : null;

  useEffect(() => {
    let cancelled = false;

    async function loadReport() {
      setReportLoadState("loading");
      setReportMessage(null);
      setReportCanRetry(false);
      setReportRetryAfterSeconds(null);
      setReportDebugInfo(frontendProviderDebugMetadata({ status: "loading" }));

      try {
        const sessionId = new URLSearchParams(window.location.search).get("sessionId");
        let report: EvaluationReportDetail | null = null;

        if (sessionId) {
          try {
            report = await getEvaluationReportBySession(sessionId);
          } catch (error) {
            if (!isEvaluationReportMissing(error)) throw error;
            if (cancelled) return;
            setReportLoadState("analyzing");
            setReportMessage("Analyzing assessment answers and generating your verified AI report...");
            let generationRequest = reportGenerationRequests.get(sessionId);
            if (!generationRequest) {
              if (reportGenerationAttemptedSessions.has(sessionId)) {
                setBackendReport(null);
                setReportLoadState("error");
                setReportCanRetry(true);
                setReportMessage("Report generation was already requested for this session. Use Retry to request it again.");
                setReportDebugInfo(frontendProviderDebugMetadata({
                  source: "results_page",
                  session_id: sessionId,
                  duplicate_generate_blocked: true,
                  generation_in_flight: false,
                }));
                return;
              }
              reportGenerationAttemptedSessions.add(sessionId);
              generationRequest = generateEvaluationReport(sessionId, false, "results_page").finally(() => {
                reportGenerationRequests.delete(sessionId);
              });
              reportGenerationRequests.set(sessionId, generationRequest);
              setReportDebugInfo(frontendProviderDebugMetadata({
                source: "results_page",
                session_id: sessionId,
                duplicate_generate_blocked: false,
                generation_in_flight: true,
              }));
            } else {
              setReportDebugInfo(frontendProviderDebugMetadata({
                source: "results_page",
                session_id: sessionId,
                duplicate_generate_blocked: true,
                generation_in_flight: true,
              }));
            }
            try {
              report = await generationRequest;
            } catch (generationError) {
              if (!isReportGenerationInProgress(generationError)) throw generationError;
              if (cancelled) return;
              setReportLoadState("analyzing");
              setReportMessage("Report generation is in progress. Checking for the completed backend report...");
              report = await pollReportBySession(sessionId, () => cancelled);
              if (!report) throw generationError;
            }
          }
        } else {
          report = await getLatestEvaluationReport();
          if (!report) {
            if (cancelled) return;
            setBackendReport(null);
            setReportLoadState("empty");
            setReportMessage("No assessment report yet. Complete an assessment to generate your verified backend report.");
            return;
          }
        }

        if (cancelled) return;
        setBackendReport(report);
        setReportLoadState("ready");
        setReportMessage(null);
        setReportDebugInfo(frontendProviderDebugMetadata({
          status: "ready",
          session_id: report.session_id,
          actual_provider: asRecord(report.report_json.provider_metadata).actual_provider,
          model: asRecord(report.report_json.provider_metadata).model,
        }));
        markReportReviewed();
        if (report.published) publishProfile();
      } catch (error) {
        if (cancelled) return;
        if (isEvaluationReportMissing(error)) {
          setBackendReport(null);
          setReportLoadState("empty");
          setReportMessage("No assessment report yet. Start an assessment to generate your verified backend report.");
          return;
        }
        if (isAiEvaluationUnavailable(error)) {
          const retryAfter = evaluationRetryAfterSeconds(error);
          const details = evaluationUnavailableDetails(error);
          setBackendReport(null);
          setReportLoadState("error");
          setReportCanRetry(true);
          setReportRetryAfterSeconds(retryAfter);
          setReportMessage(evaluationErrorMessage(error));
          setReportDebugInfo(frontendProviderDebugMetadata({
            status_code: asRecord(details).status_code ?? 429,
            reason: details.reason,
            provider: details.provider,
            model: details.model,
            retry_after_seconds: details.retry_after_seconds,
            retryable: details.retryable,
            generation_in_flight: false,
          }));
          return;
        }
        if (isReportGenerationInProgress(error)) {
          setBackendReport(null);
          setReportLoadState("analyzing");
          setReportMessage(evaluationErrorMessage(error));
          return;
        }
        if (canUseEvaluationDemoFallback(error)) {
          setBackendReport(null);
          setReportLoadState("fallback");
          setReportMessage("Backend unavailable. Demo fallback mode is showing local report data.");
          markReportReviewed();
          return;
        }
        setReportLoadState("error");
        setReportMessage(evaluationErrorMessage(error));
      }
    }

    loadReport();

    return () => {
      cancelled = true;
    };
  }, [markReportReviewed, publishProfile, reportRetryNonce]);

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      try {
        const profile = await getCandidateProfile();
        if (!cancelled) setCandidateProfile(profile);
      } catch (error) {
        if (!cancelled && !canUseProfileDemoFallback(error)) {
          setCandidateProfile(null);
        }
      }
    }
    loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePublishReport = async () => {
    if (publishState === "publishing") return;
    setPublishState("publishing");
    setPublishMessage(null);

    if (!backendReport) {
      if (isDemoFallbackReport) {
        publishProfile();
        setPublishState("success");
        setPublishMessage("Demo fallback profile published locally because the backend is unavailable.");
        return;
      }
      setPublishState("error");
      setPublishMessage("No backend report is available to publish. Complete an assessment first.");
      return;
    }

    try {
      const response = await publishEvaluationReport(backendReport.id);
      setBackendReport(response.report);
      publishProfile();
      setPublishState("success");
      setPublishMessage("Your verified profile is published and ready for recruiter discovery.");

      try {
        const status = await getCandidateEmbeddingStatus();
        setEmbeddingStatus(status);
      } catch (error) {
        if (!canUseEmbeddingDemoFallback(error)) {
          setPublishMessage("Profile published. Discovery embedding status could not be refreshed.");
        }
      }
    } catch (error) {
      if (canUseEvaluationDemoFallback(error)) {
        publishProfile();
        setPublishState("success");
        setPublishMessage("Backend unavailable. Demo fallback publish state saved locally.");
        return;
      }
      setPublishState("error");
      setPublishMessage(evaluationErrorMessage(error));
    }
  };

  const handleRetryReportGeneration = () => {
    if (retryInFlightRef.current || reportLoadState === "analyzing" || reportLoadState === "loading") return;
    const sessionId = new URLSearchParams(window.location.search).get("sessionId");
    if (sessionId) {
      reportGenerationRequests.delete(sessionId);
      reportGenerationAttemptedSessions.delete(sessionId);
      setReportDebugInfo(frontendProviderDebugMetadata({
        source: "retry_button",
        session_id: sessionId,
        generation_in_flight: true,
        duplicate_generate_blocked: false,
      }));
    }
    retryInFlightRef.current = true;
    setReportRetryNonce((value) => value + 1);
    window.setTimeout(() => {
      retryInFlightRef.current = false;
    }, 0);
  };

  if (!data) {
    const isBusy = reportLoadState === "loading" || reportLoadState === "analyzing";
    const title =
      reportLoadState === "analyzing"
        ? "Report generation in progress"
        : reportLoadState === "error"
          ? reportCanRetry && reportRetryAfterSeconds !== null
            ? "AI provider rate limit reached"
            : reportCanRetry
              ? "AI evaluation unavailable"
            : "Report needs attention"
          : "No assessment report yet";
    const description =
      reportMessage ??
      (isBusy
        ? "Loading backend assessment results."
        : "Complete an assessment to generate a verified backend report and score.");

    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg-primary)] px-6 text-[var(--color-text-primary)]">
        <div className="max-w-xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--color-accent-border)] bg-[var(--color-accent-light)] text-[var(--color-accent)]">
            {isBusy ? <RefreshCw className="h-6 w-6 animate-spin" /> : <Brain className="h-6 w-6" />}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">{description}</p>
          {reportRetryAfterSeconds !== null && (
            <p className="mt-2 text-xs font-semibold text-[var(--color-text-muted)]">
              Suggested retry window: {reportRetryAfterSeconds} seconds.
            </p>
          )}
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            {reportCanRetry && (
              <button
                type="button"
                onClick={handleRetryReportGeneration}
                disabled={reportLoadState === "analyzing" || reportLoadState === "loading"}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] px-5 py-3 text-sm font-bold text-white hover:bg-[var(--color-accent-hover)]"
              >
                <RefreshCw className="h-4 w-4" />
                Retry Report Generation
              </button>
            )}
            {!reportCanRetry && (
              <Link href="/dashboard/student/interview/prep" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] px-5 py-3 text-sm font-bold text-white hover:bg-[var(--color-accent-hover)]">
                Start Assessment
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            <Link href="/dashboard/student" className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-5 py-3 text-sm font-bold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
              Back to Dashboard
            </Link>
          </div>
          <RagDebugPanel
            title="Report Generation Debug"
            summary="Frontend provider header and report generation request state."
            className="mt-5"
            metadata={reportDebugInfo}
          />
        </div>
      </div>
    );
  }

  const status = resultStatus(data.overallScore);
  const primaryRoleFit = data.roleFit[0];
  const marketplaceEligible = data.overallScore >= 60;
  const recommendedNextSteps = backendReport
    ? asStringArray(backendReport.report_json.recommended_improvements).slice(0, 4)
    : data.weaknesses.slice(0, 3);
  const reviewItems = questionReviews(backendReport, data);
  const scoreBreakdown = [
    ...data.performance.filter((item) => item.label !== "AI Integrity"),
    { label: "Code Quality", score: data.skills.find((item) => item.label === "Code Quality")?.pct ?? backendReport?.code_quality_score ?? 0 },
    { label: "Integrity", score: backendReport?.integrity_score ?? data.performance.find((item) => item.label === "AI Integrity")?.score ?? 100 },
  ];
  const strongestSkills = data.skills
    .filter((item) => item.pct >= 65)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3)
    .map((item) => item.label);

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-6 md:py-10">
        {(reportMessage || backendDisplayData?.embeddingWarning) && (
          <div
            role={reportLoadState === "error" ? "alert" : undefined}
            className={`rounded-2xl border px-5 py-4 text-sm leading-6 ${
              reportLoadState === "error"
                ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-200"
                : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-secondary)]"
            }`}
          >
            {reportMessage && <p>{reportMessage}</p>}
            {backendDisplayData?.embeddingWarning && (
              <p className="mt-1 text-amber-700 dark:text-amber-300">
                Discovery readiness note: {backendDisplayData.embeddingWarning}
              </p>
            )}
          </div>
        )}

        <RagDebugPanel
          title="Evaluation RAG Report"
          summary="Provider metadata and rubric retrieval evidence used by backend report generation."
          className="mx-auto"
          metadata={reportDebugMetadata}
        />

        <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm md:p-8">
          <div className="grid gap-8 lg:grid-cols-[260px_1fr] lg:items-center">
            <div className="mx-auto flex flex-col items-center text-center">
              <div className="relative">
                <svg width="190" height="190" viewBox="0 0 200 200" aria-label={`Verified score ${data.overallScore} out of 100`}>
                  <circle cx="100" cy="100" r="85" fill="none" stroke="var(--color-border)" strokeWidth="12" />
                  <motion.circle
                    cx="100"
                    cy="100"
                    r="85"
                    fill="none"
                    stroke={ringColor}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 85}`}
                    initial={{ strokeDashoffset: 2 * Math.PI * 85 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 85 * (1 - data.overallScore / 100) }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-mono text-5xl font-bold"><AnimatedCounter value={data.overallScore} /></span>
                  <span className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">/ 100</span>
                </div>
              </div>
              <span className={`mt-4 rounded-full border px-3 py-1 text-xs font-bold ${status.tone}`}>
                {status.label}
              </span>
            </div>

            <div className="space-y-6">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--color-accent-border)] bg-[var(--color-accent-light)] px-3 py-1 text-xs font-bold text-[var(--color-accent)]">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Assessment Result
                </div>
                <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
                  You scored {data.overallScore}/100
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--color-text-secondary)] md:text-lg">
                  {status.summary} {data.summary}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Role Fit</div>
                  <div className="mt-2 text-lg font-bold">{primaryRoleFit?.role ?? candidateProfile?.target_role ?? "Verified candidate"}</div>
                  <div className="mt-1 text-sm text-[var(--color-text-secondary)]">{primaryRoleFit ? `${primaryRoleFit.pct}% match` : "Based on your report"}</div>
                </div>
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Marketplace</div>
                  <div className="mt-2 text-lg font-bold">{marketplaceEligible ? "Eligible" : "Retake recommended"}</div>
                  <div className="mt-1 text-sm text-[var(--color-text-secondary)]">{status.eligibility}</div>
                </div>
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Profile Status</div>
                  <div className="mt-2 text-lg font-bold">{effectiveProfilePublished ? "Published" : "Not published"}</div>
                  <div className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    {effectiveProfilePublished ? "Visible to recruiters" : "Ready when you publish"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm md:p-8">
          <div className="mb-6">
            <div className="text-xs font-bold uppercase tracking-widest text-[var(--color-accent)]">Score Breakdown</div>
            <h2 className="mt-2 text-2xl font-bold">What your score means</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {scoreBreakdown.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.04 }}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="font-semibold">{item.label === "AI Integrity" ? "Integrity" : item.label}</span>
                  <span className="font-mono text-lg font-bold text-[var(--color-accent)]"><AnimatedCounter value={item.score} />%</span>
                </div>
                <ScoreBar pct={item.score} color="from-violet-500 to-indigo-500" delay={index * 0.05} />
                <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
                  {scoreExplanation(item.label, item.score)}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm md:p-8">
            <div className="mb-6">
              <div className="text-xs font-bold uppercase tracking-widest text-[var(--color-accent)]">Skill Breakdown</div>
              <h2 className="mt-2 text-2xl font-bold">Verified skills</h2>
            </div>
            <div className="space-y-5">
              {data.skills.map((skill, index) => (
                <div key={skill.label}>
                  <div className="mb-2 flex justify-between gap-4">
                    <span className="text-sm font-semibold">{skill.label}</span>
                    <span className="font-mono text-sm font-bold text-[var(--color-accent)]"><AnimatedCounter value={skill.pct} />%</span>
                  </div>
                  <ScoreBar pct={skill.pct} color={skill.color} delay={index * 0.05} />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm md:p-8">
            <div className="mb-6">
              <div className="text-xs font-bold uppercase tracking-widest text-[var(--color-accent)]">Role Fit</div>
              <h2 className="mt-2 text-2xl font-bold">Best matching roles</h2>
            </div>
            <div className="space-y-4">
              {data.roleFit.map((role, index) => (
                <div key={role.role} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-accent-border)] bg-[var(--color-accent-light)] text-[var(--color-accent)]">
                      <Target className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate font-semibold">{role.role}</span>
                        <span className="font-mono text-sm font-bold text-[var(--color-accent)]">{role.pct}%</span>
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)]">{role.badge}</div>
                    </div>
                  </div>
                  <ScoreBar pct={role.pct} color={index === 0 ? "from-violet-500 to-indigo-500" : "from-slate-400 to-slate-500"} delay={index * 0.08} />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
              Your Strengths
            </h2>
            <div className="space-y-3">
              {data.strengths.map((text, index) => (
                <p key={index} className="rounded-2xl border border-emerald-500/15 bg-[var(--color-card)] p-4 text-sm leading-6 text-[var(--color-text-secondary)]">
                  {text}
                </p>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
              <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-300" />
              Areas to Improve
            </h2>
            <div className="space-y-3">
              {data.weaknesses.map((text, index) => (
                <p key={index} className="rounded-2xl border border-amber-500/15 bg-[var(--color-card)] p-4 text-sm leading-6 text-[var(--color-text-secondary)]">
                  {text}
                </p>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-bold">Recommended Next Steps</h2>
            <div className="space-y-3">
              {recommendedNextSteps.length ? recommendedNextSteps.map((text, index) => (
                <div key={index} className="flex gap-3 rounded-2xl bg-[var(--color-bg-secondary)] p-4 text-sm leading-6 text-[var(--color-text-secondary)]">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <span>{text}</span>
                </div>
              )) : (
                <p className="text-sm leading-6 text-[var(--color-text-secondary)]">
                  Keep practicing role-specific examples and explain your decisions clearly.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm md:p-8">
          <div className="mb-6">
            <div className="text-xs font-bold uppercase tracking-widest text-[var(--color-accent)]">Question Review</div>
            <h2 className="mt-2 text-2xl font-bold">How you performed question by question</h2>
          </div>
          <div className="space-y-4">
            {reviewItems.map((item, index) => {
              const open = openQ === index;
              return (
                <div key={index} className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                  <button
                    onClick={() => setOpenQ(open ? null : index)}
                    className="flex w-full items-start gap-4 px-5 py-4 text-left"
                  >
                    <span className="mt-0.5 font-mono text-xs font-bold text-[var(--color-accent)]">Q{index + 1}</span>
                    <span className="flex-1 text-sm font-semibold leading-6">{item.question}</span>
                    <span className="shrink-0 font-mono text-sm font-bold text-[var(--color-accent)]">{item.score}/100</span>
                    {open ? <ChevronUp className="mt-0.5 h-4 w-4 text-[var(--color-text-muted)]" /> : <ChevronDown className="mt-0.5 h-4 w-4 text-[var(--color-text-muted)]" />}
                  </button>
                  <AnimatePresence>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden border-t border-[var(--color-border)]"
                      >
                        <div className="grid gap-4 p-5 md:grid-cols-2">
                          <div className="rounded-2xl bg-[var(--color-card)] p-4">
                            <div className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">Skill tested</div>
                            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{item.skill}</p>
                          </div>
                          <div className="rounded-2xl bg-[var(--color-card)] p-4">
                            <div className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">What went well</div>
                            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{item.wentWell}</p>
                          </div>
                          <div className="rounded-2xl bg-[var(--color-card)] p-4">
                            <div className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">What was missing</div>
                            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{item.missing}</p>
                          </div>
                          <div className="rounded-2xl bg-[var(--color-card)] p-4">
                            <div className="text-xs font-bold uppercase tracking-wide text-[var(--color-text-muted)]">How to improve</div>
                            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{item.improve}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm md:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--color-accent-border)] bg-[var(--color-accent-light)] text-[var(--color-accent)]">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-[var(--color-accent)]">How Your Score Was Calculated</div>
                <h2 className="text-xl font-bold">Main score inputs</h2>
              </div>
            </div>
            <div className="space-y-4">
              {decisionTrace.map((trace, index) => (
                <div key={index} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="font-semibold">{trace.label}</span>
                    <span className="text-xs font-bold text-[var(--color-accent)]">Weight {trace.weight}</span>
                  </div>
                  <p className="text-sm leading-6 text-[var(--color-text-secondary)]">{trace.reasoning}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm md:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--color-accent-border)] bg-[var(--color-accent-light)] text-[var(--color-accent)]">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-[var(--color-accent)]">Recruiter Preview</div>
                <h2 className="text-xl font-bold">How recruiters will see this result</h2>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Candidate</div>
                <div className="mt-2 font-bold">{candidateProfile?.full_name ?? "Candidate"}</div>
                <div className="mt-1 text-sm text-[var(--color-text-secondary)]">{candidateProfile?.target_role ?? primaryRoleFit?.role ?? "Verified candidate"}</div>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Verified Score</div>
                <div className="mt-2 font-mono text-2xl font-bold text-[var(--color-accent)]">{data.overallScore}/100</div>
                <div className="mt-1 text-sm text-[var(--color-text-secondary)]">{data.fit}</div>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Strongest skills</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(strongestSkills.length ? strongestSkills : data.strengths.slice(0, 2)).map((skill) => (
                    <span key={skill} className="rounded-full bg-[var(--color-accent-light)] px-3 py-1 text-xs font-bold text-[var(--color-accent)]">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Improvement areas</div>
                <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                  {data.weaknesses.slice(0, 2).join(" ")}
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-[var(--color-accent-border)] bg-[var(--color-accent-light)] p-4 text-sm leading-6 text-[var(--color-text-secondary)]">
              <strong className="text-[var(--color-text-primary)]">Hiring recommendation:</strong>{" "}
              {marketplaceEligible
                ? "Good candidate to review for junior opportunities that match the role fit above."
                : "Candidate should improve weak areas and retake before broad marketplace promotion."}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-center shadow-sm md:p-10">
          <div className="text-xs font-bold uppercase tracking-widest text-[var(--color-accent)]">
            {marketplaceEligible ? "Next step" : "Recommended action"}
          </div>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            {marketplaceEligible ? "Publish your verified profile" : "Improve and retake the assessment"}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)] md:text-base">
            {marketplaceEligible
              ? "Publishing makes your verified result discoverable to recruiters looking for candidates with matching skills."
              : "Review the weak areas, practice targeted examples, and retake when you can show stronger evidence."}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handlePublishReport}
              disabled={
                !marketplaceEligible ||
                publishState === "publishing" ||
                effectiveProfilePublished ||
                reportLoadState === "loading" ||
                reportLoadState === "analyzing" ||
                reportLoadState === "error"
              }
              className="inline-flex items-center gap-2.5 rounded-2xl bg-[var(--color-accent)] px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Zap className="h-4 w-4" />
              {publishState === "publishing" ? "Publishing..." : effectiveProfilePublished ? "Profile Published" : "Publish Profile"}
              <ArrowRight className="h-4 w-4" />
            </motion.button>
            <Link href="/dashboard/student/interview/prep" className="inline-flex items-center gap-2.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-6 py-3 text-sm font-bold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-accent-border)]">
              <RefreshCw className="h-4 w-4" />
              Retake Assessment
            </Link>
            <Link href="/dashboard/student/results/post-mortem" className="inline-flex items-center gap-2.5 rounded-2xl border border-[var(--color-accent-border)] bg-[var(--color-accent-light)] px-6 py-3 text-sm font-bold text-[var(--color-accent)] transition-colors hover:bg-[var(--color-accent-soft)]">
              <Brain className="h-4 w-4" />
              Review Weak Areas
            </Link>
            <button
              onClick={() => setReportShared(true)}
              className="inline-flex items-center gap-2.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-6 py-3 text-sm font-bold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-accent-border)]"
            >
              <Share2 className="h-4 w-4" />
              {reportShared ? "Share Link Ready" : "Share Report"}
            </button>
          </div>
          {(effectiveProfilePublished || reportShared || publishMessage) && (
            <div className="mt-6 flex flex-col items-center gap-4">
              <p className={`text-sm font-medium ${publishState === "error" ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"}`}>
                {publishMessage ??
                  (effectiveProfilePublished
                    ? embeddingStatus?.has_embedding
                      ? "Your verified profile is visible to recruiters and discovery data is ready."
                      : "Your verified profile is visible to recruiters."
                    : "Share link prepared.")}
              </p>
              {effectiveProfilePublished && (
                <div className="flex flex-wrap justify-center gap-3">
                  <Link href="/dashboard/student/visibility" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-200">
                    Manage Profile Visibility
                  </Link>
                  <Link href="/dashboard/student/requests" className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2 text-sm font-bold text-[var(--color-text-primary)] hover:border-[var(--color-accent-border)]">
                    Review Recruiter Requests
                  </Link>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
