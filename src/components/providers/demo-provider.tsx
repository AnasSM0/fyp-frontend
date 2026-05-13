"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type DemoPerformance = "high" | "mid" | "low";

interface DemoState {
  performance: DemoPerformance;
  setPerformance: (p: DemoPerformance) => void;
  isDemoPanelOpen: boolean;
  setDemoPanelOpen: (open: boolean) => void;
}

const DemoContext = createContext<DemoState | undefined>(undefined);

// Define the data presets for the demo
export const PERFORMANCE_DATA = {
  high: {
    overallScore: 94,
    fit: "Strong Match",
    reasoning: "Candidate demonstrates exceptional depth in distributed systems and React architecture. Code quality was consistently high with proactive optimization.",
    skills: [
      { name: "React", score: 98 },
      { name: "TypeScript", score: 95 },
      { name: "System Design", score: 92 },
      { name: "Testing", score: 88 },
    ]
  },
  mid: {
    overallScore: 76,
    fit: "Probable Match",
    reasoning: "Solid technical foundation. Candidate solved core problems but struggled with edge-case performance considerations. Good communication skills.",
    skills: [
      { name: "React", score: 82 },
      { name: "TypeScript", score: 78 },
      { name: "System Design", score: 65 },
      { name: "Testing", score: 72 },
    ]
  },
  low: {
    overallScore: 42,
    fit: "Underqualified",
    reasoning: "Significant gaps in fundamental React patterns and TypeScript safety. Candidate struggled to articulate architectural decisions.",
    skills: [
      { name: "React", score: 45 },
      { name: "TypeScript", score: 38 },
      { name: "System Design", score: 32 },
      { name: "Testing", score: 50 },
    ]
  }
};

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [performance, setPerformanceState] = useState<DemoPerformance>("high");
  const [isDemoPanelOpen, setDemoPanelOpen] = useState(false);

  // Initialize from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("xlr8_demo_performance") as DemoPerformance;
    if (saved && (saved === "high" || saved === "mid" || saved === "low")) {
      setPerformanceState(saved);
    }
  }, []);

  const setPerformance = (p: DemoPerformance) => {
    setPerformanceState(p);
    localStorage.setItem("xlr8_demo_performance", p);
  };

  // Keyboard shortcut: Ctrl + Shift + D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        e.preventDefault();
        setDemoPanelOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <DemoContext.Provider value={{ performance, setPerformance, isDemoPanelOpen, setDemoPanelOpen }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemoState() {
  const context = useContext(DemoContext);
  if (context === undefined) {
    throw new Error("useDemoState must be used within a DemoProvider");
  }
  return context;
}
