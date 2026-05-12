import { Variants } from "framer-motion";

// Premium easing curves inspired by Linear and Vercel
export const EASE = {
  // Fast snap, slow settle. Extremely polished and calm.
  outExpo: [0.16, 1, 0.3, 1] as const,
  // Smooth, continuous flow. Good for opacity and simple scales.
  smooth: [0.25, 0.1, 0.25, 1] as const,
};

export const TRANSITIONS = {
  base: { duration: 0.6, ease: EASE.outExpo },
  slow: { duration: 0.8, ease: EASE.outExpo },
  fast: { duration: 0.3, ease: EASE.outExpo },
  spring: { type: "spring", stiffness: 300, damping: 30, mass: 1 },
};

// --- PRE-BUILT VARIANTS ---

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: TRANSITIONS.base
  }
};

export const fadeDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: TRANSITIONS.base
  }
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.5, ease: EASE.smooth }
  }
};

// Use for staggered lists (e.g. Leaderboard, Candidate Grids)
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: TRANSITIONS.fast
  }
};

// Subtle continuous floating motion
export const subtleFloat = {
  animate: {
    y: [0, -6, 0],
    transition: {
      duration: 5,
      ease: "easeInOut",
      repeat: Infinity
    }
  }
};

// Premium hover scale for cards
export const cardHover = {
  whileHover: { 
    scale: 1.01,
    y: -4,
    transition: TRANSITIONS.fast
  },
  whileTap: {
    scale: 0.99,
    transition: TRANSITIONS.fast
  }
};

// Extremely slow pulse for background radial gradients
export const slowPulse = {
  animate: {
    opacity: [0.3, 0.5, 0.3],
    scale: [1, 1.05, 1],
    transition: {
      duration: 8,
      ease: "easeInOut" as const,
      repeat: Infinity
    }
  }
};

// For animated progress bars
export const expandWidth = {
  hidden: { width: 0 },
  visible: (targetWidth: string = "100%") => ({
    width: targetWidth,
    transition: { duration: 1.2, ease: EASE.outExpo, delay: 0.2 }
  })
};
