import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FormDialogShell({
  open,
  onOpenChange,
  icon,
  title,
  description,
  children,
  footer,
  className,
  contentClassName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          // !flex sobrescreve o `grid` padrão do DialogContent.
          // top fixo (sem translateY(-50%)): no Firefox o centro+max-height corta o modal sem scroll.
          "w-[calc(100vw-1.5rem)] max-w-xl sm:w-full p-0 gap-0",
          "!flex !flex-col overflow-hidden",
          "!top-[max(0.75rem,2dvh)] !translate-y-0",
          "max-h-[calc(100dvh-1.5rem)]",
          className,
        )}
      >
        <DialogHeader className="px-4 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-black/5 bg-muted/20 shrink-0">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              {icon}
            </div>
            <div className="space-y-1 pr-6 min-w-0">
              <DialogTitle className="text-base sm:text-lg tracking-tight">
                {title}
              </DialogTitle>
              {description ? (
                <DialogDescription>{description}</DialogDescription>
              ) : null}
            </div>
          </div>
        </DialogHeader>
        <div
          className={cn(
            // Área rolável do modal (funciona com <form> + FormDialogBody/Actions dentro).
            "min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y [scrollbar-gutter:stable] [scrollbar-width:thin]",
            contentClassName,
          )}
        >
          {children}
        </div>
        {footer}
      </DialogContent>
    </Dialog>
  );
}

export function FormSectionNav<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  const cols =
    items.length <= 2
      ? "grid-cols-2"
      : items.length === 3
        ? "grid-cols-2 sm:grid-cols-3"
        : items.length === 4
          ? "grid-cols-2 sm:grid-cols-4"
          : "grid-cols-2 sm:grid-cols-3";

  return (
    <div
      className={cn(
        "grid gap-2 rounded-xl border bg-muted/30 p-2",
        cols,
        className,
      )}
    >
      {items.map((section) => (
        <Button
          key={section.id}
          type="button"
          size="sm"
          variant={value === section.id ? "default" : "ghost"}
          onClick={() => onChange(section.id)}
        >
          {section.label}
        </Button>
      ))}
    </div>
  );
}

export function FormSection({
  icon,
  title,
  description,
  children,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border bg-card p-4 space-y-4 shadow-sm",
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        {icon ? (
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {icon}
          </span>
        ) : null}
        <div className="min-w-0 space-y-0.5">
          <div className="text-sm font-medium">{title}</div>
          {description ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export function FormDialogBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("px-4 sm:px-6 py-4 sm:py-5 space-y-5", className)}
    >
      {children}
    </div>
  );
}

export function FormDialogActions({
  children,
  hint,
  className,
}: {
  children: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <DialogFooter
      className={cn(
        "gap-2 px-4 sm:px-6 py-3 sm:py-4 border-t bg-muted/30 shrink-0",
        "flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:space-x-0",
        className,
      )}
    >
      {hint ? (
        <p className="hidden min-w-0 max-w-full text-xs text-muted-foreground sm:block">
          {hint}
        </p>
      ) : (
        <span className="hidden sm:block" />
      )}
      <div className="flex w-full min-w-0 max-w-full flex-col-reverse items-stretch gap-2 sm:flex-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end [&_button]:w-full sm:[&_button]:w-auto">
        {children}
      </div>
    </DialogFooter>
  );
}

export function DetailField({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium break-words">{value || "—"}</div>
    </div>
  );
}
