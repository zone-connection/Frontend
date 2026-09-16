import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import {
  CAPTACAO_IMOVEL_TIPO_LABEL,
  type CaptacaoImovelTipo,
} from "@/lib/captacao-api";
import {
  PORTAL_SITUACAO_LABEL,
  type PortalImovelListItem,
  type PortalSituacao,
} from "@/lib/portal-api";
import { cn } from "@/lib/utils";

export const PORTAL_TEAL = "#0f4c5c";

const BADGE: Record<PortalSituacao, string> = {
  sem_operacao: "bg-[#0f4c5c] text-white",
  captacao: "bg-[#0d7a8c] text-white",
  disponivel: "bg-emerald-600 text-white",
  negociacao: "bg-orange-500 text-white",
  vendido: "bg-violet-600 text-white",
  indisponivel: "bg-slate-500 text-white",
};

export function portalTipoLabel(tipo: string) {
  return (
    CAPTACAO_IMOVEL_TIPO_LABEL[tipo as CaptacaoImovelTipo] ?? tipo
  );
}

export function PortalPageTitle({
  kicker,
  title,
  subtitle,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      {kicker ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0d7a8c]">
          {kicker}
        </p>
      ) : null}
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#12343d] sm:text-[28px]">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      ) : null}
    </div>
  );
}

const WASH: Record<string, string> = {
  "#0f4c5c": "bg-sky-50 border-sky-100",
  "#3b82f6": "bg-blue-50 border-blue-100",
  "#16a34a": "bg-emerald-50 border-emerald-100",
  "#7c3aed": "bg-violet-50 border-violet-100",
  "#ea580c": "bg-orange-50 border-orange-100",
};

export function PortalStatCard({
  label,
  hint,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  hint: string;
  value: number;
  icon: LucideIcon;
  accent: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        WASH[accent] ?? "border-slate-100 bg-white",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-700">{label}</p>
          <p className="text-xs text-slate-400">{hint}</p>
          <p className="mt-3 text-3xl font-semibold tabular-nums text-[#12343d]">
            {value}
          </p>
        </div>
        <span
          className="flex h-10 w-10 items-center justify-center rounded-full text-white"
          style={{ background: accent }}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

export function PortalImovelCard({
  imovel,
  compact,
}: {
  imovel: PortalImovelListItem;
  compact?: boolean;
}) {
  const tipo = portalTipoLabel(imovel.tipo);
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="relative">
        {imovel.fotoUrl ? (
          <img
            src={imovel.fotoUrl}
            alt=""
            className={cn("w-full object-cover", compact ? "h-36" : "h-44")}
          />
        ) : (
          <div
            className={cn(
              "flex items-end bg-gradient-to-br from-[#0f4c5c] to-[#148ea3] px-4 pb-3",
              compact ? "h-36" : "h-44",
            )}
          >
            <p className="text-sm text-white/80">Sem foto ainda</p>
          </div>
        )}
        <span
          className={cn(
            "absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold",
            imovel.canceladoPeloProprietario
              ? "bg-red-600 text-white"
              : BADGE[imovel.situacao],
          )}
        >
          {imovel.canceladoPeloProprietario
            ? "Cancelado por você"
            : PORTAL_SITUACAO_LABEL[imovel.situacao]}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="text-sm font-semibold text-[#12343d]">{tipo}</p>
          <p className="mt-0.5 text-sm text-slate-500">
            {imovel.endereco || imovel.identificacao}
            {imovel.bairro ? ` · ${imovel.bairro}` : ""}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
          <div className="rounded-lg bg-slate-50 px-2 py-2">
            <p className="text-slate-400">Tipo</p>
            <p className="mt-0.5 font-medium text-slate-700">{tipo}</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-2 py-2">
            <p className="text-slate-400">Cidade</p>
            <p className="mt-0.5 font-medium text-slate-700">
              {imovel.cidade || "—"}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 px-2 py-2">
            <p className="text-slate-400">Status</p>
            <p className="mt-0.5 font-medium text-slate-700">
              {PORTAL_SITUACAO_LABEL[imovel.situacao]}
            </p>
          </div>
        </div>
        {imovel.proximoPasso ? (
          <p className="line-clamp-2 text-xs leading-relaxed text-slate-500">
            {imovel.proximoPasso}
          </p>
        ) : null}
        <Link
          to="/portal/imoveis/$id"
          params={{ id: imovel.id }}
          className="mt-auto flex items-center justify-center gap-1.5 rounded-full bg-sky-50 py-2.5 text-sm font-medium text-[#0f4c5c] hover:bg-sky-100"
        >
          Ver detalhes
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}

export function PortalEmpty({ children }: { children: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-10 text-center text-sm text-slate-500">
      {children}
    </p>
  );
}
