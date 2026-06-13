"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Timer, Save, Send,
  Play, ChevronUp, ChevronDown,
  Terminal, FileCode2, ChevronDown as LangDown,
  FileText, Zap, Brain, ArrowLeft, X
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RagDebugPanel } from "@/components/debug/rag-debug-panel";
import { hasDebugMetadata } from "@/lib/debug-metadata";
import { useMarketplaceStore } from "@/store/useMarketplaceStore";
import {
  assessmentErrorMessage,
  canUseAssessmentDemoFallback,
  clearStoredActiveAssessmentSessionId,
  getAssessmentSession,
  getLatestAssessmentSession,
  getStoredActiveAssessmentSessionId,
  setStoredActiveAssessmentSessionId,
  setStoredFinishedAssessmentSessionId,
  runAssessmentCode,
  submitAssessmentAnswer,
  submitAssessmentForReport,
} from "@/lib/api/assessment-service";
import {
  AssessmentProgress,
  AssessmentQuestion,
  AssessmentSessionDetail,
  RunCodeResponse,
} from "@/lib/api/types";
import { useIntegrityEvents } from "@/lib/use-integrity-events";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  id: number;
  role: "ai" | "user";
  name: string;
  time: string;
  content: string[];
}

type InterviewMode = "loading" | "backend" | "demo" | "error";

interface InterviewSearchState {
  ready: boolean;
  mode: string | null;
  sessionId: string | null;
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

function codeLinesToText(): string {
  return CODE_LINES.map((line) => {
    const content = line.tokens.map((token) => token.t).join("");
    return `${" ".repeat(line.indent)}${content}`;
  }).join("\n");
}

type QuestionUxMode = "text" | "coding" | "debugging_text" | "debugging_code";

interface QuestionPresentation {
  mode: QuestionUxMode;
  requiresCode: boolean;
  hasCodeSnippet: boolean;
  codeSnippet: string | null;
  label: string;
  expectedAnswerStyle: string;
}

interface AnswerGuidance {
  title: string;
  items: string[];
  outline: string;
  placeholder: string;
  expectation: string;
}

const DEMO_QUESTION: AssessmentQuestion = {
  id: "demo-coding-question",
  question_bank_id: "demo",
  order_index: 0,
  question_text:
    "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.",
  question_type: "coding",
  category: "algorithm",
  difficulty: "intermediate",
  time_limit_seconds: 45 * 60,
  expected_concepts: ["hash map lookup", "single pass traversal", "time complexity", "edge cases"],
  scoring_rubric: { requires_code: true },
};

function normalizeSignal(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/[_-]+/g, " ");
}

function metadataRequiresCode(question: AssessmentQuestion): boolean {
  const sources = [
    question.scoring_rubric,
    (question as AssessmentQuestion & { metadata?: Record<string, unknown> }).metadata,
    (question as AssessmentQuestion & { metadata_json?: Record<string, unknown> }).metadata_json,
  ].filter(Boolean) as Record<string, unknown>[];

  return sources.some((source) =>
    ["requires_code", "code_required", "requiresImplementation", "requires_implementation"].some(
      (key) => source[key] === true
    )
  );
}

function extractCodeSnippet(text: string): string | null {
  const fenced = text.match(/```(?:[a-zA-Z0-9_-]+)?\s*([\s\S]*?)```/);
  if (fenced?.[1]?.trim()) return fenced[1].trim();

  const lines = text.split("\n");
  const snippetLines = lines.filter((line) =>
    /^\s*(class |def |function |const |let |var |SELECT |INSERT |UPDATE |DELETE |Traceback|Error:|Exception|HTTP\/|GET |POST |PUT |PATCH )/i.test(line)
  );
  return snippetLines.length >= 2 ? snippetLines.join("\n").trim() : null;
}

function buildQuestionPresentation(question: AssessmentQuestion | null): QuestionPresentation {
  if (!question) {
    return {
      mode: "text",
      requiresCode: false,
      hasCodeSnippet: false,
      codeSnippet: null,
      label: "Answer",
      expectedAnswerStyle: "Answer the current prompt clearly, then finish when all questions are complete.",
    };
  }

  const questionType = normalizeSignal(question.question_type);
  const category = normalizeSignal(question.category);
  const text = normalizeSignal(question.question_text);
  const signal = `${questionType} ${category} ${text}`;
  const codeSnippet = extractCodeSnippet(question.question_text);
  const isDebugging = questionType.includes("debug") || category.includes("debug");
  const explicitCode = questionType === "coding" || questionType.includes("coding");
  const implementationCategory =
    category.includes("implementation") ||
    category.includes("coding") ||
    category.includes("algorithm") ||
    category.includes("component design") ||
    category.includes("code quality");
  const asksForCode =
    /\b(write|implement|build|code|fix|patch|refactor|complete)\b/.test(signal) &&
    /\b(function|component|endpoint|query|class|method|sql|api|code|implementation)\b/.test(signal);
  const requiresCode =
    metadataRequiresCode(question) || explicitCode || implementationCategory || (isDebugging && asksForCode);
  const hasCodeSnippet = Boolean(codeSnippet);

  let mode: QuestionUxMode = "text";
  if (isDebugging) {
    mode = requiresCode ? "debugging_code" : "debugging_text";
  } else if (requiresCode) {
    mode = "coding";
  }

  const label =
    question.objective_question || questionType.includes("mcq")
      ? "Objective Check"
      : mode === "coding"
      ? "Coding Task"
      : mode === "debugging_code"
        ? "Debug & Patch"
        : mode === "debugging_text"
          ? "Debugging Scenario"
          : questionType.includes("system")
            ? "System Design"
            : questionType.includes("communication")
              ? "Communication"
              : category.includes("database")
                ? "Database Design"
                : "Interview Question";

  const expectedAnswerStyle =
    mode === "coding"
      ? "Submit working code and add a concise note about your approach, complexity, and edge cases."
      : mode === "debugging_code"
        ? "Identify the likely root cause, explain the fix, then provide the code or patch."
        : mode === "debugging_text"
          ? "Explain symptoms, root cause, verification steps, and the safest fix path."
          : questionType.includes("system") || category.includes("architecture")
            ? "Cover architecture, data flow, tradeoffs, failure cases, and how you would validate the design."
            : questionType.includes("communication")
              ? "Use a structured, evidence-based answer with context, decision, tradeoff, and outcome."
              : category.includes("database")
                ? "Explain schema/query choices, constraints, indexing, consistency, and tradeoffs."
                : "Explain your reasoning clearly, include assumptions, tradeoffs, and concrete examples.";

  return { mode, requiresCode, hasCodeSnippet, codeSnippet, label, expectedAnswerStyle };
}

function buildAnswerGuidance(question: AssessmentQuestion | null, presentation: QuestionPresentation): AnswerGuidance {
  const questionType = normalizeSignal(question?.question_type);
  const category = normalizeSignal(question?.category);
  const signal = `${questionType} ${category}`;

  if (presentation.mode === "debugging_text" || signal.includes("debug")) {
    return {
      title: "Structure your debugging answer",
      items: ["Reproduction steps", "Logs or metrics to inspect", "Likely causes", "Fix", "Prevention"],
      outline: "Reproduction:\nSignals/logs to check:\nLikely cause:\nFix:\nPrevention:",
      placeholder: "Write a structured debugging answer. Include reproduction steps, signals, likely cause, fix, and prevention.",
      expectation: "Recommended: 5-8 sentences or structured bullets.",
    };
  }

  if (questionType.includes("system") || category.includes("system") || category.includes("architecture")) {
    return {
      title: "Structure your system design answer",
      items: ["Requirements", "Architecture", "Data flow", "Scaling/failure handling", "Tradeoffs"],
      outline: "Requirements:\nArchitecture:\nData flow:\nScaling/failure handling:\nTradeoffs:\nFinal recommendation:",
      placeholder: "Write a structured system design answer. Include requirements, architecture, data flow, scaling, and tradeoffs.",
      expectation: "Recommended: concise sections or 6-10 focused bullets.",
    };
  }

  if (questionType.includes("communication") || category.includes("communication")) {
    return {
      title: "Structure your communication answer",
      items: ["Clear explanation", "Reasoning", "Tradeoffs", "Concrete example", "Final recommendation"],
      outline: "Context:\nReasoning:\nTradeoffs:\nExample:\nFinal recommendation:",
      placeholder: "Write a clear answer. Include your reasoning, tradeoffs, an example, and a final recommendation.",
      expectation: "Recommended: 5-8 sentences with a clear final recommendation.",
    };
  }

  return {
    title: "Structure your interview answer",
    items: ["Assumptions", "Step-by-step approach", "Tradeoffs", "Edge cases", "Concrete example"],
    outline: "Assumptions:\nApproach:\nTradeoffs:\nEdge cases:\nExample:\nFinal answer:",
    placeholder: "Write a structured answer. Include assumptions, reasoning, tradeoffs, and examples.",
    expectation: "Recommended: 5-8 sentences or structured bullets.",
  };
}

function shouldSubmitCodeText(question: AssessmentQuestion | null): boolean {
  return buildQuestionPresentation(question).requiresCode;
}

function isObjectiveQuestion(question: AssessmentQuestion | null): boolean {
  return Boolean(question?.objective_question && question.objective_options?.length);
}

function optionText(question: AssessmentQuestion | null, optionId: string | null): string | null {
  if (!question || !optionId) return null;
  return question.objective_options?.find((option) => option.id === optionId)?.text ?? null;
}

function initialCodeForQuestion(question: AssessmentQuestion | null): string {
  if (!question) return codeLinesToText();
  if (question.starter_code?.trim()) return question.starter_code;
  const snippet = extractCodeSnippet(question.question_text);
  if (snippet) return snippet;
  if (question.id === DEMO_QUESTION.id) return codeLinesToText();
  return "";
}

function questionToMessage(question: AssessmentQuestion): Message {
  return {
    id: Date.now() + question.order_index,
    role: "ai",
    name: "Interview Assistant",
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    content: [
      question.question_text,
      `Focus area: ${question.category.replaceAll("_", " ")}. Difficulty: ${question.difficulty}.`,
    ],
  };
}

function messagesFromSessionDetail(detail: AssessmentSessionDetail): Message[] {
  const answerByQuestion = new Map(
    detail.answers.map((answer) => [answer.assessment_question_id, answer])
  );
  const nextMessages: Message[] = [];

  [...detail.questions]
    .sort((a, b) => a.order_index - b.order_index)
    .some((question) => {
      nextMessages.push(questionToMessage(question));
      const answer = answerByQuestion.get(question.id);
      if (!answer) return true;
      nextMessages.push({
        id: Date.now() + question.order_index + 100,
        role: "user",
        name: "Candidate",
        time: "Submitted",
        content: [answer.answer_text || "Code response submitted."],
      });
      return false;
    });

  if (detail.current_question === null && detail.answers.length > 0) {
    nextMessages.push({
      id: Date.now() + 999,
      role: "ai",
      name: "Interview Assistant",
      time: "Now",
      content: ["All planned questions are answered. Finish the assessment to unlock your results page."],
    });
  }

  return nextMessages.length > 0 ? nextMessages : INITIAL_MESSAGES;
}

function formatDisplayValue(value: string | null | undefined): string {
  return (value || "general").replaceAll("_", " ").replaceAll("-", " ");
}

function runResultLines(result: RunCodeResponse | null): Array<{ type: "success" | "info" | "error"; text: string }> {
  if (!result) {
    return [{ type: "info", text: "Run Code executes backend Python tests when this question supports executable test cases." }];
  }

  const lines: Array<{ type: "success" | "info" | "error"; text: string }> = [
    {
      type: result.status === "passed" ? "success" : result.status === "failed" ? "error" : "info",
      text: `${result.message} | Runtime: ${result.runtime_ms}ms`,
    },
  ];

  for (const test of result.test_results) {
    lines.push({
      type: test.passed ? "success" : "error",
      text: `${test.passed ? "PASS" : "FAIL"} ${test.name}`,
    });
    if (!test.passed) {
      if (test.expected_output != null) lines.push({ type: "info", text: `Expected: ${test.expected_output}` });
      if (test.actual_output != null) lines.push({ type: "info", text: `Actual: ${test.actual_output}` });
      if (test.error) lines.push({ type: "error", text: test.error });
    }
  }

  if (result.stderr && result.test_results.length === 0) {
    lines.push({ type: "error", text: result.stderr });
  }
  if (result.stdout && result.status === "error") {
    lines.push({ type: "info", text: result.stdout });
  }
  return lines;
}

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

function QuestionDetailCard({
  question,
  presentation,
  compact = false,
}: {
  question: AssessmentQuestion | null;
  presentation: QuestionPresentation;
  compact?: boolean;
}) {
  if (!question) {
    return (
      <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-card)] p-5">
        <p className="text-[13px] font-bold text-[var(--color-text-primary)]">No active question</p>
        <p className="mt-2 text-[13px] text-[var(--color-text-secondary)]">
          Finish the assessment when the backend marks all questions answered.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[var(--color-accent-light)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-accent)]">
          {presentation.label}
        </span>
        <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[11px] font-semibold capitalize text-[var(--color-text-secondary)]">
          {formatDisplayValue(question.difficulty)}
        </span>
        <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[11px] font-semibold capitalize text-[var(--color-text-secondary)]">
          {formatDisplayValue(question.category)}
        </span>
      </div>

      <p className={`${compact ? "text-[15px]" : "text-[18px]"} font-semibold leading-[1.55] text-[var(--color-text-primary)]`}>
        {question.question_text}
      </p>

      {!compact && (
        <div className="mt-4 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
            Expected answer style
          </p>
          <p className="mt-1 text-[13px] leading-[1.55] text-[var(--color-text-secondary)]">
            {presentation.expectedAnswerStyle}
          </p>
        </div>
      )}

      {question.expected_concepts.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {question.expected_concepts.slice(0, compact ? 5 : 8).map((concept) => (
            <span
              key={concept}
              className="rounded-full bg-[var(--color-bg-secondary)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-secondary)]"
            >
              {concept}
            </span>
          ))}
        </div>
      )}

      {presentation.codeSnippet && !presentation.requiresCode && (
        <pre className="mt-4 max-h-40 overflow-auto rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-dark)] p-4 text-[12px] leading-[1.55] text-slate-100">
          {presentation.codeSnippet}
        </pre>
      )}
    </div>
  );
}

function SimpleQuestionCard({
  question,
  presentation,
  current,
  total,
}: {
  question: AssessmentQuestion | null;
  presentation: QuestionPresentation;
  current: number;
  total: number;
}) {
  if (!question) {
    return (
      <div className="shrink-0 rounded-[14px] bg-[var(--color-card)] p-5">
        <p className="text-[15px] font-bold text-[var(--color-text-primary)]">No active question</p>
        <p className="mt-2 text-[13px] text-[var(--color-text-secondary)]">
          Finish the assessment when all backend questions are answered.
        </p>
      </div>
    );
  }

  return (
    <section className="shrink-0 rounded-[14px] bg-[var(--color-card)] p-5">
      <p className="text-[12px] font-bold text-[var(--color-accent)]">
        Question {current || 0} of {total || 0}
      </p>
      <h1 className="mt-2 text-[22px] font-bold leading-[1.35] tracking-tight text-[var(--color-text-primary)] md:text-[26px]">
        {question.question_text}
      </h1>
      <div className="mt-3 text-[13px] font-semibold capitalize text-[var(--color-text-muted)]">
        {presentation.label} · {formatDisplayValue(question.difficulty)} · {formatDisplayValue(question.category)}
      </div>
    </section>
  );
}

function ObjectiveOptions({
  question,
  selectedOptionId,
  onSelect,
}: {
  question: AssessmentQuestion | null;
  selectedOptionId: string | null;
  onSelect: (optionId: string) => void;
}) {
  const options = question?.objective_options ?? [];
  if (!question || options.length === 0) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-[12px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
      <div className="mb-3">
        <p className="text-[15px] font-bold text-[var(--color-text-primary)]">Choose one answer</p>
        <p className="text-[12px] text-[var(--color-text-muted)]">
          This objective check is scored by the backend. The answer key is hidden until evaluation is complete.
        </p>
      </div>
      <div className="grid gap-2 overflow-y-auto">
        {options.map((option, index) => {
          const selected = selectedOptionId === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelect(option.id)}
              className={`flex items-start gap-3 rounded-[10px] border p-3 text-left transition ${
                selected
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-light)] text-[var(--color-text-primary)]"
                  : "border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/50 hover:bg-[var(--color-bg-subtle)]"
              }`}
            >
              <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[12px] font-bold ${
                selected
                  ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                  : "border-[var(--color-border)] text-[var(--color-text-muted)]"
              }`}>
                {String.fromCharCode(65 + index)}
              </span>
              <span className="text-[14px] font-semibold leading-6">{option.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AnswerGuideDisclosure({
  guidance,
  onUseTemplate,
}: {
  guidance: AnswerGuidance;
  onUseTemplate: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="shrink-0 rounded-[10px] bg-[var(--color-bg-secondary)] px-3 py-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="text-[13px] font-bold text-[var(--color-text-secondary)]">Answer guide</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-[var(--color-text-muted)]" />
        ) : (
          <ChevronDown className="h-4 w-4 text-[var(--color-text-muted)]" />
        )}
      </button>
      {open && (
        <div className="mt-2 border-t border-[var(--color-border)] pt-2">
          <ul className="grid gap-1 text-[13px] leading-6 text-[var(--color-text-secondary)] sm:grid-cols-2">
            {guidance.items.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
          <button
            type="button"
            onClick={onUseTemplate}
            className="mt-3 inline-flex items-center gap-2 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-[12px] font-bold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]"
          >
            <FileText className="h-4 w-4" strokeWidth={1.5} />
            Use answer structure
          </button>
        </div>
      )}
    </div>
  );
}

function InterviewDebugLauncher({ metadata }: { metadata: unknown }) {
  const [canShow, setCanShow] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      setCanShow(window.localStorage.getItem("xlr8_show_debug_metadata") === "true");
    } catch {
      setCanShow(false);
    }
  }, []);

  if (!canShow || !hasDebugMetadata(metadata)) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-[70] rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-[12px] font-bold text-[var(--color-text-secondary)] shadow-lg transition hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
      >
        Debug
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] bg-black/35 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="ml-auto flex h-full w-full max-w-xl flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
              <div>
                <p className="text-sm font-bold text-[var(--color-text-primary)]">Debug metadata</p>
                <p className="text-xs text-[var(--color-text-muted)]">Collapsed by default. Visible only in debug mode.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
                aria-label="Close debug metadata"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <RagDebugPanel
                title="Interview RAG Session"
                summary="Backend question source, selected RAG documents, and current question metadata."
                metadata={metadata}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SubmitAnswerButton({
  isSubmitting,
  disabled,
  isCodeFocused,
  label,
  onClick,
}: {
  isSubmitting: boolean;
  disabled: boolean;
  isCodeFocused: boolean;
  label?: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.01 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center gap-2 rounded-[8px] bg-[var(--color-accent)] px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition-colors hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isSubmitting ? (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
          className="h-4 w-4 rounded-full border-2 border-white border-t-transparent"
        />
      ) : (
        <Send className="h-4 w-4" strokeWidth={2} />
      )}
      {label ?? (isCodeFocused ? "Submit Code Answer" : "Submit Answer")}
    </motion.button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AIInterviewPage() {
  const [, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState("");
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [codeText, setCodeText] = useState(codeLinesToText());
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<RunCodeResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnswerSubmitting, setIsAnswerSubmitting] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [draftSaved, setDraftSaved] = useState(false);
  const [interviewMode, setInterviewMode] = useState<InterviewMode>("loading");
  const [backendSessionId, setBackendSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<AssessmentQuestion | null>(null);
  const [progress, setProgress] = useState<AssessmentProgress | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [backendNotice, setBackendNotice] = useState<string | null>(null);
  const [sessionMetadata, setSessionMetadata] = useState<Record<string, unknown> | null>(null);
  const [questionStartedAt, setQuestionStartedAt] = useState(() => Date.now());
  const [requestSearch, setRequestSearch] = useState<InterviewSearchState>({
    ready: false,
    mode: null,
    sessionId: null,
  });
  const router = useRouter();
  const { completeAssessment } = useMarketplaceStore();
  const { flushIntegrityEvents } = useIntegrityEvents(
    backendSessionId,
    interviewMode === "backend"
  );
  const displayQuestion =
    currentQuestion ?? (interviewMode === "demo" ? DEMO_QUESTION : null);
  const questionPresentation = buildQuestionPresentation(displayQuestion);
  const answerGuidance = buildAnswerGuidance(displayQuestion, questionPresentation);
  const isObjective = isObjectiveQuestion(displayQuestion);
  const isCodeFocused =
    questionPresentation.mode === "coding" || questionPresentation.mode === "debugging_code";
  const executionSupported = Boolean(displayQuestion?.execution_supported);
  const executionReason =
    displayQuestion?.execution_reason || "This task is evaluated by rubric, not executable tests.";
  const currentQuestionId = currentQuestion?.id ?? null;
  const answeredCount = progress?.answered ?? 0;
  const totalQuestions = progress?.total ?? (displayQuestion ? 1 : 0);
  const currentQuestionNumber = displayQuestion
    ? Math.min(answeredCount + 1, totalQuestions || answeredCount + 1)
    : answeredCount;
  const answerCharacterCount = inputValue.length;
  const answerWordCount = inputValue.trim() ? inputValue.trim().split(/\s+/).length : 0;

  const steps = [
    "Compiling code signals...",
    "Analyzing semantic reasoning...",
    "Evaluating problem solving vectors...",
    "Synthesizing final HirdUp score...",
    "Verification complete. Redirecting..."
  ];
  useEffect(() => {
    if (currentQuestion && shouldSubmitCodeText(currentQuestion)) {
      setCodeText(initialCodeForQuestion(currentQuestion));
    }
    setInputValue("");
    setSelectedOptionId(null);
    setRunResult(null);
  }, [currentQuestion, currentQuestionId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRequestSearch({
      ready: true,
      mode: params.get("mode"),
      sessionId: params.get("sessionId"),
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const switchToDemo = (notice?: string) => {
      if (cancelled) return;
      setInterviewMode("demo");
      setMessages(INITIAL_MESSAGES);
      setCurrentQuestion(null);
      setProgress(null);
      setBackendSessionId(null);
      setSessionMetadata(null);
      setBackendNotice(notice ?? null);
      setBackendError(null);
    };

    async function loadBackendSession() {
      if (!requestSearch.ready) return;

      setBackendError(null);
      setBackendNotice(null);

      if (requestSearch.mode === "demo") {
        switchToDemo();
        return;
      }

      setInterviewMode("loading");

      try {
        let sessionId = requestSearch.sessionId || getStoredActiveAssessmentSessionId();
        let detail: AssessmentSessionDetail | null = null;

        if (sessionId) {
          detail = await getAssessmentSession(sessionId);
        } else {
          detail = await getLatestAssessmentSession();
          sessionId = detail?.session.id ?? null;
        }

        if (cancelled) return;

        if (!detail || !sessionId) {
          switchToDemo("No active backend session found. Running local demo interview.");
          return;
        }

        if (detail.session.status === "completed") {
          completeAssessment();
          clearStoredActiveAssessmentSessionId();
          setStoredFinishedAssessmentSessionId(detail.session.id);
          router.replace(`/dashboard/student/results?sessionId=${encodeURIComponent(detail.session.id)}`);
          return;
        }

        setStoredActiveAssessmentSessionId(detail.session.id);
        setBackendSessionId(detail.session.id);
        setSessionMetadata(detail.session.session_plan_metadata);
        setCurrentQuestion(detail.current_question);
        setProgress(detail.progress);
        setMessages(messagesFromSessionDetail(detail));
        setQuestionStartedAt(Date.now());
        setInterviewMode("backend");
      } catch (error) {
        if (cancelled) return;
        if (canUseAssessmentDemoFallback(error)) {
          switchToDemo("Assessment backend unavailable. Continuing in local demo mode.");
          return;
        }
        setInterviewMode("error");
        setBackendError(assessmentErrorMessage(error));
      }
    }

    loadBackendSession();

    return () => {
      cancelled = true;
    };
  }, [requestSearch, router, completeAssessment]);

  const handleBackendSend = async () => {
    if (!backendSessionId || !currentQuestion || isAnswerSubmitting) return;

    const submittedText = inputValue.trim();
    const shouldSendCode = shouldSubmitCodeText(currentQuestion);
    const isCurrentObjective = isObjectiveQuestion(currentQuestion);
    const submittedCode = shouldSendCode ? codeText.trim() : "";
    if (isCurrentObjective && !selectedOptionId) {
      setBackendError("Select an option before submitting this question.");
      return;
    }
    if (!isCurrentObjective && !submittedText && !submittedCode) {
      setBackendError(
        shouldSendCode
          ? "Add code or a short explanation before submitting this answer."
          : "Add an answer before submitting this question."
      );
      return;
    }

    setIsAnswerSubmitting(true);
    setBackendError(null);
    setBackendNotice(null);

    try {
      const durationSeconds = Math.max(1, Math.round((Date.now() - questionStartedAt) / 1000));
      const selectedOptionText = optionText(currentQuestion, selectedOptionId);
      const response = await submitAssessmentAnswer(backendSessionId, {
        assessment_question_id: currentQuestion.id,
        answer_text: submittedText || selectedOptionText || (submittedCode ? "Code solution submitted." : null),
        code_text: submittedCode || null,
        selected_option_id: isCurrentObjective ? selectedOptionId : null,
        duration_seconds: durationSeconds,
        metadata: {
          source: "frontend",
          category: currentQuestion.category,
          question_type: currentQuestion.question_type,
          ui_mode: buildQuestionPresentation(currentQuestion).mode,
          expected_sections: answerGuidance.items,
          structured_answer_guidance_shown: !isCurrentObjective && !shouldSendCode,
          objective_question: isCurrentObjective,
          latest_run_result: runResult
            ? {
                status: runResult.status,
                passed_count: runResult.passed_count,
                failed_count: runResult.failed_count,
                total_count: runResult.total_count,
                runtime_ms: runResult.runtime_ms,
              }
            : null,
        },
      });

      const userMessage: Message = {
        id: Date.now(),
        role: "user",
        name: "Candidate",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        content: [submittedText || selectedOptionText || "Code solution submitted."],
      };

      setInputValue("");
      setSelectedOptionId(null);
      if (shouldSendCode) {
        setCodeText("");
      }
      setProgress(response.progress);
      setCurrentQuestion(response.next_question);
      setSessionMetadata(response.session.session_plan_metadata);
      setQuestionStartedAt(Date.now());
      setMessages((prev) => {
        const next = [...prev, userMessage];
        if (response.next_question) {
          next.push(questionToMessage(response.next_question));
        } else {
          next.push({
            id: Date.now() + 1,
            role: "ai",
            name: "Interview Assistant",
            time: "Now",
            content: ["All planned questions are answered. Finish the assessment to unlock your results page."],
          });
        }
        return next;
      });
      if (response.next_question && shouldSubmitCodeText(response.next_question)) {
        setCodeText(initialCodeForQuestion(response.next_question));
      }
    } catch (error) {
      if (canUseAssessmentDemoFallback(error)) {
        setBackendNotice("Assessment backend unavailable. Switching to local demo mode.");
        setInterviewMode("demo");
      } else {
        setBackendError(assessmentErrorMessage(error));
      }
    } finally {
      setIsAnswerSubmitting(false);
    }
  };

  const handleRun = () => {
    if (!backendSessionId || !currentQuestion || !executionSupported || isRunning) return;
    setIsRunning(true);
    setConsoleOpen(true);
    setBackendError(null);
    runAssessmentCode(backendSessionId, currentQuestion.id, {
      language: "python",
      code: codeText,
    })
      .then((result) => {
        setRunResult(result);
      })
      .catch((error) => {
        setRunResult({
          status: "error",
          passed_count: 0,
          failed_count: 0,
          total_count: 0,
          runtime_ms: 0,
          test_results: [],
          stdout: "",
          stderr: assessmentErrorMessage(error),
          message: assessmentErrorMessage(error),
        });
      })
      .finally(() => setIsRunning(false));
  };

  const handleSaveDraft = () => {
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2200);
  };

  const handleInsertAnswerOutline = () => {
    setInputValue((current) => {
      const trimmed = current.trim();
      return trimmed ? current : answerGuidance.outline;
    });
    setDraftSaved(false);
  };

  const completeMockAssessment = () => {
    setIsSubmitting(true);
    // Cycle through analysis steps
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < steps.length) {
        setAnalysisStep(currentStep);
      } else {
        clearInterval(interval);
        completeAssessment();
        setTimeout(() => {
          router.push("/dashboard/student/results");
        }, 800);
      }
    }, 1200);
  };

  const handleSubmit = async () => {
    if (interviewMode === "error") return;
    if (interviewMode !== "backend") {
      completeMockAssessment();
      return;
    }

    if (!backendSessionId) {
      setBackendError("Assessment session not found. Start again from prep.");
      return;
    }

    if (currentQuestion) {
      setBackendError("Answer the current question before finishing the assessment.");
      return;
    }

    setBackendError(null);
    setBackendNotice(null);
    setIsSubmitting(true);

    try {
      await flushIntegrityEvents();
      await submitAssessmentForReport(backendSessionId);
      completeAssessment();
      clearStoredActiveAssessmentSessionId();
      setStoredFinishedAssessmentSessionId(backendSessionId);
      router.push(`/dashboard/student/results?sessionId=${encodeURIComponent(backendSessionId)}`);
    } catch (error) {
      setIsSubmitting(false);
      if (canUseAssessmentDemoFallback(error)) {
        completeMockAssessment();
      } else {
        setBackendError(assessmentErrorMessage(error));
      }
    }
  };

  const finishAvailable = interviewMode === "backend" && !currentQuestion && Boolean(backendSessionId);
  const primaryActionLabel = finishAvailable ? "Finish Assessment" : "Submit Answer";
  const primaryActionDisabled =
    isSubmitting ||
    isAnswerSubmitting ||
    interviewMode === "loading" ||
    interviewMode === "error" ||
    (interviewMode === "backend" && !currentQuestion && !finishAvailable);
  const handlePrimaryAction = () => {
    if (finishAvailable) {
      void handleSubmit();
      return;
    }
    if (interviewMode === "backend") {
      void handleBackendSend();
      return;
    }
    void handleSubmit();
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      {/* ── TopNav ─────────────────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="z-50 flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 md:px-5"
      >
        {/* Left: Brand + Nav */}
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/dashboard/student/interview/prep" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[var(--color-border)] text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)] md:w-auto md:px-3" aria-label="Exit assessment">
            <ArrowLeft className="h-4 w-4" />
            <span className="ml-2 hidden text-[13px] font-bold md:inline">Exit</span>
          </Link>
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-[var(--color-accent)]">
              <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <div className="truncate text-[16px] font-bold tracking-tight text-[var(--color-text-primary)]">
                InterviewOS Assessment
              </div>
              <div className="hidden text-[11px] font-semibold text-[var(--color-text-muted)] sm:block">
                Focused mode
              </div>
            </div>
          </div>
          <div className="hidden min-w-0 items-center gap-2 lg:flex">
            <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-2.5 py-1 text-[11px] font-bold text-[var(--color-text-secondary)]">
              Q{currentQuestionNumber || 0}/{totalQuestions || 0}
            </span>
            <span className="rounded-full bg-[var(--color-accent-light)] px-2.5 py-1 text-[11px] font-bold text-[var(--color-accent)]">
              {questionPresentation.label}
            </span>
            {displayQuestion && (
              <span className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[11px] font-semibold capitalize text-[var(--color-text-secondary)]">
                {formatDisplayValue(displayQuestion.difficulty)}
              </span>
            )}
          </div>
        </div>

        {/* Right: Timer + Actions */}
        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          <CountdownTimer initial={45 * 60} />

          {!finishAvailable && (
            <button
              onClick={handleSaveDraft}
              className="hidden items-center gap-2 rounded-[8px] border border-transparent px-3 py-2 text-[13px] font-semibold text-[var(--color-text-secondary)] transition-all hover:border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)] md:flex"
            >
              <Save className="w-4 h-4" strokeWidth={1.5} />
              {draftSaved ? "Draft Saved" : "Save Draft"}
            </button>
          )}

          <SubmitAnswerButton
            isSubmitting={isSubmitting || isAnswerSubmitting}
            disabled={primaryActionDisabled}
            isCodeFocused={isCodeFocused}
            label={primaryActionLabel}
            onClick={handlePrimaryAction}
          />
        </div>
      </motion.header>

      <div className="h-1 shrink-0 bg-[var(--color-bg-secondary)]">
        <div
          className="h-full bg-[var(--color-accent)] transition-all duration-500"
          style={{
            width: `${totalQuestions ? Math.min(100, Math.round((answeredCount / totalQuestions) * 100)) : 0}%`,
          }}
        />
      </div>

      {/* ── Workspace ──────────────────────────────────────────────────── */}
      {(backendError || backendNotice || interviewMode === "loading") && (
        <div className="border-b border-[var(--color-border)] bg-[var(--color-card)] px-6 py-3 text-[13px] text-[var(--color-text-secondary)]">
          <div className="mx-auto max-w-[1200px]">
            {interviewMode === "loading" && (
              <span className="font-bold text-[var(--color-accent)]">Loading backend assessment session...</span>
            )}
            {backendError && (
              <span className="font-bold text-red-600" role="alert">{backendError}</span>
            )}
            {backendNotice && (
              <span className="font-bold text-[var(--color-accent)]">{backendNotice}</span>
            )}
          </div>
        </div>
      )}
      <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 md:p-4 lg:flex-row lg:gap-4">

        {/* ── Left Panel: AI Chat (40%) ────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className={`min-h-0 w-full flex-col overflow-hidden rounded-[14px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] ${
            isCodeFocused ? "flex lg:w-[400px] lg:shrink-0" : "hidden"
          }`}
        >
          {/* Panel Header */}
          <div className="px-5 py-3 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-card)] shrink-0">
            <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[var(--color-accent)]" strokeWidth={1.5} />
              Question Details
            </h2>
            <span className="rounded-full bg-[var(--color-accent-light)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--color-accent)]">
              {questionPresentation.label}
            </span>
          </div>

          {/* Thread / details area */}
          <div className="flex-1 overflow-y-auto p-5">
            <div className="space-y-4">
              <QuestionDetailCard question={displayQuestion} presentation={questionPresentation} compact />
              {questionPresentation.codeSnippet && (
                <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-dark)]">
                  <div className="border-b border-white/10 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
                    Provided snippet / logs
                  </div>
                  <pre className="max-h-44 overflow-auto p-3 text-[12px] leading-[1.55] text-slate-100">
                    {questionPresentation.codeSnippet}
                  </pre>
                </div>
              )}
              <div className="rounded-[10px] border border-[var(--color-border)] bg-[var(--color-card)] p-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                  Approach note
                </p>
                <textarea
                  value={inputValue}
                  onChange={(event) => {
                    setInputValue(event.target.value);
                    setDraftSaved(false);
                  }}
                  placeholder="Briefly explain your approach, assumptions, complexity, or debugging diagnosis."
                  className="mt-2 min-h-[128px] w-full resize-none rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-2 text-[13px] leading-[1.55] text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/15"
                />
              </div>
            </div>
          </div>

          {/* Helper footer */}
          <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-card)] shrink-0">
            <p className="text-[12px] leading-[1.5] text-[var(--color-text-muted)]">
              {isCodeFocused
                ? "Full chat is hidden in coding mode so the editor stays focused. Add only the code needed for this prompt."
                : "Use the answer panel to respond naturally. The code editor is hidden because this question does not require code."}
            </p>
          </div>
        </motion.section>

        {/* ── Right Panel: Code Editor (60%) ───────────────────────────── */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className={`flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[14px] border border-[var(--color-border)] ${
            isCodeFocused
              ? "bg-[#1E1E1E] border-[#333]"
              : "bg-[var(--color-card)]"
          }`}
        >
          {/* Editor / answer header */}
          <div
            className={`px-5 py-2.5 border-b justify-between items-center shrink-0 ${
              isCodeFocused
                ? "flex border-[#333] bg-[#252526]"
                : "hidden border-[var(--color-border)] bg-[var(--color-card)]"
            }`}
          >
            {isCodeFocused ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1E1E1E] rounded-t border-t-2 border-t-[var(--color-accent)]">
                    <FileCode2 className="w-3.5 h-3.5 text-[#E3B341]" strokeWidth={1.5} />
                    <span className="text-[13px] text-[#CCCCCC] font-mono">solution.py</span>
                  </div>
                  <div className="h-4 w-px bg-[#444]"></div>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-[12px] text-[#858585] transition-colors hover:text-[#CCCCCC] font-mono"
                  >
                    Python 3 <LangDown className="w-3 h-3" />
                  </button>
                </div>
                {executionSupported ? (
                  <motion.button
                    onClick={handleRun}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    disabled={isRunning || !backendSessionId || !currentQuestion}
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
                    {isRunning ? "Running tests..." : "Run Code"}
                  </motion.button>
                ) : (
                  <span className="hidden max-w-[280px] text-right text-[11px] leading-snug text-[#858585] sm:block">
                    {executionReason}
                  </span>
                )}
              </>
            ) : (
              <>
                <div>
                  <p className="text-[13px] font-bold text-[var(--color-text-primary)]">Your answer</p>
                  <p className="text-[12px] text-[var(--color-text-muted)]">
                    Conceptual, design, and communication questions use a focused text response.
                  </p>
                </div>
                <button
                  onClick={handleInsertAnswerOutline}
                  className="hidden items-center gap-2 rounded-[8px] border border-[var(--color-border)] px-3 py-2 text-[12px] font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-secondary)] sm:flex"
                >
                    <FileText className="h-4 w-4" strokeWidth={1.5} />
                    Use answer structure
                </button>
              </>
            )}
          </div>

          {/* Editor / answer body */}
          <div className="flex-1 flex overflow-hidden">
            {finishAvailable ? (
              <div className="flex flex-1 items-center justify-center p-6">
                <div className="max-w-xl rounded-[14px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent)]">
                    <FileText className="h-5 w-5" strokeWidth={1.8} />
                  </div>
                  <p className="text-lg font-bold text-[var(--color-text-primary)]">All questions answered</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-text-secondary)]">
                    You have submitted {answeredCount}/{totalQuestions} questions. Use the Finish Assessment button in the header to finalize the session and generate your results.
                  </p>
                </div>
              </div>
            ) : isCodeFocused ? (
              <>
                <div className="w-12 bg-[#1E1E1E] py-5 flex flex-col items-end pr-3 text-[#858585] font-mono text-[13px] select-none leading-[22px] border-r border-[#2d2d2d] shrink-0">
                  {Array.from({ length: Math.max(14, codeText.split("\n").length) }).map((_, i) => (
                    <span key={i}>{i + 1}</span>
                  ))}
                </div>
                <textarea
                  value={codeText}
                  onChange={(event) => setCodeText(event.target.value)}
                  spellCheck={false}
                  aria-label="Code answer editor"
                  placeholder="# Write the implementation or patch for this question here."
                  className="h-full flex-1 resize-none overflow-auto border-0 bg-[#1E1E1E] p-5 font-mono text-[13px] leading-[22px] text-[#D4D4D4] outline-none"
                />
              </>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
                <SimpleQuestionCard
                  question={displayQuestion}
                  presentation={questionPresentation}
                  current={currentQuestionNumber}
                  total={totalQuestions}
                />
                {isObjective ? (
                  <ObjectiveOptions
                    question={displayQuestion}
                    selectedOptionId={selectedOptionId}
                    onSelect={(optionId) => {
                      setSelectedOptionId(optionId);
                      setDraftSaved(false);
                    }}
                  />
                ) : (
                  <>
                    <div className="flex shrink-0 items-center justify-between gap-3">
                      <div>
                        <p className="text-[15px] font-bold text-[var(--color-text-primary)]">Your Answer</p>
                        <p className="text-[12px] text-[var(--color-text-muted)]">{answerGuidance.expectation}</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleInsertAnswerOutline}
                        disabled={Boolean(inputValue.trim())}
                        className="hidden items-center gap-2 rounded-[8px] border border-[var(--color-border)] px-3 py-2 text-[12px] font-semibold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-secondary)] disabled:cursor-not-allowed disabled:opacity-45 sm:flex"
                      >
                        <FileText className="h-4 w-4" strokeWidth={1.5} />
            Use answer structure
                      </button>
                    </div>
                    <textarea
                      value={inputValue}
                      onChange={(event) => {
                        setInputValue(event.target.value);
                        setDraftSaved(false);
                      }}
                      placeholder="Write your answer here. Include your approach, tradeoffs, edge cases, and examples."
                      className="min-h-[220px] flex-1 resize-none rounded-[12px] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 text-[15px] leading-[1.65] text-[var(--color-text-primary)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/15"
                    />
                    <AnswerGuideDisclosure guidance={answerGuidance} onUseTemplate={handleInsertAnswerOutline} />
                  </>
                )}
              </div>
            )}
          </div>

          {finishAvailable ? null : isCodeFocused ? (
            <div className="shrink-0 border-t border-[#333]">
              <button
                onClick={() => setConsoleOpen((v) => !v)}
                className="w-full h-10 bg-[#252526] hover:bg-[#2D2D30] flex items-center justify-between px-5 transition-colors"
              >
                <div className="flex items-center gap-2 text-[13px] font-medium text-[#CCCCCC]">
                  <Terminal className="w-4 h-4 text-[#858585]" strokeWidth={1.5} />
                  Console Output
                </div>
                {consoleOpen
                  ? <ChevronDown className="w-4 h-4 text-[#858585]" />
                  : <ChevronUp className="w-4 h-4 text-[#858585]" />
                }
              </button>

              <AnimatePresence>
                {consoleOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 132, opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden bg-[#1A1A1A]"
                  >
                    <div className="p-4 space-y-2 overflow-y-auto h-full">
                      {runResultLines(runResult).map((line, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
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
              <div className="flex items-center justify-between gap-3 bg-[#252526] px-5 py-3">
                <span className="hidden text-[12px] text-[#858585] md:block">
                  {executionSupported
                    ? "Run Code checks backend Python test cases. Submit Answer remains separate."
                    : "This coding task is evaluated by rubric, not executable tests."}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-5 py-3">
              <div className="min-w-0 text-[12px] text-[var(--color-text-muted)]">
                <span className="font-semibold text-[var(--color-text-secondary)]">
                  {draftSaved ? "Draft saved" : inputValue.trim() || selectedOptionId ? "Unsaved changes" : "No answer yet"}
                </span>
                <span className="mx-2 text-[var(--color-border)]">|</span>
                <span>{answerWordCount} words</span>
                <span className="mx-2 text-[var(--color-border)]">|</span>
                <span>{answerCharacterCount} characters</span>
              </div>
              {!isObjective && (
              <div className="flex flex-wrap items-center gap-2 sm:hidden">
                <button
                  type="button"
                  onClick={handleInsertAnswerOutline}
                  disabled={Boolean(inputValue.trim())}
                  className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-[12px] font-bold text-[var(--color-text-secondary)] transition hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-45 sm:hidden"
                >
                  <FileText className="h-4 w-4" strokeWidth={1.5} />
                  Template
                </button>
              </div>
              )}
            </div>
          )}
        </motion.section>

      </main>

      <InterviewDebugLauncher
        metadata={{
          session_plan_metadata: sessionMetadata,
          current_question: currentQuestion
            ? {
                id: currentQuestion.id,
                category: currentQuestion.category,
                question_type: currentQuestion.question_type,
                difficulty: currentQuestion.difficulty,
                expected_concepts: currentQuestion.expected_concepts,
              }
            : null,
          mode: interviewMode,
        }}
      />
      
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
              AI Verification Engine v2.4 // HirdUp
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
