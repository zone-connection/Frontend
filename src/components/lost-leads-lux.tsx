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
  retorno: "bg-[#F04464] shadow-[0_6px_14px_rgba(240,68,100,0.35)]",
  invalido: "bg-[#F79009] shadow-[0_6px_14px_rgba(247,144,9,0.38)]",
  financeiro: "bg-[#F79009] shadow-[0_6px_14px_rgba(247,144,9,0.38)]",
  perfil: "bg-[#F79009] shadow-[0_6px_14px_rgba(247,144,9,0.38)]",
  comprou: "bg-[#2E90FA] shadow-[0_6px_14px_rgba(46,144,250,0.35)]",
  desist: "bg-[#875BF7] shadow-[0_6px_14px_rgba(135,91,247,0.35)]",
};

const KPI_WASH: Record<string, string> = {
  retorno: "border-[#F5B8C4] bg-gradient-to-br from-[#FFD6DE] to-[#FFF6F7]",
  invalido: "border-[#F5C48A] bg-gradient-to-br from-[#FFE4C4] to-[#FFF8F1]",
  financeiro: "border-[#F5C48A] bg-gradient-to-br from-[#FFE4C4] to-[#FFF8F1]",
  perfil: "border-[#F5C48A] bg-gradient-to-br from-[#FFE4C4] to-[#FFF8F1]",
  comprou: "border-[#9DCEF5] bg-gradient-to-br from-[#D3ECFE] to-[#F4F9FE]",
  desist: "border-[#D0BEF5] bg-gradient-to-br from-[#E6DBFF] to-[#F8F5FF]",
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
              "rounded-xl border px-3.5 py-3 text-left transition",
              wash,
              selected && "ring-2 ring-primary/30",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className={cn(
                  "flex size-9 items-center justify-center rounded-full text-white",
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
