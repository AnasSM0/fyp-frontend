"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  Trophy, Brain, Briefcase, 
  CheckCircle2, ChevronRight,
  Medal, Star, Zap, Activity,
  Code2, Users
} from "lucide-react";
import { MeshBackground } from "@/components/ui/mesh-background";
import { AnimatedCounter, ScoreBar } from "@/components/ui/animated-counter";
import { staggerContainer, staggerItem, EASE, fadeUp } from "@/lib/motion";
import Link from "next/link";

// ── MOCK DATA ──────────────────────────────────────────────
const topCandidates = [
  {
    id: "c1",
    rank: 1,
    name: "Marcus Johnson",
    role: "Lead Fullstack Developer",
    score: 98,
    avatar: "M",
    skills: ["React", "TypeScript", "System Design"],
    experience: "7 Years • FinTech",
    aiSummary: "Perfect semantic fit. Marcus possesses advanced architectural patterns in React and has successfully led migrations similar to your current stack requirements.",
    color: "from-amber-400 to-yellow-600",
    badge: "Expert Match"
  },
  {
    id: "c2",
    rank: 2,
    name: "Sarah Chen",
    role: "Senior Frontend Engineer",
    score: 94,
    avatar: "S",
    skills: ["Vue", "React", "Mentorship"],
    experience: "5 Years • Startup",
    aiSummary: "Highly relevant. Sarah recently completed a complex Vue-to-React migration. Exceptional communication scores and strong cultural fit.",
    color: "from-slate-300 to-slate-500",
    badge: "Excellent Fit"
  },
  {
    id: "c3",
    rank: 3,
    name: "Elena Rodriguez",
    role: "UI/UX Developer",
    score: 91,
    avatar: "E",
    skills: ["React", "Framer Motion", "CSS"],
    experience: "4 Years • Agency",
    aiSummary: "Strong technical depth in UI execution. If your role requires heavy animation and pixel-perfect design system implementation, Elena is top-tier.",
    color: "from-orange-400 to-orange-700",
    badge: "Excellent Fit"
  }
];

const extendedCandidates = [
  { id: "c4", rank: 4, name: "David Kim", role: "Frontend Engineer", experience: "4 Years • E-commerce", score: 88, skills: ["React", "Next.js"] },
  { id: "c5", rank: 5, name: "Priya Patel", role: "Software Engineer III", experience: "6 Years • HealthTech", score: 85, skills: ["TypeScript", "GraphQL"] },
  { id: "c6", rank: 6, name: "James Wilson", role: "Web Developer", experience: "3 Years • Agency", score: 82, skills: ["JavaScript", "Vue"] },
  { id: "c7", rank: 7, name: "Anita Freeman", role: "Frontend Developer", experience: "5 Years • SaaS", score: 79, skills: ["React", "Redux"] }
];

// ── COMPONENTS ─────────────────────────────────────────────

function PodiumCard({ c, isGold = false }: { c: any; isGold?: boolean }) {
  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -8, scale: 1.02 }}
      className={`relative flex flex-col rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl transition-all hover:border-violet-500/40 ${
        isGold ? "lg:scale-110 z-10 border-violet-500/30" : ""
      }`}
    >
      {/* Rank Indicator */}
      <div className={`absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest ${
        c.rank === 1 ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
          : c.rank === 2 ? "bg-slate-400/20 border-slate-400/40 text-slate-300"
          : "bg-orange-500/20 border-orange-500/40 text-orange-300"
      }`}>
        Rank {c.rank}
      </div>

      <div className="flex flex-col items-center text-center mb-8">
        <div className="relative mb-6">
          <div className={`h-24 w-24 rounded-full bg-gradient-to-br ${c.color} flex items-center justify-center text-3xl font-bold text-white shadow-2xl`}>
            {c.avatar}
          </div>
          {isGold && (
            <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-violet-600 border-2 border-[#09090e] flex items-center justify-center">
              <Trophy className="h-4 w-4 text-white" />
            </div>
          )}
        </div>
        
        <h3 className="text-2xl font-bold text-white mb-1">{c.name}</h3>
        <p className="text-white/40 text-sm font-medium mb-4">{c.role}</p>
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white/60">
          <Briefcase className="h-3 w-3" /> {c.experience}
        </div>
      </div>

      <div className="mb-8 p-4 rounded-2xl bg-white/5 border border-white/5">
        <div className="flex items-center gap-2 mb-2 text-[10px] font-bold text-violet-400 uppercase tracking-widest">
          <Brain className="h-3 w-3" /> AI Fit Insights
        </div>
        <p className="text-xs text-white/50 leading-relaxed italic">
          "{c.aiSummary}"
        </p>
      </div>

      <div className="mt-auto space-y-4">
        <div className="flex justify-between items-end">
          <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Verified Score</div>
          <div className="text-2xl font-bold font-mono text-white">
            <AnimatedCounter value={c.score} />
            <span className="text-sm text-white/30">%</span>
          </div>
        </div>
        <ScoreBar pct={c.score} color={isGold ? "from-violet-500 to-indigo-500" : "from-violet-500/50 to-indigo-500/50"} />
        
        <div className="flex gap-2 pt-2">
          <Link href="/dashboard/company/candidate" className="flex-1">
            <button className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs transition-colors">
              VIEW PROFILE
            </button>
          </Link>
          <button className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-colors">
            <Zap className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────

export default function LeaderboardPage() {
  return (
    <div className="relative min-h-screen bg-[#09090e] text-white">
      <MeshBackground />

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-48">
        
        {/* Header */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 text-violet-400 text-xs font-semibold mb-6">
            <Activity className="h-3.5 w-3.5" /> Live Talent Rankings
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-4">Elite Talent <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">Leaderboard</span></h1>
          <p className="text-white/40 text-lg max-w-2xl leading-relaxed">
            Candidates evaluated using semantic vector analysis across technical assessment data, reasoning quality, and communication benchmarks.
          </p>
        </motion.div>

        {/* Podium */}
        <motion.div 
          variants={staggerContainer} initial="hidden" animate="visible"
          className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-32 items-end"
        >
          {/* Rank 2 */}
          <PodiumCard c={topCandidates[1]} />
          
          {/* Rank 1 */}
          <PodiumCard c={topCandidates[0]} isGold />
          
          {/* Rank 3 */}
          <PodiumCard c={topCandidates[2]} />
        </motion.div>

        {/* List View */}
        <section>
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
            <h2 className="text-2xl font-bold">Verified Rankings</h2>
            <div className="flex items-center gap-2 text-xs font-bold text-white/30 uppercase tracking-widest">
              <Users className="h-4 w-4" /> 47 Candidates Verified
            </div>
          </div>

          <motion.div 
            variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="space-y-3"
          >
            {extendedCandidates.map((cand) => (
              <motion.div 
                key={cand.id} 
                variants={staggerItem}
                whileHover={{ x: 8, backgroundColor: "rgba(255,255,255,0.05)" }}
                className="group flex items-center gap-6 rounded-2xl border border-white/5 bg-white/[0.02] p-5 transition-all cursor-pointer"
              >
                <div className="w-8 font-mono text-lg font-bold text-white/20 group-hover:text-violet-400 transition-colors">
                  {cand.rank}
                </div>
                
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-600/50 to-indigo-700/50 flex items-center justify-center font-bold text-white">
                  {cand.name[0]}
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-white mb-0.5">{cand.name}</h4>
                  <p className="text-xs text-white/40">{cand.role} • {cand.experience}</p>
                </div>

                <div className="hidden md:flex gap-2">
                  {cand.skills.map(s => (
                    <span key={s} className="px-2 py-1 rounded-lg bg-white/5 border border-white/5 text-[10px] text-white/40">
                      {s}
                    </span>
                  ))}
                </div>

                <div className="text-right min-w-[120px]">
                  <div className="text-xl font-bold font-mono text-white mb-1">
                    {cand.score}%
                  </div>
                  <ScoreBar pct={cand.score} color="from-violet-500/40 to-indigo-500/40" />
                </div>

                <div className="text-white/20 group-hover:text-white transition-colors">
                  <ChevronRight className="h-5 w-5" />
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div variants={fadeUp} className="flex justify-center mt-12">
            <button className="px-8 py-3 rounded-xl border border-white/10 hover:border-violet-500/30 text-white/50 hover:text-white font-bold text-sm transition-all">
              Load More Talent
            </button>
          </motion.div>
        </section>

      </div>
    </div>
  );
}
