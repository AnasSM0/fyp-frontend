import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  imageClassName?: string;
  priority?: boolean;
};

export function BrandLogo({ className, imageClassName, priority = false }: BrandLogoProps) {
  return (
    <span className={cn("inline-flex items-center", className)} aria-label="HirdUp">
      <Image
        src="/hirdup-logo.png"
        alt="HirdUp"
        width={1041}
        height={240}
        priority={priority}
        className={cn("h-8 w-auto object-contain", imageClassName)}
      />
    </span>
  );
}
