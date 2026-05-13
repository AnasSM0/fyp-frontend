// Demo performance preset data — drives Results page via DemoState

export const DEMO_PRESETS = {
  high: {
    overallScore: 94,
    xlr8Score: 940,
    percentile: "Top 5%",
    recruiterReadiness: "Strong Hire",
    aiConfidence: 97,
    fit: "Expert Match",
    fitColor: "emerald",
    headline: "Outstanding Performance",
    summary: "You scored in the top 5% of all assessed candidates. Your AI-verified profile is ready for immediate recruiter discovery.",
    skills: [
      { label: "React / Next.js", pct: 96, color: "from-violet-500 to-indigo-500" },
      { label: "TypeScript", pct: 94, color: "from-violet-500 to-indigo-500" },
      { label: "System Design", pct: 88, color: "from-violet-500 to-indigo-500" },
      { label: "Node.js", pct: 91, color: "from-violet-500 to-indigo-500" },
    ],
    performance: [
      { label: "Technical Accuracy", score: 96 },
      { label: "Problem Solving", score: 92 },
      { label: "System Design", score: 88 },
      { label: "Communication", score: 94 },
      { label: "AI Integrity", score: 99 },
    ],
    strengths: [
      "Exceptional React architecture and component composition reasoning",
      "Strong API design thinking with clear RESTful principles",
      "Excellent debugging methodology — systematic and precise",
      "Clear verbal communication with precise technical vocabulary",
    ],
    weaknesses: [
      "Could deepen distributed systems knowledge for principal-level roles",
      "Database query optimization has minor gaps at scale",
    ],
    transcript: [
      { q: "Implement debounce from scratch.", summary: "Correct closure-based implementation with real-world context.", score: 96, verdict: "Excellent", ai: "Clear understanding of closures, correct timer management." },
      { q: "Design a URL shortener for 1M req/day.", summary: "Covered hashing, redirect service, Redis caching, CDN layers.", score: 92, verdict: "Strong", ai: "Well-structured architecture with appropriate caching strategy." },
      { q: "Explain React reconciliation and useMemo.", summary: "Strong answer on virtual DOM diffing with practical useMemo example.", score: 94, verdict: "Excellent", ai: "Demonstrated real understanding of React internals." },
    ],
    roleFit: [
      { role: "Senior Full Stack Engineer", pct: 96, badge: "Top Match" },
      { role: "Frontend Architect", pct: 91, badge: "Excellent Fit" },
      { role: "Backend Engineer", pct: 82, badge: "Good Fit" },
    ],
  },
  mid: {
    overallScore: 74,
    xlr8Score: 740,
    percentile: "Top 35%",
    recruiterReadiness: "Probable Hire",
    aiConfidence: 81,
    fit: "Probable Match",
    fitColor: "amber",
    headline: "Solid Performance",
    summary: "You scored in the top 35% of candidates. Strong foundations with clear areas for growth before senior placement.",
    skills: [
      { label: "React / Next.js", pct: 78, color: "from-amber-500 to-orange-500" },
      { label: "TypeScript", pct: 72, color: "from-amber-500 to-orange-500" },
      { label: "System Design", pct: 58, color: "from-amber-500 to-orange-500" },
      { label: "Node.js", pct: 70, color: "from-amber-500 to-orange-500" },
    ],
    performance: [
      { label: "Technical Accuracy", score: 76 },
      { label: "Problem Solving", score: 72 },
      { label: "System Design", score: 58 },
      { label: "Communication", score: 81 },
      { label: "AI Integrity", score: 96 },
    ],
    strengths: [
      "Good React fundamentals and state management awareness",
      "Clear verbal communication and structured explanations",
    ],
    weaknesses: [
      "System design depth needs significant improvement",
      "Missed caching and scalability considerations in architecture questions",
      "TypeScript advanced patterns (generics, conditional types) not utilized",
    ],
    transcript: [
      { q: "Implement debounce from scratch.", summary: "Basic implementation with setTimeout, missing leading-edge variant.", score: 74, verdict: "Adequate", ai: "Correct logic but limited context on real-world application." },
      { q: "Design a URL shortener for 1M req/day.", summary: "Described hashing and redirect. Missed Redis, CDN, rate-limiting.", score: 62, verdict: "Needs Work", ai: "Reasonable start but lacked depth on scale and caching." },
      { q: "Explain React reconciliation and useMemo.", summary: "Partial understanding of virtual DOM. useMemo example was correct.", score: 78, verdict: "Adequate", ai: "Above average on hooks but surface-level on React Fiber." },
    ],
    roleFit: [
      { role: "Mid-Level Full Stack Engineer", pct: 78, badge: "Good Fit" },
      { role: "Frontend Developer", pct: 74, badge: "Good Fit" },
      { role: "Senior Engineer", pct: 44, badge: "Not Ready" },
    ],
  },
  low: {
    overallScore: 41,
    xlr8Score: 410,
    percentile: "Bottom 40%",
    recruiterReadiness: "Not Ready",
    aiConfidence: 89,
    fit: "Significant Gaps",
    fitColor: "rose",
    headline: "Foundational Gaps Detected",
    summary: "The AI detected significant gaps in core technical areas. A focused 3-month development plan is recommended before re-assessment.",
    skills: [
      { label: "React / Next.js", pct: 44, color: "from-rose-500 to-red-500" },
      { label: "TypeScript", pct: 36, color: "from-rose-500 to-red-500" },
      { label: "System Design", pct: 28, color: "from-rose-500 to-red-500" },
      { label: "Node.js", pct: 40, color: "from-rose-500 to-red-500" },
    ],
    performance: [
      { label: "Technical Accuracy", score: 42 },
      { label: "Problem Solving", score: 38 },
      { label: "System Design", score: 28 },
      { label: "Communication", score: 55 },
      { label: "AI Integrity", score: 94 },
    ],
    strengths: [
      "Communication clarity is above average for this experience level",
      "Shows genuine interest and effort in approaching problems",
    ],
    weaknesses: [
      "Core JavaScript patterns (closures, async) not well understood",
      "System design fundamentals absent — unable to reason about scale",
      "TypeScript typing not leveraged effectively",
      "React lifecycle and state management concepts are surface-level",
    ],
    transcript: [
      { q: "Implement debounce from scratch.", summary: "Unable to implement correctly without prompting. Unfamiliar with closures.", score: 35, verdict: "Insufficient", ai: "Fundamental closure understanding needed before re-attempt." },
      { q: "Design a URL shortener for 1M req/day.", summary: "Only described a basic database table with no architecture reasoning.", score: 28, verdict: "Insufficient", ai: "No awareness of distributed systems, caching, or load patterns." },
      { q: "Explain React reconciliation and useMemo.", summary: "Surface-level answer. Could not differentiate useMemo from useCallback.", score: 48, verdict: "Needs Work", ai: "React hooks knowledge needs a structured deep-dive course." },
    ],
    roleFit: [
      { role: "Junior Frontend Developer", pct: 52, badge: "Possible Fit" },
      { role: "Mid-Level Engineer", pct: 22, badge: "Not Ready" },
      { role: "Full Stack Engineer", pct: 18, badge: "Not Ready" },
    ],
  },
} as const;

export type DemoPreset = typeof DEMO_PRESETS[keyof typeof DEMO_PRESETS];
