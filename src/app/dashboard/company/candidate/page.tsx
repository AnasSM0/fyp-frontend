"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BadgeCheck, Bookmark, CalendarPlus, CheckCircle2, Code2, GraduationCap, MapPin, ShieldCheck, Sparkles, Star, X } from "lucide-react";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { InviteComposer } from "@/components/dashboard/invite-composer";
import { MarketplaceEmptyState } from "@/components/dashboard/marketplace-empty-state";
import { MarketplaceStatusBadge } from "@/components/dashboard/marketplace-status-badge";
import {
  getRecruiterCandidate,
  recruiterMarketplaceErrorMessage,
  removeRecruiterShortlist,
  shortlistRecruiterCandidate,
} from "@/lib/api/recruiter-marketplace-service";
import { RecruiterCandidateProfile, RecruiterCandidateSearchItem } from "@/lib/api/types";

const TABS = ["Overview", "Assessment Evidence", "Projects", "Recruiter Notes"];

function profileToSearchItem(profile: RecruiterCandidateProfile): RecruiterCandidateSearchItem {
  return {
    candidate_id: profile.candidate_id,
    profile_id: profile.profile_id,
    full_name: profile.full_name,
    target_role: profile.target_role,
    university: profile.university,
    degree: profile.degree,
    location: profile.location,
    skills: profile.skills,
    tech_stack: profile.tech_stack,
    verified_score: profile.verified_score,
    semantic_match_percent: Math.round(profile.verified_score ?? 0),
    match_explanation: profile.latest_report?.summary ?? "Verified candidate profile.",
    assessment_status: profile.latest_report ? "completed" : "missing",
    profile_status: "published",
    is_shortlisted: profile.is_shortlisted,
    has_active_invite: profile.has_active_invite,
    invite_status: profile.invite_status,
    latest_report_id: profile.latest_report?.report_id ?? null,
  };
}

export default function CandidateProfilePage() {
  const [candidate, setCandidate] = useState<RecruiterCandidateProfile | null>(null);
  const [activeTab, setActiveTab] = useState("Overview");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteSentId, setInviteSentId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [hasInvite, setHasInvite] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("candidateId");
    if (!id) {
      setError("No candidate selected.");
      return;
    }
    const selectedId = id;
    let cancelled = false;
    async function loadCandidate() {
      setError(null);
      try {
        const response = await getRecruiterCandidate(selectedId);
        if (cancelled) return;
        setCandidate(response);
        setIsSaved(response.is_shortlisted);
        setHasInvite(response.has_active_invite);
      } catch (requestError) {
        if (!cancelled) setError(recruiterMarketplaceErrorMessage(requestError));
      }
    }
    void loadCandidate();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleSaved = async () => {
    if (!candidate) return;
    setBusy(true);
    setError(null);
    try {
      if (isSaved) {
        await removeRecruiterShortlist(candidate.candidate_id);
        setIsSaved(false);
      } else {
        await shortlistRecruiterCandidate(candidate.candidate_id);
        setIsSaved(true);
      }
    } catch (requestError) {
      setError(recruiterMarketplaceErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  if (error && !candidate) {
    return (
      <main className="mx-auto w-full max-w-[900px] px-4 py-8 md:px-8">
        <Breadcrumbs backHref="/dashboard/company/search" items={[{ label: "Company Dashboard", href: "/dashboard/company" }, { label: "Discover", href: "/dashboard/company/search" }, { label: "Candidate" }]} />
        <MarketplaceEmptyState icon={ShieldCheck} title="Candidate profile unavailable" description={error} actionHref="/dashboard/company/search" actionLabel="Back to Discover" />
      </main>
    );
  }

  if (!candidate) {
    return <main className="mx-auto w-full max-w-[1180px] px-4 py-8 text-[14px] font-semibold text-[var(--color-text-secondary)] md:px-8">Loading candidate profile...</main>;
  }

  const searchItem = profileToSearchItem(candidate);
  const invited = hasInvite || Boolean(inviteSentId);
  const report = candidate.latest_report;

  return (
    <main className="mx-auto w-full max-w-[1180px] px-4 py-8 md:px-8">
      <Breadcrumbs backHref="/dashboard/company/search" backLabel="Back to Discover" items={[{ label: "Company Dashboard", href: "/dashboard/company" }, { label: "Discover", href: "/dashboard/company/search" }, { label: candidate.full_name || "Candidate" }]} />

      {error && <div className="mb-4 rounded-[12px] border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-semibold text-rose-700">{error}</div>}

      <section className="rounded-[20px] border border-[var(--color-border)] bg-white p-6 shadow-sm">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-5 md:flex-row">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[22px] border border-[var(--color-border)] bg-[var(--color-accent-light)] text-[28px] font-bold text-[var(--color-accent)]">
              {(candidate.full_name || "C").split(" ").map((part) => part[0]).join("").slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[34px] font-bold text-[var(--color-text-primary)]">{candidate.full_name || "Candidate"}</h1>
                <MarketplaceStatusBadge status="published" label="Published" />
                {isSaved && <MarketplaceStatusBadge status="saved" label="Shortlisted" />}
                {invited && <MarketplaceStatusBadge status="pending" label="Invite sent" />}
              </div>
              <p className="mt-2 text-[16px] font-semibold text-[var(--color-text-secondary)]">{candidate.target_role || "Target role not listed"}</p>
              <div className="mt-3 flex flex-wrap gap-4 text-[13px] font-medium text-[var(--color-text-secondary)]">
                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {candidate.location || "Location not listed"}</span>
                <span className="flex items-center gap-1.5"><GraduationCap className="h-4 w-4" /> {candidate.university || candidate.degree || "Education not listed"}</span>
                <span className="flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-[var(--color-verified)]" /> Verified score {Math.round(candidate.verified_score ?? 0)}</span>
              </div>
              <p className="mt-4 max-w-3xl text-[15px] leading-7 text-[var(--color-text-secondary)]">{report?.summary || "Assessment evidence is not available."}</p>
            </div>
          </div>

          <aside className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5">
            <div className="grid grid-cols-3 gap-3 text-center">
              <Score label="Verified" value={String(Math.round(candidate.verified_score ?? 0))} />
              <Score label="Profile" value={String(Math.round(candidate.profile_evidence_score))} />
              <Score label="Integrity" value={`-${Math.round(candidate.integrity_penalty)}`} />
            </div>
            <div className="mt-5 space-y-3">
              <button disabled={invited} onClick={() => setInviteOpen(true)} className="inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--color-accent)] px-4 py-3 text-[13px] font-bold text-white hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-70">
                {invited ? <CheckCircle2 className="h-4 w-4" /> : <CalendarPlus className="h-4 w-4" />}
                {invited ? "Invite Sent" : "Invite to Interview"}
              </button>
              <button disabled={busy} onClick={() => void toggleSaved()} className="inline-flex w-full items-center justify-center gap-2 rounded-[10px] border border-[var(--color-border)] bg-white px-4 py-3 text-[13px] font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-primary)] disabled:cursor-not-allowed disabled:opacity-60">
                {isSaved ? <X className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                {isSaved ? "Remove Shortlist" : "Save Profile"}
              </button>
              {invited && <Link href="/dashboard/company/offers" className="inline-flex w-full items-center justify-center gap-2 rounded-[10px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] font-bold text-emerald-700">View in Requests <ArrowRight className="h-4 w-4" /></Link>}
            </div>
          </aside>
        </div>
      </section>

      <nav className="mt-6 flex gap-2 overflow-x-auto border-b border-[var(--color-border)]">
        {TABS.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`shrink-0 px-4 py-3 text-[14px] font-bold ${activeTab === tab ? "border-b-2 border-[var(--color-accent)] text-[var(--color-accent)]" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"}`}>
            {tab}
          </button>
        ))}
      </nav>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {activeTab === "Overview" && (
            <>
              <Panel title="Verified Insights" icon={Sparkles}>
                <p className="text-[15px] leading-7 text-[var(--color-text-secondary)]">{report?.summary || "No report summary available."}</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {(report?.strengths || []).map((item) => (
                    <div key={item} className="flex gap-3 rounded-[12px] bg-[var(--color-bg-secondary)] p-4">
                      <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-verified)]" />
                      <span className="text-[13px] leading-6 text-[var(--color-text-primary)]">{item}</span>
                    </div>
                  ))}
                </div>
              </Panel>
              <Panel title="Skills And Stack" icon={Star}>
                <div className="flex flex-wrap gap-2">
                  {[...candidate.skills, ...candidate.tech_stack].map((skill) => (
                    <span key={skill} className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-1.5 text-[12px] font-bold text-[var(--color-text-secondary)]">{skill}</span>
                  ))}
                </div>
              </Panel>
            </>
          )}

          {activeTab === "Assessment Evidence" && (
            <Panel title="Assessment Evidence" icon={ShieldCheck}>
              <div className="space-y-4">
                {(report?.question_feedback_preview || []).map((item, index) => (
                  <div key={`${item.question_id ?? index}`} className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Question {index + 1}</div>
                    <p className="mt-2 text-[14px] leading-6 text-[var(--color-text-primary)]">{String(item.feedback || item.question_text || "Feedback unavailable.")}</p>
                  </div>
                ))}
                {(report?.growth_areas || []).map((item) => (
                  <div key={item} className="rounded-[12px] border border-[var(--color-border)] bg-white p-4 text-[14px] text-[var(--color-text-secondary)]">Growth area: {item}</div>
                ))}
              </div>
            </Panel>
          )}

          {activeTab === "Projects" && (
            <Panel title="Profile Evidence" icon={Code2}>
              <p className="text-[14px] leading-7 text-[var(--color-text-secondary)]">
                Profile evidence score: {Math.round(candidate.profile_evidence_score)}. Project details are shown only when the candidate profile/report exposes safe summary data.
              </p>
            </Panel>
          )}

          {activeTab === "Recruiter Notes" && (
            <Panel title="Recruiter Notes" icon={Bookmark}>
              <p className="text-[14px] leading-7 text-[var(--color-text-secondary)]">
                Private notes were skipped in this slice because the current database has no recruiter notes table. Shortlist and invite actions are persisted.
              </p>
            </Panel>
          )}
        </div>

        <aside className="space-y-5">
          <div className="rounded-[16px] border border-[var(--color-border)] bg-white p-5 shadow-sm">
            <h2 className="text-[13px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Profile Details</h2>
            <div className="mt-4 space-y-4 text-[14px]">
              <Detail label="Degree" value={candidate.degree || "Not listed"} />
              <Detail label="Academic score" value={String(Math.round(candidate.academic_score))} />
              <Detail label="Consistency" value={String(Math.round(candidate.consistency_score))} />
              <Detail label="Request status" value={candidate.invite_status || "No active request"} />
            </div>
          </div>
        </aside>
      </section>

      <InviteComposer candidate={searchItem} open={inviteOpen} onClose={() => setInviteOpen(false)} onSent={(inviteId) => { setInviteSentId(inviteId); setHasInvite(true); }} />
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

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof Sparkles; children: React.ReactNode }) {
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
