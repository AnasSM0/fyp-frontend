"use client";

import { useEffect, useState } from "react";

const PROVIDERS = [
  { id: "", label: "Default (Backend Config)" },
  { id: "gemini", label: "Google Gemini" },
  { id: "nvidia", label: "NVIDIA Nemotron" },
  { id: "stub", label: "Stub (Deterministic)" },
];

export function ProviderSwitcher() {
  const [active, setActive] = useState("");
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = window.localStorage.getItem("dev_ai_provider") || "";
    setActive(stored);
  }, []);

  if (!mounted || process.env.NODE_ENV === "production") return null;

  const handleChange = (id: string) => {
    setActive(id);
    if (id) {
      window.localStorage.setItem("dev_ai_provider", id);
    } else {
      window.localStorage.removeItem("dev_ai_provider");
    }
    // Reload to ensure all new requests pick up the header
    window.location.reload();
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-zinc-900 text-zinc-500 text-xs px-2 py-1 rounded opacity-30 hover:opacity-100 transition-opacity z-50 border border-zinc-800"
      >
        AI: {active || "default"}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-zinc-900 border border-zinc-700 text-white p-3 rounded-lg shadow-xl z-50 text-sm min-w-[200px]">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-zinc-300 text-xs uppercase tracking-wider">Dev: AI Provider</h3>
        <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white px-1 font-bold">✕</button>
      </div>
      <div className="flex flex-col gap-1">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            onClick={() => handleChange(p.id)}
            className={`text-left px-2 py-1.5 rounded transition-colors text-sm ${active === p.id ? "bg-indigo-600 text-white" : "hover:bg-zinc-800 text-zinc-400"}`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
