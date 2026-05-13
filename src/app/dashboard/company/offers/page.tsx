"use client";

import { Mail } from "lucide-react";
import { useMarketplaceStore } from "@/store/useMarketplaceStore";

export default function OffersPage() {
  const { invites } = useMarketplaceStore();

  return (
    <main className="mx-auto flex w-full max-w-[960px] flex-col gap-6 p-8">
      <div>
        <h1 className="text-[28px] font-bold text-[var(--color-text-primary)]">Interview Requests</h1>
        <p className="mt-2 text-[15px] text-[var(--color-text-secondary)]">Track recruiter requests sent to candidates.</p>
      </div>
      <section className="space-y-3">
        {invites.map((invite) => (
          <article key={invite.id} className="rounded-[14px] border border-[var(--color-border)] bg-white p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-bold text-[var(--color-text-primary)]">{invite.candidateName} - {invite.role}</h2>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{invite.message}</p>
              </div>
              <span className="rounded-full bg-[var(--color-bg-secondary)] px-3 py-1 text-xs font-bold capitalize text-[var(--color-text-secondary)]">{invite.status}</span>
            </div>
          </article>
        ))}
        {invites.length === 0 && (
          <div className="rounded-[16px] border border-dashed border-[var(--color-border)] bg-white p-8 text-center">
            <Mail className="mx-auto h-8 w-8 text-[var(--color-text-muted)]" />
            <p className="mt-3 text-sm font-semibold">No requests sent yet.</p>
          </div>
        )}
      </section>
    </main>
  );
}
