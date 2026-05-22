"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Briefcase, Inbox } from "lucide-react";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { MarketplaceEmptyState } from "@/components/dashboard/marketplace-empty-state";
import { MarketplaceStatusBadge } from "@/components/dashboard/marketplace-status-badge";
import { InviteStatus, useMarketplaceStore } from "@/store/useMarketplaceStore";
import { cn } from "@/lib/utils";
import {
  canUseCandidateInvitesDemoFallback,
  candidateInviteErrorMessage,
  getCandidateInvites,
  respondToCandidateInvite,
} from "@/lib/api/invite-service";
import { CandidateInvite } from "@/lib/api/types";
import { candidateInviteToViewModel, CandidateInviteViewModel } from "@/lib/candidate-view-adapters";

const TABS: { label: string; status: InviteStatus }[] = [
  { label: "Pending", status: "pending" },
  { label: "Accepted", status: "accepted" },
  { label: "Declined", status: "declined" },
];

export default function StudentRequestsPage() {
  const [activeStatus, setActiveStatus] = useState<InviteStatus>("pending");
  const { invites, respondToInvite, profilePublished } = useMarketplaceStore();
  const [backendInvites, setBackendInvites] = useState<CandidateInvite[] | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "fallback" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const requestItems = backendInvites
    ? backendInvites.map(candidateInviteToRequestItem)
    : invites.map((invite) => ({
        id: invite.id,
        company: invite.company,
        role: invite.role,
        location: invite.location,
        message: invite.message,
        salaryRange: invite.salaryRange,
        interviewWindow: invite.interviewWindow,
        opportunityType: invite.opportunityType,
        status: invite.status,
      }));
  const filtered = requestItems.filter((invite) => invite.status === activeStatus);

  useEffect(() => {
    let cancelled = false;
    async function loadInvites() {
      setLoadState("loading");
      setMessage(null);
      try {
        const response = await getCandidateInvites();
        if (cancelled) return;
        setBackendInvites(response.items);
        setLoadState("ready");
      } catch (error) {
        if (cancelled) return;
        if (canUseCandidateInvitesDemoFallback(error)) {
          setBackendInvites(null);
          setLoadState("fallback");
          setMessage("Backend unavailable. Showing local demo recruiter requests.");
          return;
        }
        setLoadState("error");
        setMessage(candidateInviteErrorMessage(error));
      }
    }
    loadInvites();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRespond = async (inviteId: string, status: "accepted" | "declined") => {
    if (!backendInvites) {
      respondToInvite(inviteId, status);
      return;
    }
    setRespondingId(inviteId);
    setMessage(null);
    try {
      const updated = await respondToCandidateInvite(inviteId, { status });
      setBackendInvites((items) =>
        items ? items.map((item) => (item.id === updated.id ? updated : item)) : items
      );
      setMessage(`Request ${status}. Recruiter tracker has been updated.`);
    } catch (error) {
      setMessage(candidateInviteErrorMessage(error));
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <main className="mx-auto min-h-full w-full max-w-[1080px] px-4 py-8 md:px-8">
      <Breadcrumbs
        backHref="/dashboard/student"
        items={[
          { label: "Student Dashboard", href: "/dashboard/student" },
          { label: "Recruiter Requests" },
        ]}
      />

      <section className="mb-6 rounded-[18px] border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--color-accent-light)] px-3 py-1 text-[11px] font-bold text-[var(--color-accent)]">
              <Briefcase className="h-3.5 w-3.5" />
              Companies apply to you
            </div>
            <h1 className="text-[30px] font-bold text-[var(--color-text-primary)]">Recruiter Requests</h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[var(--color-text-secondary)]">
              Review companies that requested interviews after discovering your verified profile and assessment evidence.
            </p>
          </div>
          <Link
            href={profilePublished ? "/dashboard/student/visibility" : "/dashboard/student/results"}
            className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[var(--color-accent)] px-4 py-3 text-[13px] font-bold text-white hover:bg-[var(--color-accent-hover)]"
          >
            {profilePublished ? "Manage Visibility" : "Publish Profile"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const count = requestItems.filter((invite) => invite.status === tab.status).length;
          return (
            <button
              key={tab.status}
              onClick={() => setActiveStatus(tab.status)}
              className={cn(
                "rounded-full border px-4 py-2 text-[13px] font-bold transition-all",
                activeStatus === tab.status
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-accent)]"
                  : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
              )}
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>

      <section className="space-y-4">
        {message && (
          <div
            role={loadState === "error" ? "alert" : undefined}
            className={`rounded-[12px] border px-4 py-3 text-[13px] font-semibold ${
              loadState === "error"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]"
            }`}
          >
            {message}
          </div>
        )}
        {filtered.map((invite) => (
          <article key={invite.id} className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[20px] font-bold text-[var(--color-text-primary)]">{invite.company}</h2>
                  <MarketplaceStatusBadge status={invite.status} />
                </div>
                <p className="mt-1 text-[15px] font-semibold text-[var(--color-text-secondary)]">{invite.role} - {invite.location}</p>
                <p className="mt-3 max-w-3xl text-[14px] leading-7 text-[var(--color-text-secondary)]">{invite.message}</p>
                <div className="mt-4 grid gap-3 text-[13px] sm:grid-cols-3">
                  <Info label="Range" value={invite.salaryRange} />
                  <Info label="Interview" value={invite.interviewWindow} />
                  <Info label="Type" value={invite.opportunityType} />
                </div>
              </div>

              {invite.status === "pending" ? (
                <div className="flex gap-2 lg:w-[220px] lg:flex-col">
                  <button disabled={respondingId === invite.id} onClick={() => void handleRespond(invite.id, "accepted")} className="flex-1 rounded-[10px] bg-[var(--color-accent)] px-4 py-3 text-[13px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">
                    {respondingId === invite.id ? "Saving..." : "Accept Request"}
                  </button>
                  <button disabled={respondingId === invite.id} onClick={() => void handleRespond(invite.id, "declined")} className="flex-1 rounded-[10px] border border-[var(--color-border)] px-4 py-3 text-[13px] font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] disabled:cursor-not-allowed disabled:opacity-60">
                    Decline
                  </button>
                </div>
              ) : (
                <div className="rounded-[12px] bg-[var(--color-bg-secondary)] px-4 py-3 text-[13px] font-semibold text-[var(--color-text-secondary)] lg:w-[220px]">
                  Request marked <span className="font-bold text-[var(--color-text-primary)]">{invite.status}</span>.
                </div>
              )}
            </div>
          </article>
        ))}

        {filtered.length === 0 && (
          <MarketplaceEmptyState
            icon={Inbox}
            title={`No ${activeStatus} requests`}
            description="Recruiter requests will appear here as companies discover your verified profile."
            actionHref="/dashboard/student/visibility"
            actionLabel="Check visibility"
          />
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

function candidateInviteToRequestItem(invite: CandidateInvite) {
  const view: CandidateInviteViewModel = candidateInviteToViewModel(invite);
  return {
    id: view.id,
    company: view.companyName,
    role: view.roleTitle,
    location: invite.company.industry ?? "Remote / Hybrid",
    message: view.message,
    salaryRange: view.salaryRange,
    interviewWindow: invite.interview_window ?? "To be scheduled",
    opportunityType: view.opportunityType,
    status: invite.status === "withdrawn" ? "declined" as InviteStatus : invite.status as InviteStatus,
  };
}
