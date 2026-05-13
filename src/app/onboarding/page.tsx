"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, useScroll, useSpring, useInView } from "framer-motion";
import { StickyAIAssistant } from "@/components/onboarding/ai-assistant";
import { EASE, fadeUp, staggerContainer, staggerItem } from "@/lib/motion";
import { ChevronDown, Sparkles, Terminal, Briefcase, Rocket, Star } from "lucide-react";

const ONBOARDING_SECTIONS = [
  {
    id: "foundation",
    title: "The Foundation",
    subtitle: "Define your core professional identity",
    icon: Terminal,
    fields: [
      { name: "Full Name", placeholder: "e.g. Alex Rivera", type: "text" },
      { name: "Desired Role", placeholder: "e.g. Senior Frontend Engineer", type: "text" },
      { name: "Experience Level", placeholder: "e.g. 5+ Years", type: "text" },
    ]
  },
  {
    id: "stack",
    title: "The Stack",
    subtitle: "Map your technical ecosystem",
    icon: Sparkles,
    fields: [
      { name: "Primary Frameworks", placeholder: "e.g. React, Next.js, Vue", type: "text" },
      { name: "Languages", placeholder: "e.g. TypeScript, Rust, Go", type: "text" },
      { name: "Cloud & Devops", placeholder: "e.g. AWS, Vercel, Docker", type: "text" },
    ]
  },
  {
    id: "proof",
    title: "The Proof",
    subtitle: "Showcase your highest-impact work",
    icon: Briefcase,
    fields: [
      { name: "Portfolio URL", placeholder: "https://...", type: "url" },
      { name: "Key Project", placeholder: "Describe your most complex build", type: "textarea" },
    ]
  },
  {
    id: "trajectory",
    title: "The Trajectory",
    subtitle: "Where do you want the AI to take you?",
    icon: Rocket,
    fields: [
      { name: "Career Goals", placeholder: "e.g. Scaling high-growth AI startups", type: "text" },
      { name: "Interests", placeholder: "e.g. Distributed Systems, ML Ops", type: "text" },
    ]
  }
];

function OnboardingSection({ section, index, isActive, onInputChange }: { section: any; index: number; isActive: boolean; onInputChange: (f: string, v: string) => void }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { margin: "-40% 0px -40% 0px" });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, margin: "-20%" }}
      variants={fadeUp}
      className={`min-h-[60vh] py-20 transition-opacity duration-1000 ${isInView ? "opacity-100" : "opacity-20"}`}
    >
      <div className="flex items-center gap-4 mb-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-violet-400">
          <section.icon className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">{section.title}</h2>
          <p className="text-white/40">{section.subtitle}</p>
        </div>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {section.fields.map((field: any, fIdx: number) => (
          <motion.div key={fIdx} variants={staggerItem} className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-white/40 px-1">
              {field.name}
            </label>
            {field.type === "textarea" ? (
              <textarea
                placeholder={field.placeholder}
                onChange={(e) => onInputChange(field.name, e.target.value)}
                className="w-full rounded-2xl bg-white/5 border border-white/10 p-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all min-h-[120px]"
              />
            ) : (
              <input
                type={field.type}
                placeholder={field.placeholder}
                onChange={(e) => onInputChange(field.name, e.target.value)}
                className="w-full rounded-2xl bg-white/5 border border-white/10 p-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition-all"
              />
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

export default function OnboardingPage() {
  const [currentSection, setCurrentSection] = useState(0);
  const [formData, setFormData] = useState<{ [key: string]: string }>({});
  const containerRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const completeness = ONBOARDING_SECTIONS.reduce((acc, section) => {
    section.fields.forEach(f => {
      acc[f.name] = !!formData[f.name];
    });
    return acc;
  }, {} as { [key: string]: boolean });

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  useEffect(() => {
    return scrollYProgress.onChange((v) => {
      const section = Math.floor(v * ONBOARDING_SECTIONS.length);
      setCurrentSection(Math.min(section, ONBOARDING_SECTIONS.length - 1));
    });
  }, [scrollYProgress]);

  return (
    <div className="relative min-h-screen bg-[#0a0a0b] text-white">
      {/* Background Mesh */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#1e1b4b,transparent)] opacity-40" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      {/* Progress Bar Top */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-1 bg-violet-600 z-50 origin-left"
        style={{ scaleX }}
      />

      <div className="container relative z-10 mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-24 pt-24 pb-48">
          
          {/* Content Area */}
          <div ref={containerRef} className="flex-1">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-32"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-medium mb-6">
                <Star className="h-3 w-3 fill-violet-400" />
                <span>Premium AI Onboarding</span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-6">
                Construct your <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">talent identity.</span>
              </h1>
              <p className="text-xl text-white/40 max-w-xl leading-relaxed">
                Our AI engine is ready to map your technical DNA. Complete the sections below to build a recruiter-ready profile.
              </p>
              
              <motion.div 
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="mt-20 flex items-center gap-2 text-white/20 text-sm"
              >
                <ChevronDown className="h-4 w-4" />
                <span>Scroll to begin mapping</span>
              </motion.div>
            </motion.div>

            {ONBOARDING_SECTIONS.map((section, idx) => (
              <OnboardingSection 
                key={section.id} 
                section={section} 
                index={idx}
                isActive={currentSection === idx}
                onInputChange={handleInputChange}
              />
            ))}

            {/* Final CTA */}
            <motion.div 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              className="pt-20 border-t border-white/10"
            >
              <h3 className="text-2xl font-bold mb-6">Identity Construction Complete.</h3>
              <button className="group relative px-8 py-4 rounded-2xl bg-violet-600 font-semibold hover:bg-violet-700 transition-all overflow-hidden">
                <span className="relative z-10 flex items-center gap-2">
                  Initialize Dashboard <Rocket className="h-4 w-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-violet-400 to-indigo-400 opacity-0 group-hover:opacity-20 transition-opacity" />
              </button>
            </motion.div>
          </div>

          {/* AI Sidebar */}
          <div className="lg:w-96">
            <StickyAIAssistant 
              currentSection={currentSection + 1} 
              totalSections={ONBOARDING_SECTIONS.length} 
              completeness={completeness}
            />
          </div>

        </div>
      </div>
    </div>
  );
}
