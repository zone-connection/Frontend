import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { createAgendamento } from "@/lib/agenda-api";
import {
  appendEventoLocal,
  type AcompanhamentoItem,
} from "@/lib/captacao-acompanhamento";
import { toast } from "sonner";

const CANAIS = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "ligacao", label: "Ligação" },
  { id: "visita", label: "Visita" },
  { id: "presencial", label: "Presencial" },
] as const;

const INTERLOCUTORES = [
  { id: "proprietario", label: "Proprietário" },
  { id: "conjuge", label: "Cônjuge" },
  { id: "outro", label: "Outro" },
] as const;

const RESULTADOS = [
  { id: "combinou_visita", label: "Combinou visita" },
  { id: "pediu_tempo", label: "Pediu tempo" },
  { id: "aceitou_ajuste", label: "Aceitou ajuste de valor" },
  { id: "recusou", label: "Recusou" },
  { id: "nao_atendeu", label: "Não atendeu" },
  { id: "outro", label: "Outro" },
] as const;

type Canal = (typeof CANAIS)[number]["id"];
type Interlocutor = (typeof INTERLOCUTORES)[number]["id"];
type Resultado = (typeof RESULTADOS)[number]["id"];

function toLocalIso(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(year!, month! - 1, day, hour, minute, 0, 0).toISOString();
}

function labelOf<T extends { id: string; label: string }>(
  list: readonly T[],
  id: string,
) {
  return list.find((item) => item.id === id)?.label ?? id;
}

export function CaptacaoRegistrarContatoDialog({
  item,
  open,
  onOpenChange,
  onSaved,
}: {
  item: AcompanhamentoItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}) {
  const [canal, setCanal] = useState<Canal>("whatsapp");
  const [interlocutor, setInterlocutor] = useState<Interlocutor>("proprietario");
  const [resultado, setResultado] = useState<Resultado>("pediu_tempo");
  const [nota, setNota] = useState("");
  const [retornoData, setRetornoData] = useState("");
  const [retornoHora, setRetornoHora] = useState("09:00");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCanal("whatsapp");
    setInterlocutor("proprietario");
    setResultado("pediu_tempo");
    setNota("");
    setRetornoData("");
    setRetornoHora("09:00");
  }, [open, item?.id]);

  async function salvar() {
    if (!item) return;
    const canalLabel = labelOf(CANAIS, canal);
    const quemLabel =
      interlocutor === "proprietario"
        ? item.proprietario.nome
        : labelOf(INTERLOCUTORES, interlocutor);
    const resultadoLabel = labelOf(RESULTADOS, resultado);
    const combinado = nota.trim();
    const detalhe = [
      `${canalLabel} com ${quemLabel}`,
      resultadoLabel,
      combinado || null,
    ]
      .filter(Boolean)
      .join(" · ");

    if (retornoData) {
      const hora = retornoHora || "09:00";
      const startsAt = toLocalIso(retornoData, hora);
      const endsAt = new Date(new Date(startsAt).getTime() + 30 * 60_000).toISOString();
      if (Number.isNaN(new Date(startsAt).getTime())) {
        toast.error("Informe uma data de retorno válida.");
        return;
      }
      setSaving(true);
      try {
        await createAgendamento({
          titulo: `Retorno captação · ${item.titulo}`,
          tipo: "tarefa",
          escopo: "pessoal",
          startsAt,
          endsAt,
          observacoes: detalhe,
          imovelId: item.fonte === "api" ? item.imovelId : null,
          contaAtraso: false,
        });
      } catch (err) {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Não foi possível criar o retorno na agenda.",
        );
        setSaving(false);
        return;
      }
      setSaving(false);
    }

    appendEventoLocal(item.id, {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      titulo: "Contato",
      detalhe: retornoData
        ? `${detalhe} · retorno ${new Date(toLocalIso(retornoData, retornoHora || "09:00")).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`
        : detalhe,
      tom: "contato",
    });
    onOpenChange(false);
    onSaved?.();
    toast.success(
      retornoData
        ? "Contato registrado e retorno criado na agenda."
        : "Contato registrado.",
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar contato</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Canal</Label>
              <Select value={canal} onValueChange={(v) => setCanal(v as Canal)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CANAIS.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Com quem falou</Label>
              <Select
                value={interlocutor}
                onValueChange={(v) => setInterlocutor(v as Interlocutor)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERLOCUTORES.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.id === "proprietario"
                        ? item?.proprietario.nome ?? opt.label
                        : opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Resultado</Label>
            <Select
              value={resultado}
              onValueChange={(v) => setResultado(v as Resultado)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESULTADOS.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="retorno-data">Próximo retorno</Label>
              <Input
                id="retorno-data"
                type="date"
                value={retornoData}
                onChange={(e) => setRetornoData(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="retorno-hora">Horário</Label>
              <Input
                id="retorno-hora"
                type="time"
                value={retornoHora}
                onChange={(e) => setRetornoHora(e.target.value)}
                disabled={!retornoData}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Se informar a data, o retorno entra na agenda do corretor.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="contato-nota">O que foi combinado</Label>
            <Textarea
              id="contato-nota"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Opcional"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => void salvar()} disabled={saving || !item}>
            {saving ? "Salvando…" : "Salvar contato"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
