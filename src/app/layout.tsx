import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

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
    >
      <body className="min-h-full flex flex-col bg-bg-primary text-text-primary selection:bg-accent-light selection:text-accent-hover font-sans overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
