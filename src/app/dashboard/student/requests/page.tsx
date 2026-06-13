"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Briefcase, Inbox } from "lucide-react";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { MarketplaceEmptyState } from "@/components/dashboard/marketplace-empty-state";
import { MarketplaceStatusBadge } from "@/components/dashboard/marketplace-status-badge";
import { getCandidateRequests, recruiterMarketplaceErrorMessage } from "@/lib/api/recruiter-marketplace-service";
import { CandidateRequestItem, InviteStatus } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const TABS: { label: string; status: InviteStatus }[] = [
  { label: "Pending", status: "pending" },
  { label: "Accepted", status: "accepted" },
  { label: "Declined", status: "declined" },
];

export default function StudentRequestsPage() {
  const [activeStatus, setActiveStatus] = useState<InviteStatus>("pending");
  const [requests, setRequests] = useState<CandidateRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filtered = requests.filter((invite) => invite.status === activeStatus);

  useEffect(() => {
    let cancelled = false;
    async function loadRequests() {
      setLoading(true);
      setError(null);
      try {
        const response = await getCandidateRequests();
        if (!cancelled) setRequests(response.items);
      } catch (requestError) {
        if (!cancelled) setError(recruiterMarketplaceErrorMessage(requestError));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadRequests();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto min-h-full w-full max-w-[1080px] px-4 py-8 md:px-8">
      <Breadcrumbs backHref="/dashboard/student" items={[{ label: "Student Dashboard", href: "/dashboard/student" }, { label: "Recruiter Requests" }]} />

      <section className="mb-6 rounded-[18px] border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--color-accent-light)] px-3 py-1 text-[11px] font-bold text-[var(--color-accent)]">
              <Briefcase className="h-3.5 w-3.5" />
              Companies apply to you
            </div>
            <h1 className="text-[30px] font-bold text-[var(--color-text-primary)]">Recruiter Requests</h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[var(--color-text-secondary)]">
              Real interview requests sent by recruiters after discovering your published verified profile.
            </p>
          </div>
          <Link href="/dashboard/student/visibility" className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[var(--color-accent)] px-4 py-3 text-[13px] font-bold text-white hover:bg-[var(--color-accent-hover)]">
            Manage Visibility
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const count = requests.filter((invite) => invite.status === tab.status).length;
          return (
            <button key={tab.status} onClick={() => setActiveStatus(tab.status)} className={cn("rounded-full border px-4 py-2 text-[13px] font-bold transition-all", activeStatus === tab.status ? "border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-accent)]" : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]")}>
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      <section className="space-y-4">
        {loading && <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-[14px] font-semibold text-[var(--color-text-secondary)]">Loading recruiter requests...</div>}
        {error && <MarketplaceEmptyState icon={Inbox} title="Recruiter requests unavailable" description={error} />}
        {!loading && !error && filtered.map((invite) => (
          <article key={invite.id} className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[20px] font-bold text-[var(--color-text-primary)]">{invite.company.company_name || "Company"}</h2>
                  <MarketplaceStatusBadge status={invite.status} />
                </div>
                <p className="mt-1 text-[15px] font-semibold text-[var(--color-text-secondary)]">{invite.role_title} - {invite.company.industry || "Remote / Hybrid"}</p>
                <p className="mt-3 max-w-3xl text-[14px] leading-7 text-[var(--color-text-secondary)]">{invite.message}</p>
                <div className="mt-4 grid gap-3 text-[13px] sm:grid-cols-3">
                  <Info label="Mode" value={invite.interview_mode || "interview"} />
                  <Info label="Recruiter" value={invite.company.recruiter_name || "Recruiter"} />
                  <Info label="Created" value={new Date(invite.created_at).toLocaleDateString()} />
                </div>
              </div>
              <div className="rounded-[12px] bg-[var(--color-bg-secondary)] px-4 py-3 text-[13px] font-semibold text-[var(--color-text-secondary)] lg:w-[220px]">
                Request status: <span className="font-bold text-[var(--color-text-primary)]">{invite.status}</span>
              </div>
            </div>
          </article>
        ))}

        {!loading && !error && filtered.length === 0 && (
          <MarketplaceEmptyState icon={Inbox} title={`No ${activeStatus} requests`} description="Recruiter requests will appear here as companies discover your verified profile." actionHref="/dashboard/student/visibility" actionLabel="Check visibility" />
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
