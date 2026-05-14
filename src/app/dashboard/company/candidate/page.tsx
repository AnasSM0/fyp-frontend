"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Bookmark,
  CalendarPlus,
  CheckCircle2,
  Code2,
  GraduationCap,
  MapPin,
  ShieldCheck,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { InviteComposer } from "@/components/dashboard/invite-composer";
import { MarketplaceStatusBadge } from "@/components/dashboard/marketplace-status-badge";
import { getCandidateById, PRIMARY_STUDENT_ID } from "@/lib/mock-marketplace";
import { useMarketplaceStore } from "@/store/useMarketplaceStore";

const TABS = ["Overview", "Assessment Evidence", "Projects", "Recruiter Notes"];

export default function CandidateProfilePage() {
  const [candidateId, setCandidateId] = useState(PRIMARY_STUDENT_ID);
  const [activeTab, setActiveTab] = useState("Overview");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteSentId, setInviteSentId] = useState<string | null>(null);
  const [cvDownloaded, setCvDownloaded] = useState(false);
  const [archived, setArchived] = useState(false);
  const { savedCandidateIds, toggleSavedCandidate, invites } = useMarketplaceStore();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCandidateId(params.get("candidateId") ?? PRIMARY_STUDENT_ID);
  }, []);

  const candidate = getCandidateById(candidateId);
  const isSaved = savedCandidateIds.includes(candidate.id);
  const existingInvite = invites.find(
    (invite) => invite.candidateId === candidate.id && invite.status === "pending"
  );
  const invited = Boolean(existingInvite || inviteSentId);

  return (
    <main className="mx-auto w-full max-w-[1180px] px-4 py-8 md:px-8">
      <Breadcrumbs
        backHref="/dashboard/company/search"
        backLabel="Back to Discover"
        items={[
          { label: "Company Dashboard", href: "/dashboard/company" },
          { label: "Discover", href: "/dashboard/company/search" },
          { label: candidate.name },
        ]}
      />

      <section className="rounded-[20px] border border-[var(--color-border)] bg-white p-6 shadow-sm">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-5 md:flex-row">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-[22px] border border-[var(--color-border)] bg-[var(--color-accent-light)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={candidate.image} alt={candidate.name} className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[34px] font-bold text-[var(--color-text-primary)]">{candidate.name}</h1>
                <MarketplaceStatusBadge status={candidate.availability.toLowerCase()} label={candidate.availability} />
                {isSaved && <MarketplaceStatusBadge status="saved" label="Shortlisted" />}
                {invited && <MarketplaceStatusBadge status="pending" label="Invite sent" />}
              </div>
              <p className="mt-2 text-[16px] font-semibold text-[var(--color-text-secondary)]">{candidate.role}</p>
              <div className="mt-3 flex flex-wrap gap-4 text-[13px] font-medium text-[var(--color-text-secondary)]">
                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {candidate.location}</span>
                <span className="flex items-center gap-1.5"><GraduationCap className="h-4 w-4" /> {candidate.education}</span>
                <span className="flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-[var(--color-verified)]" /> {candidate.percentile}</span>
              </div>
              <p className="mt-4 max-w-3xl text-[15px] leading-7 text-[var(--color-text-secondary)]">{candidate.reasoning}</p>
            </div>
          </div>

          <aside className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5">
            <div className="grid grid-cols-3 gap-3 text-center">
              <Score label="XLR8" value={String(candidate.score)} />
              <Score label="Match" value={`${candidate.matchScore}%`} />
              <Score label="Rank" value={candidate.percentile} />
            </div>
            <div className="mt-5 space-y-3">
              <button
                onClick={() => setInviteOpen(true)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--color-accent)] px-4 py-3 text-[13px] font-bold text-white hover:bg-[var(--color-accent-hover)]"
              >
                {invited ? <CheckCircle2 className="h-4 w-4" /> : <CalendarPlus className="h-4 w-4" />}
                {invited ? "Invite Sent" : "Invite to Interview"}
              </button>
              <button
                onClick={() => toggleSavedCandidate(candidate.id)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-[10px] border border-[var(--color-border)] bg-white px-4 py-3 text-[13px] font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-primary)]"
              >
                {isSaved ? <X className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                {isSaved ? "Remove Shortlist" : "Save Profile"}
              </button>
              {invited && (
                <Link href="/dashboard/company/offers" className="inline-flex w-full items-center justify-center gap-2 rounded-[10px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] font-bold text-emerald-700">
                  View in Requests
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </aside>
        </div>
      </section>

      <nav className="mt-6 flex gap-2 overflow-x-auto border-b border-[var(--color-border)]">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 px-4 py-3 text-[14px] font-bold ${
              activeTab === tab
                ? "border-b-2 border-[var(--color-accent)] text-[var(--color-accent)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {activeTab === "Overview" && (
            <>
              <Panel title="AI Verified Insights" icon={Sparkles}>
                <p className="text-[15px] leading-7 text-[var(--color-text-secondary)]">{candidate.reasoning}</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {candidate.evidence.map((item) => (
                    <div key={item} className="flex gap-3 rounded-[12px] bg-[var(--color-bg-secondary)] p-4">
                      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-verified)]" />
                      <span className="text-[13px] leading-6 text-[var(--color-text-primary)]">{item}</span>
                    </div>
                  ))}
                </div>
              </Panel>
              <Panel title="Skill Vectors" icon={Star}>
                <div className="flex flex-wrap gap-2">
                  {candidate.skills.map((skill) => (
                    <span key={skill} className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-1.5 text-[12px] font-bold text-[var(--color-text-secondary)]">
                      {skill}
                    </span>
                  ))}
                </div>
              </Panel>
            </>
          )}

          {activeTab === "Assessment Evidence" && (
            <Panel title="Verified Assessment Evidence" icon={ShieldCheck}>
              <div className="space-y-4">
                {candidate.evidence.map((item, index) => (
                  <div key={item} className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Evidence {index + 1}</div>
                    <p className="mt-2 text-[14px] leading-6 text-[var(--color-text-primary)]">{item}</p>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {activeTab === "Projects" && (
            <Panel title="Featured Projects" icon={Code2}>
              <div className="grid gap-4 sm:grid-cols-2">
                {candidate.projects.map((project) => (
                  <div key={project} className="rounded-[14px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
                    <h3 className="font-bold text-[var(--color-text-primary)]">{project}</h3>
                    <p className="mt-2 text-[13px] leading-6 text-[var(--color-text-secondary)]">
                      Project evidence connected to the candidate's verified profile.
                    </p>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {activeTab === "Recruiter Notes" && (
            <Panel title="Recruiter Notes" icon={Bookmark}>
              <p className="text-[14px] leading-7 text-[var(--color-text-secondary)]">
                Saved notes are represented by the shortlist and invite note in this demo. Use the invite composer to record the outreach rationale.
              </p>
            </Panel>
          )}
        </div>

        <aside className="space-y-5">
          <div className="rounded-[16px] border border-[var(--color-border)] bg-white p-5 shadow-sm">
            <h2 className="text-[13px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Profile Details</h2>
            <div className="mt-4 space-y-4 text-[14px]">
              <Detail label="Availability" value={candidate.availability} />
              <Detail label="Expected range" value={candidate.salaryRange} />
              <Detail label="Opportunity type" value={candidate.opportunityType} />
              <Detail label="Experience" value={candidate.experience} />
            </div>
          </div>

          <div className="rounded-[16px] border border-[var(--color-border)] bg-white p-5 shadow-sm">
            <h2 className="text-[13px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Secondary Actions</h2>
            <div className="mt-4 space-y-2">
              <button onClick={() => setCvDownloaded(true)} className="w-full rounded-[10px] border border-[var(--color-border)] px-4 py-3 text-left text-[13px] font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]">
                {cvDownloaded ? "CV added to demo export" : "Download CV"}
              </button>
              <button onClick={() => setArchived(true)} className="w-full rounded-[10px] border border-[var(--color-border)] px-4 py-3 text-left text-[13px] font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]">
                {archived ? "Candidate archived" : "Archive candidate"}
              </button>
            </div>
          </div>
        </aside>
      </section>

      <InviteComposer
        candidate={candidate}
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSent={(inviteId) => setInviteSentId(inviteId)}
      />
    </main>
  );
}

function Score({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] bg-white p-3">
      <div className="font-mono text-[20px] font-bold text-[var(--color-accent)]">{value}</div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">{label}</div>
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Sparkles;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[16px] border border-[var(--color-border)] bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[var(--color-accent-light)] text-[var(--color-accent)]">
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="text-[20px] font-bold text-[var(--color-text-primary)]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--color-border-subtle)] pb-3 last:border-0 last:pb-0">
      <span className="text-[var(--color-text-muted)]">{label}</span>
      <span className="text-right font-bold text-[var(--color-text-primary)]">{value}</span>
    </div>
  );
}
