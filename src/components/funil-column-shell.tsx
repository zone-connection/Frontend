import type { HTMLAttributes, ReactNode } from "react";
import {
  BadgeCheck,
  FileText,
  Handshake,
  Home,
  Layers,
  Phone,
  SearchCheck,
  TriangleAlert,
  UserPlus,
  UserX,
  type LucideIcon,
} from "lucide-react";
import {
  FUNNEL_COLUMN_BODY,
  funnelStageHeaderClass,
  funnelStageHeaderStyle,
} from "@/lib/catalog-colors";
import { cn } from "@/lib/utils";

function funnelStageIcon(title: string): LucideIcon {
  const t = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (
    t.includes("fora") ||
    t.includes("orfao") ||
    t.includes("anterior")
  ) {
    return TriangleAlert;
  }
  if (t.includes("perdid")) return UserX;
  if (
    t.includes("fech") ||
    t.includes("ganho") ||
    t.includes("contrato") ||
    t.includes("assin")
  ) {
    return Handshake;
  }
  if (t.includes("visita") || t.includes("imovel")) return Home;
  if (t.includes("proposta") || t.includes("negoci")) return FileText;
  if (t.includes("analis") || t.includes("document") || t.includes("parecer")) {
    return SearchCheck;
  }
  if (t.includes("qualific")) return BadgeCheck;
  if (t.includes("contato") || t.includes("ligac")) return Phone;
  if (t.includes("novo") || t.includes("lead") || t.includes("entrada")) {
    return UserPlus;
  }
  return Layers;
}

export function FunilColumnShell({
  title,
  count,
  total,
  color,
  orphan,
  active,
  children,
  className,
  ...rest
}: {
  title: string;
  count: number;
  total?: string;
  color?: string | null;
  orphan?: boolean;
  active?: boolean;
  children: ReactNode;
} & HTMLAttributes<HTMLDivElement>) {
  const Icon = funnelStageIcon(title);

  return (
    <div
      {...rest}
      className={cn(
        "flex w-[280px] shrink-0 flex-col overflow-hidden rounded-2xl border border-black/[0.06] shadow-[0_10px_28px_-20px_rgba(15,23,42,0.55)] transition-[box-shadow] duration-200 ease-out",
        FUNNEL_COLUMN_BODY,
        orphan && "border-amber-400/60",
        active &&
          "border-[#079ED4]/45 shadow-[0_12px_28px_-16px_rgba(7,158,212,0.45)] ring-2 ring-[#079ED4]/35",
        className,
      )}
    >
      <div
        className={cn(
          "px-3 py-2 text-white",
          orphan ? "bg-amber-600" : funnelStageHeaderClass(color),
        )}
        style={orphan ? undefined : funnelStageHeaderStyle(color)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-black/10">
              <Icon className="h-3.5 w-3.5" aria-hidden />
            </span>
            <p
              className="truncate text-[11px] font-bold uppercase tracking-[0.1em]"
              title={title}
            >
              {title}
            </p>
            <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-white/20 px-1.5 text-[11px] font-bold tabular-nums leading-none">
              {count}
            </span>
          </div>
          {total ? (
            <p className="shrink-0 text-[11px] font-bold tabular-nums">
              {total}
            </p>
          ) : null}
        </div>
      </div>
      <div className="min-h-16 flex-1 space-y-2 p-2.5">{children}</div>
    </div>
  );
}
