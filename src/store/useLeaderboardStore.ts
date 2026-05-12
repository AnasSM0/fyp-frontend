import { create } from 'zustand';

export interface LeaderboardCandidate {
  id: string;
  rank: number;
  name: string;
  university: string;
  score: number;
  specialization: string;
  projects: number;
  availability: 'Open' | 'Interviewing' | 'On Hold';
  image: string;
}

interface LeaderboardState {
  candidates: LeaderboardCandidate[];
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  filteredCandidates: () => LeaderboardCandidate[];
}

const initialCandidates: LeaderboardCandidate[] = [
  {
    id: 'L-001',
    rank: 1,
    name: 'Sarah Chen',
    university: 'Stanford University',
    score: 998,
    specialization: 'Full Stack',
    projects: 12,
    availability: 'Open',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDSEkY-zEZqF7q6RQtuLyFGpHxZM3bXCpVn7gVali0PJlF7wdsKnt6AyxAzhs9bP8gawA8ScfCnkQ8i21AhuGUDOQrcUBzfUMqWSKYYkUdOA5lTx7VoGTxLiAmLTMzMSROD3DYUXyc1Z2PIMHLwkNrVketFGmaZCrFna9M6mM0yRRAtcOJiotAc6OlkLZ1kkP5t1Qk0R6FhyFE-dAR6YlUsdrJBcwEe_mkDHHmrUy2azMbtNgCfn1B9xbhAkSeoMsTPiM78ukuQt0i2'
  },
  {
    id: 'L-002',
    rank: 2,
    name: 'Marcus Chen',
    university: 'MIT',
    score: 982,
    specialization: 'Data Scientist',
    projects: 8,
    availability: 'Interviewing',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBzDbmqVhCV6Y6lx_PGBjLXQdKTWxpWeBPBCORHC-0WGQgzMQjALi2VMqbhMn6wYHWYOaUJwhs2scN2NvBkxUbPTfVHDN9vYzaLwrjybxwjopJGSssThY2L0Z8ldepk-GkT65WLvDfUocf60JiZIsrLdtnF0veeyIM53jaRi49f7yNCCLgKnvaPXQ6uXBzFov0Gh8FLtm1m7rFCXc6A0fZCZ9z-w4PLeZyuAH2dB9ZnW5cPfregVOxxtafdQK66K_-dyOhZChyGYadU'
  },
  {
    id: 'L-003',
    rank: 3,
    name: 'Elena Rodriguez',
    university: 'ETH Zurich',
    score: 975,
    specialization: 'UX Engineer',
    projects: 15,
    availability: 'Open',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCv9kMSAv5VidY0JvfXl9l3Atq9rVEfCIsE9RhaczkF7OY8A8l7WLSUjleIY0EujEyIGBjiVCcU9u6HDRofjGV4oyCQjlIyPiTIjBJY-IMkfFPPmHKGXMyhcKoT6uyEf8nWm5p-abDmWEW_Bu64lFQlaDI88EyOAqiIt4WnZAL6KNZ7dMNAKqvIXMJwc8MhtDEIovphjvw3wD57WFPQ4sNGz_0CLfrFvb_Kh1ga-gI2whqIvZ6AOMHYB8BYGY2VuaIp0pJSoDaRHGz2'
  },
  {
    id: 'L-004',
    rank: 4,
    name: 'Alex Thompson',
    university: 'CMU',
    score: 968,
    specialization: 'Backend Engineer',
    projects: 9,
    availability: 'Open',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCriHaCCcZJ4TuJWHm3wBKAR69Kh75MDt8vGNqy7LCLhh8vru6wwlbAOQ1y2YmIlWjgx9fixoov-1lYzKvu6PoU2vt5-PxvletsvIdOP6VBsnNkbCUj36hE_lYSED8aGt0_v00JR256EMV07G-L9uOWHLzwHVnFMJmhDCRpDTjvPZWW_tIwF2G0QY74dgKom70c-j-L4p1NyROcqb_Q6JPtWf_Sa7xTqfFNgiEQHL3s3srHlet1S65SVdmWaqNd5cW-tyq82L2VIMdx'
  },
  {
    id: 'L-005',
    rank: 5,
    name: 'Priya Sharma',
    university: 'IIT Delhi',
    score: 962,
    specialization: 'AI Specialist',
    projects: 11,
    availability: 'Interviewing',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCH-tYJG9nd8Jt5MXZuee4ZG7vDdBAhvocSVwFB_zsqLG2x9h9P-fH9H4CkeC0OpACeGO83yR0lkRtF0qQHWDIrHONdtEFcYBbWgxhsaQQ8k_QfhDBoSHXN7mcVCNc-rPc8l3CQf7zafkUKm84-T_3n1JPqjbs0aa350TvjNpPs7xUvD39VYJAqq3wUaZWwakKQXoO9NuPN52iVL32OmEY5YTis8TK8xrU8GEnKXxOTndWkMnoCo3j7eqlC1T37EYt6uH2acm5sW_ij'
  },
  {
    id: 'L-006',
    rank: 6,
    name: "Liam O'Connor",
    university: 'Oxford University',
    score: 955,
    specialization: 'Mobile Dev',
    projects: 7,
    availability: 'On Hold',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuApn-B8UqbgC3xlcmPFVqwo9nG4cH3WNS9oQTKZGkXRhZCDUM_97rpVWQMryjU9eyLN7RWKGjCbvSgFU2vc--h61xY-9lw-lLJvEEj54sNF8-b5o2MjE2p9H8xHhB-FJyH6B3pOlCNGNpYJyDM7xBFrRnr6J4yYOLr_aF6LN28qgpybIhYY4bGZryzCTENjltJdRxST9mcnYhBQnGUYyZAru1h2gfFRmAxDmmxBUP3EdlhZ2xQHv2FxJ4v9MNk03PT6wAkmu3kr8YTy'
  }
];

export const useLeaderboardStore = create<LeaderboardState>((set, get) => ({
  candidates: initialCandidates,
  activeFilter: 'All',
  setActiveFilter: (filter: string) => set({ activeFilter: filter }),
  filteredCandidates: () => {
    const { candidates, activeFilter } = get();
    if (activeFilter === 'All') return candidates;
    
    // Map simple filters to specializations
    const filterMap: Record<string, string[]> = {
      'Frontend': ['Frontend', 'Full Stack', 'UX Engineer'],
      'Backend': ['Backend Engineer', 'Full Stack'],
      'AI/ML': ['AI Specialist', 'Data Scientist'],
      'Mobile': ['Mobile Dev'],
      'Data Science': ['Data Scientist', 'AI Specialist']
    };

    const allowedSpecializations = filterMap[activeFilter] || [];
    return candidates.filter(c => allowedSpecializations.some(s => c.specialization.includes(s)));
  }
}));
