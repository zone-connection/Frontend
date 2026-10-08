import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FlowTrack } from "@/components/flow-bar";
import { FormFieldIconContext } from "@/lib/form-field-icons";
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
  closeOnOutsideClick = true,
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
  closeOnOutsideClick?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="!top-14 !bottom-0 !left-0 !right-0 md:!left-[var(--app-sidebar,15rem)] bg-background"
        className={cn(
          "!left-0 !right-0 !top-14 !bottom-0 !h-auto !max-h-none !w-auto !max-w-none !translate-x-0 !translate-y-0",
          "md:!left-[var(--app-sidebar,15rem)]",
          "!flex !flex-col overflow-hidden rounded-none border-0 bg-background p-0 shadow-none",
          className,
        )}
        onPointerDownOutside={
          closeOnOutsideClick ? undefined : (event) => event.preventDefault()
        }
        onInteractOutside={
          closeOnOutsideClick ? undefined : (event) => event.preventDefault()
        }
      >
        <DialogHeader className="shrink-0 border-b border-primary/10 bg-gradient-to-r from-primary/10 via-sky-50/40 to-card px-4 pb-4 pt-5 sm:px-6 sm:pt-6">
          <div className="flex items-start gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-white text-primary shadow-sm">
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
  showProgress = false,
}: {
  items: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
  showProgress?: boolean;
}) {
  const index = Math.max(0, items.findIndex((item) => item.id === value));
  const pct = items.length ? Math.round(((index + 1) / items.length) * 100) : 0;
  const cols =
    items.length <= 3 ? "grid-cols-3" : items.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3";

  return (
    <div className={cn("space-y-3", className)}>
      {showProgress ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{index + 1} de {items.length} seções</span>
            <span>{pct}% concluído</span>
          </div>
          <FlowTrack percent={pct} tone={pct >= 100 ? "emerald" : pct >= 70 ? "sky" : "navy"} />
        </div>
      ) : null}
      <div className={cn("grid gap-1 rounded-2xl border bg-card p-1", cols)}>
        {items.map((section) => {
          const active = value === section.id;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onChange(section.id)}
              className={cn(
                "rounded-xl px-2 py-2.5 text-sm transition",
                active
                  ? "bg-primary/10 font-medium text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-primary/10 hover:text-primary",
              )}
            >
              {section.label}
            </button>
          );
        })}
      </div>
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
        "space-y-4 rounded-2xl border border-primary/10 bg-gradient-to-br from-card to-primary/[0.04] p-5 shadow-sm transition duration-200 hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        {icon ? (
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-white text-primary">
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
    <FormFieldIconContext.Provider value={true}>
    <div
      className={cn("px-4 sm:px-6 py-4 sm:py-5 space-y-5", className)}
    >
      {children}
    </div>
    </FormFieldIconContext.Provider>
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
        "shrink-0 gap-2 border-t border-primary/10 bg-gradient-to-r from-card to-primary/[0.04] px-4 py-3 sm:px-6 sm:py-4",
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
