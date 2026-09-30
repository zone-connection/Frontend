import { useEffect, useState } from "react";
import { CalendarClock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AgendamentoTipoOption } from "@/components/agenda-tipo-option";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TimePicker } from "@/components/time-picker";
import { ApiError } from "@/lib/api";
import {
  createAgendamento,
  type AgendamentoTipo,
} from "@/lib/agenda-api";

const ACTIVITY_TIPOS = [
  "ligacao",
  "visita",
  "reuniao",
  "tarefa",
  "outro",
] as const satisfies readonly AgendamentoTipo[];

type ActivityTipo = (typeof ACTIVITY_TIPOS)[number];

export type LeadAtividadePrompt = {
  leadId: string;
  leadNome: string;
  stage: string;
  stageName: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function roundNextHalfHour(from = new Date()) {
  const d = new Date(from);
  d.setSeconds(0, 0);
  const minutes = d.getMinutes();
  const add =
    minutes === 0 || minutes === 30
      ? 30
      : minutes < 30
        ? 30 - minutes
        : 60 - minutes;
  d.setMinutes(d.getMinutes() + add);
  return d;
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function hm(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toLocalIso(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0).toISOString();
}

function activityTitle(tipo: ActivityTipo, nome: string) {
  if (tipo === "ligacao") return `Ligação ${nome}`;
  if (tipo === "visita") return `Visita ${nome}`;
  if (tipo === "reuniao") return `Reunião ${nome}`;
  if (tipo === "tarefa") return `Tarefa ${nome}`;
  return `Atividade ${nome}`;
}

function defaultSchedule() {
  const start = roundNextHalfHour();
  const end = new Date(start.getTime() + 30 * 60_000);
  return { data: ymd(start), inicio: hm(start), fim: hm(end) };
}

export function LeadAtividadeDialog({
  prompt,
  onClose,
  onCreated,
}: {
  prompt: LeadAtividadePrompt | null;
  onClose: () => void;
  onCreated?: (leadId: string) => void | Promise<void>;
}) {
  const [tipo, setTipo] = useState<ActivityTipo>("ligacao");
  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState("");
  const [inicio, setInicio] = useState("09:00");
  const [fim, setFim] = useState("09:30");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!prompt) return;
    const next = defaultSchedule();
    setTipo("ligacao");
    setTitulo(activityTitle("ligacao", prompt.leadNome));
    setData(next.data);
    setInicio(next.inicio);
    setFim(next.fim);
    setSaving(false);
  }, [prompt]);

  function changeTipo(next: ActivityTipo) {
    setTipo(next);
    if (!prompt) return;
    const defaults = ACTIVITY_TIPOS.map((t) =>
      activityTitle(t, prompt.leadNome),
    );
    if (!titulo.trim() || defaults.includes(titulo)) {
      setTitulo(activityTitle(next, prompt.leadNome));
    }
  }

  async function submit() {
    if (!prompt) return;
    const nome = titulo.trim();
    if (nome.length < 2) {
      toast.error("Informe o título da atividade.");
      return;
    }
    if (!data) {
      toast.error("Informe a data.");
      return;
    }
    const startsAt = toLocalIso(data, inicio);
    const endsAt = toLocalIso(data, fim);
    if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      toast.error("O horário de término deve ser depois do início.");
      return;
    }

    setSaving(true);
    try {
      await createAgendamento({
        leadId: prompt.leadId,
        titulo: nome,
        tipo,
        escopo: "pessoal",
        startsAt,
        endsAt,
        funilStage: prompt.stage,
        observacoes: `Atividade do lead · etapa ${prompt.stageName}.`,
      });
      toast.success(
        tipo === "tarefa"
          ? "Tarefa registrada. O lead saiu do atraso."
          : "Atividade agendada. O lead saiu do atraso.",
      );
      await onCreated?.(prompt.leadId);
      onClose();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível agendar a atividade.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={Boolean(prompt)}
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <DialogTitle>Adicionar atividade</DialogTitle>
              <DialogDescription>
                {prompt
                    ? `Registre um compromisso para ${prompt.leadNome}. O lead sai do atraso, e este compromisso não volta a colocá-lo em atraso.`
                  : null}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="lead-atividade-tipo">Tipo</Label>
              <Select
                value={tipo}
                onValueChange={(v) => changeTipo(v as ActivityTipo)}
                disabled={saving}
              >
                <SelectTrigger id="lead-atividade-tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TIPOS.map((item) => (
                    <SelectItem key={item} value={item}>
                      <AgendamentoTipoOption tipo={item} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-atividade-data">Data</Label>
              <Input
                id="lead-atividade-data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-atividade-titulo">Título</Label>
            <Input
              id="lead-atividade-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={160}
              disabled={saving}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lead-atividade-inicio">Início</Label>
              <TimePicker
                id="lead-atividade-inicio"
                value={inicio}
                onChange={setInicio}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lead-atividade-fim">Término</Label>
              <TimePicker id="lead-atividade-fim" value={fim} onChange={setFim} />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button type="button" disabled={saving} onClick={() => void submit()}>
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Agendar atividade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
