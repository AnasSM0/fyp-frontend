"use client";

import { useState } from "react";
import { CalendarPlus, Send, X } from "lucide-react";
import { createRecruiterInvite, recruiterMarketplaceErrorMessage } from "@/lib/api/recruiter-marketplace-service";
import { RecruiterCandidateSearchItem } from "@/lib/api/types";

export function InviteComposer({
  candidate,
  open,
  onClose,
  onSent,
}: {
  candidate: RecruiterCandidateSearchItem;
  open: boolean;
  onClose: () => void;
  onSent?: (inviteId: string) => void;
}) {
  const [role, setRole] = useState(candidate.target_role ?? "Interview Request");
  const [interviewMode, setInterviewMode] = useState<"online" | "onsite">("online");
  const [message, setMessage] = useState(
    `Your verified ${candidate.skills.slice(0, 2).join(" and ") || "technical"} signals match our team. We would like to request an interview.`
  );
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSend = async () => {
    setSending(true);
    setError(null);
    try {
      const invite = await createRecruiterInvite({
        candidate_id: candidate.candidate_id,
        proposed_role: role,
        interview_mode: interviewMode,
        message,
      });
      onSent?.(invite.id);
      onClose();
    } catch (requestError) {
      setError(recruiterMarketplaceErrorMessage(requestError));
    } finally {
      setSending(false);
    }
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
              Invite {candidate.full_name || "candidate"}
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
            Interview mode
            <select
              value={interviewMode}
              onChange={(event) => setInterviewMode(event.target.value as "online" | "onsite")}
              className="w-full rounded-[10px] border border-[var(--color-border)] px-3 py-2.5 text-[14px] font-medium outline-none focus:border-[var(--color-accent)]"
            >
              <option value="online">Online</option>
              <option value="onsite">Onsite</option>
            </select>
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

        {error && (
          <div className="mt-4 rounded-[12px] border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-semibold text-rose-700">
            {error}
          </div>
        )}

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
            disabled={sending}
            onClick={() => void handleSend()}
            className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[var(--color-accent)] px-4 py-2.5 text-[13px] font-bold text-white hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {sending ? "Sending..." : "Send Interview Request"}
          </button>
        </div>
      </div>
    </div>
  );
}
