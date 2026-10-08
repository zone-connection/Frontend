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
}: {
  value: AgendamentoTipo;
  options: readonly AgendamentoTipo[];
  onChange: (tipo: AgendamentoTipo) => void;
  disabled?: boolean;
  className?: string;
}) {
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
              "flex min-h-12 items-center gap-2.5 rounded-xl border-2 px-3 py-2 text-left transition",
              selected
                ? cn(AGENDA_LUX_CHIP[tipo], "border-transparent shadow-sm")
                : cn(
                    AGENDA_LUX_SOFT[tipo],
                    "bg-background hover:brightness-[0.98]",
                  ),
              disabled && "cursor-not-allowed",
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-sm",
                selected
                  ? "bg-white/20 text-white"
                  : AGENDA_LUX_WELL[tipo],
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold leading-tight text-balance">
              {AGENDAMENTO_TIPO_LABEL[tipo]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
