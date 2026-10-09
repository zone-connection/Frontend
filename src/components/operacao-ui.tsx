import { type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { NovoBadge } from "@/components/novo-badge";
import { isNavPathNovo } from "@/lib/novidades";
import { cn } from "@/lib/utils";

const NAV_SHELL =
  "mb-5 shrink-0 overflow-x-auto overflow-y-hidden rounded-xl border border-[#E2E8EC] bg-white p-1";

export function SlidingNav({
  className,
  children,
}: {
  activeKey?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <nav className={NAV_SHELL}>
      <div className={cn("relative flex min-w-max gap-0.5", className)}>
        {children}
      </div>
    </nav>
  );
}

export const navItemClass = (active: boolean) =>
  cn(
    "relative z-10 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors duration-500 ease-out motion-reduce:transition-none",
    active
      ? "bg-[#079ED4] text-white"
      : "text-[#5C6B76] hover:bg-[#F3FAFD] hover:text-[#0B3148]",
  );

export function ModulePageTransition({
  pathname,
  children,
}: {
  pathname: string;
  children: React.ReactNode;
}) {
  return (
    <div
      key={pathname}
      className="module-page-in flex min-h-0 flex-1 flex-col"
    >
      {children}
    </div>
  );
}

export function OperationSubnav({
  items,
  pathname,
}: {
  items: Array<{ to: string; label: string; icon?: LucideIcon }>;
  pathname: string;
}) {
  const depth = pathname.split("/").filter(Boolean).length;
  if (depth > 2) return null;

  return (
    <SlidingNav activeKey={pathname}>
        {items.map((tab) => {
          const active =
            pathname === tab.to || pathname.startsWith(`${tab.to}/`);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.to}
              to={tab.to}
              preload={false}
              data-nav-active={active ? "true" : undefined}
              className={navItemClass(active)}
            >
              {Icon ? <Icon className="size-3.5 shrink-0" /> : null}
              {tab.label}
              {isNavPathNovo(tab.to) ? (
                <NovoBadge
                  compact
                  className={
                    active
                      ? "bg-white/20 text-white"
                      : "bg-[#E7F4FA] text-[#0B3148]"
                  }
                />
              ) : null}
            </Link>
          );
        })}
    </SlidingNav>
  );
}

export function PillTabs({
  items,
  value,
  onChange,
}: {
  items: Array<{ id: string; label: string; novo?: boolean }>;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <SlidingNav activeKey={value} className="flex-wrap">
      {items.map((item) => {
        const active = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            data-nav-active={active ? "true" : undefined}
            onClick={() => onChange(item.id)}
            className={navItemClass(active)}
          >
            {item.label}
            {item.novo ? (
              <NovoBadge
                compact
                className={active ? "bg-white/20 text-white" : "bg-[#E7F4FA] text-[#0B3148]"}
              />
            ) : null}
          </button>
        );
      })}
    </SlidingNav>
  );
}

export function TableFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 overflow-hidden rounded-2xl border border-black/5 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_20px_rgba(15,23,42,0.05)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StatusChip({
  tone = "muted",
  children,
}: {
  tone?: "emerald" | "orange" | "blue" | "violet" | "muted" | "teal";
  children: React.ReactNode;
}) {
  const tones = {
    emerald:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    orange:
      "border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300",
    blue: "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300",
    violet:
      "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    teal: "border-teal-500/20 bg-teal-500/10 text-teal-700 dark:text-teal-300",
    muted: "border-border bg-muted text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function OperationSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function FunnelStageList({
  rows,
}: {
  rows: Array<{
    id: string;
    label: string;
    total: number;
    color?: string | null;
  }>;
}) {
  const max = Math.max(...rows.map((r) => r.total), 1);
  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.id} className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium">{row.label}</span>
            <span className="tabular-nums text-muted-foreground">{row.total}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width: `${Math.max(6, (row.total / max) * 100)}%`,
                backgroundColor: row.color || undefined,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function vendaStatusTone(
  status: string,
): "emerald" | "orange" | "blue" | "muted" {
  if (status === "disponivel") return "emerald";
  if (status === "reservado") return "orange";
  if (status === "vendido") return "blue";
  return "muted";
}

export function situacaoTone(
  situacao: string,
): "emerald" | "orange" | "blue" | "violet" | "teal" | "muted" {
  if (situacao === "disponivel") return "emerald";
  if (situacao === "negociacao") return "orange";
  if (situacao === "vendido") return "blue";
  if (situacao === "captacao") return "teal";
  if (situacao === "indisponivel") return "muted";
  return "violet";
}
