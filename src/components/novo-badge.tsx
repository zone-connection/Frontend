import { cn } from "@/lib/utils";

export function NovoBadge({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full bg-emerald-400 font-bold uppercase tracking-wide text-emerald-950",
        compact ? "h-4 px-1.5 text-[8px]" : "h-5 px-1.5 text-[9px]",
        className,
      )}
    >
      Novo
    </span>
  );
}
