"use client";

import React from "react";
import { motion } from "framer-motion";

const particles = Array.from({ length: 20 }, (_, i) => ({
  opacity: ((i % 5) + 1) * 0.08,
  x: `${(i * 37) % 100}%`,
  y: `${(i * 53) % 100}%`,
  duration: 10 + (i % 7),
  delay: (i % 10) * 0.7,
}));

export function MeshBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-[#09090e]">
      {/* Primary Ambient Glows */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.15, 0.25, 0.15],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -top-[10%] -left-[10%] h-[60%] w-[60%] rounded-full bg-violet-600/20 blur-[120px]"
      />
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute -bottom-[10%] -right-[10%] h-[60%] w-[60%] rounded-full bg-indigo-600/20 blur-[120px]"
      />

      {/* Grid Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.15]" 
        style={{
          backgroundImage: `linear-gradient(to right, #ffffff10 1px, transparent 1px), linear-gradient(to bottom, #ffffff10 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse at center, black, transparent 80%)'
        }}
      />

      {/* Animated Particles (Only on Client to prevent hydration mismatch) */}
      <div className="absolute inset-0">
        {particles.map((particle, i) => (
          <motion.div
            key={i}
            initial={{ 
              opacity: particle.opacity,
              x: particle.x, 
              y: particle.y 
            }}
            animate={{
              y: ["-10%", "110%"],
              opacity: [0, 0.3, 0],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              ease: "linear",
              delay: particle.delay,
            }}
            className="absolute h-[1px] w-[1px] bg-white rounded-full shadow-[0_0_8px_1px_rgba(255,255,255,0.4)]"
          />
        ))}
      </div>
    </div>
  );
}
