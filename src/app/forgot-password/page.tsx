import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg-primary)] px-6 text-[var(--color-text-primary)]">
      <div className="w-full max-w-md rounded-[16px] border border-[var(--color-border)] bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight">Reset password</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
          Password reset is not connected in the demo. Use the candidate or recruiter role toggle on login to enter the marketplace.
        </p>
        <Link href="/login" className="mt-8 flex h-11 items-center justify-center rounded-[8px] bg-[var(--color-accent)] text-sm font-bold text-white">
          Back to login
        </Link>
      </div>
    </main>
  );
}
