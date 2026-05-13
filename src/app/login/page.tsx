"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  fadeUp, staggerContainer, staggerItem, 
  cardHover, slowPulse, fadeIn 
} from "@/lib/motion";
import { 
  Eye, EyeOff, ArrowRight, ShieldCheck, 
  Loader2 
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate network request
    setTimeout(() => {
      setIsSubmitting(false);
      router.push("/onboarding");
    }, 1500);
  };

  return (
    <main className="bg-[var(--color-bg-primary)] min-h-screen w-full flex flex-col md:flex-row font-sans text-[15px] text-[var(--color-text-primary)] antialiased">
      
      {/* Left Column: Branding / Proof */}
      <motion.div 
        initial="hidden" animate="visible" variants={fadeIn}
        className="hidden md:flex md:w-1/2 lg:w-5/12 bg-[var(--color-bg-subtle)] flex-col justify-between p-[48px] lg:p-[96px] relative overflow-hidden border-r border-[var(--color-border)]"
      >
        <motion.div 
          variants={slowPulse}
          className="absolute top-0 left-0 w-full h-full pointer-events-none" 
          style={{ backgroundImage: "radial-gradient(circle at 20% 30%, var(--color-accent-border) 0%, transparent 40%)" }}
        />

        <div className="relative z-10 max-w-lg mx-auto w-full">
          <motion.div variants={fadeUp}>
            <h2 className="text-[48px] font-bold leading-[1.1] tracking-tight text-[var(--color-text-primary)] mb-[24px]">
              Welcome back to elite hiring.
            </h2>
            <p className="text-[22px] font-semibold leading-[1.3] text-[var(--color-text-secondary)] mb-[64px]">
              Sign in to manage your talent profile or source top-tier candidates.
            </p>
          </motion.div>

          <motion.div variants={staggerContainer} className="space-y-6">
            <motion.div variants={staggerItem} className="p-6 bg-white rounded-2xl border border-[var(--color-border)] shadow-sm">
              <p className="text-[14px] text-[var(--color-text-secondary)] italic">
                "XLR8Hire changed how we find developers. The skill verification is world-class."
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold">JD</div>
                <div>
                  <div className="text-sm font-bold">James Dalton</div>
                  <div className="text-xs text-[var(--color-text-muted)]">CTO, CloudScale</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        <motion.div variants={fadeUp} className="relative z-10 mt-[64px] flex items-center gap-[12px]">
          <ShieldCheck className="text-[var(--color-accent)] w-[24px] h-[24px]" strokeWidth={1.5} />
          <span className="text-[13px] font-medium text-[var(--color-text-secondary)]">Your data is secured with enterprise-grade encryption.</span>
        </motion.div>
      </motion.div>

      {/* Right Column: Login Form */}
      <div className="w-full md:w-1/2 lg:w-7/12 bg-white min-h-screen flex items-center justify-center p-[24px] md:p-[96px] relative">
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
              Sign in
            </h1>
            <p className="text-[15px] leading-[1.6] text-[var(--color-text-secondary)]">
              Enter your credentials to access your dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-[24px]">
            <div className="flex flex-col gap-[20px]">
              <div className="flex flex-col gap-[8px] group">
                <label htmlFor="email" className="text-[13px] font-medium text-[var(--color-text-primary)] group-focus-within:text-[var(--color-accent)] transition-colors">
                  Email Address
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
                <div className="flex justify-between items-center">
                  <label htmlFor="password" className="text-[13px] font-medium text-[var(--color-text-primary)] group-focus-within:text-[var(--color-accent)] transition-colors">
                    Password
                  </label>
                  <Link href="#" className="text-[12px] font-medium text-[var(--color-accent)] hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    required
                    placeholder="Enter your password"
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
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="w-[20px] h-[20px]" strokeWidth={1.5} />
                </>
              )}
            </motion.button>
          </form>

          <p className="text-[13px] font-medium text-[var(--color-text-secondary)] text-center mt-[24px]">
            Don't have an account?{" "}
            <Link href="/signup" className="text-[var(--color-accent)] font-semibold hover:underline decoration-[var(--color-accent)]/30 underline-offset-4 transition-all">
              Sign up
            </Link>
          </p>
        </motion.div>
      </div>
    </main>
  );
}
