import { useEffect, useState } from "react";
import { CalendarClock, Loader2 } from "lucide-react";
import { toast } from "sonner";
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
import { TimePicker } from "@/components/time-picker";
import { ApiError } from "@/lib/api";
import { createAgendamento } from "@/lib/agenda-api";

export type FunilTarefaPrompt = {
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

function defaultForm(leadNome: string) {
  const start = roundNextHalfHour();
  const end = new Date(start.getTime() + 30 * 60_000);
  return {
    titulo: `Follow-up ${leadNome}`,
    data: ymd(start),
    inicio: hm(start),
    fim: hm(end),
  };
}

export function FunilTarefaDialog({
  prompt,
  onClose,
  onCreated,
}: {
  prompt: FunilTarefaPrompt | null;
  onClose: () => void;
  onCreated?: () => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [data, setData] = useState("");
  const [inicio, setInicio] = useState("09:00");
  const [fim, setFim] = useState("09:30");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!prompt) return;
    const next = defaultForm(prompt.leadNome);
    setTitulo(next.titulo);
    setData(next.data);
    setInicio(next.inicio);
    setFim(next.fim);
    setSaving(false);
  }, [prompt]);

  async function submit() {
    if (!prompt) return;
    const nome = titulo.trim();
    if (nome.length < 2) {
      toast.error("Informe o título da tarefa.");
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
        tipo: "tarefa",
        escopo: "pessoal",
        startsAt,
        endsAt,
        funilStage: prompt.stage,
        observacoes: `Etapa do funil: ${prompt.stageName}.`,
        contaAtraso: true,
      });
      toast.success("Tarefa criada na agenda.");
      onCreated?.();
      onClose();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível criar a tarefa.",
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
              <DialogTitle>Criar tarefa?</DialogTitle>
              <DialogDescription>
                {prompt
                  ? `${prompt.leadNome} foi para ${prompt.stageName}. Se este follow-up vencer sem conclusão, o lead entra em atraso.`
                  : null}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="funil-tarefa-titulo">Título</Label>
            <Input
              id="funil-tarefa-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={160}
              disabled={saving}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="funil-tarefa-data">Data</Label>
            <Input
              id="funil-tarefa-data"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="funil-tarefa-inicio">Início</Label>
              <TimePicker
                id="funil-tarefa-inicio"
                value={inicio}
                onChange={setInicio}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="funil-tarefa-fim">Término</Label>
              <TimePicker id="funil-tarefa-fim" value={fim} onChange={setFim} />
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
            Não, obrigado
          </Button>
          <Button type="button" disabled={saving} onClick={() => void submit()}>
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Criar tarefa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
