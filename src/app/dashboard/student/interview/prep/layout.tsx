import { ReactNode } from "react";
export default function PrepLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-[calc(100dvh-4rem)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] antialiased">{children}</div>;
}
