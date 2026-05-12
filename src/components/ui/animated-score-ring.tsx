"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate, useInView } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";

interface AnimatedScoreRingProps {
  score: number;
  maxScore?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  label?: string;
  scoreClassName?: string;
  labelClassName?: string;
}

export function AnimatedScoreRing({
  score,
  maxScore = 1000,
  size = 120,
  strokeWidth = 6,
  className,
  label = "Score",
  scoreClassName = "text-white",
  labelClassName = "text-[rgba(255,255,255,0.4)]",
}: AnimatedScoreRingProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-10%" });
  const [isCompleted, setIsCompleted] = useState(false);

  // Math for SVG
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  
  // To reach score:
  const fillRatio = score / maxScore;
  const targetOffset = circumference * (1 - fillRatio);

  // Motion value for the number
  const count = useMotionValue(0);
  const displayCount = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    if (isInView) {
      const controls = animate(count, score, {
        duration: 2.2,
        ease: [0.16, 1, 0.3, 1], // easeOutExpo
        onComplete: () => setIsCompleted(true)
      });
      return controls.stop;
    }
  }, [isInView, count, score]);

  return (
    <motion.div 
      ref={ref}
      className={cn("relative flex items-center justify-center flex-col", className)}
      style={{ width: size, height: size }}
      // Subtle idle breathing after animation is complete
      animate={isCompleted ? { scale: [1, 1.01, 1] } : { scale: 1 }}
      transition={{ duration: 6, ease: "easeInOut", repeat: Infinity }}
    >
      {/* Background radial glow */}
      <motion.div 
        className="absolute inset-0 rounded-full bg-[var(--color-verified)] opacity-0 blur-[24px]"
        animate={isInView ? { opacity: isCompleted ? 0.05 : 0.15 } : { opacity: 0 }}
        transition={{ duration: 2.2, ease: "easeOut" }}
      />

      <svg className="absolute inset-0 w-full h-full -rotate-90">
        <defs>
          <filter id="glow-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        {/* Track */}
        <circle 
          cx={center} 
          cy={center} 
          r={radius} 
          fill="none" 
          stroke="rgba(255,255,255,0.08)" 
          strokeWidth={strokeWidth} 
        />
        
        {/* Main animated progress stroke */}
        <motion.circle 
          cx={center} 
          cy={center} 
          r={radius} 
          fill="none" 
          stroke="var(--color-verified)" 
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={isInView ? { strokeDashoffset: targetOffset } : { strokeDashoffset: circumference }}
          transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1] }}
          strokeLinecap="round"
        />

        {/* Traveling Glow layer (a shorter stroke running slightly ahead/with the edge) */}
        <motion.circle 
          cx={center} 
          cy={center} 
          r={radius} 
          fill="none" 
          stroke="#34D399" /* A slightly brighter emerald/green for the highlight */
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference * 0.1} ${circumference * 0.9}`}
          initial={{ strokeDashoffset: circumference + (circumference * 0.1) }}
          animate={isInView ? { 
            strokeDashoffset: targetOffset,
            opacity: isCompleted ? 0 : [0, 1, 0.8]
          } : { strokeDashoffset: circumference + (circumference * 0.1), opacity: 0 }}
          transition={{ 
            strokeDashoffset: { duration: 2.2, ease: [0.16, 1, 0.3, 1] },
            opacity: { duration: 2.2, times: [0, 0.2, 1] }
          }}
          strokeLinecap="round"
          filter="url(#glow-blur)"
        />
      </svg>
      
      {/* Dynamic Score Counter */}
      <motion.span 
        className={cn("font-mono font-[800] leading-none z-10", scoreClassName)}
        style={{ fontSize: size * 0.31 }}
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        {displayCount}
      </motion.span>
      <span className={cn("text-[11px] mt-[4px] font-[600] tracking-wider uppercase z-10", labelClassName)}>
        {label}
      </span>
    </motion.div>
  );
}
