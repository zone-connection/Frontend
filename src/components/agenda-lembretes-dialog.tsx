import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AgendaProximo, AgendaUrgencia } from "@/lib/agenda-api";
import {
  Briefcase,
  CalendarClock,
  MapPin,
  Network,
  User,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_CHIP_CLASS } from "@/lib/catalog-colors";

const NIVEL_LABEL: Record<AgendaProximo["nivel"], string> = {
  dia: "Em até 1 dia",
  duas_horas: "Em até 2 horas",
  uma_hora: "Em até 1 hora",
};

const NIVEL_BADGE_URGENTE: Record<AgendaProximo["nivel"], string> = {
  dia: "bg-amber-100 text-amber-900 border-amber-200",
  duas_horas: "bg-orange-100 text-orange-900 border-orange-200",
  uma_hora: "bg-red-100 text-red-800 border-red-200",
};

/** Tom neutro para administração — sem pressão visual. */
const NIVEL_BADGE_INFO = "bg-slate-100 text-slate-700 border-slate-200";

function formatQuando(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRestante(ms: number) {
  const totalMin = Math.max(0, Math.round(ms / 60_000));
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h < 24) return m > 0 ? `${h}h ${m}min` : `${h}h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh > 0 ? `${d}d ${rh}h` : `${d}d`;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proximos: AgendaProximo[];
  urgencia: AgendaUrgencia;
  /** Admin: aviso informativo da equipe, sem tom de urgência pessoal. */
  informativo?: boolean;
  onGoAgenda: () => void;
};

export function AgendaLembretesDialog({
  open,
  onOpenChange,
  proximos,
  urgencia,
  informativo = false,
  onGoAgenda,
}: Props) {
  if (!proximos?.length) return null;

  const titulo = informativo
    ? "Agenda da equipe"
    : urgencia === "uma_hora"
      ? "Compromisso em menos de 1 hora"
      : urgencia === "duas_horas"
        ? "Compromisso em menos de 2 horas"
        : "Compromissos nas próximas 24 horas";

  const descricao = informativo
    ? `${proximos.length} compromisso${proximos.length > 1 ? "s" : ""} da equipe nas próximas 24h — apenas para sua informação.`
    : `Você tem ${proximos.length} compromisso${proximos.length > 1 ? "s" : ""} próximo${proximos.length > 1 ? "s" : ""}.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock
              className={cn(
                "w-5 h-5",
                informativo
                  ? "text-slate-500"
                  : urgencia === "uma_hora"
                    ? "text-red-600"
                    : urgencia === "duas_horas"
                      ? "text-orange-600"
                      : "text-amber-600",
              )}
            />
            {titulo}
          </DialogTitle>
          <DialogDescription>{descricao}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {proximos.map((p) => {
            const contatoLabel =
              p.leadTipo === "cliente" ? "Cliente" : p.leadNome ? "Lead" : null;
            return (
              <div
                key={p.id}
                className="rounded-lg border bg-card px-3 py-2.5 space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-snug">{p.titulo}</p>
                  <Badge
                    variant="outline"
                    className={cn(
                      STATUS_CHIP_CLASS,
                      "shrink-0",
                      informativo
                        ? NIVEL_BADGE_INFO
                        : NIVEL_BADGE_URGENTE[p.nivel],
                    )}
                    title={NIVEL_LABEL[p.nivel]}
                  >
                    {NIVEL_LABEL[p.nivel]}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatQuando(p.startsAt)}
                  {!informativo
                    ? ` · falta ${formatRestante(p.msRestante)}`
                    : null}
                </p>
                <div className="flex flex-col gap-1">
                  {p.publicoLabel ? (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Network className="w-3 h-3 shrink-0" />
                      <span>{p.publicoLabel}</span>
                    </p>
                  ) : null}
                  {p.equipeNome && !p.publicoLabel?.startsWith("Equipe:") ? (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Network className="w-3 h-3 shrink-0" />
                      <span>Equipe: {p.equipeNome}</span>
                    </p>
                  ) : null}
                  {p.leadNome && contatoLabel ? (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User className="w-3 h-3 shrink-0" />
                      <span>
                        {contatoLabel}: {p.leadNome}
                      </span>
                    </p>
                  ) : null}
                  {p.corretorNome ? (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Briefcase className="w-3 h-3 shrink-0" />
                      <span>Corretor: {p.corretorNome}</span>
                    </p>
                  ) : null}
                  {p.gerenteNome && !p.publicoLabel?.startsWith("Gerente:") ? (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="w-3 h-3 shrink-0" />
                      <span>Gerente: {p.gerenteNome}</span>
                    </p>
                  ) : null}
                  {!p.corretorNome &&
                  !p.gerenteNome &&
                  !p.publicoLabel &&
                  p.autorNome ? (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="w-3 h-3 shrink-0" />
                      <span>Criado por: {p.autorNome}</span>
                    </p>
                  ) : null}
                  {p.local ? (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span>{p.local}</span>
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Entendi
          </Button>
          <Button
            variant={informativo ? "secondary" : "default"}
            onClick={onGoAgenda}
          >
            Ver Agenda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
