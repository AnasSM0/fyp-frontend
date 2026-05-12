"use client";

import Image from "next/image";
import Link from "next/link";
import { useCompanyStore } from "@/store/useCompanyStore";

export default function CompanyDashboard() {
  const { stats, searchQuery, setSearchQuery, filteredCandidates } = useCompanyStore();
  const candidates = filteredCandidates();

  return (
    <main className="w-full max-w-[1200px] mx-auto px-12 py-page-xl space-y-relaxed">
      {/* Header */}
      <section>
        <h2 className="font-text-h2 text-text-h2 text-text-primary">Good morning, Recruiters</h2>
        <p className="font-text-body text-text-body text-text-muted mt-1">Here is your talent pipeline today.</p>
      </section>

      {/* Analytics Horizontal Scroll */}
      <section className="flex gap-4 overflow-x-auto hide-scrollbar -mx-4 px-4">
        {/* Stat Card 1 */}
        <div className="flex-shrink-0 w-40 bg-white border border-border-default p-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-primary text-lg">bookmark</span>
            <span className="font-text-label text-text-label text-text-muted">Total Saved</span>
          </div>
          <div className="font-text-h3 text-text-h3">{stats.totalSaved}</div>
        </div>
        {/* Stat Card 2 */}
        <div className="flex-shrink-0 w-40 bg-white border border-border-default p-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-status-info text-lg">send</span>
            <span className="font-text-label text-text-label text-text-muted">Offers Sent</span>
          </div>
          <div className="font-text-h3 text-text-h3">{stats.offersSent}</div>
        </div>
        {/* Stat Card 3 */}
        <div className="flex-shrink-0 w-40 bg-white border border-border-default p-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-status-success text-lg">check_circle</span>
            <span className="font-text-label text-text-label text-text-muted">Accepted</span>
          </div>
          <div className="font-text-h3 text-text-h3">{stats.offersAccepted}</div>
        </div>
      </section>

      {/* Search & Filters */}
      <section className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-grow">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">search</span>
            <input 
              className="w-full h-12 pl-10 pr-4 bg-white border border-border-default rounded-lg focus:ring-2 focus:ring-primary focus:border-primary font-text-body text-text-body" 
              placeholder="Search talent by skill, role, or ID" 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="w-12 h-12 flex items-center justify-center border border-border-default rounded-lg bg-white hover:bg-bg-subtle transition-colors">
            <span className="material-symbols-outlined text-text-primary">tune</span>
          </button>
        </div>
        {/* Filter Chips */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4">
          <button className="flex-shrink-0 px-4 py-2 border border-border-default rounded-full bg-white font-text-label text-text-label flex items-center gap-1">
            Location <span className="material-symbols-outlined text-sm">expand_more</span>
          </button>
          <button className="flex-shrink-0 px-4 py-2 border border-border-default rounded-full bg-white font-text-label text-text-label flex items-center gap-1">
            Experience <span className="material-symbols-outlined text-sm">expand_more</span>
          </button>
          <button className="flex-shrink-0 px-4 py-2 border border-border-default rounded-full bg-white font-text-label text-text-label flex items-center gap-1">
            Min Score <span className="material-symbols-outlined text-sm">expand_more</span>
          </button>
          <button className="flex-shrink-0 px-4 py-2 border border-border-default rounded-full bg-white font-text-label text-text-label flex items-center gap-1">
            Remote
          </button>
        </div>
      </section>

      {/* Candidate Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-24">
        {candidates.map((candidate) => (
          <div key={candidate.id} className="bg-white border border-border-default rounded-xl p-6 space-y-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full overflow-hidden border border-border-soft">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt={candidate.name} src={candidate.image}/>
                </div>
                <div>
                  <h3 className="font-text-h3 text-[18px] text-text-primary font-bold">{candidate.name}</h3>
                  <p className="font-text-body text-text-label text-text-muted">{candidate.role}</p>
                </div>
              </div>
              {/* Score Ring */}
              <div className="relative w-12 h-12 flex items-center justify-center">
                <svg className="score-ring w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path className="text-border-soft" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="100, 100" strokeWidth="3"></path>
                  <path className="text-status-success" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray={`${candidate.score}, 100`} strokeWidth="3"></path>
                </svg>
                <span className="absolute font-text-mono text-text-mono text-[11px] text-status-success">{candidate.score}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {candidate.skills.map(skill => (
                <span key={skill} className="px-3 py-1 bg-bg-subtle text-text-secondary rounded-full font-text-label text-[12px]">{skill}</span>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <button className="w-10 h-10 flex items-center justify-center border border-border-default rounded-lg hover:bg-bg-subtle transition-colors">
                <span className="material-symbols-outlined text-text-muted text-[20px]">bookmark</span>
              </button>
              <button className="flex-grow h-10 bg-primary text-white font-text-label text-text-label rounded-lg hover:bg-accent-primary-hover transition-colors">
                View Profile
              </button>
            </div>
          </div>
        ))}
      </section>

    </main>
}
