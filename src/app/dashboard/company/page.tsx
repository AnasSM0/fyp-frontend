"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, BarChart3, Bookmark, Briefcase, Search, Sparkles, Users } from "lucide-react";
import { CandidateSummaryCard } from "@/components/dashboard/candidate-summary-card";
import { JourneyChecklist } from "@/components/dashboard/journey-checklist";
import { MARKETPLACE_CANDIDATES } from "@/lib/mock-marketplace";
import { useMarketplaceStore } from "@/store/useMarketplaceStore";

export default function CompanyDashboard() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { savedCandidateIds, invites, lastSearchQuery, setLastSearchQuery } = useMarketplaceStore();

  const pendingInvites = invites.filter((invite) => invite.status === "pending").length;
  const acceptedInvites = invites.filter((invite) => invite.status === "accepted").length;

  const handleDiscover = () => {
    const nextQuery =
      query.trim() || lastSearchQuery || "Senior React engineer with system design and product experience";
    setLastSearchQuery(nextQuery);
    router.push("/dashboard/company/search");
  };

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-8 md:px-8">
      <section className="rounded-[22px] border border-[var(--color-border)] bg-white p-7 shadow-sm">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[var(--color-accent-light)] px-3 py-1 text-[11px] font-bold text-[var(--color-accent)]">
              <Sparkles className="h-3.5 w-3.5" />
              Semantic recruiter discovery
            </div>
            <h1 className="max-w-2xl text-[34px] font-bold leading-tight text-[var(--color-text-primary)] md:text-[46px]">
              Find verified candidates and request interviews first.
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[var(--color-text-secondary)]">
              Describe the talent you need. HirdUp ranks students by semantic fit, verified AI assessment evidence, and availability.
            </p>
          </div>
          <div className="rounded-[18px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
            <label className="text-[12px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
              Describe your ideal candidate
            </label>
            <textarea
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="mt-3 min-h-[138px] w-full resize-none rounded-[14px] border border-[var(--color-border)] bg-white p-4 text-[14px] leading-6 text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)]"
              placeholder="e.g. Senior React engineer with system design experience and strong product instincts..."
            />
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setQuery("")}
                className="rounded-[10px] border border-[var(--color-border)] bg-white px-4 py-2 text-[13px] font-bold text-[var(--color-text-secondary)]"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleDiscover}
                className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[var(--color-accent)] px-4 py-2 text-[13px] font-bold text-white hover:bg-[var(--color-accent-hover)]"
              >
                <Search className="h-4 w-4" />
                Discover Candidates
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard icon={Users} label="Verified pool" value={String(MARKETPLACE_CANDIDATES.length)} detail="Demo candidates" />
        <MetricCard icon={Bookmark} label="Shortlisted" value={String(savedCandidateIds.length)} detail="Saved profiles" />
        <MetricCard icon={Briefcase} label="Pending requests" value={String(pendingInvites)} detail="Awaiting response" />
        <MetricCard icon={BarChart3} label="Accepted" value={String(acceptedInvites)} detail="Candidate interest" />
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <JourneyChecklist
          title="Recruiter workflow"
          items={[
            {
              label: "Describe the role",
              description: "Use semantic search instead of keyword filters.",
              complete: Boolean(lastSearchQuery),
            },
            {
              label: "Review verified matches",
              description: "Open AI reasoning and assessment evidence before outreach.",
              complete: Boolean(lastSearchQuery),
            },
            {
              label: "Shortlist candidates",
              description: "Save profiles for follow-up and comparison.",
              complete: savedCandidateIds.length > 0,
            },
            {
              label: "Send interview requests",
              description: "Companies apply to candidates through invite requests.",
              complete: invites.length > 0,
            },
            {
              label: "Track candidate responses",
              description: "Monitor pending, accepted, and declined requests.",
              complete: invites.some((invite) => invite.status !== "pending"),
            },
          ]}
        />

        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-[20px] font-bold text-[var(--color-text-primary)]">Recommended verified talent</h2>
              <p className="text-[13px] text-[var(--color-text-secondary)]">Start from a ranked candidate, then invite directly.</p>
            </div>
            <Link href="/dashboard/company/search" className="hidden text-[13px] font-bold text-[var(--color-accent)] hover:underline sm:block">
              Open Discover
            </Link>
          </div>
          <div className="space-y-4">
            {MARKETPLACE_CANDIDATES.slice(0, 2).map((candidate) => (
              <CandidateSummaryCard key={candidate.id} candidate={candidate} compact />
            ))}
          </div>
          <Link href="/dashboard/company/search" className="mt-4 inline-flex items-center gap-2 rounded-[10px] bg-[var(--color-accent)] px-4 py-3 text-[13px] font-bold text-white sm:hidden">
            Open Discover
            <ArrowRight className="h-4 w-4" />
          </Link>
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
  icon: typeof Users;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[16px] border border-[var(--color-border)] bg-white p-5 shadow-sm">
      <Icon className="h-5 w-5 text-[var(--color-accent)]" />
      <div className="mt-4 text-[28px] font-bold text-[var(--color-text-primary)]">{value}</div>
      <div className="text-[13px] font-bold text-[var(--color-text-secondary)]">{label}</div>
      <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">{detail}</p>
    </div>
  );
}
