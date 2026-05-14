"use client";

import Link from "next/link";
import { ArrowRight, Eye, Globe2, Inbox, ShieldCheck, TrendingUp, Zap } from "lucide-react";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { MarketplaceStatusBadge } from "@/components/dashboard/marketplace-status-badge";
import { useMarketplaceStore } from "@/store/useMarketplaceStore";

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

  const pendingCount = invites.filter((invite) => invite.status === "pending").length;

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
          <MarketplaceStatusBadge status={profilePublished ? "published" : "unpublished"} label={profilePublished ? "Published" : "Unpublished"} />
        </div>

        <div className="mt-7 grid gap-4 md:grid-cols-4">
          <VisibilityCard icon={ShieldCheck} label="Published state" value={profilePublished ? "Live" : "Hidden"} detail={profilePublished ? "Recruiters can request you" : "Publish from results"} />
          <VisibilityCard icon={Eye} label="Recruiter views" value={String(recruiterViews)} detail="Demo marketplace signals" />
          <VisibilityCard icon={TrendingUp} label="Visibility score" value={`${visibilityScore}%`} detail={assessmentComplete ? "Strong discovery readiness" : "Assessment needed"} />
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
            <div className="mt-4 flex flex-col gap-3">
              {!profilePublished && (
                <button onClick={publishProfile} className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[var(--color-accent)] px-4 py-3 text-[13px] font-bold text-white">
                  <Zap className="h-4 w-4" />
                  Publish Verified Profile
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
