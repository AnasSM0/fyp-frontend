"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

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

      {/* Animated Particles (CSS based for performance) */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              opacity: Math.random() * 0.5,
              x: Math.random() * 100 + "%", 
              y: Math.random() * 100 + "%" 
            }}
            animate={{
              y: ["-10%", "110%"],
              opacity: [0, 0.3, 0],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 10,
            }}
            className="absolute h-[1px] w-[1px] bg-white rounded-full shadow-[0_0_8px_1px_rgba(255,255,255,0.4)]"
          />
        ))}
      </div>
    </div>
  );
}
