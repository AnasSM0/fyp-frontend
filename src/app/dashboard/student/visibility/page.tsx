"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Cpu, Eye, Globe2, Inbox, ShieldCheck, TrendingUp, Zap } from "lucide-react";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { MarketplaceStatusBadge } from "@/components/dashboard/marketplace-status-badge";
import { useMarketplaceStore } from "@/store/useMarketplaceStore";
import {
  canUseEmbeddingDemoFallback,
  embeddingErrorMessage,
  getCandidateEmbeddingStatus,
  rebuildMyCandidateEmbedding,
} from "@/lib/api/embedding-service";
import {
  canUseEvaluationDemoFallback,
  evaluationErrorMessage,
  getLatestEvaluationReport,
  publishEvaluationReport,
} from "@/lib/api/evaluation-service";
import { CandidateEmbeddingStatus, EvaluationReportDetail } from "@/lib/api/types";
import { visibilityScoreFromReport } from "@/lib/report-display-adapter";
import {
  canUseCandidateInvitesDemoFallback,
  getCandidateInvites,
} from "@/lib/api/invite-service";
import { CandidateInvite } from "@/lib/api/types";

type VisibilityLoadState = "loading" | "ready" | "fallback" | "error";
type VisibilityActionState = "idle" | "publishing" | "rebuilding";

export default function StudentVisibilityPage() {
  const {
    profilePublished,
    assessmentComplete,
    visibilityScore,
    recruiterViews,
    availabilityStatus,
    invites,
    publishProfile,
    setAvailabilityStatus,
  } = useMarketplaceStore();
  const [backendReport, setBackendReport] = useState<EvaluationReportDetail | null>(null);
  const [embeddingStatus, setEmbeddingStatus] = useState<CandidateEmbeddingStatus | null>(null);
  const [backendInvites, setBackendInvites] = useState<CandidateInvite[] | null>(null);
  const [loadState, setLoadState] = useState<VisibilityLoadState>("loading");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [actionState, setActionState] = useState<VisibilityActionState>("idle");

  const pendingCount = backendInvites
    ? backendInvites.filter((invite) => invite.status === "pending").length
    : invites.filter((invite) => invite.status === "pending").length;
  const backendPublished =
    backendReport?.published ?? (embeddingStatus ? Boolean(embeddingStatus.latest_published_report_id && embeddingStatus.profile_visible) : null);
  const effectiveProfilePublished = backendPublished ?? profilePublished;
  const effectiveVisibilityScore = visibilityScoreFromReport(backendReport, visibilityScore);
  const verifiedScore = backendReport ? Math.round(backendReport.verified_score) : null;
  const embeddingReady = Boolean(embeddingStatus?.has_embedding);
  const canRebuildEmbedding = Boolean(
    embeddingStatus?.profile_visible && embeddingStatus.latest_published_report_id && actionState === "idle"
  );

  useEffect(() => {
    let cancelled = false;

    async function loadBackendVisibility() {
      setLoadState("loading");
      setStatusMessage(null);

      try {
        const [report, status] = await Promise.all([
          getLatestEvaluationReport(),
          getCandidateEmbeddingStatus(),
        ]);
        if (cancelled) return;
        setBackendReport(report);
        setEmbeddingStatus(status);
        setLoadState("ready");
        if (report?.published) publishProfile();
        if (!report) {
          setStatusMessage("No backend report is published yet. Complete results review before recruiter discovery.");
        }
        try {
          const inviteResponse = await getCandidateInvites();
          if (!cancelled) setBackendInvites(inviteResponse.items);
        } catch (error) {
          if (!canUseCandidateInvitesDemoFallback(error)) {
            setStatusMessage("Visibility loaded, but recruiter requests could not be refreshed.");
          }
        }
      } catch (error) {
        if (cancelled) return;
        if (canUseEvaluationDemoFallback(error) || canUseEmbeddingDemoFallback(error)) {
          setLoadState("fallback");
          setStatusMessage("Backend unavailable. Showing local demo visibility state.");
          return;
        }
        setLoadState("error");
        setStatusMessage(evaluationErrorMessage(error) || embeddingErrorMessage(error));
      }
    }

    loadBackendVisibility();

    return () => {
      cancelled = true;
    };
  }, [publishProfile]);

  const refreshEmbeddingStatus = async () => {
    const status = await getCandidateEmbeddingStatus();
    setEmbeddingStatus(status);
    return status;
  };

  const handlePublishVisibility = async () => {
    if (actionState !== "idle") return;

    if (!backendReport) {
      publishProfile();
      setStatusMessage("Local demo profile published. Backend report is not available.");
      return;
    }

    setActionState("publishing");
    setStatusMessage(null);
    try {
      const response = await publishEvaluationReport(backendReport.id);
      setBackendReport(response.report);
      publishProfile();
      await refreshEmbeddingStatus().catch(() => null);
      setStatusMessage("Verified profile published. Recruiters can discover this backend report.");
    } catch (error) {
      if (canUseEvaluationDemoFallback(error)) {
        publishProfile();
        setStatusMessage("Backend publish unavailable. Local demo profile published.");
      } else {
        setStatusMessage(evaluationErrorMessage(error));
      }
    } finally {
      setActionState("idle");
    }
  };

  const handleRebuildEmbedding = async () => {
    if (!canRebuildEmbedding || actionState !== "idle") return;

    setActionState("rebuilding");
    setStatusMessage(null);
    try {
      const response = await rebuildMyCandidateEmbedding();
      setEmbeddingStatus({
        profile_exists: true,
        profile_visible: true,
        latest_published_report_id: response.embedding.report_id,
        has_embedding: true,
        embedding: response.embedding,
      });
      setStatusMessage(
        `Discovery profile rebuilt with ${response.provider_metadata.provider}/${response.provider_metadata.model}.`
      );
    } catch (error) {
      if (canUseEmbeddingDemoFallback(error)) {
        setStatusMessage("Embedding backend unavailable. Local visibility remains active for demo mode.");
      } else {
        setStatusMessage(embeddingErrorMessage(error));
      }
    } finally {
      setActionState("idle");
    }
  };

  return (
    <main className="mx-auto w-full max-w-[1080px] px-4 py-8 md:px-8">
      <Breadcrumbs
        backHref="/dashboard/student"
        items={[
          { label: "Student Dashboard", href: "/dashboard/student" },
          { label: "Profile Visibility" },
        ]}
      />

      <section className="rounded-[20px] border border-[var(--color-border)] bg-white p-7 shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--color-accent-light)] px-3 py-1 text-[11px] font-bold text-[var(--color-accent)]">
              <Globe2 className="h-3.5 w-3.5" />
              Marketplace visibility
            </div>
            <h1 className="text-[34px] font-bold text-[var(--color-text-primary)]">Control how companies discover you</h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[var(--color-text-secondary)]">
              Profile visibility connects your verified AI assessment to recruiter discovery, leaderboard signals, and interview requests.
            </p>
          </div>
          <MarketplaceStatusBadge status={effectiveProfilePublished ? "published" : "unpublished"} label={effectiveProfilePublished ? "Published" : "Unpublished"} />
        </div>

        {statusMessage && (
          <div
            role={loadState === "error" ? "alert" : undefined}
            className={`mt-5 rounded-[12px] border px-4 py-3 text-[13px] font-semibold ${
              loadState === "error"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
            }`}
          >
            {statusMessage}
          </div>
        )}

        <div className="mt-7 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <VisibilityCard icon={ShieldCheck} label="Published state" value={effectiveProfilePublished ? "Live" : "Hidden"} detail={effectiveProfilePublished ? "Recruiters can request you" : "Publish from results"} />
          <VisibilityCard icon={Zap} label="Verified score" value={verifiedScore === null ? "--" : `${verifiedScore}`} detail={backendReport ? "Backend AI report" : "Local demo score"} />
          <VisibilityCard icon={Eye} label="Recruiter views" value={String(recruiterViews)} detail="Demo marketplace signals" />
          <VisibilityCard icon={TrendingUp} label="Visibility score" value={`${effectiveVisibilityScore}%`} detail={assessmentComplete || backendReport ? "Strong discovery readiness" : "Assessment needed"} />
          <VisibilityCard icon={Cpu} label="Search embedding" value={embeddingReady ? "Ready" : "Missing"} detail={embeddingStatus?.embedding ? `${embeddingStatus.embedding.embedding_provider}/${embeddingStatus.embedding.embedding_model} (${embeddingStatus.embedding.embedding_dimensions}d)` : "Publish or rebuild"} />
          <VisibilityCard icon={Inbox} label="Pending requests" value={String(pendingCount)} detail="Companies applying to you" />
        </div>

        <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_0.85fr]">
          <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5">
            <h2 className="text-[18px] font-bold text-[var(--color-text-primary)]">Availability</h2>
            <p className="mt-1 text-[13px] leading-6 text-[var(--color-text-secondary)]">
              This tells recruiters whether they should request an interview now.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {[
                { id: "open", label: "Open" },
                { id: "interviewing", label: "Interviewing" },
                { id: "paused", label: "Paused" },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => setAvailabilityStatus(option.id as "open" | "interviewing" | "paused")}
                  className={`rounded-[10px] border px-4 py-3 text-[13px] font-bold ${
                    availabilityStatus === option.id
                      ? "border-[var(--color-accent)] bg-white text-[var(--color-accent)]"
                      : "border-[var(--color-border)] bg-white/70 text-[var(--color-text-secondary)]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[16px] border border-[var(--color-accent-border)] bg-[var(--color-accent-light)] p-5">
            <h2 className="text-[18px] font-bold text-[var(--color-text-primary)]">Public profile preview</h2>
            <p className="mt-2 text-[13px] leading-6 text-[var(--color-text-secondary)]">
              Recruiters see your verified score, skill evidence, AI reasoning, and invitation status.
            </p>
            <div className="mt-3 rounded-[12px] border border-[var(--color-border)] bg-white/70 px-3 py-2 text-[12px] font-semibold text-[var(--color-text-secondary)]">
              {loadState === "loading"
                ? "Checking backend visibility..."
                : embeddingReady
                  ? "Backend discovery profile is indexed for semantic search."
                  : effectiveProfilePublished
                    ? "Profile is published. Rebuild discovery data if search embedding is missing."
                    : "Publish your verified report before recruiter discovery."}
            </div>
            <div className="mt-4 flex flex-col gap-3">
              {!effectiveProfilePublished && (backendReport || loadState === "fallback") && (
                <button
                  onClick={handlePublishVisibility}
                  disabled={actionState !== "idle" || loadState === "loading" || loadState === "error"}
                  className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[var(--color-accent)] px-4 py-3 text-[13px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <Zap className="h-4 w-4" />
                  {actionState === "publishing" ? "Publishing..." : "Publish Verified Profile"}
                </button>
              )}
              {!effectiveProfilePublished && !backendReport && loadState === "ready" && (
                <Link href="/dashboard/student/results" className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[var(--color-accent)] px-4 py-3 text-[13px] font-bold text-white">
                  View AI Results to Publish
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              {effectiveProfilePublished && !embeddingReady && (
                <button
                  onClick={handleRebuildEmbedding}
                  disabled={!canRebuildEmbedding || actionState !== "idle"}
                  className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-[var(--color-border)] bg-white px-4 py-3 text-[13px] font-bold text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Cpu className="h-4 w-4" />
                  {actionState === "rebuilding" ? "Rebuilding..." : "Rebuild Discovery Profile"}
                </button>
              )}
              <Link href="/dashboard/company/candidate?candidateId=candidate-alex-chen" className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-[var(--color-border)] bg-white px-4 py-3 text-[13px] font-bold text-[var(--color-text-primary)]">
                Preview Recruiter View
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function VisibilityCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Eye;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[14px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
      <Icon className="h-5 w-5 text-[var(--color-accent)]" />
      <div className="mt-4 text-[24px] font-bold text-[var(--color-text-primary)]">{value}</div>
      <div className="text-[12px] font-bold text-[var(--color-text-secondary)]">{label}</div>
      <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">{detail}</p>
    </div>
  );
}
