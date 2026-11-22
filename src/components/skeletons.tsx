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

function SkeletonPageHeader({
  withTabs = false,
  tabs = 0,
}: {
  withTabs?: boolean;
  tabs?: number;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:mb-6 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-56 max-w-full" />
        <Skeleton className="h-4 w-full max-w-md" />
        {withTabs ? (
          <div className="flex flex-wrap gap-2 pt-2">
            {Array.from({ length: tabs }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-24 rounded-full" />
            ))}
          </div>
        ) : null}
      </div>
      <Skeleton className="h-9 w-24 rounded-full" />
    </div>
  );
}

function SkeletonPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(SOFT_SURFACE, "p-4 sm:p-5", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
      {children}
    </div>
  );
}

function SkeletonDashboardPage() {
  return (
    <Block className="space-y-5">
      <SkeletonPageHeader withTabs tabs={4} />
      <SkeletonPanel>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      </SkeletonPanel>
      <SkeletonPanel>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      </SkeletonPanel>
      <SkeletonPanel>
        <Skeleton className="h-36 w-full rounded-xl" />
      </SkeletonPanel>
    </Block>
  );
}

function SkeletonTablePage() {
  return (
    <Block className="space-y-4">
      <SkeletonPageHeader />
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 min-w-48 flex-1 rounded-xl" />
        <Skeleton className="h-9 w-32 rounded-xl" />
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>
      <div className={cn(SOFT_SURFACE, "p-3")}>
        <div className="mb-3 grid grid-cols-5 gap-3 px-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-3 w-16" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-11 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </Block>
  );
}

function SkeletonKanbanPage() {
  return (
    <Block className="space-y-4">
      <SkeletonPageHeader />
      <SkeletonKanban />
    </Block>
  );
}

function SkeletonCardsPage() {
  return (
    <Block className="space-y-4">
      <SkeletonPageHeader />
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 min-w-48 flex-1 rounded-xl" />
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>
      <SkeletonPropertyCards />
    </Block>
  );
}

function SkeletonFinancePage() {
  return (
    <Block className="space-y-5">
      <SkeletonPageHeader />
      <SkeletonKpiGrid count={4} />
      <div className="grid gap-4 lg:grid-cols-5">
        <SkeletonChart className="lg:col-span-3" />
        <SkeletonList rows={5} />
      </div>
    </Block>
  );
}

function SkeletonFormPage() {
  return (
    <Block className="space-y-5">
      <SkeletonPageHeader />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className={cn(SOFT_SURFACE, "space-y-4 p-5 lg:col-span-2")}>
          <SkeletonForm fields={5} />
        </div>
        <div className={cn(SOFT_SURFACE, "space-y-3 p-5")}>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-9 w-full rounded-full" />
        </div>
      </div>
    </Block>
  );
}

function SkeletonChatPage() {
  return (
    <Block className="grid min-h-[70vh] gap-3 lg:grid-cols-[280px_1fr]">
      <div className={cn(SOFT_SURFACE, "space-y-2 p-3")}>
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-full rounded-xl" />
        ))}
      </div>
      <div className={cn(SOFT_SURFACE, "flex flex-col p-4")}>
        <Skeleton className="h-10 w-48" />
        <div className="mt-4 flex-1 space-y-3">
          <Skeleton className="h-12 w-2/3 rounded-2xl" />
          <Skeleton className="ml-auto h-12 w-1/2 rounded-2xl" />
          <Skeleton className="h-12 w-3/5 rounded-2xl" />
        </div>
        <Skeleton className="mt-4 h-11 w-full rounded-full" />
      </div>
    </Block>
  );
}

function SkeletonCalendarPage() {
  return (
    <Block className="space-y-4">
      <SkeletonPageHeader withTabs tabs={3} />
      <div className={cn(SOFT_SURFACE, "grid grid-cols-7 gap-2 p-3")}>
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton key={index} className="h-4 w-full" />
        ))}
        {Array.from({ length: 28 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </Block>
  );
}

function SkeletonDetailPage() {
  return (
    <Block className="space-y-4">
      <SkeletonPageHeader />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className={cn(SOFT_SURFACE, "space-y-3 p-5")}>
          <Skeleton className="mx-auto size-16 rounded-full" />
          <Skeleton className="mx-auto h-5 w-32" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
        <div className={cn(SOFT_SURFACE, "space-y-3 p-5 lg:col-span-2")}>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    </Block>
  );
}

const KNOWN_SECTIONS = new Set([
  "visao-geral",
  "funil",
  "pos-venda",
  "estoque",
  "propostas",
  "interessados",
  "vendas",
  "proprietarios",
  "oportunidades",
  "captacoes",
  "fila",
  "imoveis",
  "contas-a-receber",
  "comissao",
  "movimentacao",
  "gestao-nf",
  "funcionarios",
  "fluxo-caixa",
  "clientes-fornecedores",
]);

function isDetailPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 2) return false;
  const last = parts[parts.length - 1] ?? "";
  if (KNOWN_SECTIONS.has(last)) return false;
  return parts.length >= 3 || /[0-9]/.test(last) || last.length > 16;
}

export function RoutePendingSkeleton({ pathname }: { pathname: string }) {
  if (
    pathname === "/login" ||
    pathname === "/portal/login" ||
    pathname === "/parceiros/login"
  ) {
    return <LoginPageSkeleton />;
  }

  if (
    pathname === "/dashboard" ||
    pathname.endsWith("/visao-geral") ||
    pathname === "/resultado" ||
    pathname === "/taxa-conversao"
  ) {
    return <SkeletonDashboardPage />;
  }

  if (
    pathname.includes("/funil") ||
    pathname.endsWith("/pos-venda") ||
    pathname === "/triagem"
  ) {
    return <SkeletonKanbanPage />;
  }

  if (pathname.startsWith("/imoveis") && !pathname.startsWith("/imoveis-usados")) {
    return <SkeletonCardsPage />;
  }

  if (pathname.startsWith("/whatsapp") || pathname.startsWith("/portal/mensagens")) {
    return <SkeletonChatPage />;
  }

  if (
    pathname.startsWith("/agenda") ||
    pathname.startsWith("/lembretes") ||
    pathname.startsWith("/presenca")
  ) {
    return <SkeletonCalendarPage />;
  }

  if (
    pathname.startsWith("/configuracoes") ||
    pathname.startsWith("/perfil") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/permissoes")
  ) {
    return <SkeletonFormPage />;
  }

  if (pathname.startsWith("/financeiro")) {
    return <SkeletonFinancePage />;
  }

  if (isDetailPath(pathname)) {
    return <SkeletonDetailPage />;
  }

  return <SkeletonTablePage />;
}

export function PagePendingSkeleton() {
  return <SkeletonTablePage />;
}

/** Espelha o cartão da tela de login (logo, campos, captcha, botão e atalhos). */
export function LoginPageSkeleton() {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-10"
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={{
        background:
          "radial-gradient(circle at 18% 12%, #0b7088 0%, #053647 42%, #021923 100%)",
      }}
    >
      <span className="sr-only">Carregando login</span>
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-[#E2E8EC] bg-white p-6 shadow-[0_24px_60px_-28px_rgba(5,54,71,0.45)] sm:p-8">
        <div className="mb-6 flex items-center gap-4">
          <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
        <Skeleton className="h-7 w-56" />
        <Skeleton className="mt-2 h-4 w-full max-w-xs" />

        <div className="mt-6 space-y-5">
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-14" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-12" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
          <Skeleton className="h-[65px] w-full rounded-md" />
          <div className="flex items-center gap-2">
            <Skeleton className="size-4 shrink-0 rounded" />
            <Skeleton className="h-3.5 w-56" />
          </div>
          <Skeleton className="h-11 w-full rounded-full" />
        </div>

        <div className="mt-6 divide-y divide-[#E6EDF2] overflow-hidden rounded-2xl border border-[#E2E8EC] bg-[#F8FBFC]">
          <div className="px-4 py-3.5">
            <Skeleton className="h-3.5 w-52" />
          </div>
          <div className="px-4 py-3.5">
            <Skeleton className="h-3.5 w-44" />
          </div>
          <div className="px-4 py-3.5">
            <Skeleton className="h-3.5 w-56" />
          </div>
        </div>
      </div>
    </div>
  );
}
