"use client";

import { useLeaderboardStore } from "@/store/useLeaderboardStore";
import clsx from "clsx";

export default function LeaderboardPage() {
  const { activeFilter, setActiveFilter, filteredCandidates } = useLeaderboardStore();
  const candidates = filteredCandidates();

  const filters = ["All", "Frontend", "Backend", "AI/ML", "Mobile", "Data Science"];

  return (
    <main className="w-full max-w-[1200px] mx-auto px-12 py-page-xl">
      {/* Hero Section */}
      <section className="mb-section">
        <h1 className="font-text-h1 text-text-h1 mb-2 text-text-primary">Global Leaderboard</h1>
        <p className="font-text-body text-text-body text-text-muted">Top 1% technical talent verified by AI through rigorous skill assessments.</p>
      </section>

      {/* Filter Row */}
      <section className="mb-relaxed flex items-center gap-3 overflow-x-auto hide-scrollbar pb-2">
        {filters.map(filter => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={clsx(
              "px-5 py-2 rounded-full font-text-label text-text-label cursor-pointer active:scale-95 transition-all border",
              activeFilter === filter
                ? "bg-primary text-white border-primary"
                : "bg-white border-border-default text-text-secondary hover:border-primary hover:text-primary"
            )}
          >
            {filter}
          </button>
        ))}
      </section>

      {/* Leaderboard Table */}
      <section className="bg-white rounded-xl border border-border-default overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-bg-secondary border-b border-border-default">
              <th className="px-6 py-4 font-text-label text-text-label text-text-muted tracking-wider">RANK</th>
              <th className="px-6 py-4 font-text-label text-text-label text-text-muted tracking-wider">STUDENT</th>
              <th className="px-6 py-4 font-text-label text-text-label text-text-muted tracking-wider">SCORE</th>
              <th className="px-6 py-4 font-text-label text-text-label text-text-muted tracking-wider">SPECIALIZATION</th>
              <th className="px-6 py-4 font-text-label text-text-label text-text-muted tracking-wider text-center">PROJECTS</th>
              <th className="px-6 py-4 font-text-label text-text-label text-text-muted tracking-wider">AVAILABILITY</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-soft">
            {candidates.map((candidate) => {
              // Determine styles based on rank
              let rowStyle = "h-16 hover:bg-bg-subtle transition-colors";
              let rankStyle = "px-6 py-3 font-text-mono text-text-mono font-bold ";
              
              if (candidate.rank === 1) {
                rowStyle += " border-l-[3px] border-status-warning bg-[#FFFBEB]";
                rankStyle += "text-status-warning";
              } else if (candidate.rank === 2) {
                rowStyle += " border-l-[3px] border-[#94A3B8]";
                rankStyle += "text-[#64748B]";
              } else if (candidate.rank === 3) {
                rowStyle += " border-l-[3px] border-[#D97706]";
                rankStyle += "text-[#D97706]";
              } else {
                rankStyle = "px-6 py-3 font-text-mono text-text-mono text-text-muted";
              }

              // Availability Badge Style
              let availabilityStyle = "";
              if (candidate.availability === 'Open') {
                availabilityStyle = "bg-accent-verified-light text-status-success";
              } else if (candidate.availability === 'Interviewing') {
                availabilityStyle = "bg-blue-50 text-status-info";
              } else {
                availabilityStyle = "bg-gray-100 text-text-muted";
              }

              return (
                <tr key={candidate.id} className={rowStyle}>
                  <td className={rankStyle}>#{candidate.rank}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img alt={candidate.name} className="w-9 h-9 rounded-full bg-surface-container border border-white object-cover" src={candidate.image} />
                      <div>
                        <div className="font-text-label text-text-label text-text-primary">{candidate.name}</div>
                        <div className="text-[11px] text-text-muted">{candidate.university}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span className="bg-accent-verified-light text-status-success font-text-mono text-[13px] px-2 py-1 rounded-lg border border-accent-verified-border">
                      {candidate.score}
                    </span>
                  </td>
                  <td className="px-6 py-3 font-text-label text-text-label text-text-secondary">{candidate.specialization}</td>
                  <td className="px-6 py-3 font-text-label text-text-label text-text-secondary text-center">{candidate.projects}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${availabilityStyle}`}>
                      {candidate.availability}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Footer Section */}
      <footer className="mt-section py-relaxed flex flex-col md:flex-row justify-between items-center text-text-muted border-t border-border-soft">
        <div className="font-text-label text-text-label mb-4 md:mb-0">
          © 2024 XLR8Hire. All rights reserved. Top 1% Technical Assessment Platform.
        </div>
        <div className="flex gap-relaxed font-text-label text-text-label">
          <a className="hover:text-primary transition-colors" href="#">Privacy Policy</a>
          <a className="hover:text-primary transition-colors" href="#">Terms of Service</a>
          <a className="hover:text-primary transition-colors" href="#">Contact Support</a>
        </div>
      </footer>
    </main>
  );
}
