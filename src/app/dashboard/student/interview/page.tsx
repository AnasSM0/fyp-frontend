"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { fadeUp, staggerContainer, staggerItem } from "@/lib/motion";
import {
  Timer, Save, Send, Mic,
  Bot, User, Volume2, MoreHorizontal,
  Play, ChevronUp, ChevronDown,
  Terminal, FileCode2, ChevronDown as LangDown,
  BookOpen, FileText, CheckCircle2, Zap
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

import { useRouter } from "next/navigation";

interface Message {
  id: number;
  role: "ai" | "user";
  name: string;
  time: string;
  content: string[];
}

// ─── Static Data ─────────────────────────────────────────────────────────────

const INITIAL_MESSAGES: Message[] = [
  {
    id: 1,
    role: "ai",
    name: "Interview Assistant",
    time: "10:02 AM",
    content: [
      "Welcome to the technical assessment. Today, we'll be looking at a common algorithmic problem.",
      "**Task:** Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.",
      "You may assume that each input would have exactly one solution, and you may not use the same element twice. You can return the answer in any order.",
    ],
  },
  {
    id: 2,
    role: "user",
    name: "Candidate",
    time: "10:05 AM",
    content: [
      "I understand. I'll use a hash map to store the values and their indices as I iterate through the array. This should give us an O(n) time complexity.",
    ],
  },
  {
    id: 3,
    role: "ai",
    name: "Interview Assistant",
    time: "10:06 AM",
    content: [
      "That sounds like an optimal approach. Please go ahead and implement that in the editor.",
    ],
  },
];

// Syntax-highlighted code segments
const CODE_LINES = [
  { indent: 0, tokens: [{ t: "class", c: "#C586C0" }, { t: " ", c: "#D4D4D4" }, { t: "Solution", c: "#4EC9B0" }, { t: ":", c: "#D4D4D4" }] },
  { indent: 4, tokens: [{ t: "def", c: "#C586C0" }, { t: " ", c: "#D4D4D4" }, { t: "twoSum", c: "#DCDCAA" }, { t: "(", c: "#D4D4D4" }, { t: "self", c: "#9CDCFE" }, { t: ", ", c: "#D4D4D4" }, { t: "nums", c: "#9CDCFE" }, { t: ": ", c: "#D4D4D4" }, { t: "List", c: "#4EC9B0" }, { t: "[", c: "#D4D4D4" }, { t: "int", c: "#4EC9B0" }, { t: "], ", c: "#D4D4D4" }, { t: "target", c: "#9CDCFE" }, { t: ": ", c: "#D4D4D4" }, { t: "int", c: "#4EC9B0" }, { t: ") -> ", c: "#D4D4D4" }, { t: "List", c: "#4EC9B0" }, { t: "[", c: "#D4D4D4" }, { t: "int", c: "#4EC9B0" }, { t: "]:", c: "#D4D4D4" }] },
  { indent: 8, tokens: [{ t: "# Initialize a hash map to store value: index", c: "#6A9955" }] },
  { indent: 8, tokens: [{ t: "num_map", c: "#9CDCFE" }, { t: " = {}", c: "#D4D4D4" }] },
  { indent: 0, tokens: [{ t: "", c: "#D4D4D4" }] },
  { indent: 8, tokens: [{ t: "for", c: "#C586C0" }, { t: " ", c: "#D4D4D4" }, { t: "i", c: "#9CDCFE" }, { t: ", ", c: "#D4D4D4" }, { t: "num", c: "#9CDCFE" }, { t: " ", c: "#D4D4D4" }, { t: "in", c: "#C586C0" }, { t: " ", c: "#D4D4D4" }, { t: "enumerate", c: "#DCDCAA" }, { t: "(", c: "#D4D4D4" }, { t: "nums", c: "#9CDCFE" }, { t: "):", c: "#D4D4D4" }] },
  { indent: 12, tokens: [{ t: "complement", c: "#9CDCFE" }, { t: " = ", c: "#D4D4D4" }, { t: "target", c: "#9CDCFE" }, { t: " - ", c: "#D4D4D4" }, { t: "num", c: "#9CDCFE" }] },
  { indent: 12, tokens: [{ t: "if", c: "#C586C0" }, { t: " ", c: "#D4D4D4" }, { t: "complement", c: "#9CDCFE" }, { t: " ", c: "#D4D4D4" }, { t: "in", c: "#C586C0" }, { t: " ", c: "#D4D4D4" }, { t: "num_map", c: "#9CDCFE" }, { t: ":", c: "#D4D4D4" }] },
  { indent: 16, tokens: [{ t: "return", c: "#C586C0" }, { t: " [", c: "#D4D4D4" }, { t: "num_map", c: "#9CDCFE" }, { t: "[", c: "#D4D4D4" }, { t: "complement", c: "#9CDCFE" }, { t: "], ", c: "#D4D4D4" }, { t: "i", c: "#9CDCFE" }, { t: "]", c: "#D4D4D4" }] },
  { indent: 12, tokens: [{ t: "num_map", c: "#9CDCFE" }, { t: "[", c: "#D4D4D4" }, { t: "num", c: "#9CDCFE" }, { t: "] = ", c: "#D4D4D4" }, { t: "i", c: "#9CDCFE" }] },
];

const CONSOLE_OUTPUT = [
  { type: "success", text: "✓ Test Case 1 Passed: Input [2,7,11,15], target=9 → Output [0,1]" },
  { type: "success", text: "✓ Test Case 2 Passed: Input [3,2,4], target=6 → Output [1,2]" },
  { type: "success", text: "✓ Test Case 3 Passed: Input [3,3], target=6 → Output [0,1]" },
  { type: "info",    text: "Runtime: 52ms | Memory: 17.2MB | Time: O(n) | Space: O(n)" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function CountdownTimer({ initial }: { initial: number }) {
  const [seconds, setSeconds] = useState(initial);

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);

  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  const isLow = seconds < 300;

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-[8px] border font-mono text-[14px] font-semibold transition-colors ${
      isLow
        ? "bg-red-50 border-red-200 text-red-500"
        : "bg-[var(--color-warning)]/10 border-[var(--color-warning)]/30 text-[var(--color-warning)]"
    }`}>
      <Timer className="w-4 h-4" strokeWidth={2} />
      {mins}:{secs}
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isAI = msg.role === "ai";
  return (
    <motion.div variants={staggerItem} className="flex gap-3">
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
        isAI
          ? "bg-[var(--color-bg-secondary)] border-[var(--color-border)]"
          : "bg-[var(--color-accent-light)] border-[var(--color-accent-border)]"
      }`}>
        {isAI
          ? <Bot className="w-4 h-4 text-[var(--color-accent)]" strokeWidth={1.5} />
          : <User className="w-4 h-4 text-[var(--color-accent)]" strokeWidth={1.5} />
        }
      </div>
      {/* Content */}
      <div className="flex-1 pt-0.5">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[13px] font-semibold text-[var(--color-text-primary)]">{msg.name}</span>
          <span className="text-[11px] text-[var(--color-text-muted)]">{msg.time}</span>
        </div>
        <div className="space-y-2">
          {msg.content.map((para, i) => (
            <p key={i} className="text-[14px] leading-[1.6] text-[var(--color-text-secondary)]">
              {para.includes("**") ? (
                <>
                  {para.split("**").map((chunk, j) =>
                    j % 2 === 1
                      ? <strong key={j} className="font-semibold text-[var(--color-text-primary)]">{chunk}</strong>
                      : chunk.includes("`")
                        ? chunk.split("`").map((c2, k) =>
                            k % 2 === 1
                              ? <code key={k} className="px-1.5 py-0.5 bg-[var(--color-bg-secondary)] text-[var(--color-accent)] rounded text-[12px] font-mono border border-[var(--color-border-subtle)]">{c2}</code>
                              : c2
                          )
                        : chunk
                  )}
                </>
              ) : para.includes("`") ? (
                para.split("`").map((c, j) =>
                  j % 2 === 1
                    ? <code key={j} className="px-1.5 py-0.5 bg-[var(--color-bg-secondary)] text-[var(--color-accent)] rounded text-[12px] font-mono border border-[var(--color-border-subtle)]">{c}</code>
                    : c
                )
              ) : para}
            </p>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AIInterviewPage() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState("");
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [activeNav, setActiveNav] = useState("Assessment");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const router = useRouter();
  const threadEndRef = useRef<HTMLDivElement>(null);

  const steps = [
    "Compiling code signals...",
    "Analyzing semantic reasoning...",
    "Evaluating problem solving vectors...",
    "Synthesizing final XLR8 score...",
    "Verification complete. Redirecting..."
  ];

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        role: "user",
        name: "Candidate",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        content: [inputValue],
      },
    ]);
    setInputValue("");
  };

  const handleRun = () => {
    setIsRunning(true);
    setConsoleOpen(true);
    setTimeout(() => setIsRunning(false), 1400);
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    // Cycle through analysis steps
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < steps.length) {
        setAnalysisStep(currentStep);
      } else {
        clearInterval(interval);
        setTimeout(() => {
          router.push("/dashboard/student/results");
        }, 800);
      }
    }, 1200);
  };

  return (
    <>
      {/* ── TopNav ─────────────────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="h-14 flex items-center justify-between px-8 bg-white border-b border-[var(--color-border)] z-50 shrink-0"
      >
        {/* Left: Brand + Nav */}
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[var(--color-accent)] rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-[18px] font-bold text-[var(--color-text-primary)] tracking-tight">InterviewOS</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            {["Assessment", "Documentation", "Guidelines"].map((nav) => (
              <button
                key={nav}
                onClick={() => setActiveNav(nav)}
                className={`text-[13px] font-medium pb-0.5 transition-colors relative ${
                  activeNav === nav
                    ? "text-[var(--color-accent)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {nav}
                {activeNav === nav && (
                  <motion.div
                    layoutId="navUnderline"
                    className="absolute bottom-[-2px] left-0 right-0 h-[2px] bg-[var(--color-accent)] rounded-t"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Right: Timer + Actions */}
        <div className="flex items-center gap-3">
          <CountdownTimer initial={45 * 60} />

          <button className="hidden md:flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-transparent hover:border-[var(--color-border)] rounded-[8px] transition-all">
            <Save className="w-4 h-4" strokeWidth={1.5} />
            Save Draft
          </button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] text-white text-[13px] font-bold rounded-[8px] hover:bg-[var(--color-accent-hover)] transition-colors shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
            Submit Solution
          </motion.button>

          <div className="w-8 h-8 rounded-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] overflow-hidden ml-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDQZT7yCwR5N6AMOZ6RMfaqCZzW-kxbROlVr7f12hxHei_JCDmgVVLsw_fyjtQNi2Z7LBW2CGFMXeQieQbi7O37l-HuQqekWCJ1_Q0qAw2MtjLEigyBgPyx9SAsdKGK6Zi2_9-rBIhnhQkXfUKwUkpynEM2AMnWyl-dFZUH3mVcaaHcwBneHVHPEY1PhjkvrxyRfmSfkPpkuZeldaVqzKK-OdpgrRJbC4gE8ACoxjBIi9tLeoKwK19FPOMOtsdL41KwdvVr5rt9vMdD"
              alt="User"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </motion.header>

      {/* ── Workspace ──────────────────────────────────────────────────── */}
      <main className="flex-1 flex overflow-hidden">

        {/* ── Left Panel: AI Chat (40%) ────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="w-2/5 flex flex-col bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)]"
        >
          {/* Panel Header */}
          <div className="px-5 py-3 border-b border-[var(--color-border)] flex justify-between items-center bg-white shrink-0">
            <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
              <Bot className="w-4 h-4 text-[var(--color-accent)]" strokeWidth={1.5} />
              AI Interviewer
              <span className="w-2 h-2 rounded-full bg-[var(--color-verified)] ml-1 animate-pulse"></span>
            </h2>
            <div className="flex gap-1">
              <button className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] rounded-[6px] transition-colors">
                <Volume2 className="w-4 h-4" strokeWidth={1.5} />
              </button>
              <button className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] rounded-[6px] transition-colors">
                <MoreHorizontal className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Thread Area */}
          <div className="flex-1 overflow-y-auto p-5">
            <motion.div
              initial="hidden" animate="visible" variants={staggerContainer}
              className="space-y-7"
            >
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
              <div ref={threadEndRef} />
            </motion.div>
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-[var(--color-border)] bg-white shrink-0">
            <div className="flex items-center gap-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-[10px] px-2 focus-within:border-[var(--color-accent)] focus-within:ring-1 focus-within:ring-[var(--color-accent)] transition-all">
              <button className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors">
                <Mic className="w-5 h-5" strokeWidth={1.5} />
              </button>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Type your message or speak..."
                className="flex-1 bg-transparent border-none outline-none text-[14px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] py-2.5"
              />
              <button
                onClick={handleSend}
                className="p-2 text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors"
              >
                <Send className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
          </div>
        </motion.section>

        {/* ── Right Panel: Code Editor (60%) ───────────────────────────── */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-3/5 flex flex-col bg-[#1E1E1E]"
        >
          {/* Editor Header */}
          <div className="px-5 py-2.5 border-b border-[#333] flex justify-between items-center bg-[#252526] shrink-0">
            <div className="flex items-center gap-3">
              {/* Tab */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1E1E1E] rounded-t border-t-2 border-t-[var(--color-accent)]">
                <FileCode2 className="w-3.5 h-3.5 text-[#E3B341]" strokeWidth={1.5} />
                <span className="text-[13px] text-[#CCCCCC] font-mono">solution.py</span>
              </div>
              <div className="h-4 w-px bg-[#444]"></div>
              {/* Language selector */}
              <button className="flex items-center gap-1 text-[12px] text-[#858585] hover:text-[#CCCCCC] transition-colors font-mono">
                Python 3 <LangDown className="w-3 h-3" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                onClick={handleRun}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                disabled={isRunning}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[#CCCCCC] bg-[#333] hover:bg-[#3c3c3c] border border-[#444] rounded-[6px] transition-colors disabled:opacity-50 font-mono"
              >
                {isRunning ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                    className="w-3 h-3 border-2 border-[#CCCCCC] border-t-transparent rounded-full"
                  />
                ) : (
                  <Play className="w-3 h-3 fill-current" />
                )}
                {isRunning ? "Running..." : "Run Code"}
              </motion.button>
            </div>
          </div>

          {/* Editor Body */}
          <div className="flex-1 flex overflow-hidden">
            {/* Line Numbers */}
            <div className="w-12 bg-[#1E1E1E] py-5 flex flex-col items-end pr-3 text-[#858585] font-mono text-[13px] select-none leading-[1.6] border-r border-[#2d2d2d] shrink-0">
              {CODE_LINES.map((_, i) => (
                <span key={i} className="leading-[22px]">{i + 1}</span>
              ))}
            </div>

            {/* Code Content */}
            <div className="flex-1 overflow-auto p-5 font-mono text-[13px] leading-[22px]">
              {CODE_LINES.map((line, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.3, ease: "easeOut" }}
                  className="whitespace-pre hover:bg-white/[0.03] rounded-sm transition-colors"
                >
                  <span>{" ".repeat(line.indent)}</span>
                  {line.tokens.map((token, j) => (
                    <span key={j} style={{ color: token.c }}>{token.t}</span>
                  ))}
                </motion.div>
              ))}
            </div>
          </div>

          {/* Console Slide-up Panel */}
          <div className="shrink-0 border-t border-[#333]">
            {/* Console Toggle Header */}
            <button
              onClick={() => setConsoleOpen((v) => !v)}
              className="w-full h-10 bg-[#252526] hover:bg-[#2D2D30] flex items-center justify-between px-5 transition-colors"
            >
              <div className="flex items-center gap-2 text-[13px] font-medium text-[#CCCCCC]">
                <Terminal className="w-4 h-4 text-[#858585]" strokeWidth={1.5} />
                Console Output
                {consoleOpen && (
                  <span className="px-1.5 py-0.5 bg-[var(--color-verified)]/20 text-[var(--color-verified)] text-[10px] font-bold rounded font-mono">
                    All tests passed
                  </span>
                )}
              </div>
              {consoleOpen
                ? <ChevronDown className="w-4 h-4 text-[#858585]" />
                : <ChevronUp className="w-4 h-4 text-[#858585]" />
              }
            </button>

            {/* Console Content */}
            <AnimatePresence>
              {consoleOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 180, opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden bg-[#1A1A1A]"
                >
                  <div className="p-4 space-y-2 overflow-y-auto h-full">
                    {CONSOLE_OUTPUT.map((line, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className={`font-mono text-[12px] flex items-start gap-2 ${
                          line.type === "success" ? "text-[#4EC9B0]" :
                          line.type === "info" ? "text-[#858585]" : "text-[#F48771]"
                        }`}
                      >
                        {line.text}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.section>

      </main>
      
      <AnimatePresence>
        {isSubmitting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[#09090e] flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="relative mb-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="h-48 w-48 rounded-full border border-dashed border-violet-500/30"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                className="absolute inset-4 rounded-full border border-violet-500/20"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  <div className="absolute inset-0 animate-pulse rounded-full bg-violet-500/20 blur-2xl" />
                  <motion.div 
                    animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-2xl shadow-violet-500/20"
                  >
                    <Brain className="h-10 w-10 text-white" />
                  </motion.div>
                </div>
              </div>
            </div>

            <motion.div
              key={analysisStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <h2 className="text-2xl font-bold tracking-tight text-white">Analyzing Results</h2>
              <p className="text-violet-400 font-mono text-sm tracking-wide">
                {steps[analysisStep]}
              </p>
              
              <div className="mt-8 flex justify-center gap-1.5">
                {steps.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1 rounded-full transition-all duration-500 ${
                      i === analysisStep ? "w-8 bg-violet-500" : i < analysisStep ? "w-4 bg-violet-500/40" : "w-4 bg-white/5"
                    }`}
                  />
                ))}
              </div>
            </motion.div>

            <div className="absolute bottom-12 text-[10px] uppercase tracking-[0.2em] text-white/20 font-bold">
              AI Verification Engine v2.4 // XLR8Hire
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
