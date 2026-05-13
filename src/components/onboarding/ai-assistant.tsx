"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Brain, Fingerprint, Zap } from "lucide-react";
import { EASE } from "@/lib/motion";

interface AIAssistantProps {
  currentSection: number;
  totalSections: number;
  insight?: string;
  completeness: { [key: string]: boolean };
}

export function StickyAIAssistant({ currentSection, totalSections, insight, completeness }: AIAssistantProps) {
  const completedCount = Object.values(completeness).filter(Boolean).length;
  const totalFields = 10; // Foundation(3) + Stack(3) + Proof(2) + Trajectory(2)
  const progress = (completedCount / totalFields) * 100;
  
  const defaultInsights = [
    "I'm ready to begin mapping your technical trajectory.",
    "Analyzing your core skill vectors...",
    "Synthesizing project impact metrics...",
    "Almost complete. Finalizing your AI talent identity.",
  ];

  const currentInsight = insight || defaultInsights[Math.min(currentSection, defaultInsights.length - 1)];

  return (
    <div className="sticky top-24 h-fit w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl shadow-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse rounded-full bg-violet-500/20 blur-xl" />
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600">
              <Brain className="h-5 w-5 text-white" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">XLR8 Intelligence</h3>
            <p className="text-[10px] uppercase tracking-widest text-white/40">Active Analysis</p>
          </div>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
          <Zap className="h-4 w-4 text-emerald-400" />
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl bg-black/40 p-4 border border-white/5">
          <AnimatePresence mode="wait">
            <motion.p
              key={currentInsight}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.4, ease: EASE.outExpo }}
              className="text-sm leading-relaxed text-white/70"
            >
              "{currentInsight}"
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-medium uppercase tracking-widest text-white/40">
            <span>Identity Construction</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: EASE.outExpo }}
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <div className="flex items-center gap-2 rounded-xl bg-white/5 p-2 border border-white/5">
            <Fingerprint className="h-3 w-3 text-violet-400" />
            <span className="text-[10px] text-white/50">Biometric Sync</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white/5 p-2 border border-white/5">
            <Sparkles className="h-3 w-3 text-indigo-400" />
            <span className="text-[10px] text-white/50">Semantic Mapping</span>
          </div>
        </div>
      </div>
    </div>
  );
}
