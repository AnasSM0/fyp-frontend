"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, SlidersHorizontal, Zap, Brain, Star, CheckCircle2,
  ChevronRight, ChevronDown, Filter, Sparkles, X, Activity,
  TrendingUp, Code2, MessageSquare, Layers, Shield, Target
} from "lucide-react";
import { MeshBackground } from "@/components/ui/mesh-background";
import { ScoreBar } from "@/components/ui/animated-counter";
import { staggerContainer, staggerItem, EASE } from "@/lib/motion";
import Link from "next/link";

// ── MOCK DATA ──────────────────────────────────────────────
const CANDIDATES = [
  {
    id: 1, name: "Alex Chen", role: "Senior Full Stack Engineer", score: 94, percentile: "Top 5%",
    skills: ["React", "TypeScript", "Node.js", "System Design"],
    reasoning: "Exceptional distributed systems understanding. Demonstrated production-grade React architecture at scale. Strong communicator.",
    fit: 96, available: true, badge: "Expert Match",
    breakdown: { technical: 96, problemSolving: 92, design: 88, communication: 94 },
  },
  {
    id: 2, name: "Priya Sharma", role: "Frontend Architect", score: 91, percentile: "Top 8%",
    skills: ["React", "Next.js", "GraphQL", "Performance"],
    reasoning: "Outstanding UI performance optimization instincts. Deep knowledge of rendering pipelines. Excellent design-system thinking.",
    fit: 91, available: true, badge: "Excellent Fit",
    breakdown: { technical: 94, problemSolving: 88, design: 92, communication: 90 },
  },
  {
    id: 3, name: "Omar Hassan", role: "Full Stack Developer", score: 84, percentile: "Top 18%",
    skills: ["Vue.js", "Python", "FastAPI", "PostgreSQL"],
    reasoning: "Strong backend API design. Python ecosystem expertise is a fit for your data pipeline needs. Some frontend gaps.",
    fit: 81, available: false, badge: "Strong Fit",
    breakdown: { technical: 85, problemSolving: 84, design: 70, communication: 82 },
  },
  {
    id: 4, name: "Sophie Laurent", role: "Backend Engineer", score: 79, percentile: "Top 25%",
    skills: ["Go", "Kubernetes", "gRPC", "Redis"],
    reasoning: "Infrastructure-first mindset. Kubernetes depth is exceptional. Go concurrency patterns well understood.",
    fit: 76, available: true, badge: "Good Fit",
    breakdown: { technical: 82, problemSolving: 79, design: 68, communication: 74 },
  },
  {
    id: 5, name: "James Okafor", role: "Mid-Level Full Stack", score: 68, percentile: "Top 42%",
    skills: ["React", "Express.js", "MongoDB", "REST APIs"],
    reasoning: "Solid MERN fundamentals. Needs depth in TypeScript and distributed systems for senior role requirements.",
    fit: 62, available: true, badge: "Possible Fit",
    breakdown: { technical: 68, problemSolving: 65, design: 58, communication: 72 },
  },
];

const FILTERS = ["React", "TypeScript", "System Design", "Go", "Python", "Node.js", "GraphQL"];

// ── SCORE COLOR ────────────────────────────────────────────
function scoreColor(s: number) {
  if (s >= 88) return "text-emerald-400";
  if (s >= 72) return "text-violet-400";
  return "text-amber-400";
}
function fitBadgeClass(badge: string) {
  if (badge === "Expert Match" || badge === "Excellent Fit") return "bg-emerald-500/10 border-emerald-500/30 text-emerald-300";
  if (badge === "Strong Fit") return "bg-violet-500/10 border-violet-500/30 text-violet-300";
  if (badge === "Good Fit") return "bg-amber-500/10 border-amber-500/30 text-amber-300";
  return "bg-white/5 border-white/10 text-white/40";
}

// ── CANDIDATE CARD ─────────────────────────────────────────
function CandidateCard({ c, rank }: { c: typeof CANDIDATES[0]; rank: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      variants={staggerItem}
      layout
      className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl hover:border-violet-500/30 transition-colors"
    >
      {/* Main Row */}
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center gap-5 px-6 py-5 text-left"
      >
        {/* Rank */}
        <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-mono text-sm font-bold border ${
          rank === 1 ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
            : rank === 2 ? "bg-slate-400/10 border-slate-400/20 text-slate-300"
            : rank === 3 ? "bg-orange-600/10 border-orange-600/20 text-orange-400"
            : "bg-white/5 border-white/10 text-white/30"
        }`}>
          {rank}
        </div>

        {/* Avatar */}
        <div className="shrink-0 h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center font-bold text-lg">
          {c.name[0]}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <span className="font-semibold text-white">{c.name}</span>
            {!c.available && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 border border-white/10 text-white/30">Unavailable</span>}
          </div>
          <div className="text-sm text-white/40">{c.role}</div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {c.skills.slice(0, 3).map((sk) => (
              <span key={sk} className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-violet-500/10 border border-violet-500/20 text-violet-300">{sk}</span>
            ))}
          </div>
        </div>

        {/* Score + Fit */}
        <div className="shrink-0 text-right space-y-1 hidden sm:block">
          <div className={`text-2xl font-bold font-mono ${scoreColor(c.score)}`}>{c.score}</div>
          <div className="text-[10px] text-white/30 uppercase tracking-widest">{c.percentile}</div>
        </div>

        <div className="shrink-0 flex flex-col items-end gap-2">
          <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${fitBadgeClass(c.badge)}`}>{c.badge}</span>
          <div className="text-white/30">{expanded ? <ChevronDown className="h-4 w-4 rotate-180" /> : <ChevronDown className="h-4 w-4" />}</div>
        </div>
      </button>

      {/* Expanded: AI Fit Reasoning + Breakdown */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-white/[0.06]"
          >
            <div className="p-6 grid md:grid-cols-2 gap-6">
              {/* AI Reasoning Panel */}
              <div className="rounded-2xl bg-violet-500/5 border border-violet-500/15 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="h-4 w-4 text-violet-400" />
                  <div className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">AI Fit Reasoning</div>
                </div>
                <p className="text-sm text-white/70 leading-relaxed">{c.reasoning}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[10px] text-white/30 uppercase tracking-widest">Semantic Match</span>
                  <span className={`text-lg font-bold font-mono ${scoreColor(c.fit)}`}>{c.fit}%</span>
                </div>
                <ScoreBar pct={c.fit} color="from-violet-500 to-indigo-500" />
              </div>

              {/* Performance Breakdown */}
              <div className="space-y-4">
                <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Performance Vectors</div>
                {[
                  { label: "Technical Accuracy", icon: Code2, val: c.breakdown.technical },
                  { label: "Problem Solving", icon: Brain, val: c.breakdown.problemSolving },
                  { label: "System Design", icon: Layers, val: c.breakdown.design },
                  { label: "Communication", icon: MessageSquare, val: c.breakdown.communication },
                ].map(({ label, icon: Icon, val }) => (
                  <div key={label} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <div className="flex items-center gap-1.5 text-white/50"><Icon className="h-3 w-3" />{label}</div>
                      <span className={`font-mono ${scoreColor(val)}`}>{val}%</span>
                    </div>
                    <ScoreBar pct={val} color="from-violet-500 to-indigo-500" />
                  </div>
                ))}
              </div>
            </div>

            {/* Action Row */}
            <div className="flex items-center gap-3 px-6 pb-5">
              <Link href="/dashboard/company/candidate" className="flex-1">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-semibold text-sm transition-colors"
                >
                  View Full Profile <ChevronRight className="h-4 w-4" />
                </motion.button>
              </Link>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-5 py-3 bg-white/5 border border-white/10 hover:border-white/20 rounded-xl font-semibold text-sm transition-all text-white/70"
              >
                <Zap className="h-4 w-4" /> Fast Track
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── PAGE ───────────────────────────────────────────────────
export default function TalentSearchPage() {
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const toggleFilter = (f: string) =>
    setActiveFilters((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]);

  const handleSearch = () => {
    if (!query && !activeFilters.length) return;
    setIsSearching(true);
    setTimeout(() => { setIsSearching(false); setHasSearched(true); }, 1800);
  };

  const filtered = CANDIDATES.filter((c) => {
    const qMatch = !query || c.name.toLowerCase().includes(query.toLowerCase()) || c.role.toLowerCase().includes(query.toLowerCase()) || c.skills.some(s => s.toLowerCase().includes(query.toLowerCase()));
    const fMatch = !activeFilters.length || activeFilters.some(f => c.skills.includes(f));
    return qMatch && fMatch;
  });

  return (
    <div className="relative min-h-screen bg-[#09090e] text-white">
      <MeshBackground />

      <div className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-32">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 text-violet-400 text-xs font-semibold mb-6">
            <Sparkles className="h-3.5 w-3.5" /> Semantic AI Search
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-3">Find Verified Talent</h1>
          <p className="text-white/40 text-lg max-w-xl">
            Search by role, skill, or describe what you need. The AI ranks candidates by semantic match and verified score.
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="e.g. 'Senior React engineer with system design experience'"
                className="w-full pl-14 pr-5 py-5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all text-sm"
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.03, boxShadow: "0 0 30px rgba(139,92,246,0.4)" }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSearch}
              className="px-8 py-5 bg-violet-600 hover:bg-violet-500 rounded-2xl font-bold text-sm transition-colors shrink-0 flex items-center gap-2"
            >
              {isSearching ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="h-4 w-4 rounded-full border-2 border-white border-t-transparent"
                />
              ) : <Zap className="h-4 w-4" />}
              {isSearching ? "Analyzing..." : "Search"}
            </motion.button>
          </div>

          {/* AI searching indicator */}
          <AnimatePresence>
            {isSearching && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mt-3 flex items-center gap-2 text-xs text-violet-400"
              >
                <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }}
                  className="h-1.5 w-1.5 rounded-full bg-violet-400"
                />
                AI is performing semantic analysis across verified candidate pool...
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Filter Chips */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="flex flex-wrap gap-2 mb-10"
        >
          <div className="flex items-center gap-1.5 text-xs text-white/30 font-medium mr-2">
            <Filter className="h-3.5 w-3.5" /> Filter by skill:
          </div>
          {FILTERS.map((f) => (
            <button key={f} onClick={() => toggleFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                activeFilters.includes(f)
                  ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
                  : "bg-white/5 border-white/10 text-white/40 hover:border-white/20"
              }`}
            >
              {f}
              {activeFilters.includes(f) && <X className="inline ml-1 h-3 w-3" />}
            </button>
          ))}
        </motion.div>

        {/* Results */}
        <AnimatePresence mode="wait">
          {!hasSearched && !query && !activeFilters.length ? (
            /* Empty / Pre-search state */
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center py-24"
            >
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 animate-pulse rounded-full bg-violet-500/20 blur-2xl" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-white/5 border border-white/10 mx-auto">
                  <Brain className="h-10 w-10 text-violet-400" />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">AI-Powered Semantic Search</h3>
              <p className="text-white/40 max-w-sm mx-auto text-sm leading-relaxed">
                Describe the kind of engineer you're looking for. The AI will match against verified candidates across skill depth, reasoning quality, and cultural signals.
              </p>
              <div className="mt-8 flex flex-wrap gap-2 justify-center">
                {["Senior React architect", "Go backend + Kubernetes", "Full Stack with FastAPI"].map((s) => (
                  <button key={s} onClick={() => { setQuery(s); handleSearch(); }}
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-violet-500/30 text-sm text-white/50 hover:text-white/80 transition-all"
                  >
                    "{s}"
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            /* Search Results */
            <motion.div key="results" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-[10px] text-white/30 uppercase tracking-widest font-semibold mb-1">Semantic Match Results</div>
                  <h2 className="text-lg font-bold">{filtered.length} verified candidates found</h2>
                </div>
                <div className="flex items-center gap-2 text-xs text-violet-400 font-semibold">
                  <Activity className="h-4 w-4" />
                  Ranked by AI Fit Score
                </div>
              </div>

              <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-4">
                {filtered.map((c, i) => (
                  <CandidateCard key={c.id} c={c} rank={i + 1} />
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
