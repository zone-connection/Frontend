import type { LucideIcon } from "lucide-react";
import {
  Ban,
  DollarSign,
  Home,
  MoreHorizontal,
  PhoneOff,
  UserRound,
} from "lucide-react";
import type { LostLeadMotivoKpi } from "@/lib/leads-api";
import { cn } from "@/lib/utils";

export function slugMotivoKey(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "motivo"
  );
}

const KPI_ICON: { test: (slug: string) => boolean; icon: LucideIcon }[] = [
  { test: (s) => s.includes("retorno") || s.includes("ligac"), icon: PhoneOff },
  { test: (s) => s.includes("invalido") || s.includes("numero"), icon: Ban },
  {
    test: (s) =>
      s.includes("financeiro") || s.includes("renda") || s.includes("perfil"),
    icon: DollarSign,
  },
  { test: (s) => s.includes("comprou") || s.includes("imovel") || s.includes("concorrente"), icon: Home },
  {
    test: (s) => s.includes("desist") || s.includes("sem-interesse"),
    icon: UserRound,
  },
];

export function lostMotivoIcon(motivo: string): LucideIcon {
  const slug = slugMotivoKey(motivo);
  return KPI_ICON.find((item) => item.test(slug))?.icon ?? MoreHorizontal;
}

const CHIP: Record<string, string> = {
  retorno: "bg-rose-500 text-white",
  invalido: "bg-teal-500 text-white",
  financeiro: "bg-amber-400 text-amber-950",
  perfil: "bg-amber-400 text-amber-950",
  comprou: "bg-sky-500 text-white",
  desist: "bg-violet-500 text-white",
  restricao: "bg-orange-500 text-white",
};

export function lostMotivoChipClass(motivo: string) {
  const slug = slugMotivoKey(motivo);
  const hit = Object.keys(CHIP).find((key) => slug.includes(key));
  return hit ? CHIP[hit] : "bg-slate-100 text-slate-700";
}

const KPI_ICON_BG: Record<string, string> = {
  retorno: "bg-rose-500",
  invalido: "bg-amber-500",
  financeiro: "bg-amber-500",
  perfil: "bg-amber-500",
  comprou: "bg-sky-500",
  desist: "bg-violet-500",
};

const KPI_WASH: Record<string, string> = {
  retorno: "border-rose-100 bg-rose-50",
  invalido: "border-amber-100 bg-amber-50",
  financeiro: "border-amber-100 bg-amber-50",
  perfil: "border-amber-100 bg-amber-50",
  comprou: "border-sky-100 bg-sky-50",
  desist: "border-violet-100 bg-violet-50",
};

function toneKey(motivo: string) {
  const slug = slugMotivoKey(motivo);
  return (
    Object.keys(KPI_WASH).find((key) => slug.includes(key)) ?? "default"
  );
}

export function lostMotivoKpiTone(motivo: string) {
  return KPI_ICON_BG[toneKey(motivo)] ?? "bg-slate-500";
}

const AVATAR = [
  "bg-sky-500",
  "bg-emerald-500",
  "bg-orange-500",
  "bg-violet-500",
  "bg-teal-500",
  "bg-rose-500",
];

export function lostLeadAvatarClass(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash + ch.charCodeAt(0)) % AVATAR.length;
  return AVATAR[hash] ?? AVATAR[0];
}

export function LostLeadsMotivoKpis({
  items,
  active,
  onSelect,
}: {
  items: LostLeadMotivoKpi[];
  total?: number;
  active: string;
  onSelect: (motivo: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-3 p-3 sm:p-4 xl:grid-cols-6">
      {items.map((item) => {
        const Icon = lostMotivoIcon(item.motivo);
        const selected = active.toLowerCase() === item.motivo.toLowerCase();
        const wash = KPI_WASH[toneKey(item.motivo)] ?? "border-slate-100 bg-slate-50";
        return (
          <button
            key={item.motivo}
            type="button"
            onClick={() => onSelect(selected ? "all" : item.motivo)}
            className={cn(
              "rounded-2xl border px-3 py-3 text-left shadow-sm transition",
              wash,
              selected && "ring-2 ring-primary/30",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl text-white",
                  lostMotivoKpiTone(item.motivo),
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="text-right">
                <p className="text-2xl font-bold tabular-nums text-foreground">
                  {item.count}
                </p>
                <p className="text-[11px] text-muted-foreground">{item.pct}%</p>
              </div>
            </div>
            <p className="mt-2 line-clamp-2 text-xs font-medium text-foreground/80">
              {item.motivo}
            </p>
          </button>
        );
      })}
    </div>
  );
}
