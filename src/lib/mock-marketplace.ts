export interface MockCandidate {
  id: string;
  name: string;
  initials: string;
  role: string;
  location: string;
  score: number;
  percentile: string;
  matchScore: number;
  availability: "Open" | "Interviewing" | "Limited";
  salaryRange: string;
  opportunityType: string;
  education: string;
  experience: string;
  image: string;
  skills: string[];
  reasoning: string;
  evidence: string[];
  projects: string[];
}

export const PRIMARY_STUDENT_ID = "candidate-alex-chen";

export const MARKETPLACE_CANDIDATES: MockCandidate[] = [
  {
    id: PRIMARY_STUDENT_ID,
    name: "Alex Chen",
    initials: "AC",
    role: "Full Stack Developer",
    location: "Lahore, PK / Remote",
    score: 95,
    percentile: "Top 5%",
    matchScore: 96,
    availability: "Open",
    salaryRange: "$80k - $110k",
    opportunityType: "Full-time or remote contract",
    education: "BS Computer Science, FAST NUCES",
    experience: "3 shipped products",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDQZT7yCwR5N6AMOZ6RMfaqCZzW-kxbROlVr7f12hxHei_JCDmgVVLsw_fyjtQNi2Z7LBW2CGFMXeQieQbi7O37l-HuQqekWCJ1_Q0qAw2MtjLEigyBgPyx9SAsdKGK6Zi2_9-rBIhnhQkXfUKwUkpynEM2AMnWyl-dFZUH3mVcaaHcwBneHVHPEY1PhjkvrxyRfmSfkPpkuZeldaVqzKK-OdpgrRJbC4gE8ACoxjBIi9tLeoKwK19FPOMOtsdL41KwdvVr5rt9vMdD",
    skills: ["React", "Next.js", "TypeScript", "Node.js", "System Design"],
    reasoning:
      "Strong semantic match for product engineering roles. Verified assessment evidence shows high React architecture depth, clear system design tradeoffs, and strong communication under pressure.",
    evidence: [
      "Scored 95/100 on adaptive full-stack assessment",
      "Explained scaling tradeoffs in the interview transcript",
      "Built a real-time analytics project with React and streaming APIs",
    ],
    projects: ["FinTech Analytics Engine", "Automated Deployment Tool"],
  },
  {
    id: "candidate-priya-sharma",
    name: "Priya Sharma",
    initials: "PS",
    role: "Frontend Architect",
    location: "Bengaluru, IN / Remote",
    score: 91,
    percentile: "Top 8%",
    matchScore: 91,
    availability: "Open",
    salaryRange: "$90k - $125k",
    opportunityType: "Full-time",
    education: "MS Software Engineering, IIIT Bangalore",
    experience: "Design system lead",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDfm8vg0jfwD33EuEHn69xQgNRJlVSyK4k-QD0vM69NZ352jt-PqMwaf6XDRwvuBR1onV2UlI_eht4MCHu03oARs-K506-z8_mXsHdmWrDqhvymUZAyGDau9jhrxdk589ebTAFG1ssye5s6eQj7wfp3ZmMT8jDcFJo0mjyduMggvaUxsD0wZMjYjWK2P3nbMu_ZrUe5WOF_XiQHgZvTyV3BrgTEDty0O729St54xTAHJKRNzQNfHKs_GvOVrugt8fbMazkYEpU8fXNy",
    skills: ["React", "Next.js", "GraphQL", "Performance", "Design Systems"],
    reasoning:
      "Excellent match for frontend platform roles. Strong rendering performance instincts and component architecture evidence.",
    evidence: [
      "Optimized dashboard render path by 38%",
      "Designed reusable component primitives",
      "High communication score in product tradeoff discussion",
    ],
    projects: ["Design System Migration", "GraphQL Performance Console"],
  },
  {
    id: "candidate-omar-hassan",
    name: "Omar Hassan",
    initials: "OH",
    role: "Backend Engineer",
    location: "Karachi, PK / Hybrid",
    score: 84,
    percentile: "Top 18%",
    matchScore: 82,
    availability: "Interviewing",
    salaryRange: "$65k - $95k",
    opportunityType: "Full-time",
    education: "BS Computer Science, IBA",
    experience: "API platform engineer",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAXWszfE3DvWoSkeZNzcIIbQ0sBksohN27qzTJjWkHKnQ7OjJHNwBUGN9BWlsmVNife-QmC-11i3SoR6Fdi49CX8ojm8fn30d-VPI2-MFScXAWkvvwSdnMr7FxUXOr43G9o86C2hQwbtZ37wZ8319HQWfto5qpNjceSHjozvDJHHuC6Ztl32TvWEqboV7wuCQdU5U49iPdWV_mUemcyVpvTMCUxfbH2VqDM-tFZ0G-Z1xzJ-0PVXEc-5MJ7k7lIFurJbFEgsCkaQMtQ",
    skills: ["Python", "FastAPI", "PostgreSQL", "Redis", "API Design"],
    reasoning:
      "Strong backend and API design match. Best suited for data platform and service reliability roles.",
    evidence: [
      "Designed typed API boundaries during assessment",
      "Strong database indexing explanation",
      "Good reliability instincts under scenario pressure",
    ],
    projects: ["FastAPI Billing Service", "PostgreSQL Audit Pipeline"],
  },
  {
    id: "candidate-sophie-laurent",
    name: "Sophie Laurent",
    initials: "SL",
    role: "Cloud Infrastructure Engineer",
    location: "Paris, FR / Remote",
    score: 88,
    percentile: "Top 12%",
    matchScore: 86,
    availability: "Open",
    salaryRange: "$100k - $135k",
    opportunityType: "Full-time or contract",
    education: "MEng Computer Systems, EPITA",
    experience: "Kubernetes platform projects",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDuc36NqUXvjoDyz0-wNUu1xtjEG806p-AceIv6nLRY1sgZw-2jvbucLFEaVaPNm9nX9k6hox-DU2NqRnrl-PLy6hUfacv7JAz0cnbl_WhtYZC7BJr6KdqcAm5IVgPpJ2U_hyZX4kDESI9e_soMXBK_CpcxGfnS9m2sEYInbXZejE7JDV-DV05EJQCzl3DAGQTrNpMeEY_4EOUKXgz22IOrmrfcGbGkrfbMkRqKaGfLJSGUsmt6bag28wZOVXb3iF3iDIHZapUs-gUd",
    skills: ["Go", "Kubernetes", "Terraform", "gRPC", "Redis"],
    reasoning:
      "Infrastructure-first candidate with unusually strong Kubernetes depth and clear distributed systems reasoning.",
    evidence: [
      "Explained multi-region failover strategy",
      "Strong Go concurrency pattern recognition",
      "High confidence in deployment architecture review",
    ],
    projects: ["Kubernetes Cost Optimizer", "gRPC Internal Gateway"],
  },
  {
    id: "candidate-james-okafor",
    name: "James Okafor",
    initials: "JO",
    role: "Full Stack Engineer",
    location: "London, UK / Remote",
    score: 78,
    percentile: "Top 28%",
    matchScore: 74,
    availability: "Limited",
    salaryRange: "$70k - $100k",
    opportunityType: "Contract",
    education: "BSc Computing, University of Lagos",
    experience: "MERN product builds",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuB8jV4e-QbaPj7E2ZIjz5IaC6RGvDM3Y1KrJTRliJ1uWMeRg504k0-Mi3oHAqADheGEP4VzW7Elnr_oNnnX3PxLP6lhwKusWxYUpP7quMPgpO1RezaFMJOzr7mvC4SjgdA1r7uq1BpooviLWehGYjwG7WrFlg_4XTm4tMAEKkQUlC12kHKjLf0grJVwyT3vKf0F85fxjF50NG4iH6MUxmprVFia0gEJuXB2gC3Nh2lq9zTlhPRl4rBEagPu-JTPZra32D9i9VZljeOi",
    skills: ["React", "Express.js", "MongoDB", "REST APIs"],
    reasoning:
      "Solid full-stack candidate for mid-level teams. Better fit for product execution than architecture-heavy senior roles.",
    evidence: [
      "Good implementation speed",
      "Needs more TypeScript depth",
      "Strong practical API delivery evidence",
    ],
    projects: ["Marketplace Admin Console", "REST API Starter Kit"],
  },
];

export function getCandidateById(candidateId?: string | null) {
  return (
    MARKETPLACE_CANDIDATES.find((candidate) => candidate.id === candidateId) ??
    MARKETPLACE_CANDIDATES[0]
  );
}
