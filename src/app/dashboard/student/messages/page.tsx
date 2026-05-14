import Link from "next/link";
import { Inbox, MessageSquare } from "lucide-react";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { MarketplaceEmptyState } from "@/components/dashboard/marketplace-empty-state";

export default function StudentMessagesPage() {
  return (
    <main className="mx-auto w-full max-w-[960px] px-4 py-8 md:px-8">
      <Breadcrumbs
        backHref="/dashboard/student"
        items={[
          { label: "Student Dashboard", href: "/dashboard/student" },
          { label: "Messages" },
        ]}
      />
      <section className="mb-6 rounded-[18px] border border-[var(--color-border)] bg-white p-6 shadow-sm">
        <h1 className="text-[28px] font-bold text-[var(--color-text-primary)]">Messages</h1>
        <p className="mt-2 text-[15px] leading-7 text-[var(--color-text-secondary)]">
          In the demo MVP, recruiter conversations start as interview requests. Accepted requests become message threads.
        </p>
      </section>
      <MarketplaceEmptyState
        icon={MessageSquare}
        title="No active message threads"
        description="Accept a recruiter request to open a conversation with the company."
        actionHref="/dashboard/student/requests"
        actionLabel="Review recruiter requests"
      />
      <div className="mt-5 rounded-[14px] border border-[var(--color-border)] bg-white p-5">
        <div className="flex items-center gap-3">
          <Inbox className="h-5 w-5 text-[var(--color-accent)]" />
          <div>
            <h2 className="font-bold text-[var(--color-text-primary)]">Request inbox drives messages</h2>
            <p className="text-[13px] text-[var(--color-text-secondary)]">
              Recruiters apply to you first. You stay in control by accepting or declining.
            </p>
          </div>
        </div>
        <Link href="/dashboard/student/requests" className="mt-4 inline-flex rounded-[8px] bg-[var(--color-accent)] px-4 py-2 text-sm font-bold text-white">
          Open Requests
        </Link>
      </div>
    </main>
  );
}
