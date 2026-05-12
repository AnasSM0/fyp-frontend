"use client";

import { motion } from "framer-motion";
import { fadeUp, staggerContainer, staggerItem, cardHover } from "@/lib/motion";
import { 
  Trophy, Brain, Terminal, Briefcase, 
  MapPin, CheckCircle2, ChevronRight,
  Medal, Star
} from "lucide-react";
import { AnimatedScoreRing } from "@/components/ui/animated-score-ring";

// Mock Backend Data tailored to "Senior Frontend Engineer" search
const topCandidates = [
  {
    id: "c1",
    rank: 1,
    name: "Marcus Johnson",
    role: "Lead Fullstack Developer",
    score: 98,
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAbEmUiIf0cYg7tIYGek3hHvpSj8BiRZw2OWpkWo0kc0skvjf3b0d-CG7nGcDSJyawA67bqZRMBxVNjF3Dvc4unLo2eitlIks7x9zD7-lKj_dHzkYVvG3szZ6YpVRczqPZiLugz9aJMMatnYCm6sD8kz8BbptTqsl1RiAr6fCwhOTE3NK8XvbFpJ7H47sw9QNo8DJpma2Z1f5zRkKfW7-qYk1HFEZiuzhqpaf4I-_Ta2kZp25XHBZMYcmjxBnzCLMg7GvEjCC-q2vP_",
    skills: ["React", "TypeScript", "System Design"],
    experience: "7 Years • FinTech",
    aiSummary: "Perfect semantic fit. Marcus possesses advanced architectural patterns in React and has successfully led migrations similar to your current stack requirements. Elite system design scores.",
    color: "var(--color-warning)" // Gold
  },
  {
    id: "c2",
    rank: 2,
    name: "Sarah Chen",
    role: "Senior Frontend Engineer",
    score: 94,
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAxiOqvEPzioj9Z3ZrDU7xTMIuSicOeAms8nGsY68almMZcgopb2e36CcW6E8SdZ8OeVArjbStbTj7CzVnXlfrdZC9_ru_1CNFJbPKRXt0bQfFoe_MBxAVkL1OtMARzeXaMvv5ZU8Ro1z1GHTUQr584hcB7Uw_iAms2SMv3zMl7Jm5wpSUYWPGsa7MKeIfgUHVuL5m2OxJPNfR1yJ_rlpWJuSR3rw9_jxN2yqmWOA2XOqN09O749nNWkoxFFTF9bwd8dRdmfHgZqckM",
    skills: ["Vue", "React", "Mentorship"],
    experience: "5 Years • Startup",
    aiSummary: "Highly relevant. Sarah recently completed a complex Vue-to-React migration. Exceptional communication scores and strong cultural fit for autonomous teams.",
    color: "var(--color-text-muted)" // Silver
  },
  {
    id: "c3",
    rank: 3,
    name: "Elena Rodriguez",
    role: "UI/UX Developer",
    score: 91,
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuBxhFCdCGDtTZbfHBLNBpJZ-BuF3tYyUc4NGzhT2JGNhDVcbrHWzQ1VpiyhZD6K1rq87VDfUklhA4dpMbLT9SyDzy18MIc9xLURTvIokhTabK6PpiFemVQO2NRLK7ulXWU-O0nNU06d-UK3UrsPMGEV8bQH7ic2BYCYB65oDpFGMt2C3be_s_TCfl7K-ZBdj5bBHFtU3yl-Ih8cLC8-WYLHdGLvNxGynG3NcWG-UcbYg-V7FrGeOC_KkJfNdfJnbrpe21Ao-GO_sPzQ",
    skills: ["React", "Framer Motion", "CSS"],
    experience: "4 Years • Agency",
    aiSummary: "Strong technical depth in UI execution. If your role requires heavy animation and pixel-perfect design system implementation, Elena is a top-tier candidate.",
    color: "#cd7f32" // Bronze
  }
];

const extendedCandidates = [
  { id: "c4", rank: 4, name: "David Kim", role: "Frontend Engineer", experience: "4 Years • E-commerce", score: 88, skills: ["React", "Next.js", "Tailwind"] },
  { id: "c5", rank: 5, name: "Priya Patel", role: "Software Engineer III", experience: "6 Years • HealthTech", score: 85, skills: ["TypeScript", "GraphQL", "React"] },
  { id: "c6", rank: 6, name: "James Wilson", role: "Web Developer", experience: "3 Years • Agency", score: 82, skills: ["JavaScript", "Vue", "CSS"] },
  { id: "c7", rank: 7, name: "Anita Freeman", role: "Frontend Developer", experience: "5 Years • SaaS", score: 79, skills: ["React", "Redux", "Jest"] }
];

export default function LeaderboardPage() {
  return (
    <main className="flex-1 flex flex-col p-[24px] md:p-[64px] max-w-[1200px] mx-auto w-full gap-[48px]">
      
      {/* Header */}
      <motion.section initial="hidden" animate="visible" variants={fadeUp} className="flex flex-col gap-[16px]">
        <div>
          <h2 className="text-[36px] font-bold leading-[1.15] tracking-tight text-[var(--color-text-primary)]">Search Results Leaderboard</h2>
          <p className="text-[15px] leading-[1.6] text-[var(--color-text-secondary)] max-w-2xl mt-[8px]">
            AI-ranked engineering candidates for <span className="font-semibold text-[var(--color-accent)]">"Senior Frontend Engineer"</span>, evaluated using semantic vector analysis and verified technical assessments.
          </p>
        </div>
      </motion.section>

      {/* Top 3 AI Podium */}
      <motion.section initial="hidden" animate="visible" variants={staggerContainer} className="grid grid-cols-1 lg:grid-cols-3 gap-[24px] items-stretch">
        
        {/* Silver (Rank 2) */}
        <PodiumCard candidate={topCandidates[1]} className="lg:order-1 mt-[24px]" />
        
        {/* Gold (Rank 1) - Emphasized */}
        <PodiumCard candidate={topCandidates[0]} className="lg:order-2 border-[var(--color-accent-border)] shadow-[0_0_40px_rgba(79,70,229,0.1)] relative z-10 scale-100 lg:scale-105" isGold />
        
        {/* Bronze (Rank 3) */}
        <PodiumCard candidate={topCandidates[2]} className="lg:order-3 mt-[24px]" />

      </motion.section>

      {/* Extended Leaderboard List */}
      <motion.section initial="hidden" animate="visible" variants={staggerContainer} className="flex flex-col gap-[16px] mt-[24px]">
        <div className="flex justify-between items-end border-b border-[var(--color-border)] pb-[16px] mb-[8px]">
          <h3 className="text-[22px] font-semibold leading-[1.3] text-[var(--color-text-primary)]">Highly Relevant Candidates</h3>
          <span className="text-[13px] font-medium text-[var(--color-text-secondary)]">Showing Ranks 4-7</span>
        </div>

        {extendedCandidates.map((cand) => (
          <motion.div 
            key={cand.id} 
            variants={staggerItem}
            whileHover={cardHover.whileHover}
            className="flex flex-col md:flex-row items-center justify-between bg-white border border-[var(--color-border)] rounded-[12px] p-[16px] gap-[16px] shadow-sm cursor-pointer"
          >
            {/* Rank & Identity */}
            <div className="flex items-center gap-[16px] min-w-[240px]">
              <div className="w-[32px] h-[32px] rounded-full bg-[var(--color-bg-subtle)] border border-[var(--color-border)] flex items-center justify-center font-bold text-[13px] text-[var(--color-text-secondary)] shrink-0">
                {cand.rank}
              </div>
              <div className="w-[48px] h-[48px] rounded-full bg-[var(--color-bg-secondary)] overflow-hidden shrink-0">
                 {/* Placeholder Avatar */}
                 <div className="w-full h-full bg-[var(--color-accent-light)] flex items-center justify-center text-[var(--color-accent)] font-bold text-[16px]">
                   {cand.name.charAt(0)}
                 </div>
              </div>
              <div>
                <h4 className="text-[15px] font-semibold text-[var(--color-text-primary)]">{cand.name}</h4>
                <p className="text-[13px] text-[var(--color-text-secondary)]">{cand.role}</p>
              </div>
            </div>

            {/* Experience & Skills */}
            <div className="flex-1 flex flex-col md:flex-row items-start md:items-center justify-between gap-[16px] px-[16px] w-full border-t md:border-t-0 md:border-l border-[var(--color-border-subtle)] pt-[12px] md:pt-0">
              <div className="flex items-center gap-[8px] text-[13px] text-[var(--color-text-secondary)] font-medium">
                <Briefcase className="w-[14px] h-[14px]" /> {cand.experience}
              </div>
              <div className="flex gap-[6px] flex-wrap">
                {cand.skills.map((skill) => (
                  <span key={skill} className="bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)] px-[8px] py-[2px] rounded text-[11px] font-medium border border-[var(--color-border-subtle)]">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Score & Action */}
            <div className="flex items-center gap-[24px] min-w-[180px] justify-end border-t md:border-t-0 border-[var(--color-border-subtle)] pt-[12px] md:pt-0 w-full md:w-auto">
              <div className="flex flex-col items-end">
                <span className="text-[11px] text-[var(--color-text-muted)] font-medium uppercase tracking-wider mb-[4px]">Match</span>
                <div className="flex items-center gap-[8px]">
                  <div className="w-[64px] h-[6px] bg-[var(--color-bg-secondary)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--color-verified)] rounded-full" style={{ width: `${cand.score}%` }}></div>
                  </div>
                  <span className="text-[15px] font-bold text-[var(--color-text-primary)] font-mono">{cand.score}</span>
                </div>
              </div>
              <button className="w-[32px] h-[32px] rounded-[8px] flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-accent)] transition-colors">
                <ChevronRight className="w-[18px] h-[18px]" />
              </button>
            </div>
          </motion.div>
        ))}

        <motion.div variants={fadeUp} className="flex justify-center mt-[24px] pb-[64px]">
          <button className="px-[24px] py-[8px] border border-[var(--color-border)] rounded-[8px] text-[13px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors">
            Load More Results
          </button>
        </motion.div>
      </motion.section>

    </main>
  );
}

// Sub-component for Rich Podium Cards
function PodiumCard({ candidate, className = "", isGold = false }: { candidate: any, className?: string, isGold?: boolean }) {
  return (
    <motion.article 
      variants={staggerItem}
      className={`bg-white border border-[var(--color-border)] rounded-[16px] p-[24px] flex flex-col shadow-sm relative overflow-hidden ${className}`}
    >
      {/* Decorative Gold Header Background */}
      {isGold && (
        <div className="absolute top-0 left-0 right-0 h-[8px] bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-verified)] opacity-80"></div>
      )}

      {/* Header: Rank & Score */}
      <div className="flex justify-between items-start mb-[24px]">
        <div className="flex flex-col items-center gap-[4px]">
          <div className="w-[32px] h-[32px] rounded-full flex items-center justify-center font-bold text-[14px]" style={{ backgroundColor: `${candidate.color}20`, color: candidate.color }}>
            {isGold ? <Trophy className="w-[16px] h-[16px]" strokeWidth={2.5} /> : candidate.rank}
          </div>
          <span className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Rank</span>
        </div>
        
        <div className="flex items-center gap-[12px]">
          <div className="text-right">
            <div className="text-[11px] font-bold text-[var(--color-verified)] tracking-wide uppercase mb-[2px]">Verified</div>
            <div className="text-[12px] font-medium text-[var(--color-text-secondary)]">Match Score</div>
          </div>
          <AnimatedScoreRing 
            score={candidate.score} 
            maxScore={100} 
            size={44} 
            strokeWidth={4} 
            label=""
            scoreClassName={`text-[14px] font-bold ${isGold ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]'}`}
          />
        </div>
      </div>

      {/* Identity */}
      <div className="flex flex-col items-center text-center mb-[24px]">
        <div className="w-[80px] h-[80px] rounded-full overflow-hidden border-2 border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-sm mb-[16px] relative">
           {isGold && (
             <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm">
               <CheckCircle2 className="w-[16px] h-[16px] text-[var(--color-verified)] fill-[var(--color-verified)]/10" />
             </div>
           )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={candidate.avatar} alt={candidate.name} className="w-full h-full object-cover" />
        </div>
        <h3 className="text-[20px] font-bold leading-[1.2] text-[var(--color-text-primary)] mb-[4px]">{candidate.name}</h3>
        <p className="text-[13px] font-medium text-[var(--color-text-secondary)] mb-[8px]">{candidate.role}</p>
        <p className="text-[12px] font-medium text-[var(--color-text-muted)] flex items-center gap-[4px]">
          <Briefcase className="w-[12px] h-[12px]" /> {candidate.experience}
        </p>
      </div>

      {/* AI Fit Summary */}
      <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border-subtle)] rounded-[12px] p-[16px] mb-[24px] flex-1">
        <h4 className="text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-[8px] flex items-center gap-[4px]">
          <Brain className="w-[12px] h-[12px] text-[var(--color-accent)]" /> AI Fit Summary
        </h4>
        <p className="text-[13px] leading-[1.6] text-[var(--color-text-primary)] font-medium">
          {candidate.aiSummary}
        </p>
      </div>

      {/* Core Skills */}
      <div className="mb-[24px]">
        <h4 className="text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-[8px]">Core Skills</h4>
        <div className="flex flex-wrap gap-[6px]">
          {candidate.skills.map((skill: string) => (
            <span key={skill} className="bg-[var(--color-accent-light)] text-[var(--color-accent)] px-[10px] py-[4px] rounded-[6px] text-[11px] font-bold border border-[var(--color-accent-border)]">
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Action */}
      <div className="mt-auto pt-[16px] border-t border-[var(--color-border)] flex gap-[12px]">
        <button className="flex-1 px-[16px] py-[8px] border border-[var(--color-border)] rounded-[8px] text-[13px] font-bold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors">
          Profile
        </button>
        <button className="flex-1 px-[16px] py-[8px] bg-[var(--color-accent)] text-white rounded-[8px] text-[13px] font-bold hover:bg-[var(--color-accent-hover)] transition-colors">
          Invite
        </button>
      </div>
    </motion.article>
  );
}
