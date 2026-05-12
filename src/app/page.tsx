import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <>
      
{/* TopNavBar */}
<nav className="fixed top-0 w-full h-[60px] z-50 bg-white/80 backdrop-blur-md dark:bg-background/80 border-b border-border-default dark:border-outline-variant">
<div className="flex justify-between items-center max-w-7xl mx-auto px-default h-full">
<span className="font-text-h3 text-text-h3 font-bold tracking-tight text-on-background dark:text-on-surface">XLR8Hire</span>
<div className="flex items-center gap-small">
<Link href="/dashboard/student" className="px-default py-micro rounded-lg font-text-label text-text-label text-primary font-semibold hover:bg-accent-primary-light transition-colors">Log In</Link>
<span className="material-symbols-outlined text-primary" data-icon="bolt">bolt</span>
</div>
</div>
</nav>
<main className="pt-[60px]">
{/* Hero Section */}
<section className="px-default pt-page pb-section flex flex-col items-center text-center">
<h1 className="font-text-h1 text-text-h1 mb-default text-text-primary">Stop applying. <br/><span className="text-primary">Get discovered.</span></h1>
<p className="font-text-body text-text-body text-text-secondary max-w-[320px] mb-relaxed">
                The elite marketplace where high-signal AI talent meets the world's most innovative engineering teams through verified technical proof.
            </p>
<div className="flex flex-col w-full gap-small">
<Link href="/dashboard/student" className="flex items-center justify-center w-full h-[48px] bg-primary-container text-on-primary font-text-label text-text-label rounded-lg font-bold shadow-sm active:scale-[0.98] transition-transform">Get Ranked</Link>
<button className="w-full h-[48px] border border-border-default text-text-primary font-text-label text-text-label rounded-lg font-bold hover:bg-bg-secondary active:scale-[0.98] transition-transform">Hire Talent</button>
</div>
{/* UI Preview: Verified Talent Score Card */}
<div className="mt-page w-full max-w-[320px] relative">
<div className="bg-white p-relaxed rounded-xl border border-border-default shadow-[0_1px_3px_rgba(0,0,0,0.06)] transform -rotate-1">
<div className="flex justify-between items-start mb-relaxed">
<div className="flex flex-col items-start">
<span className="bg-accent-verified-light text-secondary px-small py-micro rounded-full text-[11px] font-bold border border-accent-verified-border flex items-center gap-1 uppercase tracking-wider">
<span className="material-symbols-outlined text-[14px]" data-icon="verified" data-weight="fill" style={{fontVariationSettings: "'FILL' 1"}}>verified</span>
                                Verified
                            </span>
<h3 className="font-text-h3 text-text-h3 mt-2">Senior Architect</h3>
</div>
<div className="w-20 h-20 rounded-full relative flex items-center justify-center">
<div className="absolute inset-0 rounded-full border-[6px] border-border-soft"></div>
<div className="absolute inset-0 rounded-full border-[6px] border-status-success border-r-transparent border-b-transparent transform rotate-45"></div>
<span className="font-text-mono text-text-mono text-xl font-bold text-status-success">912</span>
</div>
</div>
<div className="space-y-base">
<div className="h-1 bg-border-soft rounded-full overflow-hidden">
<div className="h-full bg-primary w-[88%] rounded-full"></div>
</div>
<div className="flex justify-between font-text-label text-text-label text-text-muted">
<span>System Design</span>
<span className="text-text-primary font-bold">92%</span>
</div>
</div>
</div>
{/* Decorative element */}
<div className="absolute -bottom-4 -right-2 w-full h-full bg-bg-secondary -z-10 rounded-xl border border-border-default"></div>
</div>
</section>
{/* Social Proof */}
<section className="py-section border-t border-border-soft bg-bg-secondary">
<p className="text-center font-text-label text-text-label text-text-muted mb-relaxed uppercase tracking-widest">Trusted by industry leaders</p>
<div className="flex flex-wrap justify-center gap-relaxed px-default opacity-40 grayscale">
<img alt="Airbnb" className="h-6 object-contain" data-alt="A clean, minimalist monochrome version of the Airbnb logo, rendered in a soft charcoal gray against a light neutral background, emphasizing corporate elegance and modern professional identity." src="https://lh3.googleusercontent.com/aida-public/AB6AXuCDTdQreMwJfE65teXpGTlDQLRNyf4G9pveAyDT_ePYH8HJYVIcv2Hwws0WS_3wVJAXQxo8vFfzHixmCcpibnRjqDPFN7u9jl1VGu0DrRlKCmk5r026NIdX7JTOjc5sKKFjA7JTNlmSn9ewTNRpk7GRa8Ne2K0lWtye9WF5pcpO2HpEU_LqBFLXhY4lO_jW1KyFgBZGhi_x8Go9tqcDeHYpQFTprWP1-3CDLatuxqXxJKVPBT0A5oW32eNjrlhYZypVTvlxuQ8F8E1t"/>
<img alt="LinkedIn" className="h-6 object-contain" data-alt="A professional, muted grayscale rendering of the LinkedIn logo, stripped of its brand blue to fit a minimalist and elite talent marketplace aesthetic, maintaining high-contrast legibility." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDtIzVi9ogzCa3SCcR8KuMQJZsfg8bSwgeNFPQL8K8F3-Y91HgcXp4JictVruGiEIu_-ZjTFb5j8DONkGn8P2Oh1CVSjukNYGl0zTS5qgvoLOZBx1ASTNdmoYlG9xMI2IpJSUa-mJ5wScLcUkU4_xjH25EPSjPU5wfWmhR9dwyg5K5FG7HfHUEsUyrOUUswyNlSAo0i1jiGgoPBcnbuBMLODkwGYjG-SDqMp02uy7J90VZseZwNjw6TC_gLs6J5EACiKR9T_yeZg8Ug"/>
<img alt="Stripe" className="h-6 object-contain" data-alt="The Stripe company logo presented in a sophisticated, desaturated gray tone, perfect for a high-end SaaS dashboard environment that prioritizes calm intelligence and professional restraint over bright colors." src="https://lh3.googleusercontent.com/aida-public/AB6AXuAivWaXlIrQTX2_-dP_rwU0flw79jdC50fNhdKTmhb_ipEj6UXt5x7A0uWyVljIUz6J0XGk3IMERMFqsM5qW4XD3PNBr9B4ncBGN2-eL5E4lV3Cexu9KiHxVoxq7VgYZFnDSZQ-R-VrBYK79Ut9AkkHRtXIzjBM22Y6OxYjqRjzKnX2UpYM8oInmLxSs2Pym1Bm1Rf8wZUfZVYpFp77wAJHclpCO7bpQcQhiu2KWumWa3izc0etIfnOoKc505J60WLMKtJh5T7xUf6S"/>
</div>
</section>
{/* Feature Cards */}
<section className="px-default py-page space-y-default">
<div className="bg-white p-relaxed rounded-xl border border-border-default shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
<div className="w-10 h-10 rounded-lg bg-accent-primary-light flex items-center justify-center mb-base">
<span className="material-symbols-outlined text-primary" data-icon="psychology">psychology</span>
</div>
<h4 className="font-text-h3 text-text-h3 mb-small">AI Skill Assessments</h4>
<p className="font-text-body text-text-body text-text-secondary">Our proprietary neural engine analyzes actual code contributions and problem-solving patterns to determine true expertise levels.</p>
</div>
<div className="bg-white p-relaxed rounded-xl border border-border-default shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
<div className="w-10 h-10 rounded-lg bg-accent-verified-light flex items-center justify-center mb-base">
<span className="material-symbols-outlined text-secondary" data-icon="rewarded_ads">rewarded_ads</span>
</div>
<h4 className="font-text-h3 text-text-h3 mb-small">Verified Talent Scores</h4>
<p className="font-text-body text-text-body text-text-secondary">Stop guessing. Every candidate profile features a hard-verified score backed by technical benchmarks and peer-reviewed challenges.</p>
</div>
<div className="bg-white p-relaxed rounded-xl border border-border-default shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
<div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center mb-base">
<span className="material-symbols-outlined text-text-primary" data-icon="hub">hub</span>
</div>
<h4 className="font-text-h3 text-text-h3 mb-small">Semantic AI Matching</h4>
<p className="font-text-body text-text-body text-text-secondary">We map the underlying intent of your project to candidate capabilities, finding the perfect fit beyond just matching keyword lists.</p>
</div>
</section>
{/* CTA Banner */}
<section className="mx-default my-page bg-primary-container rounded-xl p-relaxed text-center overflow-hidden relative">
<div className="relative z-10">
<h2 className="font-text-h2 text-text-h2 text-white mb-base">Ready to accelerate?</h2>
<p className="font-text-body text-text-body text-on-primary-container mb-relaxed">Join the world's most elite technical community today.</p>
<button className="w-full h-[48px] bg-white text-primary font-bold rounded-lg shadow-sm active:scale-[0.95] transition-transform">Get Started</button>
</div>
{/* Decorative circle */}
<div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full"></div>
<div className="absolute -bottom-20 -left-10 w-60 h-60 bg-white/5 rounded-full"></div>
</section>
</main>
{/* Footer */}
<footer className="w-full py-page-xl bg-bg-secondary dark:bg-surface-container-low border-t border-border-soft dark:border-outline-variant">
<div className="flex flex-col gap-relaxed max-w-7xl mx-auto px-default w-full">
<div className="flex flex-col gap-base">
<span className="font-text-h3 text-text-h3 font-bold text-on-background dark:text-on-surface">XLR8Hire</span>
<p className="font-text-label text-text-label text-text-muted">Intelligence for the modern talent market.</p>
</div>
<div className="grid grid-cols-2 gap-relaxed">
<div className="flex flex-col gap-small">
<h5 className="font-bold font-text-label text-text-label text-text-primary">Product</h5>
<a className="font-text-body text-text-body text-text-muted hover:text-primary transition-colors" href="#">Features</a>
<a className="font-text-body text-text-body text-text-muted hover:text-primary transition-colors" href="#">Rankings</a>
<a className="font-text-body text-text-body text-text-muted hover:text-primary transition-colors" href="#">Pricing</a>
</div>
<div className="flex flex-col gap-small">
<h5 className="font-bold font-text-label text-text-label text-text-primary">Company</h5>
<a className="font-text-body text-text-body text-text-muted hover:text-primary transition-colors" href="#">About</a>
<a className="font-text-body text-text-body text-text-muted hover:text-primary transition-colors" href="#">Careers</a>
<a className="font-text-body text-text-body text-text-muted hover:text-primary transition-colors" href="#">Press</a>
</div>
<div className="flex flex-col gap-small">
<h5 className="font-bold font-text-label text-text-label text-text-primary">Legal</h5>
<a className="font-text-body text-text-body text-text-muted hover:text-primary transition-colors" href="#">Privacy</a>
<a className="font-text-body text-text-body text-text-muted hover:text-primary transition-colors" href="#">Terms</a>
<a className="font-text-body text-text-body text-text-muted hover:text-primary transition-colors" href="#">Cookies</a>
</div>
</div>
<div className="pt-relaxed border-t border-border-soft">
<p className="font-text-label text-text-label text-text-muted text-center">© 2024 XLR8Hire. Intelligence for the modern talent market.</p>
</div>
</div>
</footer>

    </>
  );
}