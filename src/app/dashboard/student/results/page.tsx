"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  CheckCircle2, TrendingUp, Brain, Shield, Star, ChevronDown, ChevronUp,
  ArrowRight, Zap, BarChart3, MessageSquare, Code2, Layers, RefreshCw,
  Share2, Activity, Cpu, Target, Users
} from "lucide-react";
import { useDemoState } from "@/components/providers/demo-provider";
import { DEMO_PRESETS } from "@/lib/demo-data";
import { AnimatedCounter, ScoreBar } from "@/components/ui/animated-counter";
import { MeshBackground } from "@/components/ui/mesh-background";
import { staggerContainer, staggerItem, EASE } from "@/lib/motion";

const VERDICT_COLORS: Record<string, string> = {
  Excellent: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  Strong:    "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  Adequate:  "text-amber-400 bg-amber-500/10 border-amber-500/20",
  "Needs Work": "text-amber-400 bg-amber-500/10 border-amber-500/20",
  Insufficient: "text-rose-400 bg-rose-500/10 border-rose-500/20",
};

const FIT_BADGE: Record<string, string> = {
  emerald: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
  amber:   "bg-amber-500/10  border-amber-500/30  text-amber-300",
  rose:    "bg-rose-500/10   border-rose-500/30   text-rose-300",
};

export default function ResultsPage() {
  const { performance } = useDemoState();
  const data = DEMO_PRESETS[performance];
  const [openQ, setOpenQ] = useState<number | null>(null);

  const ringColor = performance === "high" ? "#8b5cf6" : performance === "mid" ? "#f59e0b" : "#f43f5e";

  return (
    <div className="relative min-h-screen bg-[#09090e] text-white overflow-x-hidden">
      <MeshBackground />

      {/* ── 1. HERO ── */}
      <section className="relative z-10 pt-20 pb-24 px-6 text-center">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="max-w-4xl mx-auto"
        >
          {/* Status badge */}
          <motion.div variants={staggerItem} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-bold mb-10">
            <CheckCircle2 className="w-3.5 h-3.5" /> Assessment Complete · AI Report Generated
          </motion.div>

          {/* SVG Score Ring */}
          <motion.div variants={staggerItem} className="flex justify-center mb-10">
            <div className="relative">
              <svg width="200" height="200" viewBox="0 0 200 200">
                <circle cx="100" cy="100" r="85" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                <motion.circle
                  cx="100" cy="100" r="85" fill="none"
                  stroke={ringColor} strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 85}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 85 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 85 * (1 - data.overallScore / 100) }}
                  transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                  style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold font-mono"><AnimatedCounter value={data.overallScore} /></span>
                <span className="text-xs text-white/30 uppercase tracking-widest font-semibold">/ 100</span>
              </div>
            </div>
          </motion.div>

          <motion.h1 variants={staggerItem} className="text-5xl font-bold tracking-tight mb-4">
            {data.headline}
          </motion.h1>
          <motion.p variants={staggerItem} className="text-white/40 text-lg max-w-xl mx-auto leading-relaxed mb-10">
            {data.summary}
          </motion.p>

          {/* Stat pills */}
          <motion.div variants={staggerItem} className="flex flex-wrap justify-center gap-4">
            {[
              { label: "Percentile", value: data.percentile },
              { label: "AI Confidence", value: `${data.aiConfidence}%` },
              { label: "Readiness", value: data.recruiterReadiness },
              { label: "XLR8 Score", value: `${data.xlr8Score}/1000` },
            ].map((p) => (
              <div key={p.label} className="px-5 py-3 bg-white/[0.04] border border-white/[0.08] rounded-2xl min-w-[120px]">
                <div className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">{p.label}</div>
                <div className="text-lg font-bold mt-0.5">{p.value}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      <div className="relative z-10 max-w-6xl mx-auto px-6 space-y-24 pb-32">

        {/* ── 2. PERFORMANCE GRID ── */}
        <section>
          <div className="text-[11px] font-bold text-violet-400 uppercase tracking-widest mb-2">AI Evaluation</div>
          <h2 className="text-3xl font-bold mb-8">Performance Breakdown</h2>
          <motion.div
            variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-5 gap-4"
          >
            {data.performance.map((p, i) => (
              <motion.div key={p.label} variants={staggerItem}
                whileHover={{ y: -4 }}
                className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl hover:border-violet-500/40 transition-colors"
              >
                <div className="text-3xl font-bold font-mono mb-2">
                  <AnimatedCounter value={p.score} />
                  <span className="text-lg text-white/30">%</span>
                </div>
                <div className="text-xs text-white/40 mb-3">{p.label}</div>
                <ScoreBar pct={p.score} color="from-violet-500 to-indigo-500" delay={i * 0.08} />
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ── 3. SKILLS ── */}
        <section>
          <div className="text-[11px] font-bold text-violet-400 uppercase tracking-widest mb-2">Verified Competencies</div>
          <h2 className="text-3xl font-bold mb-8">Skill Intelligence</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.skills.map((sk, i) => (
              <motion.div key={sk.label}
                initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                className="group"
              >
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-semibold text-white/70 group-hover:text-white transition-colors">{sk.label}</span>
                  <span className="font-mono text-sm text-violet-400"><AnimatedCounter value={sk.pct} />%</span>
                </div>
                <ScoreBar pct={sk.pct} color={sk.color} delay={i * 0.09} />
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── 4. STRENGTHS / WEAKNESSES ── */}
        <section className="grid md:grid-cols-2 gap-8">
          <div>
            <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest mb-4">AI Identified · Strengths</div>
            <div className="space-y-3">
              {data.strengths.map((t, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                  className="flex items-start gap-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 p-4"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                  <span className="text-sm text-white/70 leading-relaxed">{t}</span>
                </motion.div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-amber-400 uppercase tracking-widest mb-4">AI Identified · Growth Areas</div>
            <div className="space-y-3">
              {data.weaknesses.map((t, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: 12 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                  className="flex items-start gap-3 rounded-2xl bg-amber-500/5 border border-amber-500/15 p-4"
                >
                  <TrendingUp className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                  <span className="text-sm text-white/70 leading-relaxed">{t}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 5. ROLE FIT ── */}
        <section>
          <div className="text-[11px] font-bold text-violet-400 uppercase tracking-widest mb-2">AI Match Analysis</div>
          <h2 className="text-3xl font-bold mb-8">Role Fit Intelligence</h2>
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-4">
            {data.roleFit.map((r, i) => (
              <motion.div key={r.role} variants={staggerItem}
                className="flex items-center gap-5 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 shrink-0">
                  <Target className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-white">{r.role}</span>
                    <span className="font-mono font-bold text-violet-300">{r.pct}%</span>
                  </div>
                  <ScoreBar pct={r.pct} color={i === 0 ? "from-violet-500 to-indigo-500" : "from-violet-500/50 to-indigo-500/50"} delay={i * 0.1} />
                </div>
                <span className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold border ${
                  r.badge === "Top Match" || r.badge === "Excellent Fit"
                    ? "bg-violet-500/15 border-violet-500/30 text-violet-300"
                    : r.badge === "Good Fit" || r.badge === "Possible Fit"
                    ? "bg-white/5 border-white/10 text-white/50"
                    : "bg-rose-500/10 border-rose-500/20 text-rose-300"
                }`}>{r.badge}</span>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ── 6. CLICKABLE TRANSCRIPT ── */}
        <section>
          <div className="text-[11px] font-bold text-violet-400 uppercase tracking-widest mb-2">Evidence-Backed Insights</div>
          <h2 className="text-3xl font-bold mb-8">AI Interview Transcript</h2>
          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }} className="space-y-4">
            {data.transcript.map((q, i) => {
              const open = openQ === i;
              return (
                <motion.div key={i} variants={staggerItem}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl"
                >
                  <button onClick={() => setOpenQ(open ? null : i)} className="w-full flex items-start gap-4 px-6 py-5 text-left">
                    <span className="font-mono text-xs text-violet-400 font-bold mt-0.5 shrink-0">Q{i + 1}</span>
                    <span className="flex-1 text-sm font-medium text-white/80 leading-relaxed">{q.q}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`font-mono font-bold text-base ${q.score >= 85 ? "text-emerald-400" : q.score >= 65 ? "text-amber-400" : "text-rose-400"}`}>
                        {q.score}
                      </span>
                      {open ? <ChevronUp className="h-4 w-4 text-white/30" /> : <ChevronDown className="h-4 w-4 text-white/30" />}
                    </div>
                  </button>
                  <AnimatePresence>
                    {open && (
                      <motion.div
                        initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden border-t border-white/[0.06]"
                      >
                        <div className="px-6 py-5 space-y-4">
                          <div className="rounded-xl bg-white/5 p-4">
                            <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Response Summary</div>
                            <p className="text-sm text-white/60 leading-relaxed">{q.summary}</p>
                          </div>
                          <div className="rounded-xl bg-violet-500/5 border border-violet-500/15 p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">AI Evaluation</div>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${VERDICT_COLORS[q.verdict] ?? ""}`}>
                                {q.verdict}
                              </span>
                            </div>
                            <p className="text-sm text-white/70 leading-relaxed">{q.ai}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>
        </section>

          {/* Decision Trace: Explainable AI (NEW) */}
          <motion.section variants={staggerItem} className="mt-8 bg-slate-900 border border-white/10 rounded-[20px] p-8 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <Brain className="w-48 h-48" />
            </div>
            
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-violet-600/20 flex items-center justify-center text-violet-400 border border-violet-500/20">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Decision Trace</h3>
                <p className="text-sm text-white/40">Neural weights and semantic logic behind your score</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {[
                { label: "Algorithmic Efficiency", weight: "40%", reasoning: "High marks for O(n) optimization on the TwoSum challenge. Deducted 2.5 pts for redundant variable initialization in Line 42.", status: "Verified" },
                { label: "Architecture Scalability", weight: "35%", reasoning: "Strong understanding of load balancer placement and database sharding. Match on 'Distributed Systems' vector was 98.2%.", status: "Verified" },
                { label: "Soft Skill Sentiment", weight: "25%", reasoning: "Communication tone detected as 'Collaborative' and 'Problem-Oriented'. High articulation index during the System Design debrief.", status: "Verified" }
              ].map((trace, i) => (
                <div key={i} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-bold text-white/60 uppercase tracking-widest">{trace.label}</span>
                    <span className="text-[11px] font-mono text-violet-400 font-bold">Weight: {trace.weight}</span>
                  </div>
                  <div className="p-5 bg-white/[0.03] border border-white/5 rounded-2xl text-[14px] leading-relaxed text-white/70 italic">
                    "{trace.reasoning}"
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{trace.status} Signal</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

        {/* ── 7. RECRUITER PREVIEW ── */}
        <section>
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-950/40 to-indigo-950/30 p-8 md:p-10 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 h-64 w-64 bg-violet-500/10 rounded-full blur-[80px] pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-violet-400" />
                <div className="text-[11px] font-bold text-violet-400 uppercase tracking-widest">Recruiter Intelligence View</div>
              </div>
              <h2 className="text-2xl font-bold mb-8">How Recruiters See You</h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center font-bold text-lg shrink-0">A</div>
                    <div>
                      <div className="font-bold">Alex Chen</div>
                      <div className="text-sm text-violet-300 font-semibold">Full Stack Developer</div>
                    </div>
                  </div>
                  <div className={`flex items-center gap-2 p-3 rounded-xl border ${FIT_BADGE[data.fitColor]}`}>
                    <Activity className="h-4 w-4" />
                    <span className="text-sm font-semibold">{data.fit}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "XLR8 Score", value: `${data.xlr8Score} / 1000` },
                    { label: "Hiring Readiness", value: data.recruiterReadiness },
                    { label: "Percentile", value: data.percentile },
                    { label: "AI Confidence", value: `${data.aiConfidence}%` },
                  ].map((item) => (
                    <div key={item.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
                      <div className="text-[10px] text-white/30 uppercase tracking-widest font-semibold mb-1">{item.label}</div>
                      <div className="font-bold text-sm">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* ── 8. CTA ── */}
        <section className="text-center py-12">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="text-[11px] font-bold text-violet-400 uppercase tracking-widest mb-4">You are verified</div>
            <h2 className="text-5xl font-bold tracking-tight mb-4">Ready for the Talent Marketplace</h2>
            <p className="text-white/35 max-w-lg mx-auto mb-10 leading-relaxed">
              Your Verified Score™ and AI-generated profile will be discoverable by recruiters hiring for your matched roles.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <motion.button whileHover={{ scale: 1.03, boxShadow: "0 0 50px rgba(139,92,246,0.35)" }} whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2.5 px-8 py-4 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-2xl shadow-2xl transition-colors"
              >
                <Zap className="h-5 w-5" /> Publish Verified Profile <ArrowRight className="h-4 w-4" />
              </motion.button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2.5 px-8 py-4 bg-white/5 border border-white/10 hover:border-violet-500/30 text-white font-bold rounded-2xl transition-all"
              >
                <Share2 className="h-4 w-4" /> Share Report
              </motion.button>
              <Link href="/dashboard/student/results/post-mortem">
                <motion.button whileHover={{ scale: 1.02, backgroundColor: "rgba(139, 92, 246, 0.1)" }} whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2.5 px-8 py-4 bg-violet-500/5 border border-violet-500/20 hover:border-violet-500/50 text-violet-300 font-bold rounded-2xl transition-all"
                >
                  <Brain className="h-4 w-4" /> Interactive Post-Mortem
                </motion.button>
              </Link>
              <Link href="/dashboard/student/interview/prep">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2.5 px-8 py-4 bg-white/[0.03] border border-white/10 hover:border-white/20 text-white/60 font-bold rounded-2xl transition-all"
                >
                  <RefreshCw className="h-4 w-4" /> Retake Assessment
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
}
