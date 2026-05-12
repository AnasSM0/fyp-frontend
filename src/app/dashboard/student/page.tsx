import Image from "next/image";
import Link from "next/link";

export default function StudentDashboard() {
  return (
    <>
      
{/*  SideNavBar  */}
<aside className="w-[240px] h-screen fixed left-0 top-0 bg-bg-secondary dark:bg-inverse-surface border-r border-border-default z-50">
<div className="flex flex-col p-6 gap-y-2 h-full">
<div className="mb-section flex items-center gap-base">
<div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-text-label text-text-label font-bold">X</div>
<div>
<h1 className="font-text-h2 text-text-h2 font-bold text-primary dark:text-primary-fixed">XLR8Hire</h1>
<p className="font-text-label text-text-label text-text-muted">Student Portal</p>
</div>
</div>
<nav className="flex flex-col gap-y-micro flex-1">
{/*  Active: Dashboard  */}
<Link className="flex items-center gap-base px-base py-small bg-accent-primary-light dark:bg-primary-container text-primary dark:text-on-primary-container font-bold rounded-lg scale-95 active:scale-90 transition-all duration-150 ease-in-out hover:translate-x-1" href="/dashboard/student">
<span className="material-symbols-outlined text-medium">dashboard</span>
<span className="font-text-body text-text-body font-medium">Dashboard</span>
</Link>
<Link className="flex items-center gap-base px-base py-small text-text-secondary dark:text-on-surface-variant hover:bg-bg-subtle dark:hover:bg-surface-variant rounded-lg scale-95 active:scale-90 transition-all duration-150 ease-in-out hover:translate-x-1" href="#">
<span className="material-symbols-outlined text-medium">assignment</span>
<span className="font-text-body text-text-body font-medium">Assessments</span>
</Link>
<Link className="flex items-center gap-base px-base py-small text-text-secondary dark:text-on-surface-variant hover:bg-bg-subtle dark:hover:bg-surface-variant rounded-lg scale-95 active:scale-90 transition-all duration-150 ease-in-out hover:translate-x-1" href="#">
<span className="material-symbols-outlined text-medium">leaderboard</span>
<span className="font-text-body text-text-body font-medium">Rankings</span>
</Link>
<Link className="flex items-center gap-base px-base py-small text-text-secondary dark:text-on-surface-variant hover:bg-bg-subtle dark:hover:bg-surface-variant rounded-lg scale-95 active:scale-90 transition-all duration-150 ease-in-out hover:translate-x-1" href="#">
<span className="material-symbols-outlined text-medium">folder_open</span>
<span className="font-text-body text-text-body font-medium">Projects</span>
</Link>
<Link className="flex items-center gap-base px-base py-small text-text-secondary dark:text-on-surface-variant hover:bg-bg-subtle dark:hover:bg-surface-variant rounded-lg scale-95 active:scale-90 transition-all duration-150 ease-in-out hover:translate-x-1" href="#">
<span className="material-symbols-outlined text-medium">work_outline</span>
<span className="font-text-body text-text-body font-medium">Offers</span>
</Link>
<Link className="flex items-center gap-base px-base py-small text-text-secondary dark:text-on-surface-variant hover:bg-bg-subtle dark:hover:bg-surface-variant rounded-lg scale-95 active:scale-90 transition-all duration-150 ease-in-out hover:translate-x-1" href="#">
<span className="material-symbols-outlined text-medium">chat_bubble</span>
<span className="font-text-body text-text-body font-medium">Messages</span>
</Link>
</nav>
<div className="mt-auto pt-section border-t border-border-default">
<div className="flex items-center gap-base px-base">
<img alt="Student Profile" className="w-8 h-8 rounded-full" data-alt="A professional headshot of a young student against a clean, bright minimalist background. The lighting is soft and natural, conveying a calm and competent corporate aesthetic. High resolution and modern style." src="https://lh3.googleusercontent.com/aida-public/AB6AXuB3Pq8zjb2UXwGOn_bbGfGu_FiEdwHH9ysLC6c4lmta50cpnvNDASKbRkLKvdscfqVKiLI7Q4PvYAREHO_9Krwoq79lKs0qbSFzFZByxF6wA73rW53ORpWAARAQqmpErfoeGSbdb-DSG6JxvwYKZCR5_xzJpjXSDgPiRdyu5JSgdpwJ-ESgJMrGU6s9aCOg37oG62jaHu4rZeNcVnoyL-2BFg86xDC_IllrALUlAfB0ylQGO2AFfKhh_0J7kBD5KcRrUsoGXdVCa9Ck"/>
<div className="flex flex-col">
<span className="font-text-label text-text-label text-text-primary">Alex Chen</span>
<span className="font-text-label text-[11px] text-text-muted">alex@university.edu</span>
</div>
</div>
</div>
</div>
</aside>
{/*  TopNavBar & Main Content Wrapper  */}
<div className="flex-1 ml-[240px] flex flex-col h-screen relative">
{/*  TopNavBar  */}
<header className="h-16 fixed top-0 right-0 left-[240px] z-40 bg-surface-container-lowest dark:bg-on-surface border-b border-border-default dark:border-outline-variant flex items-center justify-between px-8">
<div className="flex items-center w-64 bg-bg-subtle rounded-full px-4 py-2 border border-transparent focus-within:border-accent-primary-border focus-within:bg-surface-container-lowest transition-colors">
<span className="material-symbols-outlined text-text-muted text-[18px]">search</span>
<input className="bg-transparent border-none focus:ring-0 font-text-label text-text-label text-text-primary w-full ml-2 outline-none" placeholder="Search..." type="text"/>
</div>
<div className="flex items-center gap-comfortable">
<button className="text-text-secondary dark:text-on-surface-variant hover:text-primary dark:hover:text-primary-fixed transition-colors cursor-pointer active:opacity-70">
<span className="material-symbols-outlined text-medium">notifications</span>
</button>
<button className="text-text-secondary dark:text-on-surface-variant hover:text-primary dark:hover:text-primary-fixed transition-colors cursor-pointer active:opacity-70">
<span className="material-symbols-outlined text-medium">settings</span>
</button>
</div>
</header>
{/*  Main Content Canvas  */}
<main className="mt-16 flex-1 overflow-y-auto w-full max-w-[1200px] mx-auto px-12 py-page-xl">
{/*  Hero Header  */}
<div className="flex flex-col md:flex-row md:items-end justify-between border-b border-border-default pb-comfortable mb-page gap-comfortable">
<div className="max-w-2xl">
<h2 className="font-text-h3 text-text-h3 text-text-muted mb-micro">Welcome back,</h2>
<h1 className="font-text-display text-text-display text-text-primary">Your talent profile is <span className="text-primary">thriving</span>.</h1>
</div>
<div className="flex flex-col items-end">
<span className="font-text-label text-text-label text-text-muted uppercase tracking-wider mb-1">XLR8 Score</span>
<div className="font-text-hero text-text-hero font-text-mono text-primary leading-none">842</div>
</div>
</div>
{/*  Borderless Grid Content  */}
<div className="grid grid-cols-1 md:grid-cols-12 gap-x-relaxed gap-y-page">
{/*  Skill Matrix  */}
<section className="col-span-1 md:col-span-4">
<div className="flex items-center justify-between mb-comfortable">
<h3 className="font-text-label text-text-label text-text-secondary uppercase tracking-widest">Skill Matrix</h3>
<span className="material-symbols-outlined text-text-muted text-[16px]">tune</span>
</div>
<div className="flex flex-col gap-y-comfortable">
<div>
<div className="flex justify-between font-text-label text-text-label mb-2">
<span className="text-text-primary">System Architecture</span>
<span className="font-text-mono text-text-muted">92%</span>
</div>
<div className="w-full h-[2px] bg-bg-subtle rounded-full overflow-hidden">
<div className="w-[92%] h-full bg-primary rounded-full"></div>
</div>
</div>
<div>
<div className="flex justify-between font-text-label text-text-label mb-2">
<span className="text-text-primary">React &amp; Ecosystem</span>
<span className="font-text-mono text-text-muted">88%</span>
</div>
<div className="w-full h-[2px] bg-bg-subtle rounded-full overflow-hidden">
<div className="w-[88%] h-full bg-primary rounded-full"></div>
</div>
</div>
<div>
<div className="flex justify-between font-text-label text-text-label mb-2">
<span className="text-text-primary">Algorithmic Problem Solving</span>
<span className="font-text-mono text-text-muted">75%</span>
</div>
<div className="w-full h-[2px] bg-bg-subtle rounded-full overflow-hidden">
<div className="w-[75%] h-full bg-status-warning rounded-full"></div>
</div>
</div>
<div>
<div className="flex justify-between font-text-label text-text-label mb-2">
<span className="text-text-primary">Database Design</span>
<span className="font-text-mono text-text-muted">81%</span>
</div>
<div className="w-full h-[2px] bg-bg-subtle rounded-full overflow-hidden">
<div className="w-[81%] h-full bg-primary rounded-full"></div>
</div>
</div>
</div>
</section>
{/*  Upcoming Interviews (Timeline)  */}
<section className="col-span-1 md:col-span-4">
<div className="flex items-center justify-between mb-comfortable">
<h3 className="font-text-label text-text-label text-text-secondary uppercase tracking-widest">Upcoming</h3>
<span className="material-symbols-outlined text-text-muted text-[16px]">event</span>
</div>
<div className="border-l border-border-default pl-comfortable ml-2 flex flex-col gap-y-section relative">
<div className="relative">
<div className="absolute w-2 h-2 bg-primary rounded-full -left-[29px] top-1.5 ring-4 ring-surface-container-lowest"></div>
<p className="font-text-label text-text-label text-text-muted mb-1">Tomorrow, 10:00 AM</p>
<h4 className="font-text-body text-text-body font-medium text-text-primary">Technical Screen: Acme Corp</h4>
<p className="font-text-label text-text-label text-text-secondary mt-1">Systems Design &amp; Scaling</p>
</div>
<div className="relative">
<div className="absolute w-2 h-2 bg-border-default rounded-full -left-[29px] top-1.5 ring-4 ring-surface-container-lowest"></div>
<p className="font-text-label text-text-label text-text-muted mb-1">Oct 24, 2:30 PM</p>
<h4 className="font-text-body text-text-body font-medium text-text-primary">Final Round: Globex</h4>
<p className="font-text-label text-text-label text-text-secondary mt-1">Cultural Fit &amp; Leadership</p>
</div>
<div className="relative">
<div className="absolute w-2 h-2 bg-border-default rounded-full -left-[29px] top-1.5 ring-4 ring-surface-container-lowest"></div>
<p className="font-text-label text-text-label text-text-muted mb-1">Oct 28, 11:00 AM</p>
<h4 className="font-text-body text-text-body font-medium text-text-primary">Assessment Review</h4>
<p className="font-text-label text-text-label text-text-secondary mt-1">Algorithms Module 4</p>
</div>
</div>
</section>
{/*  Verified Ranking Progress  */}
<section className="col-span-1 md:col-span-4">
<div className="flex items-center justify-between mb-comfortable">
<h3 className="font-text-label text-text-label text-text-secondary uppercase tracking-widest">Ranking Trajectory</h3>
<span className="material-symbols-outlined text-text-muted text-[16px]">trending_up</span>
</div>
<div className="flex flex-col gap-y-small">
<div className="flex items-baseline gap-base">
<span className="font-text-h2 text-text-h2 text-text-primary">Top 8%</span>
<span className="font-text-label text-text-label text-status-success flex items-center gap-micro">
<span className="material-symbols-outlined text-[14px]">arrow_upward</span> 2.4%
              </span>
</div>
<p className="font-text-label text-text-label text-text-muted mb-comfortable">Of global applicants in Software Engineering.</p>
{/*  Abstract Sparkline Representation using CSS grid and heights  */}
<div className="h-24 w-full flex items-end gap-1 px-2 border-b border-border-default pb-1">
<div className="w-full bg-surface-variant rounded-t-sm h-[30%]"></div>
<div className="w-full bg-surface-variant rounded-t-sm h-[35%]"></div>
<div className="w-full bg-surface-variant rounded-t-sm h-[40%]"></div>
<div className="w-full bg-surface-variant rounded-t-sm h-[38%]"></div>
<div className="w-full bg-surface-variant rounded-t-sm h-[45%]"></div>
<div className="w-full bg-surface-variant rounded-t-sm h-[60%]"></div>
<div className="w-full bg-surface-variant rounded-t-sm h-[65%]"></div>
<div className="w-full bg-surface-variant rounded-t-sm h-[80%]"></div>
<div className="w-full bg-primary rounded-t-sm h-[95%]"></div>
</div>
<div className="flex justify-between mt-2 font-text-label text-[10px] text-text-muted uppercase tracking-widest">
<span>Jul</span>
<span>Aug</span>
<span>Sep</span>
<span>Oct</span>
</div>
</div>
</section>
{/*  Offer Cards (Empty State)  */}
<section className="col-span-1 md:col-span-12 pt-page border-t border-border-soft">
<div className="flex items-center justify-between mb-comfortable">
<h3 className="font-text-label text-text-label text-text-secondary uppercase tracking-widest">Active Offers</h3>
<span className="material-symbols-outlined text-text-muted text-[16px]">work</span>
</div>
<div className="w-full flex flex-col items-center justify-center py-page px-default border border-dashed border-border-default rounded-xl bg-bg-secondary">
<div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center mb-base">
<span className="material-symbols-outlined text-text-muted">inbox</span>
</div>
<h4 className="font-text-body text-text-body font-medium text-text-primary mb-1">No offers yet</h4>
<p className="font-text-label text-text-label text-text-muted text-center max-w-sm">Companies will reach out after ranking.</p>
</div>
</section>
</div>
</main>
</div>

    </>
  );
}