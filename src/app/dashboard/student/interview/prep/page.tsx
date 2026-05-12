"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, Brain, Shield, Mic, Camera, Wifi, Monitor, Zap, ArrowRight, Star, Code2, MessageSquare, BarChart3, ChevronDown, ChevronUp } from "lucide-react";

const s = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const sc = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

function Tag({ t, d = 0 }: { t: string; d?: number }) {
  return (
    <motion.span variants={s} transition={{ delay: d }} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[12px] font-mono">
      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />{t}
    </motion.span>
  );
}

function Card({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <motion.div variants={s} whileHover={{ y: -3 }}
      className="group bg-white/[0.03] border border-white/[0.08] hover:border-indigo-500/30 rounded-2xl p-6 transition-all duration-300">
      <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">{icon}</div>
      <div className="text-[11px] text-white/30 uppercase tracking-widest font-semibold mb-1">{label}</div>
      <div className="text-[17px] font-bold text-white">{value}</div>
      {sub && <div className="text-[12px] text-white/35 mt-1">{sub}</div>}
    </motion.div>
  );
}

function Check({ icon, label, delay }: { icon: React.ReactNode; label: string; delay: number }) {
  const [ok, setOk] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOk(true), delay); return () => clearTimeout(t); }, [delay]);
  return (
    <div className="flex items-center justify-between py-4 border-b border-white/[0.06] last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/40">{icon}</div>
        <span className="text-[14px] text-white/70">{label}</span>
      </div>
      <AnimatePresence>
        {ok ? (
          <motion.div key="ok" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1.5 text-emerald-400 text-[12px] font-semibold">
            <CheckCircle2 className="w-4 h-4" /> Ready
          </motion.div>
        ) : (
          <motion.div key="spin" className="flex items-center gap-1.5 text-amber-400 text-[12px] font-semibold">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full" />
            Checking
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ScoreBar({ label, pct, delay }: { label: string; pct: number; delay: number }) {
  return (
    <div>
      <div className="flex justify-between mb-2 text-[13px]">
        <span className="text-white/60">{label}</span>
        <span className="text-white/40 font-mono">{pct}%</span>
      </div>
      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} whileInView={{ width: `${pct}%` }} viewport={{ once: true }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay }}
          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" />
      </div>
    </div>
  );
}

const FLOW = [
  { n: "01", t: "AI Introduction", d: "The AI interviewer introduces the session and calibrates to your communication style." },
  { n: "02", t: "Technical Evaluation", d: "Role-specific coding and system design questions adapted to your experience level." },
  { n: "03", t: "Real-World Problem Solving", d: "Scenario-based challenges drawn from your target industry and past projects." },
  { n: "04", t: "Communication Analysis", d: "Your reasoning clarity and explanation quality are evaluated holistically." },
  { n: "05", t: "Final AI Review", d: "The AI synthesizes all signals into your Verified Score™ and performance breakdown." },
];

const EXPECT = [
  { label: "Technical Accuracy", pct: 35 },
  { label: "Problem Solving", pct: 30 },
  { label: "System Design Thinking", pct: 20 },
  { label: "Communication Clarity", pct: 15 },
];

export default function AssessmentSetupPage() {
  const [openExp, setOpenExp] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#09090E] text-white overflow-x-hidden">
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#09090E]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center"><Zap className="w-4 h-4 text-white" strokeWidth={2.5} /></div>
            <span className="font-bold text-[16px] tracking-tight">XLR8Hire</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-emerald-400 text-[12px] font-semibold">Assessment Ready</span>
            </div>
            <Link href="/dashboard/student/interview">
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[13px] font-bold rounded-full transition-colors shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                <Zap className="w-3.5 h-3.5" strokeWidth={2.5} />
                Start Assessment
              </motion.button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 pt-28 pb-24">

        {/* 1 — Hero */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-28">
          <motion.div initial="hidden" animate="show" variants={sc}>
            <motion.div variants={s} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] text-white/50 text-[12px] font-semibold mb-6">
              <Brain className="w-3.5 h-3.5 text-indigo-400" /> Personalized by AI — No configuration needed
            </motion.div>
            <motion.h1 variants={s} className="text-[44px] md:text-[56px] font-bold leading-[1.08] tracking-[-0.03em] mb-5">
              Your Personalized<br />
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-300 bg-clip-text text-transparent">AI Assessment</span><br />
              Is Ready
            </motion.h1>
            <motion.p variants={s} className="text-[16px] text-white/45 leading-[1.75] max-w-lg mb-8">
              Our AI analyzed your profile, projects, and technical background to generate a tailored interview experience optimized for your target role as a <strong className="text-white/70">Full Stack Developer</strong>.
            </motion.p>
            <motion.div variants={s} className="flex flex-wrap gap-2 mb-8">
              {["React", "Next.js", "TypeScript", "Node.js", "PostgreSQL", "FastAPI"].map((t, i) => <Tag key={t} t={t} d={i * 0.04} />)}
            </motion.div>
            <motion.div variants={s} className="flex items-center gap-4">
              <Link href="/dashboard/student/interview">
                <motion.button whileHover={{ scale: 1.03, boxShadow: "0 0 40px rgba(99,102,241,0.4)" }} whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2.5 px-7 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[15px] font-bold rounded-2xl transition-colors shadow-[0_0_30px_rgba(99,102,241,0.25)]">
                  <Zap className="w-5 h-5" strokeWidth={2.5} />
                  Start Test
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </Link>
              <span className="text-white/25 text-[13px]">~60 minutes · Adaptive</span>
            </motion.div>
          </motion.div>

          {/* Right: Floating analytics cards */}
          <div className="relative h-[420px] hidden lg:block">
            <div className="absolute inset-0">
              <motion.div animate={{ opacity: [0.06, 0.14, 0.06] }} transition={{ duration: 5, repeat: Infinity }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] rounded-full bg-indigo-500 blur-[80px]" />
            </div>
            {/* Central orb */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="w-32 h-32 rounded-full border border-dashed border-indigo-500/30 flex items-center justify-center">
                <motion.div animate={{ scale: [0.95, 1.05, 0.95] }} transition={{ duration: 3, repeat: Infinity }}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 via-violet-600 to-indigo-700 shadow-[0_0_40px_rgba(99,102,241,0.4)] flex items-center justify-center">
                  <Brain className="w-8 h-8 text-white" strokeWidth={1.5} />
                </motion.div>
              </motion.div>
            </div>
            {/* Floating cards */}
            {[
              { cls: "top-6 left-8", label: "XLR8 Score", val: "AI Computing…", c: "text-indigo-300" },
              { cls: "top-10 right-4", label: "Experience Level", val: "Senior", c: "text-emerald-300" },
              { cls: "bottom-16 left-4", label: "Est. Duration", val: "60 min", c: "text-violet-300" },
              { cls: "bottom-8 right-10", label: "Questions", val: "Adaptive", c: "text-amber-300" },
            ].map((c, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.15 }}
                style={{ animationName: "none" }}
                className={`absolute ${c.cls} bg-white/[0.05] border border-white/[0.1] backdrop-blur-sm rounded-2xl px-4 py-3`}>
                <div className="text-[10px] text-white/30 font-semibold uppercase tracking-widest">{c.label}</div>
                <div className={`text-[15px] font-bold ${c.c} mt-0.5`}>{c.val}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* 2 — Assessment Overview */}
        <section className="mb-24">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={sc} className="mb-8">
            <motion.div variants={s} className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-2">Auto-Configured</motion.div>
            <motion.h2 variants={s} className="text-[32px] font-bold tracking-tight">Your Interview Blueprint</motion.h2>
            <motion.p variants={s} className="text-white/40 text-[14px] mt-2">Generated from your profile. The AI determined every parameter automatically.</motion.p>
          </motion.div>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={sc}
            className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card icon={<Code2 className="w-5 h-5" />} label="Target Role" value="Full Stack Dev" sub="React + Node.js" />
            <Card icon={<Star className="w-5 h-5" />} label="Experience" value="Senior Level" sub="5–8 years detected" />
            <Card icon={<Clock className="w-5 h-5" />} label="Duration" value="60 Minutes" sub="Adaptive timing" />
            <Card icon={<BarChart3 className="w-5 h-5" />} label="Difficulty" value="Advanced" sub="Calibrated by AI" />
            <Card icon={<Brain className="w-5 h-5" />} label="Focus" value="Algorithms + Design" sub="Based on your stack" />
            <Card icon={<MessageSquare className="w-5 h-5" />} label="Communication" value="15% Weight" sub="Clarity & reasoning" />
            <Card icon={<Zap className="w-5 h-5" />} label="Adaptation" value="Real-time IRT" sub="Adjusts as you answer" />
            <Card icon={<Shield className="w-5 h-5" />} label="Evaluation" value="Verified Score™" sub="Multi-dimensional" />
          </motion.div>
        </section>

        {/* 3 — Interview Flow */}
        <section className="mb-24">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-10">
            <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-2">What to Expect</div>
            <h2 className="text-[32px] font-bold tracking-tight">Interview Flow</h2>
          </motion.div>
          <div className="relative pl-8 border-l border-white/[0.08]">
            {FLOW.map((step, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5 }}
                className="relative mb-8 last:mb-0">
                <div className="absolute -left-[37px] w-7 h-7 rounded-full bg-[#09090E] border-2 border-indigo-500/40 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-indigo-400" />
                </div>
                <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl px-6 py-5 hover:border-indigo-500/20 transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-[11px] text-indigo-500 font-bold">{step.n}</span>
                    <h3 className="text-[16px] font-semibold text-white">{step.t}</h3>
                  </div>
                  <p className="text-[13px] text-white/40 leading-[1.6]">{step.d}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* 4 — AI Interviewer */}
        <section className="mb-24">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="bg-gradient-to-br from-indigo-950/50 to-violet-950/30 border border-indigo-500/20 rounded-3xl p-8 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/[0.07] rounded-full blur-[80px] pointer-events-none" />
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              <div>
                <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-3">Powered by XLR8 AI</div>
                <h2 className="text-[28px] font-bold tracking-tight mb-4">Meet Your AI Interviewer</h2>
                <p className="text-white/50 text-[15px] leading-[1.75] mb-6">
                  The AI dynamically adapts follow-up questions based on your responses and reasoning quality — just like a skilled senior engineer would.
                </p>
                <div className="space-y-3">
                  {["Adapts difficulty in real-time", "Analyzes reasoning, not just answers", "Understands your specific tech stack", "Evaluates communication holistically"].map((f, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -8 }} whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                      className="flex items-center gap-3 text-[14px] text-white/60">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />{f}
                    </motion.div>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="relative w-48 h-48">
                  <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }} transition={{ duration: 3, repeat: Infinity }}
                    className="absolute inset-0 rounded-full bg-indigo-500" />
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-4 rounded-full border border-dashed border-indigo-500/30" />
                  <motion.div animate={{ rotate: -360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-10 rounded-full border border-indigo-400/40" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[0_0_40px_rgba(99,102,241,0.4)] flex items-center justify-center">
                      <Brain className="w-9 h-9 text-white" strokeWidth={1.5} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* 5 — Expectations */}
        <section className="mb-24 grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-2">Scoring Breakdown</div>
            <h2 className="text-[32px] font-bold tracking-tight mb-2">What the AI Evaluates</h2>
            <p className="text-white/40 text-[14px] leading-[1.7] mb-8">Your Verified Score™ is a composite of four intelligently weighted dimensions.</p>
            <div className="space-y-5">
              {EXPECT.map((e, i) => <ScoreBar key={i} label={e.label} pct={e.pct} delay={i * 0.1} />)}
            </div>
          </motion.div>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true }} variants={sc} className="space-y-3">
            {[
              { t: "Technical Accuracy", d: "Correctness of solutions, edge case handling, and code quality.", w: "35% weight" },
              { t: "Problem Solving", d: "Approach clarity, algorithmic thinking, and optimization decisions.", w: "30% weight" },
              { t: "System Design Thinking", d: "Architecture reasoning, scalability considerations, trade-off awareness.", w: "20% weight" },
              { t: "Communication Clarity", d: "How well you explain reasoning and articulate technical concepts.", w: "15% weight" },
            ].map((item, i) => {
              const open = openExp === i;
              return (
                <motion.div key={i} variants={s} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl overflow-hidden">
                  <button onClick={() => setOpenExp(open ? null : i)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left">
                    <div>
                      <div className="text-[14px] font-semibold text-white">{item.t}</div>
                      <div className="text-[11px] text-indigo-400 font-mono mt-0.5">{item.w}</div>
                    </div>
                    {open ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
                  </button>
                  <AnimatePresence>
                    {open && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                        className="overflow-hidden border-t border-white/[0.06]">
                        <p className="px-5 py-4 text-[13px] text-white/40 leading-[1.65]">{item.d}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>
        </section>

        {/* 6 — Integrity */}
        <section className="mb-24">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="border border-white/[0.08] rounded-3xl p-8 md:p-10 relative overflow-hidden bg-white/[0.02]">
            <div className="absolute top-6 right-6">
              <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 2.5, repeat: Infinity }}
                className="w-12 h-12 rounded-full border-2 border-emerald-500/40 flex items-center justify-center">
                <Shield className="w-5 h-5 text-emerald-400" />
              </motion.div>
            </div>
            <div className="max-w-2xl">
              <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest mb-3">Enterprise Integrity</div>
              <h2 className="text-[28px] font-bold tracking-tight mb-3">AI Proctoring — Transparent & Fair</h2>
              <p className="text-white/45 text-[15px] leading-[1.75] mb-7">
                Intelligent behavioral monitoring ensures your results are a true reflection of your abilities — keeping the platform fair for all talent.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { t: "Response pattern analysis", d: "Detects timing anomalies intelligently" },
                  { t: "Tab-switch awareness", d: "Logged but not disqualifying" },
                  { t: "Behavioral coherence", d: "Tracks solution reasoning flow" },
                  { t: "Camera & mic optional", d: "Enhances credibility score only" },
                ].map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mt-0.5 shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    </div>
                    <div>
                      <div className="text-[14px] font-semibold text-white/80">{item.t}</div>
                      <div className="text-[12px] text-white/30 mt-0.5">{item.d}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </section>

        {/* 7 — System Checks */}
        <section className="mb-24">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-6">
            <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-2">Pre-Flight</div>
            <h2 className="text-[28px] font-bold tracking-tight">System Readiness</h2>
          </motion.div>
          <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl px-6">
            <Check icon={<Mic className="w-4 h-4" />}     label="Microphone"             delay={600} />
            <Check icon={<Camera className="w-4 h-4" />}  label="Camera"                 delay={1000} />
            <Check icon={<Monitor className="w-4 h-4" />} label="Browser Compatible"     delay={1400} />
            <Check icon={<Wifi className="w-4 h-4" />}    label="Internet Stable"        delay={1800} />
            <Check icon={<Zap className="w-4 h-4" />}     label="AI Latency Optimized"   delay={2400} />
          </div>
        </section>

        {/* 8 — CTA */}
        <section className="text-center py-12">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-4">Everything is ready</div>
            <h2 className="text-[48px] md:text-[60px] font-bold tracking-[-0.03em] mb-4">Begin AI Assessment</h2>
            <p className="text-white/35 text-[15px] max-w-md mx-auto mb-10 leading-[1.7]">
              Your results will determine your Verified Score™, platform ranking, and recruiter visibility.
            </p>
            <Link href="/dashboard/student/interview">
              <motion.button whileHover={{ scale: 1.03, boxShadow: "0 0 60px rgba(99,102,241,0.35)" }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-3 px-10 py-5 bg-indigo-600 hover:bg-indigo-500 text-white text-[17px] font-bold rounded-2xl transition-colors duration-200 shadow-[0_0_40px_rgba(99,102,241,0.25)]">
                <Zap className="w-5 h-5" strokeWidth={2.5} />
                Begin AI Assessment
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </Link>
            <p className="text-white/15 text-[12px] mt-5">By starting, you agree to the assessment integrity policy.</p>
          </motion.div>
        </section>
      </div>
    </div>
  );
}
