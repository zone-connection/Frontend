import {
  AGENDAMENTO_TIPO_LABEL,
  type AgendamentoTipo,
} from "@/lib/agenda-api";
import {
  AGENDA_LUX_CHIP,
  AGENDA_LUX_DOT,
  AGENDA_LUX_SOFT,
  AGENDA_LUX_WELL,
} from "@/lib/agenda-lux-colors";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import {
  Ban,
  CalendarDays,
  FileText,
  Handshake,
  Home,
  KeyRound,
  Phone,
  type LucideIcon,
} from "lucide-react";

export const AGENDAMENTO_TIPO_ICON: Record<AgendamentoTipo, LucideIcon> = {
  visita: Home,
  ligacao: Phone,
  reuniao: Handshake,
  tarefa: FileText,
  outro: CalendarDays,
  bloqueio: Ban,
  retirada_chave: KeyRound,
};

/** Bolinha na cor do tipo — a mesma do bloco no calendário. */
export function AgendamentoTipoDot({
  tipo,
  className,
}: {
  tipo: AgendamentoTipo;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "size-2.5 shrink-0 rounded-full",
        AGENDA_LUX_DOT[tipo],
        className,
      )}
      aria-hidden
    />
  );
}

/** Item de select: cor + rótulo do tipo de atividade. */
export function AgendamentoTipoOption({ tipo }: { tipo: AgendamentoTipo }) {
  return (
    <span className="flex items-center gap-2">
      <AgendamentoTipoDot tipo={tipo} />
      {AGENDAMENTO_TIPO_LABEL[tipo]}
    </span>
  );
}

/** Grade de cards para escolher o tipo ao agendar. */
export function AgendamentoTipoPicker({
  value,
  options,
  onChange,
  disabled,
  className,
  appearance = "solid",
}: {
  value: AgendamentoTipo;
  options: readonly AgendamentoTipo[];
  onChange: (tipo: AgendamentoTipo) => void;
  disabled?: boolean;
  className?: string;
  appearance?: "solid" | "soft";
}) {
  const soft = appearance === "soft";
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-2 sm:grid-cols-3",
        disabled && "opacity-80",
        className,
      )}
    >
      {options.map((tipo) => {
        const Icon = AGENDAMENTO_TIPO_ICON[tipo];
        const selected = value === tipo;
        return (
          <button
            key={tipo}
            type="button"
            disabled={disabled}
            onClick={() => onChange(tipo)}
            className={cn(
              "flex min-h-14 items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-left transition",
              soft
                ? selected
                  ? "border-primary bg-background shadow-sm"
                  : cn(AGENDA_LUX_SOFT[tipo], "border-transparent hover:brightness-[0.98]")
                : selected
                  ? cn(AGENDA_LUX_CHIP[tipo], "border-transparent shadow-sm")
                  : cn(AGENDA_LUX_SOFT[tipo], "bg-background hover:brightness-[0.98]"),
              disabled && "cursor-not-allowed",
            )}
          >
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full shadow-sm",
                soft || !selected ? AGENDA_LUX_WELL[tipo] : "bg-white/20 text-white",
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1 text-sm font-semibold leading-tight">
              {AGENDAMENTO_TIPO_LABEL[tipo]}
            </span>
            {soft && selected ? (
              <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-3 w-3" />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
