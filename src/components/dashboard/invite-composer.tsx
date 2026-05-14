"use client";

import { useState } from "react";
import { CalendarPlus, Send, X } from "lucide-react";
import { MockCandidate } from "@/lib/mock-marketplace";
import { useMarketplaceStore } from "@/store/useMarketplaceStore";

export function InviteComposer({
  candidate,
  open,
  onClose,
  onSent,
}: {
  candidate: MockCandidate;
  open: boolean;
  onClose: () => void;
  onSent?: (inviteId: string) => void;
}) {
  const { sendInvite } = useMarketplaceStore();
  const [role, setRole] = useState(candidate.role);
  const [salaryRange, setSalaryRange] = useState(candidate.salaryRange);
  const [opportunityType, setOpportunityType] = useState(candidate.opportunityType);
  const [interviewWindow, setInterviewWindow] = useState("This week");
  const [message, setMessage] = useState(
    `Your verified ${candidate.skills.slice(0, 2).join(" and ")} signals match our team. We would like to request an interview.`
  );
  const [note, setNote] = useState("Semantic match and verified assessment evidence reviewed.");

  if (!open) return null;

  const handleSend = () => {
    const inviteId = sendInvite({
      candidateId: candidate.id,
      candidateName: candidate.name,
      company: "Acme Corp",
      role,
      location: candidate.location,
      salaryRange,
      opportunityType,
      interviewWindow,
      message,
      note,
    });
    onSent?.(inviteId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4">
      <div className="w-full max-w-2xl rounded-[18px] border border-[var(--color-border)] bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent-light)] px-3 py-1 text-[11px] font-bold text-[var(--color-accent)]">
              <CalendarPlus className="h-3.5 w-3.5" />
              Recruiter request
            </div>
            <h2 className="mt-3 text-[24px] font-bold text-[var(--color-text-primary)]">
              Invite {candidate.name}
            </h2>
            <p className="mt-1 text-[14px] text-[var(--color-text-secondary)]">
              This request appears in the candidate's recruiter requests inbox and updates your Requests tracker.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close invite composer"
            className="rounded-[10px] p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-[13px] font-bold text-[var(--color-text-primary)]">
            Role / title
            <input
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="w-full rounded-[10px] border border-[var(--color-border)] px-3 py-2.5 text-[14px] font-medium outline-none focus:border-[var(--color-accent)]"
            />
          </label>
          <label className="space-y-2 text-[13px] font-bold text-[var(--color-text-primary)]">
            Salary range
            <input
              value={salaryRange}
              onChange={(event) => setSalaryRange(event.target.value)}
              className="w-full rounded-[10px] border border-[var(--color-border)] px-3 py-2.5 text-[14px] font-medium outline-none focus:border-[var(--color-accent)]"
            />
          </label>
          <label className="space-y-2 text-[13px] font-bold text-[var(--color-text-primary)]">
            Opportunity type
            <input
              value={opportunityType}
              onChange={(event) => setOpportunityType(event.target.value)}
              className="w-full rounded-[10px] border border-[var(--color-border)] px-3 py-2.5 text-[14px] font-medium outline-none focus:border-[var(--color-accent)]"
            />
          </label>
          <label className="space-y-2 text-[13px] font-bold text-[var(--color-text-primary)]">
            Interview window
            <input
              value={interviewWindow}
              onChange={(event) => setInterviewWindow(event.target.value)}
              className="w-full rounded-[10px] border border-[var(--color-border)] px-3 py-2.5 text-[14px] font-medium outline-none focus:border-[var(--color-accent)]"
            />
          </label>
        </div>

        <label className="mt-4 block space-y-2 text-[13px] font-bold text-[var(--color-text-primary)]">
          Message to candidate
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={4}
            className="w-full resize-none rounded-[10px] border border-[var(--color-border)] px-3 py-2.5 text-[14px] font-medium leading-6 outline-none focus:border-[var(--color-accent)]"
          />
        </label>

        <label className="mt-4 block space-y-2 text-[13px] font-bold text-[var(--color-text-primary)]">
          Internal note
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="w-full rounded-[10px] border border-[var(--color-border)] px-3 py-2.5 text-[14px] font-medium outline-none focus:border-[var(--color-accent)]"
          />
        </label>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] border border-[var(--color-border)] px-4 py-2.5 text-[13px] font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[var(--color-accent)] px-4 py-2.5 text-[13px] font-bold text-white hover:bg-[var(--color-accent-hover)]"
          >
            <Send className="h-4 w-4" />
            Send Interview Request
          </button>
        </div>
      </div>
    </div>
  );
}
