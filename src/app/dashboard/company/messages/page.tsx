"use client";

import Link from "next/link";
import { MessageSquare, Send } from "lucide-react";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { MarketplaceEmptyState } from "@/components/dashboard/marketplace-empty-state";
import { MarketplaceStatusBadge } from "@/components/dashboard/marketplace-status-badge";
import { useMarketplaceStore } from "@/store/useMarketplaceStore";

export default function CompanyMessagesPage() {
  const { invites } = useMarketplaceStore();
  const accepted = invites.filter((invite) => invite.status === "accepted");

  return (
    <main className="mx-auto w-full max-w-[980px] px-4 py-8 md:px-8">
      <Breadcrumbs
        backHref="/dashboard/company"
        items={[
          { label: "Company Dashboard", href: "/dashboard/company" },
          { label: "Messages" },
        ]}
      />
      <section className="mb-6 rounded-[18px] border border-[var(--color-border)] bg-white p-6 shadow-sm">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--color-accent-light)] px-3 py-1 text-[11px] font-bold text-[var(--color-accent)]">
          <MessageSquare className="h-3.5 w-3.5" />
          Recruiter messages
        </div>
        <h1 className="text-[30px] font-bold text-[var(--color-text-primary)]">Messages</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[var(--color-text-secondary)]">
          In this demo, message threads open after a candidate accepts an interview request.
        </p>
      </section>

      {accepted.length > 0 ? (
        <section className="space-y-4">
          {accepted.map((invite) => (
            <article key={invite.id} className="rounded-[16px] border border-[var(--color-border)] bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[18px] font-bold text-[var(--color-text-primary)]">{invite.candidateName}</h2>
                    <MarketplaceStatusBadge status={invite.status} />
                  </div>
                  <p className="mt-1 text-[14px] text-[var(--color-text-secondary)]">{invite.role} - {invite.interviewWindow}</p>
                </div>
                <Link href={`/dashboard/company/candidate?candidateId=${invite.candidateId}`} className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-[var(--color-accent)] px-4 py-3 text-[13px] font-bold text-white">
                  <Send className="h-4 w-4" />
                  Open thread
                </Link>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <MarketplaceEmptyState
          icon={MessageSquare}
          title="No open recruiter conversations"
          description="Send an interview request and wait for the candidate to accept. Accepted requests become message threads."
          actionHref="/dashboard/company/offers"
          actionLabel="View Requests"
        />
      )}
    </main>
  );
}
