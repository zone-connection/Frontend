import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import { formatCpfCnpj, cn } from "@/lib/utils";
import { lostLeadAvatarClass } from "@/components/lost-leads-lux";
import { TABLE_LUX } from "@/lib/filter-bar";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Handshake,
  Loader2,
  UserRound,
  UsersRound,
  Wallet,
} from "lucide-react";

export type VendaResumoItem = {
  id: string;
  corretorId?: string | null;
  corretor: string;
  creci: string | null;
  gerente: string | null;
  construtora?: string | null;
  empreendimento: string | null;
  cliente: string;
  clienteCpf: string | null;
  vgv: number;
  dataVenda: string | null;
};

function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dateBr(iso: string | null | undefined) {
  if (!iso) return "—";
  const [year, month, day] = iso.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : "—";
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

const thClass = "h-11 px-4 text-[11px] font-semibold uppercase tracking-wider";
const tdClass = "px-4 py-3 align-middle";

type CorretorGrupo = {
  key: string;
  corretor: string;
  creci: string | null;
  gerente: string | null;
  vendas: VendaResumoItem[];
  vgv: number;
};

function groupByCorretor(items: VendaResumoItem[]): CorretorGrupo[] {
  const map = new Map<string, CorretorGrupo>();
  for (const item of items) {
    const key = item.corretorId || `nome:${item.corretor}`;
    const existing = map.get(key);
    if (existing) {
      existing.vendas.push(item);
      existing.vgv += item.vgv;
    } else {
      map.set(key, {
        key,
        corretor: item.corretor,
        creci: item.creci,
        gerente: item.gerente,
        vendas: [item],
        vgv: item.vgv,
      });
    }
  }
  return [...map.values()].sort(
    (a, b) => b.vgv - a.vgv || a.corretor.localeCompare(b.corretor, "pt-BR"),
  );
}

function CorretorCell({
  name,
  extra,
  chevron,
}: {
  name: string;
  extra?: ReactNode;
  chevron?: "open" | "closed";
}) {
  return (
    <div className="flex items-center gap-3">
      {chevron ? (
        chevron === "open" ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )
      ) : null}
      <Avatar className="h-8 w-8">
        <AvatarFallback
          className={cn("text-xs text-white", lostLeadAvatarClass(name))}
        >
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="truncate font-medium leading-tight">{name}</div>
        {extra ? (
          <div className="mt-0.5 text-[11px] text-muted-foreground">{extra}</div>
        ) : null}
      </div>
    </div>
  );
}

export function ConstrutoraVendasTable({
  items,
  detailed = false,
}: {
  items: VendaResumoItem[];
  detailed?: boolean;
}) {
  const grupos = useMemo(() => groupByCorretor(items), [items]);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    setExpandedKeys(new Set());
  }, [items]);

  function toggleGrupo(key: string) {
    setExpandedKeys((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <Table className={TABLE_LUX}>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className={thClass}>Corretor</TableHead>
          {detailed ? (
            <>
              <TableHead className={thClass}>CRECI</TableHead>
              <TableHead className={thClass}>Gerente</TableHead>
              <TableHead className={thClass}>Empreendimento</TableHead>
            </>
          ) : null}
          <TableHead className={thClass}>Cliente</TableHead>
          {detailed ? <TableHead className={thClass}>CPF</TableHead> : null}
          {!detailed ? <TableHead className={thClass}>Data</TableHead> : null}
          <TableHead className={cn(thClass, "text-right")}>VGV</TableHead>
          {detailed ? <TableHead className={thClass}>Data</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {grupos.map((grupo) => {
          const zebra = "hover:bg-muted/40";
          if (grupo.vendas.length === 1) {
            const venda = grupo.vendas[0];
            return (
              <TableRow key={grupo.key} className={zebra}>
                <TableCell className={tdClass}>
                  <CorretorCell
                    name={grupo.corretor}
                    extra={
                      grupo.creci
                        ? `CRECI ${grupo.creci}`
                        : grupo.vendas.length === 1
                          ? "1 venda"
                          : undefined
                    }
                  />
                </TableCell>
                {detailed ? (
                  <>
                    <TableCell
                      className={cn(tdClass, "tabular-nums text-muted-foreground")}
                    >
                      {grupo.creci || "—"}
                    </TableCell>
                    <TableCell className={tdClass}>
                      {grupo.gerente || "—"}
                    </TableCell>
                    <TableCell className={tdClass}>
                      {venda.empreendimento || "—"}
                    </TableCell>
                  </>
                ) : null}
                <TableCell className={tdClass}>
                  <div className="min-w-0">
                    <div className="truncate font-medium leading-tight">
                      {venda.cliente}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {detailed
                        ? venda.clienteCpf
                          ? formatCpfCnpj(venda.clienteCpf)
                          : "CPF não informado"
                        : venda.empreendimento || "—"}
                    </div>
                  </div>
                </TableCell>
                {detailed ? (
                  <TableCell className={cn(tdClass, "tabular-nums")}>
                    {venda.clienteCpf ? formatCpfCnpj(venda.clienteCpf) : "—"}
                  </TableCell>
                ) : (
                  <TableCell
                    className={cn(tdClass, "tabular-nums text-muted-foreground")}
                  >
                    {dateBr(venda.dataVenda)}
                  </TableCell>
                )}
                <TableCell
                  className={cn(
                    tdClass,
                    "text-right tabular-nums font-semibold text-[#04648A]",
                  )}
                >
                  {money(venda.vgv)}
                </TableCell>
                {detailed ? (
                  <TableCell
                    className={cn(tdClass, "tabular-nums text-muted-foreground")}
                  >
                    {dateBr(venda.dataVenda)}
                  </TableCell>
                ) : null}
              </TableRow>
            );
          }

          const expanded = expandedKeys.has(grupo.key);
          return (
            <Fragment key={grupo.key}>
              <TableRow
                className={cn(
                  "cursor-pointer",
                  zebra,
                  expanded ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/60",
                )}
                onClick={() => toggleGrupo(grupo.key)}
              >
                <TableCell className={tdClass}>
                  <CorretorCell
                    name={grupo.corretor}
                    chevron={expanded ? "open" : "closed"}
                    extra={`${grupo.vendas.length} vendas${grupo.creci ? ` · CRECI ${grupo.creci}` : ""}`}
                  />
                </TableCell>
                {detailed ? (
                  <>
                    <TableCell
                      className={cn(tdClass, "tabular-nums text-muted-foreground")}
                    >
                      {grupo.creci || "—"}
                    </TableCell>
                    <TableCell className={tdClass}>
                      {grupo.gerente || "—"}
                    </TableCell>
                    <TableCell className={cn(tdClass, "text-muted-foreground")}>
                      —
                    </TableCell>
                  </>
                ) : null}
                <TableCell className={tdClass}>
                  <Badge variant="secondary" className="font-normal">
                    {grupo.vendas.length} vendas
                  </Badge>
                </TableCell>
                {detailed ? (
                  <TableCell className={cn(tdClass, "text-muted-foreground")}>
                    —
                  </TableCell>
                ) : (
                  <TableCell className={cn(tdClass, "text-muted-foreground")}>
                    —
                  </TableCell>
                )}
                <TableCell
                  className={cn(
                    tdClass,
                    "text-right tabular-nums font-semibold text-[#04648A]",
                  )}
                >
                  {money(grupo.vgv)}
                </TableCell>
                {detailed ? (
                  <TableCell className={cn(tdClass, "text-muted-foreground")}>
                    —
                  </TableCell>
                ) : null}
              </TableRow>
              {expanded
                ? grupo.vendas.map((venda) => (
                    <TableRow key={venda.id} className="bg-muted/15">
                      <TableCell
                        className={cn(tdClass, "pl-16 text-sm text-muted-foreground")}
                      >
                        {dateBr(venda.dataVenda)}
                      </TableCell>
                      {detailed ? (
                        <>
                          <TableCell className={tdClass} />
                          <TableCell className={tdClass} />
                          <TableCell className={tdClass}>
                            {venda.empreendimento || "—"}
                          </TableCell>
                        </>
                      ) : null}
                      <TableCell className={tdClass}>
                        <div className="truncate font-medium">{venda.cliente}</div>
                        {!detailed && venda.empreendimento ? (
                          <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {venda.empreendimento}
                          </div>
                        ) : null}
                      </TableCell>
                      {detailed ? (
                        <TableCell className={cn(tdClass, "tabular-nums")}>
                          {venda.clienteCpf
                            ? formatCpfCnpj(venda.clienteCpf)
                            : "—"}
                        </TableCell>
                      ) : (
                        <TableCell
                          className={cn(
                            tdClass,
                            "tabular-nums text-muted-foreground",
                          )}
                        >
                          {dateBr(venda.dataVenda)}
                        </TableCell>
                      )}
                      <TableCell
                        className={cn(tdClass, "text-right tabular-nums font-medium")}
                      >
                        {money(venda.vgv)}
                      </TableCell>
                      {detailed ? (
                        <TableCell
                          className={cn(
                            tdClass,
                            "tabular-nums text-muted-foreground",
                          )}
                        >
                          {dateBr(venda.dataVenda)}
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))
                : null}
            </Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
}

function CorretorVendasTable({ items }: { items: VendaResumoItem[] }) {
  return (
    <Table className={TABLE_LUX}>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className={thClass}>Construtora</TableHead>
          <TableHead className={thClass}>Empreendimento</TableHead>
          <TableHead className={thClass}>Cliente</TableHead>
          <TableHead className={cn(thClass, "text-right")}>VGV</TableHead>
          <TableHead className={cn(thClass, "text-right")}>Data</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((row, index) => (
          <TableRow
            key={row.id}
            className={index % 2 === 1 ? "bg-muted/25" : "bg-background"}
          >
            <TableCell className={tdClass}>
              {row.construtora ? (
                <Badge
                  variant="secondary"
                  className="max-w-full truncate font-medium"
                  title={row.construtora}
                >
                  {row.construtora}
                </Badge>
              ) : (
                "—"
              )}
            </TableCell>
            <TableCell className={cn(tdClass, "font-medium")}>
              {row.empreendimento || "—"}
            </TableCell>
            <TableCell className={tdClass}>
              <div className="min-w-0">
                <div className="truncate leading-tight">{row.cliente}</div>
                <div className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                  {row.clienteCpf
                    ? formatCpfCnpj(row.clienteCpf)
                    : "CPF não informado"}
                </div>
              </div>
            </TableCell>
            <TableCell
              className={cn(
                tdClass,
                "text-right tabular-nums font-semibold text-[#04648A]",
              )}
            >
              {money(row.vgv)}
            </TableCell>
            <TableCell
              className={cn(
                tdClass,
                "text-right tabular-nums text-muted-foreground",
              )}
            >
              {dateBr(row.dataVenda)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function VendasResumoDialog({
  open,
  onOpenChange,
  title,
  description,
  items,
  loading,
  mode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  items: VendaResumoItem[];
  loading: boolean;
  mode: "corretor" | "construtora";
}) {
  const totalVgv = items.reduce((sum, item) => sum + item.vgv, 0);
  const corretoresCount = useMemo(
    () => groupByCorretor(items).length,
    [items],
  );
  const construtorasCount = useMemo(
    () => new Set(items.map((item) => item.construtora).filter(Boolean)).size,
    [items],
  );

  const defaultDescription = loading
    ? "Carregando vendas…"
    : mode === "construtora"
      ? `${corretoresCount} corretor${corretoresCount === 1 ? "" : "es"} · ${items.length} venda${items.length === 1 ? "" : "s"}`
      : `${items.length} venda${items.length === 1 ? "" : "s"}`;

  const Icon = mode === "construtora" ? Building2 : UserRound;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-4xl sm:rounded-2xl",
          "[&>button]:right-5 [&>button]:top-5 [&>button]:rounded-full [&>button]:border [&>button]:bg-background [&>button]:p-1.5 [&>button]:opacity-100 [&>button]:shadow-sm",
        )}
      >
        <DialogHeader className="space-y-0 border-b bg-linear-to-br from-[#079ED4]/12 via-background to-background px-6 pb-5 pt-6 pr-14 text-left">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#079ED4] text-white shadow-sm">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#057AA8]">
                {mode === "construtora"
                  ? "Vendas da construtora"
                  : "Vendas do corretor"}
              </p>
              <DialogTitle className="mt-1 text-xl leading-tight">
                {title.replace(/^Vendas de\s+/i, "")}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {description ?? defaultDescription}
              </DialogDescription>
            </div>
          </div>
          {!loading && items.length > 0 ? (
            <div className="mt-5 grid grid-cols-3 gap-2.5">
              <FinanceKpiCard
                label="Vendas"
                value={items.length}
                icon={Handshake}
                tone="blue-2"
                format="number"
                compact
                showBar={false}
              />
              <FinanceKpiCard
                label="VGV"
                value={totalVgv}
                icon={CircleDollarSign}
                tone="blue-4"
                compact
                showBar={false}
              />
              <FinanceKpiCard
                label={mode === "construtora" ? "Corretores" : "Construtoras"}
                value={
                  mode === "construtora" ? corretoresCount : construtorasCount
                }
                icon={mode === "construtora" ? UsersRound : Building2}
                tone="blue-6"
                format="number"
                compact
                showBar={false}
              />
            </div>
          ) : null}
        </DialogHeader>
        <div className="bg-muted/30 px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center rounded-xl border bg-card py-16 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando vendas…
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-16 text-muted-foreground">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Wallet className="h-5 w-5 opacity-60" />
              </span>
              <p className="text-sm">Nenhuma venda encontrada.</p>
            </div>
          ) : (
            <div className="max-h-[52vh] overflow-auto rounded-xl border bg-card shadow-sm">
              {mode === "construtora" ? (
                <ConstrutoraVendasTable items={items} />
              ) : (
                <CorretorVendasTable items={items} />
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
