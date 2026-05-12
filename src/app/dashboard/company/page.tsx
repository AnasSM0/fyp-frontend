"use client";

import { motion } from "framer-motion";
import { fadeUp, staggerContainer, staggerItem } from "@/lib/motion";
import { 
  Sparkles, Search, ChevronDown, 
  ArrowUpDown, Bookmark, MapPin, Mail 
} from "lucide-react";
import { AnimatedScoreRing } from "@/components/ui/animated-score-ring";

export default function CompanyDashboard() {
  return (
    <main className="flex-1 flex flex-col p-[24px] md:p-[64px] max-w-[1200px] mx-auto w-full gap-[48px]">
      
      {/* Semantic Search Header */}
      <motion.section initial="hidden" animate="visible" variants={fadeUp} className="flex flex-col gap-[24px]">
        <div>
          <h2 className="text-[28px] font-bold leading-[1.2] text-[var(--color-text-primary)] mb-[8px]">Semantic Discovery</h2>
          <p className="text-[15px] leading-[1.6] text-[var(--color-text-secondary)] max-w-2xl">
            Use natural language to find candidates based on nuanced skills, project experience, and working style.
          </p>
        </div>

        {/* Large Search Area */}
        <div className="relative bg-white border border-[var(--color-border)] rounded-[12px] shadow-sm focus-within:border-[var(--color-accent)] focus-within:ring-1 focus-within:ring-[var(--color-accent)] transition-all duration-150 p-1 flex items-start">
          <Sparkles className="w-[20px] h-[20px] text-[var(--color-text-muted)] mt-[16px] ml-[16px] shrink-0" strokeWidth={1.5} />
          <textarea 
            className="w-full border-0 bg-transparent focus:ring-0 resize-none text-[15px] leading-[1.6] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] p-[16px] min-h-[120px] focus:outline-none" 
            placeholder="e.g. 'Looking for a senior frontend developer who has led a migration from Vue to React, with strong UX sensibilities and experience mentoring junior engineers...'"
          ></textarea>
          <div className="absolute bottom-[16px] right-[16px] flex gap-[8px]">
            <button className="bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] px-[16px] py-[8px] rounded-[8px] text-[13px] font-medium hover:bg-[var(--color-bg-subtle)] transition-colors">
              Clear
            </button>
            <button className="bg-[var(--color-accent)] text-white px-[24px] py-[8px] rounded-[8px] text-[13px] font-bold flex items-center gap-[8px] hover:bg-[var(--color-accent-hover)] transition-colors">
              <Search className="w-[16px] h-[16px]" strokeWidth={2} />
              Discover
            </button>
          </div>
        </div>

        {/* Subtle Filter Chips */}
        <div className="flex flex-wrap gap-[8px] items-center mt-[8px]">
          <span className="text-[13px] font-medium text-[var(--color-text-muted)] mr-[8px]">Refine:</span>
          <button className="border border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] px-[12px] py-[6px] rounded-full text-[13px] font-medium hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors flex items-center gap-[4px]">
            Location: Remote <ChevronDown className="w-[14px] h-[14px]" />
          </button>
          <button className="border border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] px-[12px] py-[6px] rounded-full text-[13px] font-medium hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors flex items-center gap-[4px]">
            Years Exp: 5+ <ChevronDown className="w-[14px] h-[14px]" />
          </button>
          <button className="border border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] px-[12px] py-[6px] rounded-full text-[13px] font-medium hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-colors flex items-center gap-[4px]">
            Availability: Immediate <ChevronDown className="w-[14px] h-[14px]" />
          </button>
          <button className="text-[var(--color-accent)] text-[13px] font-medium hover:underline ml-[8px]">
            More filters
          </button>
        </div>
      </motion.section>

      {/* Results Section (Editorial Layout) */}
      <motion.section initial="hidden" animate="visible" variants={staggerContainer} className="flex flex-col gap-[32px]">
        <div className="flex justify-between items-end border-b border-[var(--color-border)] pb-[16px]">
          <h3 className="text-[22px] font-semibold leading-[1.3] text-[var(--color-text-primary)]">Top Matches (3)</h3>
          <div className="flex gap-[16px] text-[13px] font-medium text-[var(--color-text-secondary)]">
            <span className="flex items-center gap-[4px] cursor-pointer hover:text-[var(--color-accent)] transition-colors">
              <ArrowUpDown className="w-[16px] h-[16px]" strokeWidth={1.5} /> Relevance
            </span>
          </div>
        </div>

        {/* Candidate Card 1 */}
        <motion.article 
          variants={staggerItem}
          className="bg-white border border-[var(--color-border)] rounded-[12px] p-[32px] hover:-translate-y-[1px] hover:shadow-[var(--shadow-card)] transition-all duration-250 flex flex-col md:flex-row gap-[32px] relative"
        >
          <div className="absolute top-[32px] right-[32px]">
            <button className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors">
              <Bookmark className="w-[20px] h-[20px]" strokeWidth={1.5} />
            </button>
          </div>

          {/* Left Col: Identity & Score */}
          <div className="flex flex-col items-center md:items-start md:w-[200px] shrink-0 gap-[16px]">
            <div className="w-[96px] h-[96px] rounded-full bg-[var(--color-bg-secondary)] overflow-hidden border border-[var(--color-border)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="Sarah Jenkins" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBxhFCdCGDtTZbfHBLNBpJZ-BuF3tYyUc4NGzhT2JGNhDVcbrHWzQ1VpiyhZD6K1rq87VDfUklhA4dpMbLT9SyDzy18MIc9xLURTvIokhTabK6PpiFemVQO2NRLK7ulXWU-O0nNU06d-UK3UrsPMGEV8bQH7ic2BYCYB65oDpFGMt2C3be_s_TCfl7K-ZBdj5bBHFtU3yl-Ih8cLC8-WYLHdGLvNxGynG3NcWG-UcbYg-V7FrGeOC_KkJfNdfJnbrpe21Ao-GO_sPzQ"/>
            </div>
            <div className="text-center md:text-left">
              <h4 className="text-[22px] font-semibold leading-[1.3] text-[var(--color-text-primary)]">Sarah Jenkins</h4>
              <p className="text-[13px] font-medium leading-[1.4] text-[var(--color-text-secondary)]">Senior Frontend Eng.</p>
              <p className="text-[13px] font-medium leading-[1.4] text-[var(--color-text-muted)] mt-[4px] flex items-center justify-center md:justify-start gap-[4px]">
                <MapPin className="w-[14px] h-[14px]" strokeWidth={1.5} /> Seattle, WA (Remote)
              </p>
            </div>

            {/* Score Ring Component */}
            <div className="mt-[8px] flex items-center gap-[12px] bg-[var(--color-bg-primary)] px-[16px] py-[8px] rounded-[8px] border border-[var(--color-border-subtle)] w-full justify-center md:justify-start">
              <AnimatedScoreRing 
                score={94} 
                maxScore={100} 
                size={48} 
                strokeWidth={4} 
                label=""
                scoreClassName="text-[var(--color-verified)] text-[14px]"
              />
              <span className="text-[13px] font-medium leading-[1.2] text-[var(--color-text-primary)]">Match<br/>Score</span>
            </div>
          </div>

          {/* Right Col: AI Summary & Details */}
          <div className="flex-1 flex flex-col gap-[24px]">
            <div>
              <h5 className="text-[13px] font-medium leading-[1.4] text-[var(--color-text-muted)] uppercase tracking-wider mb-[8px] flex items-center gap-[4px]">
                <Sparkles className="w-[14px] h-[14px] text-[var(--color-accent)]" strokeWidth={1.5} /> AI Match Summary
              </h5>
              <p className="text-[15px] leading-[1.6] text-[var(--color-text-primary)] bg-[var(--color-bg-primary)] p-[16px] rounded-[8px] border border-[var(--color-border-subtle)]">
                Excellent match for your query. Sarah recently led a complex Vue to React migration at FinTech Co, completing it 2 months ahead of schedule. Her references highlight her exceptional UX sensibilities and her dedication to mentoring 3 junior engineers on her previous team.
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-[24px]">
              {/* Skills */}
              <div>
                <h5 className="text-[13px] font-medium leading-[1.4] text-[var(--color-text-muted)] uppercase tracking-wider mb-[12px]">Core Competencies</h5>
                <div className="flex flex-wrap gap-[8px]">
                  <span className="bg-[var(--color-accent-light)] text-[var(--color-accent)] px-[10px] py-[4px] rounded text-[13px] font-medium">React</span>
                  <span className="bg-[var(--color-accent-light)] text-[var(--color-accent)] px-[10px] py-[4px] rounded text-[13px] font-medium">Vue.js</span>
                  <span className="bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] px-[10px] py-[4px] rounded text-[13px] font-medium">TypeScript</span>
                  <span className="bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] px-[10px] py-[4px] rounded text-[13px] font-medium">UX Design</span>
                  <span className="bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] px-[10px] py-[4px] rounded text-[13px] font-medium">Mentorship</span>
                </div>
              </div>
              
              {/* Metrics/Experience */}
              <div>
                <h5 className="text-[13px] font-medium leading-[1.4] text-[var(--color-text-muted)] uppercase tracking-wider mb-[12px]">Recent Experience</h5>
                <ul className="flex flex-col gap-[8px] text-[15px] leading-[1.6] text-[var(--color-text-primary)]">
                  <li className="flex justify-between items-center border-b border-[var(--color-border-subtle)] pb-[4px]">
                    <span>Senior UI Engineer <span className="text-[var(--color-text-muted)]">@ FinTech Co</span></span>
                    <span className="text-[var(--color-text-muted)] font-mono text-[12px]">2021 - Present</span>
                  </li>
                  <li className="flex justify-between items-center border-b border-[var(--color-border-subtle)] pb-[4px]">
                    <span>Frontend Developer <span className="text-[var(--color-text-muted)]">@ Startup Inc</span></span>
                    <span className="text-[var(--color-text-muted)] font-mono text-[12px]">2018 - 2021</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-auto pt-[16px] flex justify-end gap-[12px]">
              <button className="px-[16px] py-[8px] border border-[var(--color-border)] rounded-[8px] text-[13px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors">
                View Full Profile
              </button>
              <button className="px-[16px] py-[8px] bg-[var(--color-accent)] text-white rounded-[8px] text-[13px] font-bold hover:bg-[var(--color-accent-hover)] transition-colors flex items-center gap-[8px]">
                <Mail className="w-[16px] h-[16px]" strokeWidth={2} /> Message
              </button>
            </div>
          </div>
        </motion.article>

        {/* Candidate Card 2 (Slightly lower score) */}
        <motion.article 
          variants={staggerItem}
          className="bg-white border border-[var(--color-border)] rounded-[12px] p-[32px] hover:-translate-y-[1px] hover:shadow-[var(--shadow-card)] transition-all duration-250 flex flex-col md:flex-row gap-[32px] relative opacity-95"
        >
          <div className="absolute top-[32px] right-[32px]">
            <button className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors">
              <Bookmark className="w-[20px] h-[20px]" strokeWidth={1.5} />
            </button>
          </div>

          <div className="flex flex-col items-center md:items-start md:w-[200px] shrink-0 gap-[16px]">
            <div className="w-[96px] h-[96px] rounded-full bg-[var(--color-bg-secondary)] overflow-hidden border border-[var(--color-border)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="Marcus Chen" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAbEmUiIf0cYg7tIYGek3hHvpSj8BiRZw2OWpkWo0kc0skvjf3b0d-CG7nGcDSJyawA67bqZRMBxVNjF3Dvc4unLo2eitlIks7x9zD7-lKj_dHzkYVvG3szZ6YpVRczqPZiLugz9aJMMatnYCm6sD8kz8BbptTqsl1RiAr6fCwhOTE3NK8XvbFpJ7H47sw9QNo8DJpma2Z1f5zRkKfW7-qYk1HFEZiuzhqpaf4I-_Ta2kZp25XHBZMYcmjxBnzCLMg7GvEjCC-q2vP_"/>
            </div>
            <div className="text-center md:text-left">
              <h4 className="text-[22px] font-semibold leading-[1.3] text-[var(--color-text-primary)]">Marcus Chen</h4>
              <p className="text-[13px] font-medium leading-[1.4] text-[var(--color-text-secondary)]">Lead Frontend Dev</p>
              <p className="text-[13px] font-medium leading-[1.4] text-[var(--color-text-muted)] mt-[4px] flex items-center justify-center md:justify-start gap-[4px]">
                <MapPin className="w-[14px] h-[14px]" strokeWidth={1.5} /> Austin, TX
              </p>
            </div>

            <div className="mt-[8px] flex items-center gap-[12px] bg-[var(--color-bg-primary)] px-[16px] py-[8px] rounded-[8px] border border-[var(--color-border-subtle)] w-full justify-center md:justify-start">
              <AnimatedScoreRing 
                score={82} 
                maxScore={100} 
                size={48} 
                strokeWidth={4} 
                label=""
                scoreClassName="text-amber-500 text-[14px]"
              />
              <span className="text-[13px] font-medium leading-[1.2] text-[var(--color-text-primary)]">Match<br/>Score</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-[24px]">
            <div>
              <h5 className="text-[13px] font-medium leading-[1.4] text-[var(--color-text-muted)] uppercase tracking-wider mb-[8px] flex items-center gap-[4px]">
                <Sparkles className="w-[14px] h-[14px] text-[var(--color-accent)]" strokeWidth={1.5} /> AI Match Summary
              </h5>
              <p className="text-[15px] leading-[1.6] text-[var(--color-text-primary)] bg-[var(--color-bg-primary)] p-[16px] rounded-[8px] border border-[var(--color-border-subtle)]">
                Strong React background and solid mentoring experience. However, his migration experience is primarily Angular to React rather than Vue, which slightly lowers his perfect fit score for this specific query.
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-[24px]">
              <div>
                <h5 className="text-[13px] font-medium leading-[1.4] text-[var(--color-text-muted)] uppercase tracking-wider mb-[12px]">Core Competencies</h5>
                <div className="flex flex-wrap gap-[8px]">
                  <span className="bg-[var(--color-accent-light)] text-[var(--color-accent)] px-[10px] py-[4px] rounded text-[13px] font-medium">React</span>
                  <span className="bg-[var(--color-accent-light)] text-[var(--color-accent)] px-[10px] py-[4px] rounded text-[13px] font-medium">Team Lead</span>
                  <span className="bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] px-[10px] py-[4px] rounded text-[13px] font-medium">Angular</span>
                  <span className="bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] px-[10px] py-[4px] rounded text-[13px] font-medium">System Design</span>
                </div>
              </div>
              
              <div>
                <h5 className="text-[13px] font-medium leading-[1.4] text-[var(--color-text-muted)] uppercase tracking-wider mb-[12px]">Recent Experience</h5>
                <ul className="flex flex-col gap-[8px] text-[15px] leading-[1.6] text-[var(--color-text-primary)]">
                  <li className="flex justify-between items-center border-b border-[var(--color-border-subtle)] pb-[4px]">
                    <span>Lead Engineer <span className="text-[var(--color-text-muted)]">@ HealthTech AI</span></span>
                    <span className="text-[var(--color-text-muted)] font-mono text-[12px]">2020 - Present</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-auto pt-[16px] flex justify-end gap-[12px]">
              <button className="px-[16px] py-[8px] border border-[var(--color-border)] rounded-[8px] text-[13px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors">
                View Full Profile
              </button>
              <button className="px-[16px] py-[8px] bg-[var(--color-accent)] text-white rounded-[8px] text-[13px] font-bold hover:bg-[var(--color-accent-hover)] transition-colors flex items-center gap-[8px]">
                <Mail className="w-[16px] h-[16px]" strokeWidth={2} /> Message
              </button>
            </div>
          </div>
        </motion.article>
      </motion.section>

      <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex justify-center mt-[32px] pb-[64px]">
        <button className="px-[24px] py-[8px] border border-[var(--color-border)] rounded-[8px] text-[13px] font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)] transition-colors">
          Load More Candidates
        </button>
      </motion.div>
    </main>
  );
}
