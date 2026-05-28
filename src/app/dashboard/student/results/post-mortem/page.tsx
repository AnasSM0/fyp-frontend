"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Loader2,
  MessageSquareText,
  RefreshCcw,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";
import { RagDebugPanel } from "@/components/debug/rag-debug-panel";
import {
  coachEvaluationReport,
  evaluationErrorMessage,
  getLatestEvaluationReport,
  isEvaluationReportMissing,
} from "@/lib/api/evaluation-service";
import {
  CoachPromptType,
  EvaluationCoachResponse,
  EvaluationReportDetail,
} from "@/lib/api/types";
import { reportToResultsDisplayData } from "@/lib/report-display-adapter";
import { cn } from "@/lib/utils";

type ScoreKey =
  | "technical_score"
  | "problem_solving_score"
  | "system_design_score"
  | "communication_score"
  | "code_quality_score"
  | "integrity_score";

interface WeakArea {
  key: ScoreKey;
  skill: string;
  score: number;
  problem: string;
  whyItMatters: string;
  improveBy: string;
  practice: string[];
}

interface QuestionFeedback {
  id: string;
  question: string;
  score: number;
  answerStatus: string;
  skill: string;
  wentWell: string[];
  missing: string[];
  improve: string;
  codeRunner?: string | null;
}

const SCORE_LABELS: Record<ScoreKey, string> = {
  technical_score: "Technical Accuracy",
  problem_solving_score: "Problem Solving",
  system_design_score: "System Design",
  communication_score: "Communication",
  code_quality_score: "Code Quality",
  integrity_score: "Integrity",
};

const COACH_PROMPTS: Array<{ type: CoachPromptType; label: string }> = [
  { type: "explain_weakest_question", label: "Explain my weakest question" },
  { type: "practice_questions", label: "Generate practice questions" },
  { type: "code_quality_help", label: "Improve my code quality" },
  { type: "study_plan", label: "Create a 7-day study plan" },
  { type: "rewrite_weak_answer", label: "Rewrite a weak answer" },
];

function clampScore(value: unknown, fallback = 0): number {
  const score = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function readStringArray(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return fallback;
  const items = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  return items.length ? items : fallback;
}

function scoreStatus(score: number): string {
  if (score >= 80) return "Strong";
  if (score >= 65) return "Passed";
  if (score >= 45) return "Needs Focus";
  return "High Priority";
}

function estimatedTime(score: number, weakCount: number): string {
  if (score < 45 || weakCount >= 4) return "10-14 days";
  if (score < 65 || weakCount >= 3) return "7-10 days";
  return "3-5 days";
}

function retakeReadiness(score: number): string {
  if (score >= 75) return "Ready after targeted review";
  if (score >= 60) return "Practice weak areas first";
  return "Wait until the practice plan is complete";
}

function weakAreaCopy(key: ScoreKey, score: number, reportWeaknesses: string[]): Omit<WeakArea, "key" | "skill" | "score"> {
  const sharedProblem = reportWeaknesses[0] || "The report found limited evidence in this area.";
  const copy: Record<ScoreKey, Omit<WeakArea, "key" | "skill" | "score">> = {
    technical_score: {
      problem: sharedProblem,
      whyItMatters: "Recruiters need confidence that your answer is technically correct, not just directionally close.",
      improveBy: "Practice explaining the core concept, edge cases, and tradeoffs in the same answer.",
      practice: [
        "Answer one role-specific concept question in five bullets.",
        "List expected concepts before writing the final answer.",
        "Review one missed concept and explain it with a concrete example.",
      ],
    },
    problem_solving_score: {
      problem: "Your reasoning did not always show the steps from problem to solution.",
      whyItMatters: "Interviewers score how you approach ambiguity, not only the final answer.",
      improveBy: "Use a clarify, plan, implement, validate structure before giving the solution.",
      practice: [
        "Write assumptions before solving a scenario.",
        "Compare two possible approaches and pick one.",
        "Add validation checks for edge cases and failure paths.",
      ],
    },
    system_design_score: {
      problem: "Your design answers need clearer components, data flow, and failure handling.",
      whyItMatters: "System design shows whether you can reason about real product constraints.",
      improveBy: "Cover API boundaries, data storage, scaling limits, observability, and tradeoffs.",
      practice: [
        "Sketch a small feature with frontend, API, database, and auth flow.",
        "Add cache, validation, and error handling to the design.",
        "Explain one tradeoff and one alternative design.",
      ],
    },
    communication_score: {
      problem: "Some answers did not explain the why behind your decisions.",
      whyItMatters: "Clear communication helps recruiters trust your judgment during live interviews.",
      improveBy: "Use a because, tradeoff, alternative structure for every technical claim.",
      practice: [
        "Rewrite one answer with a clear opening claim.",
        "Add a tradeoff sentence to each answer.",
        "End with how you would verify the solution.",
      ],
    },
    code_quality_score: {
      problem: "Code evidence needs stronger structure, naming, and edge-case handling.",
      whyItMatters: "Working code is not enough if it is hard to read, test, or maintain.",
      improveBy: "Write smaller functions with clear inputs, outputs, validation, and tests.",
      practice: [
        "Refactor a messy function into two smaller helpers.",
        "Add empty input, duplicate value, and invalid state checks.",
        "Name variables for intent instead of implementation detail.",
      ],
    },
    integrity_score: {
      problem: "Assessment behavior signals reduced confidence in the final result.",
      whyItMatters: "Recruiters rely on verified assessments only when the session looks focused and consistent.",
      improveBy: "Retake in a quiet setup, avoid tab switching, and answer directly within the assessment.",
      practice: [
        "Prepare notes before starting, then close extra tabs.",
        "Use one focused assessment window.",
        "Spend enough time explaining each answer.",
      ],
    },
  };

  return {
    ...copy[key],
    problem: score < 50 ? copy[key].problem : sharedProblem,
  };
}

function buildWeakAreas(report: EvaluationReportDetail): WeakArea[] {
  const reportWeaknesses = readStringArray(report.report_json.weaknesses);
  const scores: Array<{ key: ScoreKey; score: number }> = [
    { key: "code_quality_score", score: clampScore(report.code_quality_score) },
    { key: "technical_score", score: clampScore(report.technical_score) },
    { key: "problem_solving_score", score: clampScore(report.problem_solving_score) },
    { key: "communication_score", score: clampScore(report.communication_score) },
    { key: "system_design_score", score: clampScore(report.system_design_score) },
    { key: "integrity_score", score: clampScore(report.integrity_score, 100) },
  ];

  return scores
    .sort((a, b) => a.score - b.score)
    .slice(0, 4)
    .map(({ key, score }) => ({
      key,
      skill: SCORE_LABELS[key],
      score,
      ...weakAreaCopy(key, score, reportWeaknesses),
    }));
}

function buildQuestionFeedback(report: EvaluationReportDetail): QuestionFeedback[] {
  const rawQuestions = Array.isArray(report.report_json.question_wise_scores)
    ? report.report_json.question_wise_scores
    : [];

  return rawQuestions.map((item, index) => {
    const question = asRecord(item);
    const evaluation = asRecord(question.evaluation);
    const status = readString(question.answer_status, "answered");
    const missing = [
      ...readStringArray(question.weaknesses),
      ...readStringArray(evaluation.missing_concepts),
    ].filter((value, itemIndex, array) => array.indexOf(value) === itemIndex);
    const covered = [
      ...readStringArray(question.strengths),
      ...readStringArray(evaluation.expected_concepts_covered),
    ].filter((value, itemIndex, array) => array.indexOf(value) === itemIndex);
    const metadata = asRecord(question.metadata);
    const latestRun = asRecord(metadata.latest_run_result);
    const runMessage = typeof latestRun.message === "string" && latestRun.message.trim()
      ? latestRun.message.trim()
      : null;

    return {
      id: readString(question.assessment_question_id, `question-${index}`),
      question: readString(question.question_text, `Question ${index + 1}`),
      score: clampScore(question.score, report.ai_test_score),
      answerStatus: status,
      skill: readString(question.category, readString(question.question_type, "Assessment Skill")).replaceAll("_", " "),
      wentWell: covered.length ? covered : status === "answered" ? ["Provided some assessment evidence."] : [],
      missing: missing.length ? missing : status === "answered" ? ["More specific evidence would strengthen this answer."] : ["A substantive answer was not provided."],
      improve: readString(question.improvement_advice, readString(evaluation.short_feedback, "Answer with clearer evidence, expected concepts, and tradeoffs.")),
      codeRunner: runMessage,
    };
  });
}

function buildPracticePlan(weakAreas: WeakArea[]): Array<{ day: string; title: string; task: string }> {
  const primary = weakAreas[0]?.skill || "Technical Accuracy";
  const secondary = weakAreas[1]?.skill || "Communication";
  return [
    { day: "Day 1", title: primary, task: weakAreas[0]?.practice[0] || "Review your weakest question and rewrite the answer." },
    { day: "Day 2", title: "Missing Concepts", task: "Study the missing concepts from your question review and write one example for each." },
    { day: "Day 3", title: secondary, task: weakAreas[1]?.practice[0] || "Practice explaining tradeoffs and alternatives clearly." },
    { day: "Day 4", title: "Role-Specific Practice", task: "Attempt two timed questions from your target role and compare against expected concepts." },
    { day: "Day 5", title: "Edge Cases", task: "Add edge cases, error states, and validation notes to previous answers." },
    { day: "Day 6", title: "Mock Assessment", task: "Complete three mixed questions without notes and review weak spots immediately." },
    { day: "Day 7", title: "Retake Check", task: "Retake only if you can cover the missing concepts without prompts." },
  ];
}

function scoreBarColor(score: number): string {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 55) return "bg-amber-500";
  return "bg-rose-500";
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 rounded-2xl bg-[var(--color-bg-secondary)] p-4 text-amber-500">
        <ClipboardList className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">No improvement plan yet</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">{message}</p>
      <Link
        href="/dashboard/student/interview/prep"
        className="mt-6 rounded-xl bg-[var(--color-accent)] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90"
      >
        Start Assessment
      </Link>
    </div>
  );
}

export default function ImprovementPlanPage() {
  const [report, setReport] = useState<EvaluationReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openQuestionId, setOpenQuestionId] = useState<string | null>(null);
  const [activePracticeArea, setActivePracticeArea] = useState<string | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachError, setCoachError] = useState<string | null>(null);
  const [coachResponse, setCoachResponse] = useState<EvaluationCoachResponse | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const coachCache = useRef(new Map<string, EvaluationCoachResponse>());

  useEffect(() => {
    let active = true;
    async function loadReport() {
      try {
        const latest = await getLatestEvaluationReport();
        if (!active) return;
        if (!latest) {
          setError("Complete an assessment and generate a report before reviewing weak areas.");
          return;
        }
        setReport(latest);
        setOpenQuestionId(null);
      } catch (err) {
        if (!active) return;
        if (isEvaluationReportMissing(err)) {
          setError("Complete an assessment and generate a report before reviewing weak areas.");
        } else {
          setError(evaluationErrorMessage(err));
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    loadReport();
    return () => {
      active = false;
    };
  }, []);

  const display = useMemo(() => (report ? reportToResultsDisplayData(report) : null), [report]);
  const weakAreas = useMemo(() => (report ? buildWeakAreas(report) : []), [report]);
  const questions = useMemo(() => (report ? buildQuestionFeedback(report) : []), [report]);
  const practicePlan = useMemo(() => buildPracticePlan(weakAreas), [weakAreas]);
  const mainWeakness = weakAreas[0];
  const secondaryWeakness = weakAreas[1];
  const estimatedImprovement = estimatedTime(report?.verified_score ?? 0, weakAreas.length);

  async function runCoachPrompt(promptType: CoachPromptType, message?: string) {
    if (!report) return;
    const cacheKey = `${report.id}:${promptType}:${message || ""}`;
    const cached = coachCache.current.get(cacheKey);
    if (cached) {
      setCoachResponse({ ...cached, cached: true });
      setCoachError(null);
      return;
    }

    setCoachLoading(true);
    setCoachError(null);
    try {
      const response = await coachEvaluationReport(report.id, {
        prompt_type: promptType,
        message: message || null,
      });
      coachCache.current.set(cacheKey, response);
      setCoachResponse(response);
    } catch (err) {
      setCoachError(evaluationErrorMessage(err));
    } finally {
      setCoachLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
        <Loader2 className="mr-3 h-5 w-5 animate-spin text-[var(--color-accent)]" />
        Loading improvement plan...
      </div>
    );
  }

  if (!report || !display || error) {
    return <ErrorState message={error || "No assessment report is available yet."} />;
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg-primary)] px-4 py-6 text-[var(--color-text-primary)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/dashboard/student/results"
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] transition hover:text-[var(--color-text-primary)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Results
          </Link>
          <div className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2 text-xs font-bold uppercase tracking-widest text-[var(--color-text-secondary)]">
            Assessment Feedback
          </div>
        </div>

        <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">
                Your Improvement Plan
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Focus on {mainWeakness?.skill || "your weakest skill"} before you retake.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--color-text-secondary)] sm:text-base">
                You scored {display.overallScore}/100. {display.summary} Your next best move is to improve{" "}
                {mainWeakness?.skill || "the lowest scoring area"} and then practice timed answers before retaking.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Main weakness", mainWeakness?.skill || "Not detected"],
                  ["Secondary weakness", secondaryWeakness?.skill || "Not detected"],
                  ["Recommended focus", mainWeakness?.improveBy || "Review weak answers and missing concepts."],
                  ["Estimated time", estimatedImprovement],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
                    <p className="text-xs font-semibold text-[var(--color-text-secondary)]">{label}</p>
                    <p className="mt-2 text-sm font-bold leading-5 text-[var(--color-text-primary)]">{value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--color-text-secondary)]">Verified Score</span>
                <span className="rounded-full bg-[var(--color-accent-light)] px-3 py-1 text-xs font-bold text-[var(--color-accent)]">
                  {scoreStatus(display.overallScore)}
                </span>
              </div>
              <div className="mt-4 flex items-end gap-2">
                <span className="text-5xl font-black">{display.overallScore}</span>
                <span className="pb-2 text-sm font-bold text-[var(--color-text-secondary)]">/100</span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--color-bg-subtle)]">
                <div className={cn("h-full rounded-full", scoreBarColor(display.overallScore))} style={{ width: `${display.overallScore}%` }} />
              </div>
              <div className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-[var(--color-text-secondary)]">Retake readiness</span>
                  <span className="text-right font-semibold">{retakeReadiness(display.overallScore)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-[var(--color-text-secondary)]">Marketplace action</span>
                  <span className="text-right font-semibold">
                    {display.overallScore >= 70 ? "Publish after review" : "Improve before publishing"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
              <div className="mb-5 flex items-center gap-3">
                <Target className="h-5 w-5 text-[var(--color-accent)]" />
                <h2 className="text-xl font-bold">Weak Areas</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {weakAreas.map((area) => (
                  <motion.article
                    key={area.key}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-bold">{area.skill}</h3>
                        <p className="mt-1 text-xs font-semibold text-[var(--color-text-secondary)]">{area.score}/100</p>
                      </div>
                      <span className={cn("rounded-full px-3 py-1 text-xs font-bold text-white", scoreBarColor(area.score))}>
                        {scoreStatus(area.score)}
                      </span>
                    </div>
                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--color-bg-subtle)]">
                      <div className={cn("h-full rounded-full", scoreBarColor(area.score))} style={{ width: `${area.score}%` }} />
                    </div>
                    <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--color-text-secondary)]">
                      <p><span className="font-bold text-[var(--color-text-primary)]">What went wrong:</span> {area.problem}</p>
                      <p><span className="font-bold text-[var(--color-text-primary)]">Why it matters:</span> {area.whyItMatters}</p>
                      <p><span className="font-bold text-[var(--color-text-primary)]">Improve by:</span> {area.improveBy}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActivePracticeArea(activePracticeArea === area.key ? null : area.key)}
                      className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
                    >
                      <BookOpen className="h-4 w-4" />
                      Practice this skill
                    </button>
                    {activePracticeArea === area.key && (
                      <ul className="mt-4 space-y-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-4 text-sm text-[var(--color-text-secondary)]">
                        {area.practice.map((item) => (
                          <li key={item} className="flex gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                  </motion.article>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
              <div className="mb-5 flex items-center gap-3">
                <ClipboardList className="h-5 w-5 text-[var(--color-accent)]" />
                <h2 className="text-xl font-bold">Question-Level Feedback</h2>
              </div>
              <div className="space-y-3">
                {questions.map((question, index) => {
                  const open = openQuestionId === question.id;
                  const weakStatus = question.answerStatus !== "answered";
                  return (
                    <article key={`${question.id}-${index}`} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                      <button
                        type="button"
                        onClick={() => setOpenQuestionId(open ? null : question.id)}
                        className="flex w-full items-start justify-between gap-4 p-5 text-left"
                      >
                        <div>
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-[var(--color-bg-subtle)] px-3 py-1 text-xs font-bold text-[var(--color-text-secondary)]">
                              Q{index + 1}
                            </span>
                            <span className="rounded-full bg-[var(--color-accent-light)] px-3 py-1 text-xs font-bold text-[var(--color-accent)]">
                              {question.skill}
                            </span>
                            {weakStatus && (
                              <span className="rounded-full bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-500">
                                {question.answerStatus.replaceAll("_", " ")}
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold leading-6">{question.question}</h3>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className="font-mono text-sm font-bold">{question.score}/100</span>
                          {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </div>
                      </button>
                      {open && (
                        <div className="grid gap-4 border-t border-[var(--color-border)] p-5 md:grid-cols-3">
                          <div>
                            <h4 className="text-sm font-bold">What went well</h4>
                            <ul className="mt-2 space-y-2 text-sm text-[var(--color-text-secondary)]">
                              {(question.wentWell.length ? question.wentWell : ["No clear strength was detected for this answer."]).map((item) => (
                                <li key={item}>- {item}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="text-sm font-bold">What was missing</h4>
                            <ul className="mt-2 space-y-2 text-sm text-[var(--color-text-secondary)]">
                              {question.missing.map((item) => (
                                <li key={item}>- {item}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="text-sm font-bold">How to improve</h4>
                            <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{question.improve}</p>
                            {question.codeRunner && (
                              <p className="mt-3 rounded-xl bg-[var(--color-bg-subtle)] p-3 text-xs font-semibold text-[var(--color-text-secondary)]">
                                Code runner: {question.codeRunner}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
              <div className="mb-5 flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-[var(--color-accent)]" />
                <h2 className="text-xl font-bold">7-Day Practice Plan</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {practicePlan.map((item) => (
                  <div key={item.day} className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-[var(--color-accent)]">{item.day}</p>
                    <h3 className="mt-2 font-bold">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">{item.task}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
              <h2 className="text-lg font-bold">Score Breakdown</h2>
              <div className="mt-5 space-y-4">
                {([
                  ["Technical Accuracy", report.technical_score],
                  ["Problem Solving", report.problem_solving_score],
                  ["System Design", report.system_design_score],
                  ["Communication", report.communication_score],
                  ["Code Quality", report.code_quality_score],
                  ["Integrity", report.integrity_score],
                ] as const).map(([label, value]) => {
                  const score = clampScore(value, label === "Integrity" ? 100 : 0);
                  return (
                    <div key={label}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-semibold">{label}</span>
                        <span className="font-mono font-bold">{score}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[var(--color-bg-subtle)]">
                        <div className={cn("h-full rounded-full", scoreBarColor(score))} style={{ width: `${score}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-[var(--color-accent)]" />
                <h2 className="text-lg font-bold">Optional AI Coach</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
                Use AI only when you want deeper help. This page does not call AI until you click a prompt.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {COACH_PROMPTS.map((prompt) => (
                  <button
                    key={prompt.type}
                    type="button"
                    disabled={coachLoading}
                    onClick={() => runCoachPrompt(prompt.type)}
                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-xs font-bold text-[var(--color-text-secondary)] transition hover:text-[var(--color-text-primary)] disabled:opacity-50"
                  >
                    {prompt.label}
                  </button>
                ))}
              </div>
              <textarea
                value={customPrompt}
                onChange={(event) => setCustomPrompt(event.target.value)}
                placeholder="Ask a specific improvement question..."
                className="mt-4 min-h-24 w-full resize-none rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 text-sm outline-none transition focus:border-[var(--color-accent)]"
              />
              <button
                type="button"
                disabled={coachLoading || !customPrompt.trim()}
                onClick={() => runCoachPrompt("custom", customPrompt.trim())}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] px-4 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {coachLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquareText className="h-4 w-4" />}
                Ask AI Coach
              </button>
              {coachError && (
                <p className="mt-3 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-500">{coachError}</p>
              )}
              {coachResponse && (
                <div className="mt-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--color-text-secondary)]">
                    {coachResponse.cached && <RefreshCcw className="h-3.5 w-3.5" />}
                    {coachResponse.cached ? "Cached coach answer" : "AI coach answer"}
                  </div>
                  <p className="whitespace-pre-line text-sm leading-6 text-[var(--color-text-secondary)]">{coachResponse.answer}</p>
                  <RagDebugPanel
                    title="Coach provider metadata"
                    metadata={coachResponse.provider_metadata}
                    className="mt-4"
                  />
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-6">
              <h2 className="text-lg font-bold">Recommended Next Action</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
                {display.overallScore >= 70
                  ? "You can publish your profile, but reviewing weak areas first will make recruiter conversations stronger."
                  : "Complete the practice plan before retaking so your next verified score reflects real improvement."}
              </p>
              <div className="mt-5 grid gap-3">
                <Link href="/dashboard/student/results" className="rounded-xl bg-[var(--color-accent)] px-4 py-3 text-center text-sm font-bold text-white">
                  Review Full Report
                </Link>
                <Link href="/dashboard/student/interview/prep" className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-3 text-center text-sm font-bold text-[var(--color-text-primary)]">
                  Retake Assessment
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
