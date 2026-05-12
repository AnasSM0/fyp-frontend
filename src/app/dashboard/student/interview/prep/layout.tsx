import { ReactNode } from "react";
export default function PrepLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[#09090E] text-white antialiased">{children}</div>;
}
