import Link from "next/link";
import { ArrowRight, Code2, FolderOpen, ShieldCheck } from "lucide-react";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";

const PROJECTS = [
  {
    title: "FinTech Analytics Engine",
    description: "Real-time market data pipeline with React dashboards and streaming APIs.",
    tags: ["React", "Kafka", "Node.js"],
  },
  {
    title: "Automated Deployment Tool",
    description: "CLI workflow for Kubernetes releases with validation and rollback checkpoints.",
    tags: ["Go", "Kubernetes", "CI/CD"],
  },
];

export default function StudentProjectsPage() {
  return (
    <main className="mx-auto w-full max-w-[1000px] px-4 py-8 md:px-8">
      <Breadcrumbs
        backHref="/dashboard/student"
        items={[
          { label: "Student Dashboard", href: "/dashboard/student" },
          { label: "Projects / Portfolio" },
        ]}
      />
      <section className="mb-6 rounded-[18px] border border-[var(--color-border)] bg-white p-6 shadow-sm">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[var(--color-accent-light)] px-3 py-1 text-[11px] font-bold text-[var(--color-accent)]">
          <FolderOpen className="h-3.5 w-3.5" />
          Verified portfolio
        </div>
        <h1 className="text-[30px] font-bold text-[var(--color-text-primary)]">Projects / Portfolio</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[var(--color-text-secondary)]">
          Project evidence gives recruiters context beyond scores. These demo projects are shown on your recruiter-facing profile.
        </p>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        {PROJECTS.map((project) => (
          <article key={project.title} className="rounded-[16px] border border-[var(--color-border)] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[var(--color-accent-light)] text-[var(--color-accent)]">
                <Code2 className="h-5 w-5" />
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                <ShieldCheck className="h-3.5 w-3.5" />
                Verified
              </span>
            </div>
            <h2 className="mt-5 text-[20px] font-bold text-[var(--color-text-primary)]">{project.title}</h2>
            <p className="mt-2 text-[14px] leading-6 text-[var(--color-text-secondary)]">{project.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {project.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-[var(--color-bg-secondary)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-secondary)]">
                  {tag}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>

      <Link href="/dashboard/student/results" className="mt-6 inline-flex items-center gap-2 rounded-[10px] bg-[var(--color-accent)] px-4 py-3 text-[13px] font-bold text-white">
        See how projects support your AI report
        <ArrowRight className="h-4 w-4" />
      </Link>
    </main>
  );
}
