import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { SOFT_BTN } from "@/lib/soft-btn";
import { SOFT_SURFACE } from "@/lib/soft-surface";
import { cn } from "@/lib/utils";

export function PanelLink({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) {
  return (
    <Button
      asChild
      variant="outline"
      size="sm"
      className={cn("h-8 text-xs", SOFT_BTN)}
    >
      <Link to={to as never}>{children}</Link>
    </Button>
  );
}

export function PagePanel({
  title,
  description,
  action,
  children,
  className,
  guia,
  inset = "plain",
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  guia?: string;
  inset?: "plain" | "muted";
}) {
  return (
    <section
      data-guia={guia}
      className={cn(SOFT_SURFACE, className)}
    >
      {title ? (
        <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-1 sm:px-5">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              {title}
            </h2>
            {description ? (
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <div
        className={cn(
          title ? "p-3 sm:p-4" : "p-0",
          inset === "muted" && "bg-muted/30",
        )}
      >
        {children}
      </div>
    </section>
  );
}
