"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

type BrandLogoProps = {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  variant?: "default" | "white";
};

export function BrandLogo({ className, imageClassName, priority = false, variant }: BrandLogoProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDarkTheme = mounted && theme === "dark";
  const src = variant === "white" || (!variant && isDarkTheme) 
    ? "/hirdup-logo-white-text.png" 
    : "/hirdup-logo.png";

  return (
    <span className={cn("inline-flex items-center", className)} aria-label="HirdUp">
      <Image
        src={src}
        alt="HirdUp"
        width={1041}
        height={240}
        priority={priority}
        className={cn("h-8 w-auto object-contain", imageClassName)}
      />
    </span>
  );
}
