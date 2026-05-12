"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import Link from "next/link";
import { ScoreRing } from "@/components/ui/score-ring";
import { CheckCircle2, TrendingUp, Brain, Shield, Star, ChevronDown, ChevronUp, ArrowRight, Zap, BarChart3, MessageSquare, Code2, Layers, RefreshCw, Share2, BookOpen } from "lucide-react";

const s = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16,1,0.3,1] as const } } };
const sc = (delay = 0) => ({ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: delay } } });

const PERF = [
  { label: "Technical Accuracy", score: 94, icon: <Code2 className="w-4 h-4"/>, color: "from-indigo-500 to-violet-500" },
  { label: "Problem Solving", score: 88, icon: <Brain className="w-4 h-4"/>, color: "from-violet-500 to-purple-500" },
  { label: "Communication", score: 91, icon: <MessageSquare className="w-4 h-4"/>, color: "from-indigo-400 to-blue-500" },
  { label: "System Design", score: 79, icon: <Layers className="w-4 h-4"/>, color: "from-blue-500 to-indigo-500" },
  { label: "AI Integrity Score", score: 98, icon: <Shield className="w-4 h-4"/>, color: "from-emerald-400 to-teal-500" },
  { label: "Behavioral Consistency", score: 85, icon: <BarChart3 className="w-4 h-4"/>, color: "from-amber-400 to-orange-500" },
];

const SKILLS = [
  { label: "React / Next.js", pct: 94 }, { label: "TypeScript", pct: 88 },
  { label: "Node.js / Express", pct: 82 }, { label: "PostgreSQL", pct: 76 },
  { label: "System Design", pct: 71 }, { label: "Algorithms & DSA", pct: 85 },
  { label: "REST / GraphQL APIs", pct: 89 }, { label: "Docker / DevOps", pct: 68 },
];

const STRENGTHS = [
  "Exceptional React architecture and component composition reasoning",
  "Strong API design thinking with clear RESTful principles",
  "Excellent debugging methodology — systematic and structured",
  "Clear verbal communication with precise technical vocabulary",
];
const WEAKNESSES = [
  "Limited depth in distributed systems and microservices design",
  "Database query optimization reasoning needs strengthening",
  "Scalability trade-off analysis was surface-level in final round",
];

const ROLES = [
  { role: "Full Stack Developer", pct: 94, badge: "Top Match" },
  { role: "Frontend Engineer", pct: 91, badge: "Excellent Fit" },
  { role: "Backend Engineer", pct: 78, badge: "Good Fit" },
  { role: "Tech Lead (Junior)", pct: 67, badge: "Developing" },
];

const QUESTIONS = [
  {
    q: "Implement a debounce function from scratch in JavaScript.",
    summary: "Candidate correctly implemented debounce using closures and setTimeout. Explained use-case in UI.",
    score: 96, ai: "Excellent — clear understanding of closures, correct timer management, real-world context provided.",
    improvement: "Could mention leading-edge debounce variant for completeness.",
  },
  {
    q: "Design a URL shortener system capable of handling 1M requests/day.",
    summary: "Described a basic architecture with hashing and a redirect service. Missed caching and CDN layers.",
    score: 72, ai: "Reasonable approach but lacked depth. No mention of Redis caching, rate limiting, or analytics tracking.",
    improvement: "Study caching strategies and explore how large-scale URL shorteners use geographic distribution.",
  },
  {
    q: "Explain React's reconciliation algorithm and when to use useMemo.",
    summary: "Strong answer on virtual DOM diffing. Provided a practical useMemo example with dependency arrays.",
    score: 91, ai: "Above average. Demonstrated real understanding of React internals, not just surface-level usage.",
    improvement: "Could briefly mention React Fiber scheduler for an even stronger response.",
  },
];

const RECS = [
  { step: "01", title: "System Design Mastery", desc: "Complete a system design course focused on distributed systems, CAP theorem, and database sharding.", tag: "Priority" },
  { step: "02", title: "Advanced TypeScript Patterns", desc: "Deep-dive into conditional types, mapped types, and template literal types.", tag: "Recommended" },
  { step: "03", title: "Cloud Architecture Basics", desc: "Get hands-on with AWS (EC2, RDS, ElastiCache, S3) to strengthen cloud reasoning in interviews.", tag: "Growth" },
  { step: "04", title: "Retake System Design Module", desc: "The AI recommends retaking the system design assessment after 4 weeks of focused study.", tag: "Optional" },
];

function Bar({ pct, color, delay = 0 }: { pct: number; color: string; delay?: number }) {
  return (
    <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
      <motion.div initial={{ width: 0 }} whileInView={{ width: `${pct}%` }} viewport={{ once: true }}
        transition={{ duration: 1.2, ease: [0.16,1,0.3,1], delay }}
        className={`h-full rounded-full bg-gradient-to-r ${color}`} />
    </div>
  );
}

function PerfCard({ label, score, icon, color }: typeof PERF[0]) {
  return (
    <motion.div variants={s} whileHover={{ y: -4 }}
      className="bg-white/[0.03] border border-white/[0.08] hover:border-indigo-500/30 rounded-2xl p-5 transition-all duration-300 group">
      <div className="flex items-center justify-between mb-4">
        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center text-indigo-400">{icon}</div>
        <span className="font-mono text-[22px] font-bold text-white">{score}<span className="text-[14px] text-white/30">%</span></span>
      </div>
      <div className="text-[12px] text-white/40 mb-2">{label}</div>
      <Bar pct={score} color={color} />
    </motion.div>
  );
}

export default function ResultsPage() {
  const [openQ, setOpenQ] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#09090E] text-white overflow-x-hidden">

      {/* 1 — Hero */}
      <section className="relative pt-20 pb-24 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/20 via-transparent to-[#09090E] pointer-events-none"/>
        <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage:"linear-gradient(rgba(99,102,241,0.8) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.8) 1px,transparent 1px)", backgroundSize:"48px 48px" }} />

        <motion.div initial="hidden" animate="show" variants={sc(0)} className="relative z-10 max-w-4xl mx-auto">
          <motion.div variants={s} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[12px] font-bold mb-8">
            <CheckCircle2 className="w-3.5 h-3.5"/> Assessment Complete · AI Report Generated
          </motion.div>

          <motion.div variants={s} className="flex justify-center mb-8">
            <ScoreRing score={912} max={1000} size={220}/>
          </motion.div>

          <motion.h1 variants={s} className="text-[40px] md:text-[52px] font-bold tracking-[-0.03em] mb-3">
            Outstanding Performance
          </motion.h1>
          <motion.p variants={s} className="text-white/40 text-[16px] max-w-lg mx-auto mb-10 leading-[1.7]">
            You scored in the <strong className="text-indigo-300">top 5%</strong> of all assessed candidates in your role category. Your verified profile is ready for recruiter discovery.
          </motion.p>

          {/* Stat pills */}
          <motion.div variants={s} className="flex flex-wrap justify-center gap-4">
            {[
              { label: "Percentile", value: "Top 5%", color: "text-indigo-300" },
              { label: "AI Confidence", value: "96%", color: "text-violet-300" },
              { label: "Recruiter Readiness", value: "High", color: "text-emerald-300" },
              { label: "Integrity Score", value: "98%", color: "text-amber-300" },
            ].map((p) => (
              <div key={p.label} className="px-5 py-3 bg-white/[0.04] border border-white/[0.08] rounded-2xl">
                <div className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">{p.label}</div>
                <div className={`text-[18px] font-bold mt-0.5 ${p.color}`}>{p.value}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      <div className="max-w-6xl mx-auto px-6 space-y-20 pb-28">

        {/* 2 — Performance Summary */}
        <section>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={sc()}>
            <motion.div variants={s} className="mb-6">
              <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-1">AI Evaluation</div>
              <h2 className="text-[28px] font-bold tracking-tight">Performance Summary</h2>
            </motion.div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {PERF.map((p) => <PerfCard key={p.label} {...p}/>)}
            </div>
          </motion.div>
        </section>

        {/* 3 — Skill Breakdown */}
        <section>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={sc()}>
            <motion.div variants={s} className="mb-8">
              <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Verified Competencies</div>
              <h2 className="text-[28px] font-bold tracking-tight">Skill Breakdown</h2>
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {SKILLS.map((sk, i) => (
                <motion.div key={sk.label} variants={s} className="group">
                  <div className="flex justify-between mb-2">
                    <span className="text-[14px] text-white/70 group-hover:text-white transition-colors">{sk.label}</span>
                    <span className="font-mono text-[13px] text-indigo-400">{sk.pct}%</span>
                  </div>
                  <Bar pct={sk.pct} color="from-indigo-500 to-violet-500" delay={i * 0.06}/>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* 4 — Strengths & Weaknesses */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <motion.div initial={{ opacity:0, x:-20 }} whileInView={{ opacity:1, x:0 }} viewport={{ once:true }} transition={{ duration:0.6 }}>
            <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest mb-4">AI Identified · Strengths</div>
            <div className="space-y-3">
              {STRENGTHS.map((t, i) => (
                <motion.div key={i} initial={{ opacity:0, x:-12 }} whileInView={{ opacity:1, x:0 }} viewport={{ once:true }} transition={{ delay: i*0.08 }}
                  className="flex items-start gap-3 bg-emerald-500/[0.05] border border-emerald-500/15 rounded-2xl p-4">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0"/>
                  <span className="text-[13px] text-white/70 leading-[1.6]">{t}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
          <motion.div initial={{ opacity:0, x:20 }} whileInView={{ opacity:1, x:0 }} viewport={{ once:true }} transition={{ duration:0.6 }}>
            <div className="text-[11px] font-bold text-amber-400 uppercase tracking-widest mb-4">AI Identified · Areas to Improve</div>
            <div className="space-y-3">
              {WEAKNESSES.map((t, i) => (
                <motion.div key={i} initial={{ opacity:0, x:12 }} whileInView={{ opacity:1, x:0 }} viewport={{ once:true }} transition={{ delay: i*0.08 }}
                  className="flex items-start gap-3 bg-amber-500/[0.05] border border-amber-500/15 rounded-2xl p-4">
                  <TrendingUp className="w-4 h-4 text-amber-400 mt-0.5 shrink-0"/>
                  <span className="text-[13px] text-white/70 leading-[1.6]">{t}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* 5 — Role Fit */}
        <section>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={sc()}>
            <motion.div variants={s} className="mb-8">
              <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-1">AI Match Analysis</div>
              <h2 className="text-[28px] font-bold tracking-tight">Role Fit Analysis</h2>
              <p className="text-white/35 text-[14px] mt-1">Most suitable for fast-growth startup environments requiring strong full-stack ownership.</p>
            </motion.div>
            <div className="space-y-4">
              {ROLES.map((r, i) => (
                <motion.div key={r.role} variants={s} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 flex items-center gap-5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center text-indigo-400 shrink-0">
                    <Star className="w-5 h-5"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[15px] font-semibold text-white">{r.role}</span>
                      <span className="font-mono text-[15px] text-indigo-300 font-bold">{r.pct}%</span>
                    </div>
                    <Bar pct={r.pct} color={i===0?"from-indigo-500 to-violet-400":"from-indigo-500/70 to-violet-500/70"} delay={i*0.1}/>
                  </div>
                  <span className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold border ${i===0?"bg-indigo-500/15 border-indigo-500/30 text-indigo-300":i===1?"bg-violet-500/10 border-violet-500/20 text-violet-300":"bg-white/[0.04] border-white/[0.1] text-white/40"}`}>
                    {r.badge}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* 6 — Question Review */}
        <section>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={sc()}>
            <motion.div variants={s} className="mb-8">
              <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Detailed Breakdown</div>
              <h2 className="text-[28px] font-bold tracking-tight">Question-wise Evaluation</h2>
            </motion.div>
            <div className="space-y-3">
              {QUESTIONS.map((q, i) => {
                const open = openQ === i;
                return (
                  <motion.div key={i} variants={s} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden">
                    <button onClick={() => setOpenQ(open ? null : i)} className="w-full flex items-start gap-4 px-6 py-5 text-left">
                      <span className="font-mono text-[12px] text-indigo-500 font-bold mt-0.5 shrink-0">Q{i+1}</span>
                      <span className="flex-1 text-[14px] text-white/80 font-medium leading-[1.5]">{q.q}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`font-mono font-bold text-[15px] ${q.score>=90?"text-emerald-400":q.score>=75?"text-indigo-300":"text-amber-400"}`}>{q.score}</span>
                        {open ? <ChevronUp className="w-4 h-4 text-white/30"/> : <ChevronDown className="w-4 h-4 text-white/30"/>}
                      </div>
                    </button>
                    <AnimatePresence>
                      {open && (
                        <motion.div initial={{ height:0 }} animate={{ height:"auto" }} exit={{ height:0 }}
                          transition={{ duration:0.3, ease:[0.16,1,0.3,1] }} className="overflow-hidden border-t border-white/[0.06]">
                          <div className="px-6 py-5 space-y-4">
                            <div className="bg-white/[0.03] rounded-xl p-4">
                              <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Response Summary</div>
                              <p className="text-[13px] text-white/60 leading-[1.65]">{q.summary}</p>
                            </div>
                            <div className="bg-indigo-500/[0.06] border border-indigo-500/15 rounded-xl p-4">
                              <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">AI Evaluation</div>
                              <p className="text-[13px] text-white/70 leading-[1.65]">{q.ai}</p>
                            </div>
                            <div className="bg-amber-500/[0.05] border border-amber-500/10 rounded-xl p-4">
                              <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-2">Improvement Suggestion</div>
                              <p className="text-[13px] text-white/60 leading-[1.65]">{q.improvement}</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </section>

        {/* 7 — Recruiter Preview */}
        <section>
          <motion.div initial={{ opacity:0, y:20 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }} transition={{ duration:0.7 }}
            className="bg-gradient-to-br from-indigo-950/50 to-violet-950/30 border border-indigo-500/20 rounded-3xl p-8 md:p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/[0.08] rounded-full blur-[80px] pointer-events-none"/>
            <div className="relative z-10">
              <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-3">Recruiter Intelligence View</div>
              <h2 className="text-[26px] font-bold tracking-tight mb-6">How Recruiters See You</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 flex flex-col gap-4">
                  <div className="flex items-center gap-3 p-4 bg-white/[0.04] border border-white/[0.08] rounded-2xl">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-bold text-[18px]">A</div>
                    <div>
                      <div className="text-[14px] font-bold text-white">Alex Chen</div>
                      <div className="text-[12px] text-indigo-300 font-semibold">Full Stack Developer</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400"/>
                    <span className="text-[12px] text-emerald-300 font-semibold">Verified · Top 5% Candidate</span>
                  </div>
                </div>
                <div className="md:col-span-2 grid grid-cols-2 gap-3">
                  {[
                    { label: "XLR8 Score", value: "912 / 1000" },
                    { label: "Hiring Readiness", value: "High" },
                    { label: "Strongest Skills", value: "React, Node, TS" },
                    { label: "Recommendation", value: "Strong Hire" },
                  ].map((item) => (
                    <div key={item.label} className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
                      <div className="text-[10px] text-white/30 uppercase tracking-widest font-semibold mb-1">{item.label}</div>
                      <div className="text-[14px] font-bold text-white">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* 8 — AI Recommendations */}
        <section>
          <motion.div initial="hidden" whileInView="show" viewport={{ once:true }} variants={sc()}>
            <motion.div variants={s} className="mb-8">
              <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Personalized Roadmap</div>
              <h2 className="text-[28px] font-bold tracking-tight">AI Recommendations</h2>
            </motion.div>
            <div className="relative pl-8 border-l border-white/[0.08]">
              {RECS.map((r, i) => (
                <motion.div key={i} variants={s} className="relative mb-6 last:mb-0">
                  <div className="absolute -left-[37px] w-7 h-7 rounded-full bg-[#09090E] border-2 border-indigo-500/40 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-indigo-400"/>
                  </div>
                  <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl px-6 py-5 hover:border-indigo-500/20 transition-colors">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[11px] text-indigo-500 font-bold">{r.step}</span>
                        <h3 className="text-[15px] font-semibold text-white">{r.title}</h3>
                      </div>
                      <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold border ${r.tag==="Priority"?"bg-red-500/10 border-red-500/20 text-red-300":r.tag==="Recommended"?"bg-indigo-500/10 border-indigo-500/20 text-indigo-300":"bg-white/[0.04] border-white/[0.1] text-white/40"}`}>
                        {r.tag}
                      </span>
                    </div>
                    <p className="text-[13px] text-white/40 leading-[1.6]">{r.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* 9 — CTA */}
        <section className="text-center py-12">
          <motion.div initial={{ opacity:0, y:24 }} whileInView={{ opacity:1, y:0 }} viewport={{ once:true }}>
            <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-4">You are verified</div>
            <h2 className="text-[44px] md:text-[56px] font-bold tracking-[-0.03em] mb-3">Ready for the Talent Marketplace</h2>
            <p className="text-white/35 text-[15px] max-w-lg mx-auto mb-10 leading-[1.7]">
              Your Verified Score™ and AI-generated profile will be discoverable by recruiters hiring for your matched roles.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <motion.button whileHover={{ scale:1.03, boxShadow:"0 0 50px rgba(99,102,241,0.35)" }} whileTap={{ scale:0.97 }}
                className="flex items-center gap-2.5 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white text-[15px] font-bold rounded-2xl transition-colors shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                <Zap className="w-5 h-5" strokeWidth={2.5}/> Publish Verified Profile <ArrowRight className="w-4 h-4"/>
              </motion.button>
              <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }}
                className="flex items-center gap-2.5 px-8 py-4 bg-white/[0.05] border border-white/[0.1] hover:border-indigo-500/30 text-white text-[15px] font-bold rounded-2xl transition-all">
                <Share2 className="w-4 h-4"/> Share Report
              </motion.button>
              <Link href="/dashboard/student/interview/prep">
                <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }}
                  className="flex items-center gap-2.5 px-8 py-4 bg-white/[0.03] border border-white/[0.08] hover:border-white/20 text-white/60 text-[15px] font-bold rounded-2xl transition-all">
                  <RefreshCw className="w-4 h-4"/> Retake Assessment
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
}
