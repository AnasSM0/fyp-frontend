"use client";

import Link from "next/link";
import { RefreshCw, Settings, ShieldCheck, UserRound } from "lucide-react";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { MarketplaceStatusBadge } from "@/components/dashboard/marketplace-status-badge";
import { useMarketplaceStore } from "@/store/useMarketplaceStore";

export default function StudentSettingsPage() {
  const {
    availabilityStatus,
    currentRole,
    profilePublished,
    setAvailabilityStatus,
    setRole,
    resetDemoMarketplace,
  } = useMarketplaceStore();

  return (
    <main className="mx-auto w-full max-w-[900px] px-4 py-8 md:px-8">
      <Breadcrumbs
        backHref="/dashboard/student"
        items={[
          { label: "Student Dashboard", href: "/dashboard/student" },
          { label: "Settings" },
        ]}
      />

      <section className="rounded-[18px] border border-[var(--color-border)] bg-white p-6 shadow-sm">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--color-accent-light)] px-3 py-1 text-[11px] font-bold text-[var(--color-accent)]">
          <Settings className="h-3.5 w-3.5" />
          Demo settings
        </div>
        <h1 className="text-[30px] font-bold text-[var(--color-text-primary)]">Candidate Settings</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[var(--color-text-secondary)]">
          Manage demo role, availability, profile state, and local marketplace data.
        </p>

        <div className="mt-6 grid gap-5">
          <div className="rounded-[14px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <UserRound className="h-5 w-5 text-[var(--color-accent)]" />
                <div>
                  <h2 className="font-bold text-[var(--color-text-primary)]">Demo role</h2>
                  <p className="text-[13px] text-[var(--color-text-secondary)]">Switch roles for cross-flow testing.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setRole("candidate")} className={`rounded-[8px] px-3 py-2 text-[13px] font-bold ${currentRole === "candidate" ? "bg-[var(--color-accent)] text-white" : "bg-white text-[var(--color-text-secondary)]"}`}>
                  Candidate
                </button>
                <button onClick={() => setRole("recruiter")} className={`rounded-[8px] px-3 py-2 text-[13px] font-bold ${currentRole === "recruiter" ? "bg-[var(--color-accent)] text-white" : "bg-white text-[var(--color-text-secondary)]"}`}>
                  Recruiter
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-[14px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-[var(--color-accent)]" />
                <div>
                  <h2 className="font-bold text-[var(--color-text-primary)]">Profile visibility</h2>
                  <p className="text-[13px] text-[var(--color-text-secondary)]">Published profiles can receive recruiter requests.</p>
                </div>
              </div>
              <MarketplaceStatusBadge status={profilePublished ? "published" : "unpublished"} label={profilePublished ? "Published" : "Unpublished"} />
            </div>
            <Link href="/dashboard/student/visibility" className="inline-flex rounded-[8px] bg-white px-3 py-2 text-[13px] font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-primary)]">
              Manage profile visibility
            </Link>
          </div>

          <div className="rounded-[14px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5">
            <h2 className="font-bold text-[var(--color-text-primary)]">Availability</h2>
            <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">Choose how recruiters should interpret your current search status.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["open", "interviewing", "paused"].map((status) => (
                <button
                  key={status}
                  onClick={() => setAvailabilityStatus(status as "open" | "interviewing" | "paused")}
                  className={`rounded-[8px] px-3 py-2 text-[13px] font-bold capitalize ${availabilityStatus === status ? "bg-[var(--color-accent)] text-white" : "bg-white text-[var(--color-text-secondary)]"}`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[14px] border border-rose-100 bg-rose-50 p-5">
            <h2 className="font-bold text-rose-900">Reset demo marketplace</h2>
            <p className="mt-1 text-[13px] text-rose-700">Clears localStorage demo state and restores seeded invites.</p>
            <button onClick={resetDemoMarketplace} className="mt-4 inline-flex items-center gap-2 rounded-[8px] bg-white px-3 py-2 text-[13px] font-bold text-rose-700">
              <RefreshCw className="h-4 w-4" />
              Reset demo state
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
