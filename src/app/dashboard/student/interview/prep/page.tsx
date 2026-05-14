"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import Link from "next/link";
import { 
  CheckCircle2, Clock, Brain, Shield, Mic, Camera, 
  Wifi, Monitor, Zap, ArrowRight, ArrowLeft, Star, Code2, 
  MessageSquare, BarChart3, ChevronDown, ChevronUp,
  Cpu, Activity, Scan, Fingerprint
} from "lucide-react";
import { MeshBackground } from "@/components/ui/mesh-background";
import { EASE, fadeUp, staggerContainer, staggerItem, cardHover } from "@/lib/motion";

// --- COMPONENTS ---

function Tag({ t }: { t: string }) {
  return (
    <motion.span 
      variants={staggerItem}
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[11px] font-mono"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
      {t}
    </motion.span>
  );
}

function BlueprintCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-100, 100], [10, -10]);
  const rotateY = useTransform(x, [-100, 100], [-10, 10]);

  return (
    <motion.div
      style={{ perspective: 1000, rotateX, rotateY }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - rect.left - rect.width / 2);
        y.set(e.clientY - rect.top - rect.height / 2);
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      variants={staggerItem}
      whileHover={{ y: -5, scale: 1.02 }}
      className="group relative rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 backdrop-blur-xl transition-colors hover:border-violet-500/40"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400 group-hover:scale-110 transition-transform">
        <Icon className="h-6 w-6" />
      </div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">{label}</div>
      <div className="mt-1 text-lg font-bold text-[var(--color-text-primary)]">{value}</div>
      {sub && <div className="mt-1 text-xs text-[var(--color-text-secondary)]">{sub}</div>}
      
      {/* Decorative inner glow */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.div>
  );
}

// --- MAIN PAGE ---

export default function AssessmentSetupPage() {
  const [status, setStatus] = useState<"analyzing" | "ready">("analyzing");
  const [checkProgress, setCheckProgress] = useState(0);

  useEffect(() => {
    if (status === "analyzing") {
      const timer = setInterval(() => {
        setCheckProgress(prev => {
          if (prev >= 100) {
            clearInterval(timer);
            setTimeout(() => setStatus("ready"), 800);
            return 100;
          }
          return prev + 1;
        });
      }, 30);
      return () => clearInterval(timer);
    }
  }, [status]);

  return (
    <div className="relative min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] selection:bg-violet-500/30">
      <MeshBackground />

      <AnimatePresence mode="wait">
        {status === "analyzing" ? (
          <motion.div
            key="analyzing"
            exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
            transition={{ duration: 0.8, ease: EASE.outExpo }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="relative mb-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="h-48 w-48 rounded-full border border-dashed border-violet-500/30"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute inset-4 rounded-full border border-violet-500/20"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  <div className="absolute inset-0 animate-pulse rounded-full bg-violet-500/20 blur-2xl" />
                  <motion.div 
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-2xl"
                  >
                    <Cpu className="h-10 w-10 text-white" />
                  </motion.div>
                </div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">System Initializing</h2>
              <p className="text-[var(--color-text-secondary)] max-w-xs mx-auto text-sm leading-relaxed">
                Analyzing candidate profile and calibrating adaptive assessment environment...
              </p>
              
              <div className="mt-8 space-y-2">
                <div className="h-1 w-64 overflow-hidden rounded-full bg-[var(--color-bg-secondary)]">
                  <motion.div 
                    className="h-full bg-violet-500"
                    animate={{ width: `${checkProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                  <span>Semantic Sync</span>
                  <span>{checkProgress}%</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="portal"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: EASE.outExpo }}
            className="container relative z-10 mx-auto px-6 pt-12 md:pt-20 pb-20"
          >
            <Link
              href="/dashboard/student"
              className="mb-8 inline-flex items-center gap-2 rounded-[10px] border border-white/10 bg-white/5 px-3 py-2 text-[13px] font-bold text-white/70 hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
            {/* Hero Section */}
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center mb-20 md:mb-24">
              <motion.div variants={staggerContainer} initial="hidden" animate="visible">
                <motion.div variants={staggerItem} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-violet-400 text-xs font-semibold mb-8">
                  <Scan className="h-3.5 w-3.5" />
                  AI Blueprint Generated
                </motion.div>
                
                <motion.h1 variants={staggerItem} className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6 text-[var(--color-text-primary)]">
                  Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-indigo-400 to-violet-400">Assessment Portal</span> is Live.
                </motion.h1>

                <motion.p variants={staggerItem} className="text-xl text-[var(--color-text-secondary)] max-w-xl leading-relaxed mb-10">
                  The system has synthesized your profile into a 60-minute adaptive environment. No manual setup required. The AI is ready for you.
                </motion.p>

                <motion.div variants={staggerItem} className="flex flex-wrap gap-2 mb-8">
                  {["React.js", "TypeScript", "FastAPI", "System Design", "Scalability"].map(t => <Tag key={t} t={t} />)}
                </motion.div>

                <motion.div variants={staggerItem} className="flex items-center gap-6">
                  <Link href="/dashboard/student/interview">
                    <motion.button
                      whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(139, 92, 246, 0.3)" }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-3 px-8 py-4 bg-violet-600 rounded-2xl font-bold text-base shadow-2xl transition-shadow text-white"
                    >
                      <Zap className="h-4 w-4 fill-white" />
                      Commence Assessment
                      <ArrowRight className="h-4 w-4" />
                    </motion.button>
                  </Link>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[var(--color-text-primary)]/80">~60 Minutes</span>
                    <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-widest font-medium">Adaptive Environment</span>
                  </div>
                </motion.div>
              </motion.div>

              {/* Floating Intelligence Orb */}
              <div className="relative aspect-square flex items-center justify-center">
                <motion.div 
                  animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
                  transition={{ duration: 5, repeat: Infinity }}
                  className="absolute inset-0 bg-violet-500/20 blur-[120px] rounded-full" 
                />
                <div className="relative">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="h-64 w-64 md:h-80 md:w-80 rounded-full border border-dashed border-violet-500/30"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="h-40 w-40 md:h-48 md:w-48 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 shadow-2xl flex items-center justify-center border border-white/20"
                    >
                      <Brain className="h-16 w-16 md:h-20 md:w-20 text-white" />
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>

            {/* Blueprint Grid */}
            <div className="mb-24 md:mb-32">
              <div className="flex items-end justify-between mb-12">
                <div>
                  <h2 className="text-3xl font-bold mb-2 text-[var(--color-text-primary)]">Technical Blueprint</h2>
                  <p className="text-[var(--color-text-secondary)]">Parameters calibrated specifically for your seniority level.</p>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold text-violet-400 uppercase tracking-widest">
                  <Activity className="h-4 w-4" />
                  Active Profile Sync
                </div>
              </div>

              <motion.div 
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="grid grid-cols-2 md:grid-cols-4 gap-6"
              >
                <BlueprintCard icon={Code2} label="Target Domain" value="Full Stack" sub="React + Backend" />
                <BlueprintCard icon={Star} label="Seniority" value="Expert" sub="Based on profile depth" />
                <BlueprintCard icon={Clock} label="Window" value="60m" sub="Adaptive duration" />
                <BlueprintCard icon={BarChart3} label="Complexity" value="Advanced" sub="System-wide focus" />
              </motion.div>
            </div>

            {/* AI Expectations */}
            <div className="grid lg:grid-cols-2 gap-16 md:gap-24 mb-24 md:mb-32">
              <div>
                <h2 className="text-3xl font-bold mb-6 text-[var(--color-text-primary)]">Evaluation Vectors</h2>
                <div className="space-y-8">
                  {[
                    { label: "Technical Execution", pct: 40 },
                    { label: "Architectural Reasoning", pct: 30 },
                    { label: "Problem Solving Speed", pct: 20 },
                    { label: "Communication Flow", pct: 10 },
                  ].map((v, i) => (
                    <div key={i} className="space-y-3">
                      <div className="flex justify-between text-sm font-bold uppercase tracking-widest text-[var(--color-text-muted)]">
                        <span>{v.label}</span>
                        <span className="text-violet-400">{v.pct}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-[var(--color-bg-secondary)] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${v.pct}%` }}
                          transition={{ duration: 1, delay: i * 0.1 }}
                          className="h-full bg-gradient-to-r from-violet-500 to-indigo-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-8 backdrop-blur-xl">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-6">
                  <Shield className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-[var(--color-text-primary)]">Enterprise Proctored Environment</h3>
                <p className="text-[var(--color-text-secondary)] leading-relaxed mb-8">
                  Our AI behavior engine monitors session integrity in real-time. Please ensure a quiet environment with stable connectivity.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    "Mic/Cam Readiness",
                    "Network Stability",
                    "Behavioral Sync",
                    "System Checks"
                  ].map((check, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-[var(--color-text-secondary)]">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      {check}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom CTA */}
            <div className="text-center">
              <motion.div
                whileInView={{ y: [20, 0], opacity: [0, 1] }}
                className="inline-block"
              >
                <h2 className="text-4xl lg:text-6xl font-bold mb-10 tracking-tight text-[var(--color-text-primary)]">Ready to verify your talent?</h2>
                <Link href="/dashboard/student/interview">
                  <motion.button
                    whileHover={{ scale: 1.05, boxShadow: "0 0 60px rgba(139, 92, 246, 0.4)" }}
                    whileTap={{ scale: 0.95 }}
                    className="flex items-center gap-3 px-12 py-6 bg-violet-600 rounded-2xl font-bold text-xl shadow-2xl transition-shadow mx-auto text-white"
                  >
                    Initialize AI Assessment
                    <ArrowRight className="h-6 w-6" />
                  </motion.button>
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
