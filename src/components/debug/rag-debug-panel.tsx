"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { hasDebugMetadata, sanitizeDebugMetadata, shouldShowDebugMetadata } from "@/lib/debug-metadata";

interface RagDebugPanelProps {
  title: string;
  metadata: unknown;
  summary?: string;
  className?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stringifyValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value, null, 2) ?? "";
}

export function RagDebugPanel({ title, metadata, summary, className = "" }: RagDebugPanelProps) {
  const [canShow, setCanShow] = useState(false);
  const [open, setOpen] = useState(false);
  const safeMetadata = useMemo(() => sanitizeDebugMetadata(metadata), [metadata]);

  useEffect(() => {
    setCanShow(shouldShowDebugMetadata());
  }, []);

  if (!canShow || !hasDebugMetadata(safeMetadata)) return null;

  const rows: Array<[string, unknown]> = isRecord(safeMetadata)
    ? Object.entries(safeMetadata)
    : [["value", safeMetadata]];

  return (
    <section className={`rounded-2xl border border-amber-400/20 bg-amber-400/5 text-left ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
      >
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-amber-300">Debug metadata</div>
          <div className="text-sm font-bold text-[var(--color-text-primary)]">{title}</div>
          {summary && <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{summary}</p>}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-amber-300" /> : <ChevronDown className="h-4 w-4 text-amber-300" />}
      </button>

      {open && (
        <div className="border-t border-amber-400/10 px-4 py-3">
          <dl className="space-y-3">
            {rows.map(([key, value]) => (
              <div key={key} className="grid gap-1 md:grid-cols-[180px_1fr]">
                <dt className="font-mono text-[11px] uppercase tracking-wider text-amber-200/80">{key}</dt>
                <dd className="min-w-0">
                  {isRecord(value) || Array.isArray(value) ? (
                    <pre className="max-h-56 overflow-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 text-xs leading-5 text-[var(--color-text-secondary)]">
                      {stringifyValue(value)}
                    </pre>
                  ) : (
                    <span className="break-words text-xs leading-5 text-[var(--color-text-secondary)]">
                      {stringifyValue(value)}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  );
}
