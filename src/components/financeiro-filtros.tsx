import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FILTRO_CAMPO, FiltrosPainel } from "@/components/filtros-painel";
import {
  PERIODO_OPTIONS,
  STATUS_OPTIONS,
  type PeriodoFiltro,
  type StatusTitulo,
} from "@/lib/financeiro-mock";
import { FILTER_BAR_SHELL, FILTER_CONTROL, FILTER_SEARCH_ICON } from "@/lib/filter-bar";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function anosFiltro() {
  const atual = new Date().getFullYear();
  return [atual + 1, atual, atual - 1, atual - 2, atual - 3];
}

export function FinanceiroFiltrosBar({
  search,
  onSearchChange,
  searchPlaceholder = "Buscar…",
  periodo,
  onPeriodoChange,
  ano,
  onAnoChange,
  mes,
  onMesChange,
  dataDe,
  onDataDeChange,
  dataAte,
  onDataAteChange,
  status,
  onStatusChange,
  tipo,
  onTipoChange,
  tipoOptions,
  extra,
  onClear,
  hasActive,
  resultCount,
  kicker = "Financeiro",
}: {
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  periodo?: PeriodoFiltro;
  onPeriodoChange?: (v: PeriodoFiltro) => void;
  ano?: number;
  onAnoChange?: (v: number) => void;
  mes?: number | "todos";
  onMesChange?: (v: number | "todos") => void;
  dataDe?: string;
  onDataDeChange?: (v: string) => void;
  dataAte?: string;
  onDataAteChange?: (v: string) => void;
  status?: StatusTitulo | "todos";
  onStatusChange?: (v: StatusTitulo | "todos") => void;
  tipo?: string;
  onTipoChange?: (v: string) => void;
  tipoOptions?: { value: string; label: string }[];
  extra?: ReactNode;
  onClear?: () => void;
  hasActive?: boolean;
  resultCount?: number;
  kicker?: string;
}) {
  const counted = [
    periodo != null && periodo !== "mes" && periodo !== "tudo",
    mes != null && mes !== "todos" && mes !== new Date().getMonth() + 1,
    ano != null && ano !== new Date().getFullYear(),
    Boolean(dataDe || dataAte),
    status != null && status !== "todos",
    tipo != null && tipo !== "todos",
  ].filter(Boolean).length;
  const activeCount = hasActive ? Math.max(counted, 1) : counted;
  return (
    <div className={FILTER_BAR_SHELL}>
      {onSearchChange != null && (
        <div className="relative min-w-0 flex-1">
          <Search className={FILTER_SEARCH_ICON} />
          <Input
            value={search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className={cn("pl-9", FILTER_CONTROL)}
          />
        </div>
      )}
      <FiltrosPainel
        kicker={kicker}
        description="Período, mês e demais recortes."
        resultCount={resultCount}
        activeCount={activeCount}
        onClear={onClear ?? (() => undefined)}
      >
        {onPeriodoChange != null && (
          <div className="space-y-1.5">
            <Label>Período</Label>
            <Select value={periodo} onValueChange={(v) => onPeriodoChange(v as PeriodoFiltro)}>
              <SelectTrigger className={FILTRO_CAMPO}><SelectValue placeholder="Período" /></SelectTrigger>
              <SelectContent>
                {PERIODO_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {onAnoChange != null && (
          <div className="space-y-1.5">
            <Label>Ano</Label>
            <Select value={String(ano ?? new Date().getFullYear())} onValueChange={(v) => onAnoChange(Number(v))}>
              <SelectTrigger className={FILTRO_CAMPO}><SelectValue placeholder="Ano" /></SelectTrigger>
              <SelectContent>
                {anosFiltro().map((item) => (
                  <SelectItem key={item} value={String(item)}>{item}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {onMesChange != null && (
          <div className="space-y-1.5">
            <Label>Mês</Label>
            <Select
              value={mes === "todos" || mes == null ? "todos" : String(mes)}
              onValueChange={(v) => onMesChange(v === "todos" ? "todos" : Number(v))}
            >
              <SelectTrigger className={FILTRO_CAMPO}><SelectValue placeholder="Mês" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os meses</SelectItem>
                {MESES.map((label, index) => (
                  <SelectItem key={label} value={String(index + 1)}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {onDataDeChange != null && (
          <div className="space-y-1.5">
            <Label>De</Label>
            <Input type="date" value={dataDe ?? ""} onChange={(e) => onDataDeChange(e.target.value)} className={FILTRO_CAMPO} />
          </div>
        )}
        {onDataAteChange != null && (
          <div className="space-y-1.5">
            <Label>Até</Label>
            <Input type="date" value={dataAte ?? ""} onChange={(e) => onDataAteChange(e.target.value)} className={FILTRO_CAMPO} />
          </div>
        )}
        {onStatusChange != null && (
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => onStatusChange(v as StatusTitulo | "todos")}>
              <SelectTrigger className={FILTRO_CAMPO}><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {onTipoChange != null && tipoOptions && (
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={onTipoChange}>
              <SelectTrigger className={FILTRO_CAMPO}><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                {tipoOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {extra ? <div className="space-y-1.5 sm:col-span-2">{extra}</div> : null}
      </FiltrosPainel>
    </div>
  );
}
