import {
  AGENDAMENTO_TIPO_DOT,
  AGENDAMENTO_TIPO_LABEL,
  AGENDAMENTO_TIPO_SOFT,
  AGENDAMENTO_TIPO_WELL,
  type AgendamentoTipo,
} from "@/lib/agenda-api";
import { cn } from "@/lib/utils";
import {
  Ban,
  CalendarDays,
  CheckSquare,
  KeyRound,
  MapPin,
  Phone,
  Users,
  type LucideIcon,
} from "lucide-react";

export const AGENDAMENTO_TIPO_ICON: Record<AgendamentoTipo, LucideIcon> = {
  visita: MapPin,
  ligacao: Phone,
  reuniao: Users,
  tarefa: CheckSquare,
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
        AGENDAMENTO_TIPO_DOT[tipo],
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
}: {
  value: AgendamentoTipo;
  options: readonly AgendamentoTipo[];
  onChange: (tipo: AgendamentoTipo) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-2 sm:grid-cols-3",
        disabled && "opacity-80",
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
              "flex items-center gap-2.5 rounded-xl border-2 px-3 py-2.5 text-left transition",
              selected
                ? cn(AGENDAMENTO_TIPO_SOFT[tipo], "shadow-sm")
                : "border-transparent bg-muted/50 text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground",
              disabled && "cursor-not-allowed",
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-sm",
                selected
                  ? AGENDAMENTO_TIPO_WELL[tipo]
                  : "bg-background text-muted-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold leading-tight">
              {AGENDAMENTO_TIPO_LABEL[tipo]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
