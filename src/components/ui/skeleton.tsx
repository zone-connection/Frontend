import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-[#E7F4FA] dark:bg-white/10",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[skeleton-shimmer_1.4s_ease-in-out_infinite] before:bg-linear-to-r before:from-transparent before:via-white/80 before:to-transparent dark:before:via-white/10",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
