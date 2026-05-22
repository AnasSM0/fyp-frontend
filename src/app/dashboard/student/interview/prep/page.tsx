"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  CheckCircle2, Clock, Brain, Shield,
  Zap, ArrowRight, ArrowLeft, Star, Code2,
  BarChart3,
  Cpu, Activity, Scan
} from "lucide-react";
import { MeshBackground } from "@/components/ui/mesh-background";
import { RagDebugPanel } from "@/components/debug/rag-debug-panel";
import { EASE, staggerContainer, staggerItem } from "@/lib/motion";
import {
  assessmentErrorMessage,
  canUseAssessmentDemoFallback,
  getLatestAssessmentSession,
  setStoredActiveAssessmentSessionId,
  startAssessmentSession,
} from "@/lib/api/assessment-service";
import { ApiError } from "@/lib/api/errors";
import { AssessmentSessionDetail } from "@/lib/api/types";

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
  const router = useRouter();
  const [status, setStatus] = useState<"analyzing" | "ready">("analyzing");
  const [checkProgress, setCheckProgress] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [startNotice, setStartNotice] = useState<string | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [latestSession, setLatestSession] = useState<AssessmentSessionDetail | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    async function loadLatestSession() {
      try {
        const detail = await getLatestAssessmentSession();
        if (!cancelled) setLatestSession(detail);
      } catch (error) {
        if (!cancelled && !canUseAssessmentDemoFallback(error)) {
          setStartNotice(assessmentErrorMessage(error));
        }
      }
    }
    loadLatestSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleStartAssessment = async () => {
    if (isStarting) return;
    setIsStarting(true);
    setStartError(null);
    setStartNotice(null);
    setNeedsProfile(false);

    try {
      if (latestSession?.session.status === "in_progress" || latestSession?.session.status === "created") {
        setStoredActiveAssessmentSessionId(latestSession.session.id);
        router.push(`/dashboard/student/interview?sessionId=${encodeURIComponent(latestSession.session.id)}`);
        return;
      }

      const detail = await startAssessmentSession({ force_new: false });
      setStoredActiveAssessmentSessionId(detail.session.id);
      router.push(`/dashboard/student/interview?sessionId=${encodeURIComponent(detail.session.id)}`);
    } catch (error) {
      if (canUseAssessmentDemoFallback(error)) {
        setStartNotice("Assessment backend unavailable. Opening local demo interview.");
        await new Promise((resolve) => setTimeout(resolve, 500));
        router.push("/dashboard/student/interview?mode=demo");
        return;
      }

      setNeedsProfile(error instanceof ApiError && error.status === 409);
      setStartError(assessmentErrorMessage(error));
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100dvh-4rem)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] selection:bg-violet-500/30">
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
            className="container relative z-10 mx-auto max-w-[1180px] px-4 py-5 md:px-6 md:py-6"
          >
            <Link
              href="/dashboard/student"
              className="mb-4 inline-flex items-center gap-2 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-[13px] font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
            {/* Hero Section */}
            <div className="grid items-center gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10 lg:min-h-[calc(100dvh-10rem)]">
              <motion.div variants={staggerContainer} initial="hidden" animate="visible">
                <motion.div variants={staggerItem} className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-400">
                  <Scan className="h-3.5 w-3.5" />
                  AI Blueprint Generated
                </motion.div>
                
                <motion.h1 variants={staggerItem} className="mb-4 text-3xl font-bold leading-[1.08] tracking-tight text-[var(--color-text-primary)] md:text-4xl xl:text-5xl">
                  Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-indigo-400 to-violet-400">Assessment Portal</span> is Live.
                </motion.h1>

                <motion.p variants={staggerItem} className="mb-5 max-w-xl text-base leading-7 text-[var(--color-text-secondary)] xl:text-lg">
                  The system has synthesized your profile into a 60-minute adaptive environment. No manual setup required. The AI is ready for you.
                </motion.p>

                <motion.div variants={staggerItem} className="mb-5 flex flex-wrap gap-2">
                  {(
                    latestSession?.session.session_plan_metadata?.selected_skills as string[] | undefined
                  )?.slice(0, 5).map(t => <Tag key={t} t={t} />) ??
                    ["Profile-aware", "Role calibrated", "Backend session", "System Design", "Code Reasoning"].map(t => <Tag key={t} t={t} />)}
                </motion.div>

                {(startError || startNotice) && (
                  <motion.div variants={staggerItem} className="mb-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 text-sm text-[var(--color-text-secondary)]">
                    {startError && (
                      <div role="alert">
                        <p className="font-semibold text-red-300">{startError}</p>
                        {needsProfile && (
                          <Link href="/onboarding" className="mt-3 inline-flex items-center gap-2 rounded-[10px] bg-violet-600 px-4 py-2 text-[12px] font-bold text-white hover:bg-violet-500">
                            Complete Profile
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </div>
                    )}
                    {startNotice && <p className="font-semibold text-violet-200">{startNotice}</p>}
                  </motion.div>
                )}
                <RagDebugPanel
                  title="Assessment Session Plan"
                  summary="Question source and RAG selection metadata for the latest backend session."
                  className="mb-4"
                  metadata={latestSession?.session.session_plan_metadata}
                />

                <motion.div variants={staggerItem} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                  <motion.button
                    whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(139, 92, 246, 0.3)" }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleStartAssessment}
                    disabled={isStarting}
                    className="inline-flex items-center justify-center gap-3 rounded-2xl bg-violet-600 px-7 py-3.5 text-base font-bold text-white shadow-2xl transition-shadow disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <Zap className="h-4 w-4 fill-white" />
                    {isStarting ? "Starting..." : latestSession?.session.status === "in_progress" || latestSession?.session.status === "created" ? "Continue Assessment" : "Commence Assessment"}
                    <ArrowRight className="h-4 w-4" />
                  </motion.button>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[var(--color-text-primary)]/80">~60 Minutes</span>
                    <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-widest font-medium">Adaptive Environment</span>
                  </div>
                </motion.div>
              </motion.div>

              {/* Floating Intelligence Orb */}
              <div className="relative hidden aspect-square max-h-[420px] items-center justify-center lg:flex">
                <motion.div 
                  animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
                  transition={{ duration: 5, repeat: Infinity }}
                  className="absolute inset-0 bg-violet-500/20 blur-[120px] rounded-full" 
                />
                <div className="relative">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="h-60 w-60 rounded-full border border-dashed border-violet-500/30 xl:h-72 xl:w-72"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="flex h-36 w-36 items-center justify-center rounded-full border border-violet-300/20 bg-gradient-to-br from-violet-600 to-indigo-700 shadow-2xl xl:h-44 xl:w-44"
                    >
                      <Brain className="h-14 w-14 text-white xl:h-20 xl:w-20" />
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>

            {/* Blueprint Grid */}
            <div className="mt-8 mb-16 md:mb-20">
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
                <BlueprintCard icon={Code2} label="Target Domain" value={latestSession?.session.target_role ?? "Profile-aware"} sub={latestSession ? "From backend profile" : "From candidate profile"} />
                <BlueprintCard icon={Star} label="Seniority" value={latestSession?.session.experience_level ?? "Student"} sub="Based on profile depth" />
                <BlueprintCard icon={Clock} label="Questions" value={latestSession ? String(latestSession.session.total_questions) : "Adaptive"} sub="Backend session plan" />
                <BlueprintCard icon={BarChart3} label="Complexity" value={latestSession?.session.selected_difficulty ?? "Calibrated"} sub="Question bank selected" />
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
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: "0 0 60px rgba(139, 92, 246, 0.4)" }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleStartAssessment}
                  disabled={isStarting}
                  className="flex items-center gap-3 px-12 py-6 bg-violet-600 rounded-2xl font-bold text-xl shadow-2xl transition-shadow mx-auto text-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isStarting ? "Starting Assessment..." : "Initialize AI Assessment"}
                  <ArrowRight className="h-6 w-6" />
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
