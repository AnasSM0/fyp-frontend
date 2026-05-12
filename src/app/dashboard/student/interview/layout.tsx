import { ReactNode } from "react";

// Full-screen layout — no sidebar, no shared topbar
export default function InterviewLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#fcf8ff]">
      {children}
    </div>
  );
}
