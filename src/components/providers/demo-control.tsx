"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDemoState, DemoPerformance } from "./demo-provider";
import { Settings, Shield, X, Activity } from "lucide-react";

export function DemoControl() {
  const { performance, setPerformance, isDemoPanelOpen, setDemoPanelOpen } = useDemoState();

  if (!isDemoPanelOpen) return null;

  const presets: { id: DemoPerformance; label: string; color: string }[] = [
    { id: "high", label: "High Performance", color: "text-emerald-400" },
    { id: "mid", label: "Medium Performance", color: "text-amber-400" },
    { id: "low", label: "Low Performance", color: "text-rose-400" },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed bottom-6 right-6 z-[9999] w-72 overflow-hidden rounded-2xl border border-white/10 bg-black/80 p-4 shadow-2xl backdrop-blur-2xl"
      >
        <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-violet-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-white/70">
              Demo Control
            </span>
          </div>
          <button
            onClick={() => setDemoPanelOpen(false)}
            className="rounded-full p-1 hover:bg-white/10"
          >
            <X className="h-4 w-4 text-white/50" />
          </button>
        </div>

        <div className="space-y-2">
          <p className="px-1 text-[10px] font-medium uppercase tracking-widest text-white/40">
            Performance Presets
          </p>
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => setPerformance(preset.id)}
              className={`flex w-full items-center justify-between rounded-xl p-3 transition-all ${
                performance === preset.id
                  ? "bg-white/10 ring-1 ring-white/20"
                  : "hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`h-2 w-2 rounded-full ${preset.color.replace("text", "bg")}`} />
                <span className={`text-sm font-medium ${performance === preset.id ? "text-white" : "text-white/60"}`}>
                  {preset.label}
                </span>
              </div>
              {performance === preset.id && (
                <Activity className="h-3 w-3 text-violet-400" />
              )}
            </button>
          ))}
        </div>

        <div className="mt-4 border-t border-white/10 pt-4 text-center">
          <p className="text-[10px] text-white/30 italic">
            Shortcut: Ctrl + Shift + D
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
