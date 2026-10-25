import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-[#E7F4FA] dark:bg-white/10",
        "before:pointer-events-none before:absolute before:inset-0 before:-translate-x-full before:animate-[skeleton-shimmer_1.4s_ease-in-out_infinite] before:bg-linear-to-r before:from-transparent before:via-white/80 before:to-transparent dark:before:via-white/10",
        "motion-reduce:before:animate-none",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
