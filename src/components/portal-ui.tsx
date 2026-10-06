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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const PORTAL_TEAL = "var(--primary)";

const BADGE: Record<PortalSituacao, string> = {
  sem_operacao: "border-transparent bg-muted text-muted-foreground",
  captacao: "border-transparent bg-sky-500/15 text-sky-700 dark:text-sky-300",
  disponivel:
    "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  negociacao:
    "border-transparent bg-amber-500/15 text-amber-800 dark:text-amber-300",
  vendido:
    "border-transparent bg-violet-500/15 text-violet-700 dark:text-violet-300",
  indisponivel: "border-transparent bg-muted text-muted-foreground",
};

const KPI_TONE: Record<
  string,
  { icon: string; wash: string }
> = {
  teal: {
    icon: "bg-teal-500",
    wash: "border-teal-100/80 bg-teal-50 dark:border-teal-900/40 dark:bg-teal-950/25",
  },
  blue: {
    icon: "bg-sky-500",
    wash: "border-sky-100/80 bg-sky-50 dark:border-sky-900/40 dark:bg-sky-950/25",
  },
  emerald: {
    icon: "bg-emerald-500",
    wash: "border-emerald-100/80 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/25",
  },
  violet: {
    icon: "bg-violet-500",
    wash: "border-violet-100/80 bg-violet-50 dark:border-violet-900/40 dark:bg-violet-950/25",
  },
  orange: {
    icon: "bg-orange-500",
    wash: "border-orange-100/80 bg-orange-50 dark:border-orange-900/40 dark:bg-orange-950/25",
  },
};

export function portalTipoLabel(tipo: string) {
  return CAPTACAO_IMOVEL_TIPO_LABEL[tipo as CaptacaoImovelTipo] ?? tipo;
}

export function PortalPageTitle({
  kicker,
  title,
  subtitle,
  actions,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:mb-6 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="mb-1.5 inline-flex max-w-full items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          <span className="size-1.5 shrink-0 rounded-full bg-primary" />
          <span className="truncate">{kicker ?? "Portal do proprietário"}</span>
        </p>
        <h1 className="text-xl font-semibold tracking-tight text-module-title sm:text-2xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full flex-wrap items-center justify-end gap-2 lg:w-auto">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export function PortalStatCard({
  label,
  hint,
  value,
  icon: Icon,
  tone = "teal",
  accent: _accent,
}: {
  label: string;
  hint: string;
  value: number;
  icon: LucideIcon;
  tone?: keyof typeof KPI_TONE;
  accent?: string;
}) {
  const palette = KPI_TONE[tone] ?? KPI_TONE.teal;
  return (
    <div
      className={cn(
        "rounded-xl border p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        palette.wash,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
          <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight">
            {value}
          </p>
        </div>
        <span
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full text-white",
            palette.icon,
          )}
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
    <article className="flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
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
              "flex items-end bg-muted px-4 pb-3",
              compact ? "h-36" : "h-44",
            )}
          >
            <p className="text-sm text-muted-foreground">Sem foto ainda</p>
          </div>
        )}
        <Badge
          variant="outline"
          className={cn(
            "absolute right-3 top-3",
            imovel.canceladoPeloProprietario
              ? "border-transparent bg-destructive/15 text-destructive"
              : BADGE[imovel.situacao],
          )}
        >
          {imovel.canceladoPeloProprietario
            ? "Cancelado por você"
            : PORTAL_SITUACAO_LABEL[imovel.situacao]}
        </Badge>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="text-sm font-semibold">{tipo}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {imovel.endereco || imovel.identificacao}
            {imovel.bairro ? ` · ${imovel.bairro}` : ""}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
          <div className="rounded-lg bg-muted/60 px-2 py-2">
            <p className="text-muted-foreground">Tipo</p>
            <p className="mt-0.5 font-medium">{tipo}</p>
          </div>
          <div className="rounded-lg bg-muted/60 px-2 py-2">
            <p className="text-muted-foreground">Cidade</p>
            <p className="mt-0.5 font-medium">{imovel.cidade || "—"}</p>
          </div>
          <div className="rounded-lg bg-muted/60 px-2 py-2">
            <p className="text-muted-foreground">Status</p>
            <p className="mt-0.5 font-medium">
              {PORTAL_SITUACAO_LABEL[imovel.situacao]}
            </p>
          </div>
        </div>
        {imovel.proximoPasso ? (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {imovel.proximoPasso}
          </p>
        ) : null}
        <Button asChild variant="secondary" className="mt-auto w-full">
          <Link to="/portal/imoveis/$id" params={{ id: imovel.id }}>
            Ver detalhes
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </article>
  );
}

export function PortalEmpty({ children }: { children: string }) {
  return (
    <Card>
      <CardContent className="px-5 py-10 text-center text-sm text-muted-foreground">
        {children}
      </CardContent>
    </Card>
  );
}
