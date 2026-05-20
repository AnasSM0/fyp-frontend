import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DemoProvider } from "@/components/providers/demo-provider";
import { DemoControl } from "@/components/providers/demo-control";
import { PageTransition } from "@/components/ui/page-transition";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ProviderSwitcher } from "@/components/dev/provider-switcher";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "XLR8Hire - AI-Powered Reverse Hiring",
  description: "AI-powered skill verification and reverse hiring for the next generation of talent.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased light scroll-smooth`}
      suppressHydrationWarning
    >
      <body 
        className="min-h-full flex flex-col bg-bg-primary text-text-primary selection:bg-accent-light selection:text-accent-hover font-sans overflow-x-hidden"
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <DemoProvider>
            <PageTransition>
              {children}
            </PageTransition>
            <DemoControl />
            <ProviderSwitcher />
          </DemoProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
