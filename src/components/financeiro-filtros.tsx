import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PERIODO_OPTIONS,
  STATUS_OPTIONS,
  type PeriodoFiltro,
  type StatusTitulo,
} from "@/lib/financeiro-mock";
import {
  FILTER_BAR_SHELL,
  FILTER_CLEAR_BTN,
  FILTER_CONTROL,
  FILTER_SEARCH_ICON,
} from "@/lib/filter-bar";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";

export function FinanceiroFiltrosBar({
  search,
  onSearchChange,
  searchPlaceholder = "Buscar…",
  periodo,
  onPeriodoChange,
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
}: {
  search?: string;
  onSearchChange?: (v: string) => void;
  searchPlaceholder?: string;
  periodo?: PeriodoFiltro;
  onPeriodoChange?: (v: PeriodoFiltro) => void;
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
}) {
  return (
    <div className={FILTER_BAR_SHELL}>
      {onSearchChange != null && (
        <div className="relative min-w-[200px] flex-1 max-w-sm">
          <Search className={FILTER_SEARCH_ICON} />
          <Input
            value={search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className={cn("pl-9", FILTER_CONTROL)}
          />
        </div>
      )}
      {onPeriodoChange != null && (
        <Select
          value={periodo}
          onValueChange={(v) => onPeriodoChange(v as PeriodoFiltro)}
        >
          <SelectTrigger className={cn("w-full sm:w-[160px]", FILTER_CONTROL)}>
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            {PERIODO_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {onDataDeChange != null && (
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          De
          <Input
            type="date"
            value={dataDe ?? ""}
            onChange={(e) => onDataDeChange(e.target.value)}
            className={cn("w-[148px]", FILTER_CONTROL)}
            aria-label="Data inicial"
          />
        </label>
      )}
      {onDataAteChange != null && (
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Até
          <Input
            type="date"
            value={dataAte ?? ""}
            onChange={(e) => onDataAteChange(e.target.value)}
            className={cn("w-[148px]", FILTER_CONTROL)}
            aria-label="Data final"
          />
        </label>
      )}
      {onStatusChange != null && (
        <Select
          value={status}
          onValueChange={(v) => onStatusChange(v as StatusTitulo | "todos")}
        >
          <SelectTrigger className={cn("w-full sm:w-[170px]", FILTER_CONTROL)}>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {onTipoChange != null && tipoOptions && (
        <Select value={tipo} onValueChange={onTipoChange}>
          <SelectTrigger className={cn("w-full sm:w-[180px]", FILTER_CONTROL)}>
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            {tipoOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {extra}
      {hasActive && onClear && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={FILTER_CLEAR_BTN}
          onClick={onClear}
        >
          <X className="mr-1 h-4 w-4" />
          Limpar
        </Button>
      )}
    </div>
  );
}
