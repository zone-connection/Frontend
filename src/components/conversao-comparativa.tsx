import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FlowBar } from "@/components/flow-bar";
import { cn } from "@/lib/utils";
import { BadgeCheck, FileText, ShoppingBag } from "lucide-react";

export function taxaVendasSobreBase(vendas: number, base: number) {
  if (!Number.isFinite(vendas) || !Number.isFinite(base) || base <= 0) {
    return 0;
  }
  return Number(((vendas / base) * 100).toFixed(1));
}

function formatPct(valor: number) {
  return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function formatInt(valor: number) {
  return valor.toLocaleString("pt-BR");
}

export function textoAnaliseConversao(
  documentacoes: number,
  aprovacoes: number,
  vendas: number,
) {
  const taxaDoc = taxaVendasSobreBase(vendas, documentacoes);
  const taxaAprov = taxaVendasSobreBase(vendas, aprovacoes);
  return `Para cada ${formatInt(documentacoes)} documentações realizadas, foram geradas ${formatInt(vendas)} vendas, representando uma conversão de ${formatPct(taxaDoc)}. Das ${formatInt(aprovacoes)} documentações aprovadas, foram geradas ${formatInt(vendas)} vendas, representando uma conversão de ${formatPct(taxaAprov)}.`;
}

export function ConversaoComparativa({
  title,
  subtitle,
  documentacoes,
  aprovacoes,
  vendas,
  className,
}: {
  title: string;
  subtitle?: string;
  documentacoes: number;
  aprovacoes: number;
  vendas: number;
  className?: string;
}) {
  const taxaDoc = taxaVendasSobreBase(vendas, documentacoes);
  const taxaAprov = taxaVendasSobreBase(vendas, aprovacoes);
  const maxFunil = Math.max(documentacoes, aprovacoes, vendas, 1);

  return (
    <Card className={cn("overflow-hidden rounded-2xl", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {subtitle ? (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <VolumeChip
            icon={FileText}
            label="Documentações"
            value={documentacoes}
            tone="sky"
          />
          <VolumeChip
            icon={BadgeCheck}
            label="Aprovações"
            value={aprovacoes}
            tone="violet"
          />
          <VolumeChip
            icon={ShoppingBag}
            label="Vendas"
            value={vendas}
            tone="emerald"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <TaxaChip
            label="Conversão documentação → venda"
            formula="Vendas ÷ Documentações × 100"
            valor={taxaDoc}
            tone="sky"
          />
          <TaxaChip
            label="Conversão aprovação → venda"
            formula="Vendas ÷ Aprovações × 100"
            valor={taxaAprov}
            tone="violet"
          />
        </div>

        <div className="space-y-2">
          <FlowBar
            label="Documentações"
            value={documentacoes}
            max={maxFunil}
            tone="sky"
          />
          <FlowBar
            label="Aprovações"
            value={aprovacoes}
            max={maxFunil}
            tone="primary"
          />
          <FlowBar
            label="Vendas"
            value={vendas}
            max={maxFunil}
            tone="emerald"
          />
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          {textoAnaliseConversao(documentacoes, aprovacoes, vendas)}
        </p>
      </CardContent>
    </Card>
  );
}

function VolumeChip({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof FileText;
  label: string;
  value: number;
  tone: "sky" | "violet" | "emerald";
}) {
  const well =
    tone === "emerald"
      ? "bg-emerald-500 text-white"
      : tone === "violet"
        ? "bg-violet-500 text-white"
        : "bg-sky-500 text-white";
  return (
    <div className="rounded-xl border border-black/5 bg-muted/30 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
            well,
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      </div>
      <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight">
        {formatInt(value)}
      </p>
    </div>
  );
}

function TaxaChip({
  label,
  formula,
  valor,
  tone,
}: {
  label: string;
  formula: string;
  valor: number;
  tone: "sky" | "violet";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5",
        tone === "violet"
          ? "border-violet-200/80 bg-violet-50/70 dark:border-violet-500/25 dark:bg-violet-500/10"
          : "border-sky-200/80 bg-sky-50/70 dark:border-sky-500/25 dark:bg-sky-500/10",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-xl font-bold tabular-nums",
          tone === "violet"
            ? "text-violet-700 dark:text-violet-300"
            : "text-sky-700 dark:text-sky-300",
        )}
      >
        {formatPct(valor)}
      </p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{formula}</p>
    </div>
  );
}
