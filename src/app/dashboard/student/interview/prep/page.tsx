"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Brain,
  CheckCircle2,
  Clock,
  Code2,
  ListChecks,
  RefreshCw,
  Shield,
  UserCheck,
  WifiOff,
  Zap,
} from "lucide-react";
import { RagDebugPanel } from "@/components/debug/rag-debug-panel";
import { EASE, staggerContainer, staggerItem } from "@/lib/motion";
import {
  getLatestAssessmentSession,
  setStoredActiveAssessmentSessionId,
  startAssessmentSession,
} from "@/lib/api/assessment-service";
import { logout } from "@/lib/api/auth-service";
import { ApiError } from "@/lib/api/errors";
import { getCandidateProfile, isCandidateProfileMissing } from "@/lib/api/profile-service";
import { AssessmentSessionDetail, CandidateProfile } from "@/lib/api/types";

type PrepView =
  | "loading"
  | "ready"
  | "continue"
  | "missing_profile"
  | "auth_expired"
  | "forbidden"
  | "conflict"
  | "network"
  | "unknown";

type PrepState = {
  view: PrepView;
  title: string;
  message: string;
};

const loadingSteps = [
  "Loading profile",
  "Checking existing session",
  "Matching role and skills",
  "Preparing assessment",
];

function isActiveSession(detail: AssessmentSessionDetail | null): boolean {
  return detail?.session.status === "in_progress" || detail?.session.status === "created";
}

function sessionHasCodingQuestion(detail: AssessmentSessionDetail | null): boolean {
  if (!detail) return false;
  if (detail.questions.some((question) => question.question_type === "coding")) return true;
  const questionTypePlan = detail.session.session_plan_metadata?.question_type_plan;
  return Array.isArray(questionTypePlan) && questionTypePlan.includes("coding");
}

function isProfileReady(profile: CandidateProfile | null): boolean {
  return Boolean(
    profile?.profile_complete &&
      profile.target_role &&
      profile.tech_stack.length > 0 &&
      profile.skills.length > 0
  );
}

function apiMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError && error.message ? error.message : fallback;
}

function isTransientAssessmentPrepError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.isNetworkError || error.status === undefined || Boolean(error.status && error.status >= 500))
  );
}

async function withTransientRetry<T>(
  operation: () => Promise<T>,
  options: {
    attempts?: number;
    delayMs?: number;
    onRetry?: (attempt: number, error: unknown) => void;
  } = {}
): Promise<T> {
  const attempts = options.attempts ?? 4;
  const delayMs = options.delayMs ?? 650;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTransientAssessmentPrepError(error) || attempt >= attempts) {
        throw error;
      }
      options.onRetry?.(attempt, error);
      await new Promise((resolve) => window.setTimeout(resolve, delayMs * attempt));
    }
  }

  throw lastError;
}

function classifyBlockingError(error: unknown): PrepState {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return {
        view: "auth_expired",
        title: "Your session expired",
        message: "Please sign in again to continue your assessment.",
      };
    }
    if (error.status === 403) {
      return {
        view: "forbidden",
        title: "Assessment unavailable",
        message: "This assessment is only available to candidate accounts.",
      };
    }
    if (error.status === 404) {
      return {
        view: "missing_profile",
        title: "Complete your profile first",
        message: "We need your target role and tech stack to generate a role-specific assessment.",
      };
    }
    if (error.status === 409) {
      const message = apiMessage(error, "We could not prepare this assessment right now.");
      if (message.toLowerCase().includes("profile")) {
        return {
          view: "missing_profile",
          title: "Complete your profile first",
          message: "We need your target role, skills, and tech stack to generate a role-specific assessment.",
        };
      }
      return {
        view: "conflict",
        title: "Assessment needs attention",
        message,
      };
    }
    if (error.status === 422) {
      return {
        view: "conflict",
        title: "Assessment needs attention",
        message: apiMessage(error, "We could not prepare this assessment right now."),
      };
    }
    if (error.isNetworkError || error.status === undefined || (error.status && error.status >= 500)) {
      return {
        view: "network",
        title: "We could not load your assessment",
        message: apiMessage(error, "Backend assessment setup is temporarily unavailable. Your profile is safe."),
      };
    }
    return {
      view: "unknown",
      title: "Something went wrong",
      message: apiMessage(error, "We could not prepare your assessment. Please retry."),
    };
  }
  return {
    view: "unknown",
    title: "Something went wrong",
    message: "We could not prepare your assessment. Please retry.",
  };
}

function normalizeLabel(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function focusAreas(profile: CandidateProfile | null, session: AssessmentSessionDetail | null): string[] {
  const metadata = session?.session.session_plan_metadata ?? {};
  const categoryPlan = readStringArray(metadata.category_plan);
  if (categoryPlan.length) {
    return Array.from(new Set(categoryPlan.map((item) => normalizeLabel(item, item)))).slice(0, 6);
  }

  const stack = new Set((profile?.tech_stack ?? []).map((item) => item.toLowerCase()));
  const role = (profile?.target_role ?? "").toLowerCase();
  const areas = new Set<string>();
  if (role.includes("full") || stack.has("react") || stack.has("next.js") || stack.has("nextjs")) areas.add("Frontend");
  if (role.includes("full") || role.includes("back") || stack.has("fastapi")) areas.add("Backend API");
  if (stack.has("postgresql") || stack.has("postgres") || stack.has("sql")) areas.add("Database");
  areas.add("Debugging");
  areas.add("System Design");
  areas.add("Communication");
  return Array.from(areas).slice(0, 6);
}

function estimatedMinutes(session: AssessmentSessionDetail | null): string {
  const totalSeconds = session?.questions.reduce((sum, question) => sum + (question.time_limit_seconds || 0), 0) ?? 0;
  if (totalSeconds > 0) {
    const minutes = Math.round(totalSeconds / 60);
    return `${Math.max(30, minutes)} minutes`;
  }
  return "45-60 minutes";
}

function DetailCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <motion.div
      variants={staggerItem}
      className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3"
    >
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-500">
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">{label}</div>
      <div className="mt-1 text-sm font-bold leading-5 text-[var(--color-text-primary)]">{value}</div>
      {sub && <div className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">{sub}</div>}
    </motion.div>
  );
}

function StateIcon({ view }: { view: PrepView }) {
  if (view === "auth_expired" || view === "forbidden" || view === "conflict" || view === "unknown") {
    return <AlertCircle className="h-5 w-5" />;
  }
  if (view === "network") return <WifiOff className="h-5 w-5" />;
  if (view === "missing_profile") return <UserCheck className="h-5 w-5" />;
  return <Brain className="h-5 w-5" />;
}

function stateTone(view: PrepView) {
  if (view === "network") {
    return {
      pill: "border-red-200 bg-red-50 text-red-900 dark:border-red-800/60 dark:bg-red-950/30 dark:text-red-200",
      alert: "border-red-200 bg-red-50 text-red-900 dark:border-red-800/60 dark:bg-red-950/30 dark:text-red-200",
    };
  }
  if (view === "auth_expired" || view === "forbidden" || view === "missing_profile" || view === "conflict" || view === "unknown") {
    return {
      pill: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200",
      alert: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200",
    };
  }
  if (view === "ready" || view === "continue") {
    return {
      pill: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-200",
      alert: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-200",
    };
  }
  return {
    pill: "border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-800/60 dark:bg-violet-950/30 dark:text-violet-200",
    alert: "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-primary)]",
  };
}

export default function AssessmentSetupPage() {
  const router = useRouter();
  const [prepState, setPrepState] = useState<PrepState>({
    view: "loading",
    title: "Preparing assessment",
    message: "Loading profile",
  });
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [latestSession, setLatestSession] = useState<AssessmentSessionDetail | null>(null);
  const [loadStepIndex, setLoadStepIndex] = useState(0);
  const [stillPreparing, setStillPreparing] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const loadPrepState = useCallback(async () => {
    setPrepState({ view: "loading", title: "Preparing assessment", message: loadingSteps[0] });
    setLoadStepIndex(0);
    setStillPreparing(false);
    setProfile(null);
    setLatestSession(null);

    try {
      setLoadStepIndex(0);
      const candidateProfile = await withTransientRetry(
        () => getCandidateProfile(),
        {
          onRetry: (attempt) => {
            setPrepState({
              view: "loading",
              title: "Preparing assessment",
              message: `Loading profile again (${attempt + 1}/4)`,
            });
          },
        }
      );
      setProfile(candidateProfile);

      if (!isProfileReady(candidateProfile)) {
        setPrepState({
          view: "missing_profile",
          title: "Complete your profile first",
          message: "We need your target role, skills, and tech stack to generate a role-specific assessment.",
        });
        return;
      }

      setLoadStepIndex(1);
      let session: AssessmentSessionDetail | null = null;
      try {
        session = await withTransientRetry(
          () => getLatestAssessmentSession(),
          {
            onRetry: (attempt) => {
              setPrepState({
                view: "loading",
                title: "Preparing assessment",
                message: `Checking latest session again (${attempt + 1}/4)`,
              });
            },
          }
        );
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          session = null;
        } else {
          throw error;
        }
      }
      const activeSessionIsStale = isActiveSession(session) && !sessionHasCodingQuestion(session);
      setLatestSession(activeSessionIsStale ? null : session);

      setLoadStepIndex(2);
      setLoadStepIndex(3);

      if (isActiveSession(session) && !activeSessionIsStale) {
        setPrepState({
          view: "continue",
          title: "Continue your assessment",
          message: "You already have an assessment in progress.",
        });
        return;
      }

      setPrepState({
        view: "ready",
        title: "Start your assessment",
        message: activeSessionIsStale
          ? "A refreshed assessment is ready with a coding task included."
          : "Your assessment has been prepared from your profile, target role, and tech stack.",
      });
    } catch (error) {
      if (isCandidateProfileMissing(error)) {
        setPrepState({
          view: "missing_profile",
          title: "Complete your profile first",
          message: "We need your target role and tech stack to generate a role-specific assessment.",
        });
        return;
      }
      setPrepState(classifyBlockingError(error));
    }
  }, []);

  useEffect(() => {
    loadPrepState();
  }, [loadPrepState]);

  useEffect(() => {
    if (prepState.view !== "loading") {
      setStillPreparing(false);
      return;
    }
    const timer = window.setTimeout(() => setStillPreparing(true), 5000);
    return () => window.clearTimeout(timer);
  }, [prepState.view]);

  const details = useMemo(() => {
    const session = latestSession?.session;
    const questionCount = session?.total_questions || latestSession?.questions.length || 6;
    return {
      role: profile?.target_role ?? session?.target_role ?? "Target role missing",
      stack: profile?.tech_stack?.length ? profile.tech_stack.join(", ") : "Tech stack missing",
      difficulty: normalizeLabel(session?.selected_difficulty ?? "intermediate", "Intermediate"),
      questions: `${questionCount} questions`,
      duration: estimatedMinutes(latestSession),
      focus: focusAreas(profile, latestSession),
      experience: normalizeLabel(profile?.experience_level ?? session?.experience_level ?? "student", "Student"),
    };
  }, [latestSession, profile]);

  const canStartOrContinue = prepState.view === "ready" || prepState.view === "continue";
  const isBlocking = !canStartOrContinue && prepState.view !== "loading";

  const handleStartOrContinue = async () => {
    if (isStarting || !canStartOrContinue) return;
    setIsStarting(true);

    try {
      const activeSession = isActiveSession(latestSession) && sessionHasCodingQuestion(latestSession)
        ? latestSession
        : null;
      if (activeSession) {
        setStoredActiveAssessmentSessionId(activeSession.session.id);
        router.push(`/dashboard/student/interview?sessionId=${encodeURIComponent(activeSession.session.id)}`);
        return;
      }

      const detail = await withTransientRetry(
        () => startAssessmentSession({ force_new: isActiveSession(latestSession) }),
        {
          onRetry: (attempt) => {
            setPrepState({
              view: "loading",
              title: "Starting assessment",
              message: `Starting assessment again (${attempt + 1}/4)`,
            });
          },
        }
      );
      setStoredActiveAssessmentSessionId(detail.session.id);
      router.push(`/dashboard/student/interview?sessionId=${encodeURIComponent(detail.session.id)}`);
    } catch (error) {
      setPrepState(classifyBlockingError(error));
    } finally {
      setIsStarting(false);
    }
  };

  const handleSignInAgain = () => {
    logout();
    router.push("/login");
  };

  const primaryAction = () => {
    if (prepState.view === "auth_expired") {
      return { label: "Sign in again", onClick: handleSignInAgain, icon: ArrowRight };
    }
    if (prepState.view === "missing_profile") {
      return { label: "Complete Profile", onClick: () => router.push("/onboarding"), icon: ArrowRight };
    }
    if (prepState.view === "network" || prepState.view === "conflict" || prepState.view === "unknown") {
      return { label: "Retry", onClick: loadPrepState, icon: RefreshCw };
    }
    if (prepState.view === "continue") {
      return { label: isStarting ? "Continuing..." : "Continue Assessment", onClick: handleStartOrContinue, icon: ArrowRight };
    }
    if (prepState.view === "ready") {
      return { label: isStarting ? "Starting..." : "Start Assessment", onClick: handleStartOrContinue, icon: Zap };
    }
    return null;
  };

  const primary = primaryAction();
  const tone = stateTone(prepState.view);

  return (
    <div className="relative min-h-full overflow-hidden bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] selection:bg-violet-500/30">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(139,92,246,0.12),transparent_32%),radial-gradient(circle_at_86%_20%,rgba(99,102,241,0.10),transparent_30%),linear-gradient(180deg,var(--color-bg-primary),var(--color-bg-secondary))] dark:bg-[radial-gradient(circle_at_18%_12%,rgba(139,92,246,0.22),transparent_34%),radial-gradient(circle_at_86%_20%,rgba(99,102,241,0.18),transparent_32%),linear-gradient(180deg,var(--color-bg-primary),var(--color-bg-secondary))]" />
        <div
          className="absolute inset-0 opacity-[0.16] dark:opacity-[0.11]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(139,92,246,0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(139,92,246,0.22) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            maskImage: "radial-gradient(ellipse at center, black, transparent 78%)",
          }}
        />
      </div>

      <main className="container relative z-10 mx-auto flex min-h-full max-w-[1120px] flex-col px-4 py-3 md:px-5 md:py-4">
        <Link
          href="/dashboard/student"
          className="mb-2 inline-flex w-fit items-center gap-2 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-1.5 text-xs font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {prepState.view === "loading" ? (
          <section className="flex flex-1 items-start justify-center py-4 text-center">
            <div className="w-full max-w-xl rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-sm">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 text-violet-500">
                <RefreshCw className="h-5 w-5 animate-spin" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Preparing assessment</h1>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                {stillPreparing ? "Still preparing..." : loadingSteps[loadStepIndex]}
              </p>
              <div className="mt-4 grid gap-2 text-left">
                {loadingSteps.map((step, index) => (
                  <div
                    key={step}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-sm ${
                      index <= loadStepIndex
                        ? "border-violet-500/25 bg-violet-500/10 text-[var(--color-text-primary)]"
                        : "border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-muted)]"
                    }`}
                  >
                    <CheckCircle2 className={`h-4 w-4 ${index <= loadStepIndex ? "text-violet-500" : "text-[var(--color-text-muted)]"}`} />
                    {step}
                  </div>
                ))}
              </div>
              {stillPreparing && (
                <button
                  type="button"
                  onClick={loadPrepState}
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2 text-sm font-bold text-[var(--color-text-primary)] hover:border-violet-500/40"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry
                </button>
              )}
            </div>
          </section>
        ) : (
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE.outExpo }}
            className="grid flex-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_390px]"
          >
            <motion.div variants={staggerContainer} initial="hidden" animate="visible">
              <motion.div
                variants={staggerItem}
                className={`mb-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold ${tone.pill}`}
              >
                <StateIcon view={prepState.view} />
                {isBlocking ? "Action required" : prepState.view === "continue" ? "Session found" : "Assessment ready"}
              </motion.div>

              <motion.h1
                variants={staggerItem}
                className="mb-2 max-w-3xl text-2xl font-bold leading-[1.08] tracking-tight text-[var(--color-text-primary)] md:text-3xl xl:text-4xl"
              >
                {prepState.title}
              </motion.h1>

              <motion.p
                variants={staggerItem}
                className="mb-3 max-w-2xl text-sm leading-6 text-[var(--color-text-secondary)] md:text-base"
              >
                {prepState.message}
              </motion.p>

              <motion.div variants={staggerItem} className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                {primary && (
                  <button
                    type="button"
                    onClick={primary.onClick}
                    disabled={isStarting}
                    className="inline-flex items-center justify-center gap-3 rounded-2xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <primary.icon className="h-4 w-4" />
                    {primary.label}
                  </button>
                )}
                {prepState.view !== "forbidden" && (
                  <Link
                    href="/dashboard/student"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-5 py-2.5 text-sm font-bold text-[var(--color-text-primary)] hover:border-violet-500/40"
                  >
                    Back to Dashboard
                  </Link>
                )}
                {prepState.view === "forbidden" && (
                  <Link
                    href="/dashboard/student"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-500"
                  >
                    Back to Dashboard
                  </Link>
                )}
              </motion.div>

              {!isBlocking && (
                <>
                  <motion.div variants={staggerItem} className="mb-3 grid gap-2 sm:grid-cols-2">
                    <DetailCard icon={Code2} label="Target Role" value={details.role} sub="From your candidate profile" />
                    <DetailCard icon={ListChecks} label="Tech Stack" value={details.stack} sub="Used to focus question selection" />
                    <DetailCard icon={BarChart3} label="Difficulty" value={details.difficulty} sub={details.experience} />
                    <DetailCard icon={Clock} label="Questions and Time" value={details.questions} sub={details.duration} />
                  </motion.div>

                  <motion.div variants={staggerItem} className="mb-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3">
                    <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                      Assessment focus areas
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {details.focus.map((area) => (
                        <span
                          key={area}
                          className="inline-flex items-center rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-0.5 text-xs font-semibold text-violet-600 dark:text-violet-300"
                        >
                          {area}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}

              {isBlocking && (
                <motion.div
                  variants={staggerItem}
                  role={prepState.view === "auth_expired" ? "alert" : undefined}
                  className={`mb-3 rounded-2xl border p-3 text-sm leading-6 ${tone.alert}`}
                >
                  <p className="font-semibold">{prepState.message}</p>
                  {prepState.view === "missing_profile" && (
                    <p className="mt-2">Complete onboarding so the backend can select questions from your target role, skills, and tech stack.</p>
                  )}
                </motion.div>
              )}

              {prepState.view === "continue" && latestSession && (
                <motion.div variants={staggerItem} className="mb-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3">
                  <div className="grid gap-2 text-sm sm:grid-cols-3">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Answered</div>
                      <div className="mt-1 font-bold text-[var(--color-text-primary)]">
                        {latestSession.progress.answered}/{latestSession.progress.total}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Status</div>
                      <div className="mt-1 font-bold text-[var(--color-text-primary)]">
                        {normalizeLabel(latestSession.session.status, "In Progress")}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Saved</div>
                      <div className="mt-1 font-bold text-[var(--color-text-primary)]">Backend session</div>
                    </div>
                  </div>
                </motion.div>
              )}

              <RagDebugPanel
                title="Assessment Session Plan"
                summary="Question source and RAG selection metadata for the latest backend session."
                className="mt-3"
                metadata={latestSession?.session.session_plan_metadata}
              />
            </motion.div>

            <aside className="hidden lg:block">
              <div className="relative overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-4 shadow-sm">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-violet-100/70 to-transparent dark:from-violet-950/30" />
                <div className="relative">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-xl">
                    <Brain className="h-6 w-6" />
                  </div>
                  <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Assessment blueprint</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                    The backend uses your saved profile to select role-specific questions and track verified assessment progress.
                  </p>
                  <div className="mt-4 space-y-2">
                    {[
                      "Profile-backed question selection",
                      "Role and stack focused prompts",
                      "Answer and code submission tracking",
                      "Verified report after completion",
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-2.5 text-sm text-[var(--color-text-secondary)]">
                        <Shield className="h-4 w-4 text-emerald-500" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </motion.section>
        )}
      </main>
    </div>
  );
}
