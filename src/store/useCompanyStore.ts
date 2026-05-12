import { create } from 'zustand';

export interface Candidate {
  id: string;
  name: string;
  role: string;
  score: number;
  image: string;
  skills: string[];
}

export interface DashboardStats {
  totalSaved: number;
  offersSent: number;
  offersAccepted: number;
}

interface CompanyState {
  stats: DashboardStats;
  candidates: Candidate[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredCandidates: () => Candidate[];
}

// Mock initial data
const initialCandidates: Candidate[] = [
  {
    id: 'CAND-001',
    name: 'Sarah Jenkins',
    role: 'Senior Frontend Engineer',
    score: 94,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB8jV4e-QbaPj7E2ZIjz5IaC6RGvDM3Y1KrJTRliJ1uWMeRg504k0-Mi3oHAqADheGEP4VzW7Elnr_oNnnX3PxLP6lhwKusWxYUpP7quMPgpO1RezaFMJOzr7mvC4SjgdA1r7uq1BpooviLWehGYjwG7WrFlg_4XTm4tMAEKkQUlC12kHKjLf0grJVwyT3vKf0F85fxjF50NG4iH6MUxmprVFia0gEJuXB2gC3Nh2lq9zTlhPRl4rBEagPu-JTPZra32D9i9VZljeOi',
    skills: ['React', 'TypeScript', 'Node.js']
  },
  {
    id: 'CAND-002',
    name: 'Marcus Chen',
    role: 'Lead Data Scientist',
    score: 88,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAXWszfE3DvWoSkeZNzcIIbQ0sBksohN27qzTJjWkHKnQ7OjJHNwBUGN9BWlsmVNife-QmC-11i3SoR6Fdi49CX8ojm8fn30d-VPI2-MFScXAWkvvwSdnMr7FxUXOr43G9o86C2hQwbtZ37wZ8319HQWfto5qpNjceSHjozvDJHHuC6Ztl32TvWEqboV7wuCQdU5U49iPdWV_mUemcyVpvTMCUxfbH2VqDM-tFZ0G-Z1xzJ-0PVXEc-5MJ7k7lIFurJbFEgsCkaQMtQ',
    skills: ['Python', 'PyTorch', 'AWS']
  },
  {
    id: 'CAND-003',
    name: 'Elena Rodriguez',
    role: 'UX Strategy Lead',
    score: 91,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDfm8vg0jfwD33EuEHn69xQgNRJlVSyK4k-QD0vM69NZ352jt-PqMwaf6XDRwvuBR1onV2UlI_eht4MCHu03oARs-K506-z8_mXsHdmWrDqhvymUZAyGDau9jhrxdk589ebTAFG1ssye5s6eQj7wfp3ZmMT8jDcFJo0mjyduMggvaUxsD0wZMjYjWK2P3nbMu_ZrUe5WOF_XiQHgZvTyV3BrgTEDty0O729St54xTAHJKRNzQNfHKs_GvOVrugt8fbMazkYEpU8fXNy',
    skills: ['Figma', 'User Research', 'Next.js']
  },
  {
    id: 'CAND-004',
    name: "Liam O'Sullivan",
    role: 'Cloud Infrastructure Lead',
    score: 96,
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDuc36NqUXvjoDyz0-wNUu1xtjEG806p-AceIv6nLRY1sgZw-2jvbucLFEaVaPNm9nX9k6hox-DU2NqRnrl-PLy6hUfacv7JAz0cnbl_WhtYZC7BJr6KdqcAm5IVgPpJ2U_hyZX4kDESI9e_soMXBK_CpcxGfnS9m2sEYInbXZejE7JDV-DV05EJQCzl3DAGQTrNpMeEY_4EOUKXgz22IOrmrfcGbGkrfbMkRqKaGfLJSGUsmt6bag28wZOVXb3iF3iDIHZapUs-gUd',
    skills: ['Go', 'Kubernetes', 'Terraform']
  }
];

export const useCompanyStore = create<CompanyState>((set, get) => ({
  stats: {
    totalSaved: 124,
    offersSent: 42,
    offersAccepted: 18
  },
  candidates: initialCandidates,
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  filteredCandidates: () => {
    const { candidates, searchQuery } = get();
    if (!searchQuery.trim()) return candidates;
    
    const query = searchQuery.toLowerCase();
    return candidates.filter(c => 
      c.name.toLowerCase().includes(query) ||
      c.role.toLowerCase().includes(query) ||
      c.id.toLowerCase().includes(query) ||
      c.skills.some(skill => skill.toLowerCase().includes(query))
    );
  }
}));
