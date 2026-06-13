"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Briefcase, Mail } from "lucide-react";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { MarketplaceEmptyState } from "@/components/dashboard/marketplace-empty-state";
import { MarketplaceStatusBadge } from "@/components/dashboard/marketplace-status-badge";
import { getRecruiterInvites, recruiterMarketplaceErrorMessage } from "@/lib/api/recruiter-marketplace-service";
import { InviteStatus, RecruiterInviteItem } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const TABS: { label: string; status: InviteStatus }[] = [
  { label: "Pending", status: "pending" },
  { label: "Accepted", status: "accepted" },
  { label: "Declined", status: "declined" },
];

export default function OffersPage() {
  const [activeStatus, setActiveStatus] = useState<InviteStatus>("pending");
  const [invites, setInvites] = useState<RecruiterInviteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filtered = invites.filter((invite) => invite.status === activeStatus);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await getRecruiterInvites();
        if (!cancelled) setInvites(response.items);
      } catch (requestError) {
        if (!cancelled) setError(recruiterMarketplaceErrorMessage(requestError));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-[1040px] flex-col gap-6 px-4 py-8 md:px-8">
      <Breadcrumbs backHref="/dashboard/company" items={[{ label: "Company Dashboard", href: "/dashboard/company" }, { label: "Requests / Invites" }]} />
      <section className="rounded-[18px] border border-[var(--color-border)] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--color-accent-light)] px-3 py-1 text-[11px] font-bold text-[var(--color-accent)]">
              <Briefcase className="h-3.5 w-3.5" />
              Companies apply to candidates
            </div>
            <h1 className="text-[30px] font-bold text-[var(--color-text-primary)]">Requests / Invites</h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[var(--color-text-secondary)]">
              Track interview requests created by this recruiter account.
            </p>
          </div>
          <Link href="/dashboard/company/search" className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[var(--color-accent)] px-4 py-3 text-[13px] font-bold text-white">
            Send another invite
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const count = invites.filter((invite) => invite.status === tab.status).length;
          return (
            <button key={tab.status} onClick={() => setActiveStatus(tab.status)} className={cn("rounded-full border px-4 py-2 text-[13px] font-bold transition-all", activeStatus === tab.status ? "border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-accent)]" : "border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]")}>
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      <section className="space-y-4">
        {loading && <div className="rounded-[16px] border border-[var(--color-border)] bg-white p-6 text-[14px] font-semibold text-[var(--color-text-secondary)]">Loading requests...</div>}
        {error && <MarketplaceEmptyState icon={Mail} title="Requests unavailable" description={error} />}
        {!loading && !error && filtered.map((invite) => (
          <article key={invite.id} className="rounded-[16px] border border-[var(--color-border)] bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[20px] font-bold text-[var(--color-text-primary)]">{invite.candidate.full_name || "Candidate"}</h2>
                  <MarketplaceStatusBadge status={invite.status} />
                </div>
                <p className="mt-1 text-[15px] font-semibold text-[var(--color-text-secondary)]">{invite.role_title} - {invite.candidate.university || "University not listed"}</p>
                <p className="mt-3 max-w-3xl text-[14px] leading-7 text-[var(--color-text-secondary)]">{invite.message}</p>
                <div className="mt-4 grid gap-3 text-[13px] sm:grid-cols-3">
                  <Info label="Score" value={String(Math.round(invite.candidate.verified_score ?? 0))} />
                  <Info label="Mode" value={invite.interview_mode || "interview"} />
                  <Info label="Created" value={new Date(invite.created_at).toLocaleDateString()} />
                </div>
              </div>
              <div className="flex flex-col gap-2 lg:w-[220px]">
                <Link href={`/dashboard/company/candidate?candidateId=${invite.candidate_id}`} className="inline-flex items-center justify-center rounded-[10px] bg-[var(--color-accent)] px-4 py-3 text-[13px] font-bold text-white">
                  Open candidate
                </Link>
                <Link href="/dashboard/company/search" className="inline-flex items-center justify-center rounded-[10px] border border-[var(--color-border)] px-4 py-3 text-[13px] font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]">
                  Continue discovery
                </Link>
              </div>
            </div>
          </article>
        ))}

        {!loading && !error && filtered.length === 0 && (
          <MarketplaceEmptyState icon={Mail} title={`No ${activeStatus} requests`} description="Send interview requests from Discover or candidate profiles. Their status will appear here." actionHref="/dashboard/company/search" actionLabel="Discover candidates" />
        )}
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] bg-[var(--color-bg-secondary)] p-3">
      <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">{label}</div>
      <div className="mt-1 font-bold text-[var(--color-text-primary)]">{value}</div>
    </div>
  );
}
