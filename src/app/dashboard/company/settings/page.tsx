"use client";

import Link from "next/link";
import { Building2, RefreshCw, Settings, ShieldCheck, UserRound } from "lucide-react";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { useMarketplaceStore } from "@/store/useMarketplaceStore";

export default function CompanySettingsPage() {
  const { currentRole, setRole, resetDemoMarketplace, savedCandidateIds, invites } = useMarketplaceStore();

  return (
    <main className="mx-auto w-full max-w-[900px] px-4 py-8 md:px-8">
      <Breadcrumbs
        backHref="/dashboard/company"
        items={[
          { label: "Company Dashboard", href: "/dashboard/company" },
          { label: "Settings" },
        ]}
      />

      <section className="rounded-[18px] border border-[var(--color-border)] bg-white p-6 shadow-sm">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--color-accent-light)] px-3 py-1 text-[11px] font-bold text-[var(--color-accent)]">
          <Settings className="h-3.5 w-3.5" />
          Demo settings
        </div>
        <h1 className="text-[30px] font-bold text-[var(--color-text-primary)]">Company Settings</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[var(--color-text-secondary)]">
          Manage recruiter demo state, company profile context, and local marketplace data.
        </p>

        <div className="mt-6 grid gap-5">
          <div className="rounded-[14px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-[var(--color-accent)]" />
                <div>
                  <h2 className="font-bold text-[var(--color-text-primary)]">Company profile</h2>
                  <p className="text-[13px] text-[var(--color-text-secondary)]">Acme Corp - recruiter demo account.</p>
                </div>
              </div>
              <Link href="/dashboard/company/analytics" className="rounded-[8px] bg-white px-3 py-2 text-[13px] font-bold text-[var(--color-text-primary)]">
                View analytics
              </Link>
            </div>
          </div>

          <div className="rounded-[14px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <UserRound className="h-5 w-5 text-[var(--color-accent)]" />
                <div>
                  <h2 className="font-bold text-[var(--color-text-primary)]">Demo role</h2>
                  <p className="text-[13px] text-[var(--color-text-secondary)]">Switch roles to verify cross-role invite state.</p>
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

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[14px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5">
              <ShieldCheck className="h-5 w-5 text-[var(--color-accent)]" />
              <div className="mt-3 text-[28px] font-bold text-[var(--color-text-primary)]">{savedCandidateIds.length}</div>
              <div className="text-[13px] font-bold text-[var(--color-text-secondary)]">Shortlisted candidates</div>
            </div>
            <div className="rounded-[14px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5">
              <ShieldCheck className="h-5 w-5 text-[var(--color-accent)]" />
              <div className="mt-3 text-[28px] font-bold text-[var(--color-text-primary)]">{invites.length}</div>
              <div className="text-[13px] font-bold text-[var(--color-text-secondary)]">Interview requests</div>
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
