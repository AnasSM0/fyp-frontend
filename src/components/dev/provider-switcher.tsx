"use client";

import { useEffect, useState } from "react";

const PROVIDERS = [
  { id: "", label: "Default (Backend Config)" },
  { id: "deepseek", label: "DeepSeek" },
  { id: "gemini", label: "Google Gemini" },
  { id: "openrouter", label: "OpenRouter" },
  { id: "nvidia", label: "NVIDIA Nemotron" },
  { id: "stub", label: "Stub (Deterministic)" },
];
const VALID_PROVIDER_IDS = new Set(PROVIDERS.map((provider) => provider.id));
const DEV_AI_PROVIDER_KEY = "dev_ai_provider";
const DEV_AI_PROVIDER_EXPLICIT_KEY = "dev_ai_provider_explicit";
const DEV_AI_PROVIDER_BACKEND_DEFAULT_KEY = "dev_ai_provider_backend_default";

export function ProviderSwitcher() {
  const [active, setActive] = useState("");
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    setMounted(true);
    setShowDebug(window.localStorage.getItem("xlr8_show_debug_metadata") === "true");
    const stored = window.localStorage.getItem(DEV_AI_PROVIDER_KEY) || "";
    const explicit = window.localStorage.getItem(DEV_AI_PROVIDER_EXPLICIT_KEY) === "true";
    const prefersBackendDefault = window.localStorage.getItem(DEV_AI_PROVIDER_BACKEND_DEFAULT_KEY) === "true";
    const nextProvider = explicit && !prefersBackendDefault && VALID_PROVIDER_IDS.has(stored) ? stored : "";
    if (!nextProvider) {
      window.localStorage.removeItem(DEV_AI_PROVIDER_KEY);
      window.localStorage.removeItem(DEV_AI_PROVIDER_EXPLICIT_KEY);
    }
    setActive(nextProvider);
  }, []);

  if (!mounted || process.env.NODE_ENV === "production" || !showDebug) return null;

  const handleChange = (id: string) => {
    setActive(id);
    if (id) {
      window.localStorage.removeItem(DEV_AI_PROVIDER_BACKEND_DEFAULT_KEY);
      window.localStorage.setItem(DEV_AI_PROVIDER_KEY, id);
      window.localStorage.setItem(DEV_AI_PROVIDER_EXPLICIT_KEY, "true");
    } else {
      window.localStorage.setItem(DEV_AI_PROVIDER_BACKEND_DEFAULT_KEY, "true");
      window.localStorage.removeItem(DEV_AI_PROVIDER_KEY);
      window.localStorage.removeItem(DEV_AI_PROVIDER_EXPLICIT_KEY);
    }
    // Reload to ensure all new requests pick up the header
    window.location.reload();
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-50 rounded border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1 text-xs text-[var(--color-text-secondary)] opacity-50 shadow-sm transition-opacity hover:opacity-100"
      >
        AI: {active || "default"}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 min-w-[200px] rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-3 text-sm text-[var(--color-text-primary)] shadow-xl">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Dev: AI Provider</h3>
        <button onClick={() => setIsOpen(false)} className="px-1 font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">✕</button>
      </div>
      <div className="flex flex-col gap-1">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            onClick={() => handleChange(p.id)}
            className={`rounded px-2 py-1.5 text-left text-sm transition-colors ${
              active === p.id
                ? "bg-violet-600 text-white"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
