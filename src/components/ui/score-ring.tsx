"use client";
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

export function AnimatedCounter({ target, duration = 2 }: { target: number; duration?: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const controls = animate(count, target, { duration, ease: [0.16, 1, 0.3, 1] });
    const unsub = rounded.on("change", setDisplay);
    return () => { controls.stop(); unsub(); };
  }, [target]);
  return <span>{display}</span>;
}

export function ScoreRing({ score, max = 1000, size = 220 }: { score: number; max?: number; size?: number }) {
  const r = (size - 20) / 2;
  const circ = 2 * Math.PI * r;
  const pct = score / max;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Ambient rings */}
      <motion.div animate={{ scale: [1, 1.08, 1], opacity: [0.12, 0.04, 0.12] }} transition={{ duration: 4, repeat: Infinity }}
        className="absolute inset-0 rounded-full bg-indigo-500" style={{ filter: "blur(40px)" }} />
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 rounded-full border border-dashed border-indigo-500/20" />
      <motion.div animate={{ rotate: -360 }} transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        className="absolute inset-3 rounded-full border border-indigo-400/15" />
      {/* SVG ring */}
      <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(99,102,241,0.1)" strokeWidth={10} />
        <motion.circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke="url(#scoreGrad)" strokeWidth={10} strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - pct) }}
          transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
        />
        <defs>
          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#818CF8" />
            <stop offset="100%" stopColor="#A78BFA" />
          </linearGradient>
        </defs>
      </svg>
      {/* Center */}
      <div className="relative z-10 text-center">
        <div className="text-[56px] font-bold text-white leading-none tracking-[-0.04em] font-mono">
          <AnimatedCounter target={score} duration={2.2} />
        </div>
        <div className="text-[12px] text-white/40 font-semibold uppercase tracking-widest mt-1">Verified Score</div>
      </div>
    </div>
  );
}
