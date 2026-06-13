"use client";

import Link from "next/link";
import { useState } from "react";
import { Bookmark, CalendarPlus, CheckCircle2, ChevronRight, Sparkles, X } from "lucide-react";
import {
  removeRecruiterShortlist,
  shortlistRecruiterCandidate,
  recruiterMarketplaceErrorMessage,
} from "@/lib/api/recruiter-marketplace-service";
import { RecruiterCandidateSearchItem } from "@/lib/api/types";
import { InviteComposer } from "./invite-composer";
import { MarketplaceStatusBadge } from "./marketplace-status-badge";

export function CandidateSummaryCard({
  candidate,
  compact = false,
}: {
  candidate: RecruiterCandidateSearchItem;
  compact?: boolean;
}) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [sentInviteId, setSentInviteId] = useState<string | null>(null);
  const [saved, setSaved] = useState(candidate.is_shortlisted);
  const [hasInvite, setHasInvite] = useState(candidate.has_active_invite);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const invited = Boolean(hasInvite || sentInviteId);
  const initials = (candidate.full_name || "C")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const toggleShortlist = async () => {
    setBusy(true);
    setMessage(null);
    try {
      if (saved) {
        await removeRecruiterShortlist(candidate.candidate_id);
        setSaved(false);
      } else {
        await shortlistRecruiterCandidate(candidate.candidate_id);
        setSaved(true);
      }
    } catch (error) {
      setMessage(recruiterMarketplaceErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="rounded-[16px] border border-[var(--color-border)] bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[16px] bg-[var(--color-accent-light)] text-[18px] font-bold text-[var(--color-accent)]">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[18px] font-bold text-[var(--color-text-primary)]">{candidate.full_name || "Candidate"}</h2>
              <MarketplaceStatusBadge status={candidate.profile_status} label={candidate.profile_status} />
              {saved && <MarketplaceStatusBadge status="saved" label="Shortlisted" />}
              {invited && <MarketplaceStatusBadge status="pending" label="Invite sent" />}
            </div>
            <p className="mt-1 text-[14px] font-medium text-[var(--color-text-secondary)]">
              {candidate.target_role || "Target role"} - {candidate.location || candidate.university || "Location not listed"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[...candidate.skills, ...candidate.tech_stack].slice(0, compact ? 3 : 5).map((skill) => (
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
            <div className="font-mono text-[20px] font-bold text-[var(--color-verified)]">{Math.round(candidate.verified_score ?? 0)}</div>
            <div className="text-[10px] font-bold uppercase text-[var(--color-text-muted)]">Score</div>
          </div>
          <div>
            <div className="font-mono text-[20px] font-bold text-[var(--color-accent)]">{Math.round(candidate.semantic_match_percent)}%</div>
            <div className="text-[10px] font-bold uppercase text-[var(--color-text-muted)]">Match</div>
          </div>
          <div>
            <div className="text-[14px] font-bold text-[var(--color-text-primary)]">{candidate.assessment_status}</div>
            <div className="text-[10px] font-bold uppercase text-[var(--color-text-muted)]">Assessment</div>
          </div>
        </div>
      </div>

      {!compact && (
        <div className="mt-5 rounded-[12px] border border-[var(--color-accent-border)] bg-[var(--color-accent-light)] p-4">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[var(--color-accent)]">
            <Sparkles className="h-3.5 w-3.5" />
            AI semantic match explanation
          </div>
          <p className="text-[14px] leading-6 text-[var(--color-text-primary)]">{candidate.match_explanation}</p>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          disabled={busy}
          onClick={() => void toggleShortlist()}
          className="inline-flex items-center justify-center gap-2 rounded-[10px] border border-[var(--color-border)] px-4 py-2.5 text-[13px] font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]"
        >
          {saved ? <X className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          {saved ? "Remove Shortlist" : "Shortlist"}
        </button>
        <button
          type="button"
          disabled={invited}
          onClick={() => setInviteOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[var(--color-accent)] px-4 py-2.5 text-[13px] font-bold text-white hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {invited ? <CheckCircle2 className="h-4 w-4" /> : <CalendarPlus className="h-4 w-4" />}
          {invited ? "Invite Sent" : "Invite"}
        </button>
        <Link
          href={`/dashboard/company/candidate?candidateId=${candidate.candidate_id}`}
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
      {message && (
        <div className="mt-4 rounded-[12px] border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-semibold text-rose-700">
          {message}
        </div>
      )}

      <InviteComposer
        candidate={candidate}
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSent={(inviteId) => {
          setSentInviteId(inviteId);
          setHasInvite(true);
        }}
      />
    </article>
  );
}
