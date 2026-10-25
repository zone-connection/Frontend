import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function InlineSpinner({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-sm text-muted-foreground",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" />
      {label ? (
        <span>{label}</span>
      ) : (
        <span className="sr-only">Carregando</span>
      )}
    </span>
  );
}
