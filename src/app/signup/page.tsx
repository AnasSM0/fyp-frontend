"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  fadeUp, staggerContainer, staggerItem, 
  cardHover, subtleFloat, slowPulse, 
  expandWidth, fadeIn 
} from "@/lib/motion";
import { 
  Eye, EyeOff, ArrowRight, ShieldCheck, 
  Building2, UserSearch, Loader2 
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useMarketplaceStore } from "@/store/useMarketplaceStore";

export default function SignUpPage() {
  const router = useRouter();
  const { setRole: setMarketplaceRole } = useMarketplaceStore();
  const [role, setRole] = useState<"candidate" | "recruiter">("candidate");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMarketplaceRole(role);
    setIsSubmitting(true);
    // Simulate network request
    setTimeout(() => {
      setIsSubmitting(false);
      router.push(role === "recruiter" ? "/dashboard/company" : "/onboarding");
    }, 2000);
  };

  return (
    <main className="bg-[var(--color-bg-primary)] min-h-screen w-full flex flex-col md:flex-row font-sans text-[15px] text-[var(--color-text-primary)] antialiased">
      
      {/* Left Column: Social Proof (Hidden on small screens) */}
      <motion.div 
        initial="hidden" animate="visible" variants={fadeIn}
        className="hidden md:flex md:w-1/2 lg:w-5/12 bg-[var(--color-bg-subtle)] flex-col justify-between p-[48px] lg:p-[96px] relative overflow-hidden border-r border-[var(--color-border)]"
      >
        {/* Animated Background Decoration (Subtle Radial Pulse) */}
        <motion.div 
          variants={slowPulse}
          className="absolute top-0 left-0 w-full h-full pointer-events-none" 
          style={{ backgroundImage: "radial-gradient(circle at 20% 30%, var(--color-accent-border) 0%, transparent 40%)" }}
        />

        <div className="relative z-10 max-w-lg mx-auto w-full">
          <motion.div variants={fadeUp}>
            <h2 className="text-[48px] font-bold leading-[1.1] tracking-tight text-[var(--color-text-primary)] mb-[24px]">
              Join thousands of accelerated hires.
            </h2>
            <p className="text-[22px] font-semibold leading-[1.3] text-[var(--color-text-secondary)] mb-[64px]">
              The premier talent marketplace where elite candidates meet forward-thinking companies.
            </p>
          </motion.div>

          {/* Bento Grid of Social Proof */}
          <motion.div variants={staggerContainer} className="grid grid-cols-2 gap-[24px] relative">
            
            {/* Card 1 */}
            <motion.div 
              variants={staggerItem}
              whileHover={cardHover.whileHover}
              className="bg-white rounded-[12px] p-[24px] border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)] flex flex-col gap-[12px]"
            >
              <div className="flex items-center gap-[8px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="Sarah J." src="https://lh3.googleusercontent.com/aida-public/AB6AXuA3t5gZy9o5TaES26I4SeE-qIC2ixlDbSNf-gliIWio1hF6OEvZfaWlNO1zT_T833xBVXReQlWf6KawTpoUoH8j7FiAKA3fgL_q0dr9i0pxq1vvmY8IKeLXc9iQu9OGBysjzWZbfG0L2ljxN4qNornnw2ejywjS39Eibhuxp25WcVagorkcSTWNpZIZ6Y469zcFMm0OmEwKBjurRCDbgF2khe4j6Yi7xyrSvAshKoFT22BtFLNQzqAixPqrmgdNVfJuDYrgl8dc_NeE" className="w-[40px] h-[40px] rounded-full object-cover border border-[var(--color-border-subtle)]" />
                <div>
                  <p className="text-[13px] font-medium text-[var(--color-text-primary)]">Sarah J.</p>
                  <p className="text-[13px] text-[var(--color-text-muted)]">Hired at TechNova</p>
                </div>
              </div>
              <p className="text-[13px] leading-[1.4] text-[var(--color-text-secondary)] italic">
                "The process was incredibly seamless. I found a role that perfectly matched my skill set within two weeks."
              </p>
            </motion.div>

            {/* Card 2 (Slightly offset) */}
            <motion.div 
              variants={staggerItem}
              whileHover={cardHover.whileHover}
              className="bg-white rounded-[12px] p-[24px] border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)] flex flex-col gap-[12px] translate-y-[32px]"
            >
              <div className="flex items-center gap-[8px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="Marcus T." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCL5yQPtBHUkHhNXdI8R6D3QpeTk9Db4vjniwL6fxgfBIULJJ0A00XVmsWf9-o5Pa4y7QoG0T9HrThYWMFHAP6ldRIYTIrYPGdtdKshlfMXOtzRhy0rYdiJSKdUCe2gjyaB7mMJ6nzH31nL-KHww1DeUZe_d1RTS6HbVL-jiPqipKaPL9B10A7n-2bnU2z3CDrC2p5i_-izCaeQhwVZKbQNIapXgaz6yYfoS9IuZaDyIinUn8uLfsvoHjccjIm4P2iCQq3h3L4b2SPj" className="w-[40px] h-[40px] rounded-full object-cover border border-[var(--color-border-subtle)]" />
                <div>
                  <p className="text-[13px] font-medium text-[var(--color-text-primary)]">Marcus T.</p>
                  <p className="text-[13px] text-[var(--color-text-muted)]">Recruiter, Nexus</p>
                </div>
              </div>
              <p className="text-[13px] leading-[1.4] text-[var(--color-text-secondary)] italic">
                "The quality of talent here is unmatched. It's cut our sourcing time in half."
              </p>
            </motion.div>

            {/* Card 3 */}
            <motion.div 
              variants={staggerItem}
              whileHover={cardHover.whileHover}
              className="bg-white rounded-[12px] p-[24px] border border-[var(--color-border-subtle)] shadow-[var(--shadow-card)] flex flex-col gap-[12px] col-span-2 mt-[16px]"
            >
              <div className="flex items-center gap-[8px]">
                <div className="flex -space-x-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt="Avatar 1" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCR204AaQi8irHsCqtYFseebdzZA0D3-mX0ON53hTOG1B5tAtiXdQPD44JJDcLXojjJGNQcHY1c3mkigU9iEx5dv-ESjSwkDU-sDW0hrt8AVEoejSiBXHSUW-Fx6FeJVZ2C5ekXQPSw3XuEgQnqXbt8R6axfqJM9bATKIsE0zyjD-6P8kT8CIsw9sWCUpJOnRY9TIPJoxUZYTQ0-GRD2IzCv9uVQ3jlDPYhQ2SUe1MwoFSr8KyPZxmB3ee3PX1DRRIm7dOmwfPhEpMj" className="w-[32px] h-[32px] rounded-full border-2 border-white object-cover" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img alt="Avatar 2" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDjlLr5xdMeiddxLOqXJM4PmfddmTPq-mhf6nfqH_4fOHJ14aTwH5R232v-3O7XJoWH_dbgkK3S8OLmNRgFbTZiMnX02h5cVxliHFmSMWdvDVKVj0D2V3aqrYq_NFpKb5Bdf_tQlGws3aROtqwoO7A99LlHp2tierC6PVTmwmSOPZF3bQqm6Qgh8V7YbeB-JEJIwVf8IWV0VjQqNYnx10HGJgi5kw4NdFLmQJGpCj4tIenGY5_A4__6MXupNiQnVNijYPgP-a2y-m8m" className="w-[32px] h-[32px] rounded-full border-2 border-white object-cover" />
                  <div className="w-[32px] h-[32px] rounded-full border-2 border-white bg-[var(--color-bg-subtle)] flex items-center justify-center text-[11px] font-medium text-[var(--color-text-secondary)]">
                    +1k
                  </div>
                </div>
                <p className="text-[13px] font-medium text-[var(--color-text-primary)] ml-[8px]">Verified Placements</p>
              </div>
              <div className="w-full bg-[var(--color-border-subtle)] h-[6px] rounded-full mt-[8px] overflow-hidden relative">
                <motion.div 
                  custom="85%"
                  variants={expandWidth}
                  className="absolute top-0 left-0 bg-[var(--color-verified)] h-full rounded-full" 
                />
              </div>
              <p className="text-[13px] text-[var(--color-text-muted)]">85% faster time-to-hire than industry average.</p>
            </motion.div>
          </motion.div>
        </div>

        <motion.div variants={fadeUp} className="relative z-10 mt-[64px] flex items-center gap-[12px]">
          <ShieldCheck className="text-[var(--color-accent)] w-[24px] h-[24px]" strokeWidth={1.5} />
          <span className="text-[13px] font-medium text-[var(--color-text-secondary)]">Enterprise-grade security & verified profiles.</span>
        </motion.div>
      </motion.div>

      {/* Right Column: Form Container */}
      <div className="w-full md:w-1/2 lg:w-7/12 bg-white min-h-screen flex items-center justify-center p-[24px] md:p-[96px] relative">
        {/* Subtle Ambient Top Glow for Right Column */}
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-[var(--color-accent-light)] rounded-full blur-[100px] pointer-events-none opacity-50" />

        <motion.div 
          initial="hidden" animate="visible" variants={fadeUp}
          className="w-full max-w-md mx-auto flex flex-col gap-[48px] relative z-10"
        >
          {/* Header */}
          <div className="flex flex-col gap-[12px]">
            <Link href="/" className="text-[28px] font-bold leading-[1.2] tracking-[-0.015em] text-[var(--color-accent)] mb-[20px] hover:opacity-80 transition-opacity w-fit">
              XLR8Hire
            </Link>
            <h1 className="text-[36px] font-bold leading-[1.15] text-[var(--color-text-primary)]">
              Create your account
            </h1>
            <p className="text-[15px] leading-[1.6] text-[var(--color-text-secondary)]">
              Start free, no credit card required.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-[24px]">
            
            {/* Custom Premium Role Selector */}
            <div className="flex flex-col gap-[12px]">
              <label className="text-[13px] font-medium text-[var(--color-text-primary)]">I am a...</label>
              <div className="grid grid-cols-2 gap-[20px]">
                {/* Candidate Option */}
                <label className="relative cursor-pointer group">
                  <input 
                    type="radio" 
                    name="role" 
                    value="candidate" 
                    className="peer sr-only"
                    checked={role === "candidate"}
                    onChange={() => setRole("candidate")}
                  />
                  <div className={cn(
                    "h-full rounded-[12px] p-[24px] flex flex-col items-center justify-center gap-[12px] transition-all duration-300 border-[2px]",
                    role === "candidate" 
                      ? "border-[var(--color-verified)] bg-[var(--color-verified-light)] text-[var(--color-verified)]" 
                      : "border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] hover:border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-subtle)]"
                  )}>
                    <UserSearch className="w-[32px] h-[32px]" strokeWidth={1.5} />
                    <span className="text-[13px] font-semibold text-center">Job Seeker</span>
                  </div>
                </label>

                {/* Recruiter Option */}
                <label className="relative cursor-pointer group">
                  <input 
                    type="radio" 
                    name="role" 
                    value="recruiter" 
                    className="peer sr-only"
                    checked={role === "recruiter"}
                    onChange={() => setRole("recruiter")}
                  />
                  <div className={cn(
                    "h-full rounded-[12px] p-[24px] flex flex-col items-center justify-center gap-[12px] transition-all duration-300 border-[2px]",
                    role === "recruiter" 
                      ? "border-[var(--color-verified)] bg-[var(--color-verified-light)] text-[var(--color-verified)]" 
                      : "border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] hover:border-[var(--color-border-subtle)] hover:bg-[var(--color-bg-subtle)]"
                  )}>
                    <Building2 className="w-[32px] h-[32px]" strokeWidth={1.5} />
                    <span className="text-[13px] font-semibold text-center">Hiring Manager</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Inputs */}
            <div className="flex flex-col gap-[20px]">
              <div className="flex flex-col gap-[8px] group">
                <label htmlFor="email" className="text-[13px] font-medium text-[var(--color-text-primary)] group-focus-within:text-[var(--color-accent)] transition-colors">
                  Work Email
                </label>
                <input 
                  id="email" 
                  type="email" 
                  required
                  placeholder="name@company.com"
                  className="w-full h-[48px] px-[16px] rounded-[8px] border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] text-[15px] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:ring-[3px] focus:ring-[var(--color-accent-light)] outline-none transition-all duration-200"
                />
              </div>

              <div className="flex flex-col gap-[8px] group">
                <label htmlFor="password" className="text-[13px] font-medium text-[var(--color-text-primary)] group-focus-within:text-[var(--color-accent)] transition-colors">
                  Password
                </label>
                <div className="relative">
                  <input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    required
                    placeholder="Min. 8 characters"
                    className="w-full h-[48px] pl-[16px] pr-[48px] rounded-[8px] border border-[var(--color-border)] bg-white text-[var(--color-text-primary)] text-[15px] placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:ring-[3px] focus:ring-[var(--color-accent-light)] outline-none transition-all duration-200"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-[12px] top-1/2 -translate-y-1/2 p-[4px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-[20px] h-[20px]" strokeWidth={1.5} /> : <Eye className="w-[20px] h-[20px]" strokeWidth={1.5} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <motion.button 
              whileHover={cardHover.whileHover}
              whileTap={cardHover.whileTap}
              type="submit"
              disabled={isSubmitting}
              className="w-full h-[48px] bg-[var(--color-accent)] text-white text-[13px] font-semibold rounded-[8px] hover:bg-[var(--color-accent-hover)] transition-colors duration-200 flex items-center justify-center gap-[8px] mt-[8px] shadow-[0_0_20px_rgba(79,70,229,0.2)] disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-[20px] h-[20px] animate-spin" strokeWidth={2} />
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-[20px] h-[20px]" strokeWidth={1.5} />
                </>
              )}
            </motion.button>

            {/* Divider */}
            <div className="relative flex items-center py-[20px]">
              <div className="flex-grow border-t border-[var(--color-border)]"></div>
              <span className="flex-shrink-0 mx-[16px] text-[13px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                Or continue with
              </span>
              <div className="flex-grow border-t border-[var(--color-border)]"></div>
            </div>

            {/* Social Logins */}
            <div className="flex flex-col gap-[12px]">
              {/* Google Button */}
              <motion.button 
                whileHover={cardHover.whileHover}
                whileTap={cardHover.whileTap}
                type="button"
                className="w-full h-[48px] border border-[var(--color-border)] rounded-[8px] bg-white flex items-center justify-center gap-[8px] hover:bg-[var(--color-bg-subtle)] transition-colors duration-200 text-[var(--color-text-primary)] text-[13px] font-medium"
              >
                <svg viewBox="0 0 24 24" className="w-[20px] h-[20px]">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </motion.button>
              
              <div className="grid grid-cols-2 gap-[12px]">
                {/* GitHub Button */}
                <motion.button 
                  whileHover={cardHover.whileHover}
                  whileTap={cardHover.whileTap}
                  type="button"
                  className="h-[48px] border border-[var(--color-border)] rounded-[8px] bg-white flex items-center justify-center gap-[8px] hover:bg-[var(--color-bg-subtle)] transition-colors duration-200 text-[var(--color-text-primary)] text-[13px] font-medium"
                >
                  <svg viewBox="0 0 24 24" className="w-[20px] h-[20px]" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  GitHub
                </motion.button>

                {/* LinkedIn Button */}
                <motion.button 
                  whileHover={cardHover.whileHover}
                  whileTap={cardHover.whileTap}
                  type="button"
                  className="h-[48px] border border-[var(--color-border)] rounded-[8px] bg-white flex items-center justify-center gap-[8px] hover:bg-[var(--color-bg-subtle)] transition-colors duration-200 text-[var(--color-text-primary)] text-[13px] font-medium"
                >
                  <svg viewBox="0 0 24 24" className="w-[20px] h-[20px]" fill="#0A66C2">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  LinkedIn
                </motion.button>
              </div>
            </div>
          </form>

          {/* Footer Link */}
          <p className="text-[13px] font-medium text-[var(--color-text-secondary)] text-center mt-[24px]">
            Already have an account?{" "}
            <Link href="/login" className="text-[var(--color-accent)] font-semibold hover:underline decoration-[var(--color-accent)]/30 underline-offset-4 transition-all">
              Sign in
            </Link>
          </p>

          {/* Terms */}
          <p className="text-[11px] font-medium leading-[1.4] text-[var(--color-text-muted)] text-center mt-auto pt-[48px]">
            By clicking "Create Account", you agree to our{" "}
            <Link href="/terms" className="hover:text-[var(--color-text-primary)] underline decoration-[var(--color-border)] transition-colors">
              Terms of Service
            </Link>
            {" "}and{" "}
            <Link href="/privacy" className="hover:text-[var(--color-text-primary)] underline decoration-[var(--color-border)] transition-colors">
              Privacy Policy
            </Link>.
          </p>
        </motion.div>
      </div>
    </main>
  );
}
