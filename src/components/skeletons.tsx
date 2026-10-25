import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";
import { SOFT_SURFACE } from "@/lib/soft-surface";
import { cn } from "@/lib/utils";

function Block({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Carregando conteúdo</span>
      {children}
    </div>
  );
}

export function SkeletonKpiGrid({ count = 4 }: { count?: number }) {
  return (
    <Block className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={cn(SOFT_SURFACE, "p-4")}>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-7 w-20" />
          <Skeleton className="mt-3 h-2.5 w-16" />
        </div>
      ))}
    </Block>
  );
}

export function SkeletonChart({ className }: { className?: string }) {
  return (
    <Block className={cn(SOFT_SURFACE, "p-4", className)}>
      <Skeleton className="h-4 w-36" />
      <Skeleton className="mt-4 h-40 w-full rounded-xl" />
    </Block>
  );
}

export function SkeletonList({ rows = 6 }: { rows?: number }) {
  return (
    <Block className={cn(SOFT_SURFACE, "divide-y")}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </Block>
  );
}

export function SkeletonPropertyCards({ count = 6 }: { count?: number }) {
  return (
    <Block className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={cn(SOFT_SURFACE)}>
          <Skeleton className="h-36 w-full rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </Block>
  );
}

export function SkeletonForm({ fields = 6 }: { fields?: number }) {
  return (
    <Block className="space-y-4">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
      <div className="flex justify-end gap-2 pt-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-28" />
      </div>
    </Block>
  );
}

export function SkeletonTableRows({
  rows = 8,
  cols = 6,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, row) => (
        <TableRow key={row} className="hover:bg-transparent">
          {Array.from({ length: cols }).map((_, col) => (
            <TableCell key={col}>
              <Skeleton className="h-3.5 w-[min(100%,9rem)]" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export function SkeletonKanban({ columns = 5 }: { columns?: number }) {
  return (
    <Block className="flex gap-3 overflow-hidden pb-4">
      {Array.from({ length: columns }).map((_, index) => (
        <div
          key={index}
          className="w-[272px] shrink-0 rounded-2xl border border-black/5 bg-muted/20 p-3"
        >
          <div className="mb-3 flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-8" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-[72px] w-full rounded-xl" />
            <Skeleton className="h-[72px] w-full rounded-xl" />
            <Skeleton className="h-[56px] w-full rounded-xl" />
          </div>
        </div>
      ))}
    </Block>
  );
}

export function SkeletonDashboard() {
  return (
    <Block className="space-y-5">
      <SkeletonKpiGrid count={4} />
      <div className="grid gap-4 lg:grid-cols-5">
        <SkeletonChart className="lg:col-span-3" />
        <SkeletonList rows={5} />
      </div>
    </Block>
  );
}

export function PagePendingSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <Skeleton className="mb-6 h-7 w-48" />
      <SkeletonDashboard />
    </div>
  );
}
