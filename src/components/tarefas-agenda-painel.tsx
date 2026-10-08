import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AgendaBoard,
  getVisibleRange,
  type AgendaViewMode,
} from "@/components/agenda-board";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  AGENDAMENTO_TIPO_LABEL,
  fetchAgendamentos,
  updateAgendamento,
  type Agendamento,
} from "@/lib/agenda-api";
import { ApiError } from "@/lib/api";

export function TarefasAgendaPainel() {
  const [visao, setVisao] = useState<AgendaViewMode>("semana");
  const [anchor, setAnchor] = useState(() => new Date());
  const [items, setItems] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipo, setTipo] = useState("");
  const [status, setStatus] = useState("");
  const [editando, setEditando] = useState<Agendamento | null>(null);
  const [titulo, setTitulo] = useState("");
  const [local, setLocal] = useState("");

  async function carregar() {
    const range = getVisibleRange(visao, anchor);
    setLoading(true);
    try {
      const data = await fetchAgendamentos({
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      });
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, [visao, anchor]);

  const visiveis = items.filter((item) => {
    if (tipo && item.tipo !== tipo) return false;
    if (status && item.status !== status) return false;
    return true;
  });

  async function mudarStatus(item: Agendamento, statusNovo: "concluido" | "cancelado") {
    try {
      await updateAgendamento(item.id, { status: statusNovo });
      setEditando(null);
      await carregar();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível atualizar.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Agenda</h1>
          <p className="text-sm text-muted-foreground">
            Dia, semana e mês. Clique num compromisso para concluir, cancelar ou editar.
          </p>
        </div>
        <div className="flex gap-1 rounded-xl bg-muted/60 p-1">
          {(["dia", "semana", "mes"] as const).map((id) => (
            <button
              key={id}
              type="button"
              className={`rounded-lg px-3 py-1.5 text-sm ${visao === id ? "bg-background font-medium shadow-sm" : "text-muted-foreground"}`}
              onClick={() => setVisao(id)}
            >
              {id === "dia" ? "Dia" : id === "semana" ? "Semana" : "Mês"}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <p className="rounded-2xl border bg-card px-4 py-3 text-sm">Agendados <strong className="ml-2 text-lg">{visiveis.filter((item) => item.status === "agendado").length}</strong></p>
        <p className="rounded-2xl border bg-card px-4 py-3 text-sm">Concluídos <strong className="ml-2 text-lg">{visiveis.filter((item) => item.status === "concluido").length}</strong></p>
        <p className="rounded-2xl border bg-card px-4 py-3 text-sm">Cancelados <strong className="ml-2 text-lg">{visiveis.filter((item) => item.status === "cancelado").length}</strong></p>
      </div>
      <div className="flex flex-wrap gap-2">
        <select className="h-10 rounded-xl border bg-white px-3 text-sm" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="">Todos os tipos</option>
          {Object.entries(AGENDAMENTO_TIPO_LABEL).map(([id, label]) => (
            <option key={id} value={id}>{label}</option>
          ))}
        </select>
        <select className="h-10 rounded-xl border bg-white px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="agendado">Agendado</option>
          <option value="concluido">Concluído</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>
      <AgendaBoard
        view={visao}
        anchor={anchor}
        items={visiveis}
        loading={loading}
        onSelectDay={setAnchor}
        onCreateAt={(day) => setAnchor(day)}
        onEdit={(item) => {
          setEditando(item);
          setTitulo(item.titulo);
          setLocal(item.local ?? "");
        }}
      />
      <Dialog open={editando != null} onOpenChange={(aberto) => { if (!aberto) setEditando(null); }}>
        <DialogContent>
          {editando ? (
            <>
              <DialogHeader>
                <DialogTitle>Compromisso</DialogTitle>
              </DialogHeader>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
              <Input value={local} placeholder="Local" onChange={(e) => setLocal(e.target.value)} />
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => void mudarStatus(editando, "cancelado")}>
                  Cancelar
                </Button>
                <Button type="button" variant="outline" onClick={() => void mudarStatus(editando, "concluido")}>
                  Concluir
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    void updateAgendamento(editando.id, {
                      titulo: titulo.trim(),
                      local: local.trim() || null,
                    }).then(() => {
                      setEditando(null);
                      return carregar();
                    });
                  }}
                >
                  Salvar
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
