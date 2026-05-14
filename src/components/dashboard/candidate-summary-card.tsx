"use client";

import Link from "next/link";
import { useState } from "react";
import { Bookmark, CalendarPlus, CheckCircle2, ChevronRight, Sparkles, X } from "lucide-react";
import { MockCandidate } from "@/lib/mock-marketplace";
import { useMarketplaceStore } from "@/store/useMarketplaceStore";
import { InviteComposer } from "./invite-composer";
import { MarketplaceStatusBadge } from "./marketplace-status-badge";

export function CandidateSummaryCard({
  candidate,
  compact = false,
}: {
  candidate: MockCandidate;
  compact?: boolean;
}) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [sentInviteId, setSentInviteId] = useState<string | null>(null);
  const { savedCandidateIds, toggleSavedCandidate, invites } = useMarketplaceStore();
  const saved = savedCandidateIds.includes(candidate.id);
  const existingInvite = invites.find(
    (invite) => invite.candidateId === candidate.id && invite.status === "pending"
  );
  const invited = Boolean(existingInvite || sentInviteId);

  return (
    <article className="rounded-[16px] border border-[var(--color-border)] bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[16px] bg-[var(--color-accent-light)] text-[18px] font-bold text-[var(--color-accent)]">
            {candidate.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={candidate.image} alt={candidate.name} className="h-full w-full object-cover" />
            ) : (
              candidate.initials
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[18px] font-bold text-[var(--color-text-primary)]">{candidate.name}</h2>
              <MarketplaceStatusBadge status={candidate.availability.toLowerCase()} label={candidate.availability} />
              {saved && <MarketplaceStatusBadge status="saved" label="Shortlisted" />}
              {invited && <MarketplaceStatusBadge status="pending" label="Invite sent" />}
            </div>
            <p className="mt-1 text-[14px] font-medium text-[var(--color-text-secondary)]">
              {candidate.role} - {candidate.location}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {candidate.skills.slice(0, compact ? 3 : 5).map((skill) => (
                <span
                  key={skill}
                  className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-secondary)]"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 rounded-[12px] bg-[var(--color-bg-secondary)] p-3 text-center lg:w-[260px]">
          <div>
            <div className="font-mono text-[20px] font-bold text-[var(--color-verified)]">{candidate.score}</div>
            <div className="text-[10px] font-bold uppercase text-[var(--color-text-muted)]">Score</div>
          </div>
          <div>
            <div className="font-mono text-[20px] font-bold text-[var(--color-accent)]">{candidate.matchScore}%</div>
            <div className="text-[10px] font-bold uppercase text-[var(--color-text-muted)]">Match</div>
          </div>
          <div>
            <div className="text-[14px] font-bold text-[var(--color-text-primary)]">{candidate.percentile}</div>
            <div className="text-[10px] font-bold uppercase text-[var(--color-text-muted)]">Rank</div>
          </div>
        </div>
      </div>

      {!compact && (
        <div className="mt-5 rounded-[12px] border border-[var(--color-accent-border)] bg-[var(--color-accent-light)] p-4">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[var(--color-accent)]">
            <Sparkles className="h-3.5 w-3.5" />
            AI semantic match explanation
          </div>
          <p className="text-[14px] leading-6 text-[var(--color-text-primary)]">{candidate.reasoning}</p>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => toggleSavedCandidate(candidate.id)}
          className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-[var(--color-border)] px-4 py-2.5 text-[13px] font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]"
        >
          {saved ? <X className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          {saved ? "Remove Shortlist" : "Shortlist"}
        </button>
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[var(--color-accent)] px-4 py-2.5 text-[13px] font-bold text-white hover:bg-[var(--color-accent-hover)]"
        >
          {invited ? <CheckCircle2 className="h-4 w-4" /> : <CalendarPlus className="h-4 w-4" />}
          {invited ? "Invite Sent" : "Invite"}
        </button>
        <Link
          href={`/dashboard/company/candidate?candidateId=${candidate.id}`}
          className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-[var(--color-border)] px-4 py-2.5 text-[13px] font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]"
        >
          Open Profile
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {sentInviteId && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] font-semibold text-emerald-700">
          <span>Request {sentInviteId} sent. Waiting for candidate response.</span>
          <Link href="/dashboard/company/offers" className="underline underline-offset-4">
            View in Requests
          </Link>
        </div>
      )}

      <InviteComposer
        candidate={candidate}
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSent={(inviteId) => setSentInviteId(inviteId)}
      />
    </article>
  );
}
