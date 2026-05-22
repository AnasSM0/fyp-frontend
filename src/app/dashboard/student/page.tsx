"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Eye,
  Inbox,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { JourneyChecklist } from "@/components/dashboard/journey-checklist";
import { MarketplaceStatusBadge } from "@/components/dashboard/marketplace-status-badge";
import { useMarketplaceStore } from "@/store/useMarketplaceStore";
import {
  canUseProfileDemoFallback,
  getCandidateProfile,
  isCandidateProfileMissing,
  profileErrorMessage,
} from "@/lib/api/profile-service";
import {
  canUseAssessmentDemoFallback,
  getLatestAssessmentSession,
} from "@/lib/api/assessment-service";
import {
  canUseEvaluationDemoFallback,
  getLatestEvaluationReport,
} from "@/lib/api/evaluation-service";
import {
  canUseCandidateInvitesDemoFallback,
  getCandidateInvites,
  respondToCandidateInvite,
} from "@/lib/api/invite-service";
import { canUseActivityDemoFallback, getMyActivity } from "@/lib/api/activity-service";
import {
  canUseEmbeddingDemoFallback,
  getCandidateEmbeddingStatus,
} from "@/lib/api/embedding-service";
import {
  ActivityFeedResponse,
  AssessmentSessionDetail,
  CandidateEmbeddingStatus,
  CandidateInvite,
  CandidateProfile,
  EvaluationReportDetail,
} from "@/lib/api/types";
import {
  activityEventToViewModel,
  candidateInviteToViewModel,
  CandidateActivityViewModel,
  CandidateInviteViewModel,
} from "@/lib/candidate-view-adapters";
import { visibilityScoreFromReport } from "@/lib/report-display-adapter";

type ProfileLoadState = "loading" | "ready" | "missing" | "fallback" | "error";

export default function StudentDashboardPage() {
  const {
    profileComplete,
    assessmentComplete,
    reportReviewed,
    profilePublished,
    visibilityScore,
    recruiterViews,
    availabilityStatus,
    invites,
    activityEvents,
    completeProfile,
    publishProfile,
    respondToInvite,
  } = useMarketplaceStore();
  const [backendProfileComplete, setBackendProfileComplete] = useState<boolean | null>(null);
  const [backendProfile, setBackendProfile] = useState<CandidateProfile | null>(null);
  const [backendSession, setBackendSession] = useState<AssessmentSessionDetail | null>(null);
  const [backendReport, setBackendReport] = useState<EvaluationReportDetail | null>(null);
  const [backendInvites, setBackendInvites] = useState<CandidateInvite[] | null>(null);
  const [backendActivity, setBackendActivity] = useState<ActivityFeedResponse | null>(null);
  const [embeddingStatus, setEmbeddingStatus] = useState<CandidateEmbeddingStatus | null>(null);
  const [profileLoadState, setProfileLoadState] = useState<ProfileLoadState>("loading");
  const [profileLoadMessage, setProfileLoadMessage] = useState<string | null>(null);

  const backendInviteCards: CandidateInviteViewModel[] | null = backendInvites
    ? backendInvites.map(candidateInviteToViewModel)
    : null;
  const pendingInvites = backendInviteCards
    ? backendInviteCards.filter((invite) => invite.status === "pending")
    : invites.filter((invite) => invite.status === "pending");
  const answeredInvites = backendInviteCards
    ? backendInviteCards.filter((invite) => invite.status !== "pending")
    : invites.filter((invite) => invite.status !== "pending");
  const backendActivityCards: CandidateActivityViewModel[] | null = backendActivity
    ? backendActivity.items.map(activityEventToViewModel)
    : null;
  const effectiveProfileComplete = backendProfileComplete ?? profileComplete;
  const effectiveAssessmentComplete =
    backendSession?.session.status === "completed" || assessmentComplete;
  const effectiveReportReviewed = Boolean(backendReport) || reportReviewed;
  const effectiveProfilePublished =
    backendReport?.published ??
    (embeddingStatus ? Boolean(embeddingStatus.latest_published_report_id && embeddingStatus.profile_visible) : profilePublished);
  const effectiveVisibilityScore = visibilityScoreFromReport(backendReport, visibilityScore);
  const effectiveRecruiterViews = backendActivityCards ? backendActivityCards.length : recruiterViews;
  const latestSessionId = backendSession?.session.id;

  const handleDashboardInviteResponse = async (inviteId: string, status: "accepted" | "declined") => {
    if (backendInvites) {
      const updated = await respondToCandidateInvite(inviteId, { status });
      setBackendInvites((items) =>
        items ? items.map((item) => (item.id === updated.id ? updated : item)) : items
      );
      return;
    }
    respondToInvite(inviteId, status);
  };

  useEffect(() => {
    let cancelled = false;

    async function loadCandidateProfile() {
      setProfileLoadState("loading");
      setProfileLoadMessage(null);

      try {
        const profile = await getCandidateProfile();
        if (cancelled) return;

        setBackendProfile(profile);
        setBackendProfileComplete(profile.profile_complete);
        setProfileLoadState("ready");

        if (profile.profile_complete && !profileComplete) {
          completeProfile();
        }
        const [sessionResult, reportResult, inviteResult, activityResult, embeddingResult] =
          await Promise.allSettled([
            getLatestAssessmentSession(),
            getLatestEvaluationReport(),
            getCandidateInvites(),
            getMyActivity(),
            getCandidateEmbeddingStatus(),
          ]);

        if (cancelled) return;
        if (sessionResult.status === "fulfilled") setBackendSession(sessionResult.value);
        else if (!canUseAssessmentDemoFallback(sessionResult.reason)) {
          setProfileLoadMessage("Profile loaded, but assessment state needs attention.");
        }
        if (reportResult.status === "fulfilled") {
          setBackendReport(reportResult.value);
          if (reportResult.value?.published) publishProfile();
        } else if (!canUseEvaluationDemoFallback(reportResult.reason)) {
          setProfileLoadMessage("Profile loaded, but AI report state needs attention.");
        }
        if (inviteResult.status === "fulfilled") setBackendInvites(inviteResult.value.items);
        else if (!canUseCandidateInvitesDemoFallback(inviteResult.reason)) {
          setProfileLoadMessage("Profile loaded, but recruiter requests could not be loaded.");
        }
        if (activityResult.status === "fulfilled") setBackendActivity(activityResult.value);
        else if (!canUseActivityDemoFallback(activityResult.reason)) {
          setProfileLoadMessage("Profile loaded, but activity feed could not be loaded.");
        }
        if (embeddingResult.status === "fulfilled") setEmbeddingStatus(embeddingResult.value);
        else if (!canUseEmbeddingDemoFallback(embeddingResult.reason)) {
          setProfileLoadMessage("Profile loaded, but search visibility could not be loaded.");
        }
      } catch (error) {
        if (cancelled) return;

        if (isCandidateProfileMissing(error)) {
          setBackendProfileComplete(false);
          setBackendProfile(null);
          setProfileLoadState("missing");
          setProfileLoadMessage("Backend profile not found. Complete onboarding to calibrate your assessment.");
          return;
        }

        if (canUseProfileDemoFallback(error)) {
          setBackendProfileComplete(null);
          setProfileLoadState("fallback");
          setProfileLoadMessage("Backend unavailable. Showing local demo profile state.");
          return;
        }

        setBackendProfileComplete(false);
        setProfileLoadState("error");
        setProfileLoadMessage(profileErrorMessage(error));
      }
    }

    loadCandidateProfile();

    return () => {
      cancelled = true;
    };
  }, [completeProfile, profileComplete, publishProfile]);

  const nextAction: {
    label: string;
    description: string;
    href?: string;
    action?: () => void;
  } = !effectiveProfileComplete
    ? {
        label: "Complete Profile",
        description: "Build your technical DNA so the assessment can calibrate to you.",
        href: "/onboarding",
      }
    : backendSession?.session.status === "in_progress" || backendSession?.session.status === "created"
      ? {
          label: "Continue Assessment",
          description: "Resume your backend assessment session where you left off.",
          href: `/dashboard/student/interview?sessionId=${encodeURIComponent(backendSession.session.id)}`,
        }
    : !effectiveAssessmentComplete
      ? {
          label: "Start AI Assessment",
          description: "Verify your skills and generate evidence recruiters can trust.",
          href: "/dashboard/student/interview/prep",
        }
      : !effectiveReportReviewed
        ? {
            label: "Generate AI Report",
            description: "Turn completed answers into verified score, evidence, and recruiter summary.",
            href: latestSessionId
              ? `/dashboard/student/results?sessionId=${encodeURIComponent(latestSessionId)}`
              : "/dashboard/student/results",
          }
        : !effectiveProfilePublished
          ? {
              label: "Publish Verified Profile",
              description: "Become discoverable so companies can request interviews with you.",
              href: backendReport
                ? `/dashboard/student/results?sessionId=${encodeURIComponent(backendReport.session_id)}`
                : "/dashboard/student/results",
            }
          : {
              label: "Review Recruiter Requests",
              description: "Companies can now apply to interview you. Accept or decline requests from your inbox.",
              href: "/dashboard/student/requests",
            };

  const checklistItems = [
    {
      label: "Complete profile",
      description: "Tell the AI your target role, stack, and strongest work.",
      complete: effectiveProfileComplete,
    },
    {
      label: "Complete AI assessment",
      description: "Generate verified skill evidence through the adaptive interview.",
      complete: effectiveAssessmentComplete,
    },
    {
      label: "Review verified report",
      description: "Understand your score and how recruiters will read your profile.",
      complete: effectiveReportReviewed,
    },
    {
      label: "Publish profile",
      description: "Make your verified talent profile visible in recruiter discovery.",
      complete: effectiveProfilePublished,
    },
    {
      label: "Respond to recruiter requests",
      description: "Accept or decline company interview requests from the marketplace.",
      complete: answeredInvites.length > 0,
    },
  ];

  return (
    <main className="mx-auto flex min-h-full w-full max-w-[1200px] flex-col gap-8 px-4 py-8 md:px-8">
      <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-[20px] border border-[var(--color-border)] bg-[var(--color-card)] p-7 shadow-sm">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--color-verified)]/30 bg-[var(--color-verified)]/10 px-3 py-1.5 text-[12px] font-bold text-[var(--color-verified)]">
            <BadgeCheck className="h-4 w-4" />
            {effectiveProfilePublished ? "Profile live in marketplace" : "Marketplace setup in progress"}
          </div>
          <h1 className="max-w-2xl text-[32px] font-bold leading-tight text-[var(--color-text-primary)] md:text-[42px]">
            Become discoverable verified talent.
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[var(--color-text-secondary)]">
            XLR8Hire works in reverse: you prove your skills once, publish a verified profile, and companies request interviews with you.
          </p>

          {profileLoadMessage ? (
            <div
              className="mt-5 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-4 py-3 text-[13px] font-semibold text-[var(--color-text-secondary)]"
              role={profileLoadState === "error" ? "alert" : undefined}
              aria-live="polite"
            >
              {profileLoadMessage}
            </div>
          ) : null}

          <div className="mt-7 rounded-[16px] border border-[var(--color-accent-border)] bg-[var(--color-accent-light)] p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-widest text-[var(--color-accent)]">
                  <Sparkles className="h-4 w-4" />
                  Next best action
                </div>
                <h2 className="mt-2 text-[22px] font-bold text-[var(--color-text-primary)]">{nextAction.label}</h2>
                <p className="mt-1 max-w-xl text-[14px] leading-6 text-[var(--color-text-secondary)]">
                  {profileLoadState === "loading"
                    ? "Checking your saved candidate profile..."
                    : nextAction.description}
                </p>
              </div>
              {nextAction.href ? (
                <Link
                  href={nextAction.href}
                  aria-disabled={profileLoadState === "loading"}
                  className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-[10px] bg-[var(--color-accent)] px-5 py-3 text-[14px] font-bold text-white hover:bg-[var(--color-accent-hover)] ${
                    profileLoadState === "loading" ? "pointer-events-none opacity-70" : ""
                  }`}
                >
                  {profileLoadState === "loading" ? "Checking Profile" : nextAction.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={nextAction.action}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[10px] bg-[var(--color-accent)] px-5 py-3 text-[14px] font-bold text-white hover:bg-[var(--color-accent-hover)]"
                >
                  <Zap className="h-4 w-4" />
                  {nextAction.label}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          <MetricCard icon={ShieldCheck} label="XLR8 Score" value={backendReport ? String(Math.round(backendReport.verified_score)) : assessmentComplete ? "95" : "--"} detail={backendReport ? "Backend verified score" : assessmentComplete ? "Local demo score" : "Complete assessment"} />
          <MetricCard icon={Eye} label="Activity Signals" value={String(effectiveRecruiterViews)} detail={effectiveProfilePublished ? "Backend activity feed" : "Publish to boost"} />
          <MetricCard icon={Inbox} label="Pending Requests" value={String(pendingInvites.length)} detail="Companies applying to you" />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <JourneyChecklist title="Marketplace readiness" items={checklistItems} />

        <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-[18px] font-bold text-[var(--color-text-primary)]">Profile Visibility</h2>
              <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">How discoverable you are to recruiters right now.</p>
            </div>
            <MarketplaceStatusBadge status={effectiveProfilePublished ? "published" : "unpublished"} label={effectiveProfilePublished ? "Published" : "Unpublished"} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <VisibilityStat label="Visibility score" value={`${effectiveVisibilityScore}%`} />
            <VisibilityStat label="Search embedding" value={embeddingStatus?.has_embedding ? "Ready" : "Missing"} />
            <VisibilityStat label="Availability" value={backendProfile?.availability_status ?? availabilityStatus} />
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link href="/dashboard/student/visibility" className="inline-flex flex-1 items-center justify-center gap-2 rounded-[10px] bg-[var(--color-accent)] px-4 py-3 text-[13px] font-bold text-white hover:bg-[var(--color-accent-hover)]">
              Manage Visibility
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/dashboard/student/results" className="inline-flex flex-1 items-center justify-center gap-2 rounded-[10px] border border-[var(--color-border)] px-4 py-3 text-[13px] font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]">
              View Report
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-[18px] font-bold text-[var(--color-text-primary)]">Recruiter Requests</h2>
              <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">Companies request interviews with you after reviewing verified evidence.</p>
            </div>
            <Link href="/dashboard/student/requests" className="text-[13px] font-bold text-[var(--color-accent)] hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-4">
            {pendingInvites.slice(0, 2).map((invite) => (
              <article key={invite.id} className="rounded-[14px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-[var(--color-text-primary)]">{"companyName" in invite ? invite.companyName : invite.company}</h3>
                      <MarketplaceStatusBadge status={invite.status} />
                    </div>
                    <p className="mt-1 text-[14px] font-semibold text-[var(--color-text-secondary)]">{"roleTitle" in invite ? invite.roleTitle : invite.role}</p>
                    <p className="mt-2 text-[13px] leading-6 text-[var(--color-text-muted)]">{invite.message}</p>
                    <p className="mt-2 text-[12px] font-bold text-[var(--color-text-secondary)]">{invite.salaryRange} - {invite.interviewWindow}</p>
                  </div>
                  <div className="flex gap-2 md:w-[180px] md:flex-col">
                    <button onClick={() => void handleDashboardInviteResponse(invite.id, "accepted")} className="flex-1 rounded-[8px] bg-[var(--color-accent)] px-3 py-2 text-[12px] font-bold text-white">
                      Accept
                    </button>
                    <button onClick={() => void handleDashboardInviteResponse(invite.id, "declined")} className="flex-1 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-[12px] font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]">
                      Decline
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {pendingInvites.length === 0 && (
              <div className="rounded-[14px] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 text-center">
                <p className="font-bold text-[var(--color-text-primary)]">No pending requests.</p>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Keep your verified profile published to attract recruiter activity.</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-[18px] font-bold text-[var(--color-text-primary)]">Marketplace Activity</h2>
              <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">Signals that prove companies are discovering you.</p>
            </div>
            <Link href="/dashboard/student/activity" className="text-[13px] font-bold text-[var(--color-accent)] hover:underline">
              Open
            </Link>
          </div>
          <div className="space-y-3">
            {(backendActivityCards ?? activityEvents).slice(0, 4).map((event) => (
              <div key={event.id} className="flex gap-3 rounded-[12px] bg-[var(--color-bg-secondary)] p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--color-card)] text-[var(--color-accent)]">
                  {event.type === "profile_view" ? <Eye className="h-4 w-4" /> : event.type === "semantic_match" ? <Search className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                </div>
                <div>
                  <div className="text-[13px] font-bold text-[var(--color-text-primary)]">{event.title}</div>
                  <p className="mt-0.5 text-[12px] leading-5 text-[var(--color-text-secondary)]">{"description" in event ? event.description : event.detail}</p>
                  <div className="mt-1 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">{event.createdAt}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof BarChart3;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-sm">
      <Icon className="h-5 w-5 text-[var(--color-accent)]" />
      <div className="mt-4 text-[28px] font-bold text-[var(--color-text-primary)]">{value}</div>
      <div className="text-[13px] font-bold text-[var(--color-text-secondary)]">{label}</div>
      <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">{detail}</p>
    </div>
  );
}

function VisibilityStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] bg-[var(--color-bg-secondary)] p-4">
      <div className="text-[20px] font-bold text-[var(--color-text-primary)]">{value}</div>
      <div className="mt-1 text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">{label}</div>
    </div>
  );
}
