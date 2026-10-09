import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  AgendaBoard,
  formatRangeLabel,
  getVisibleRange,
  startOfMonth,
  type AgendaViewMode,
} from "@/components/agenda-board";
import {
  AgendaLuxHeader,
  AgendaLuxKpis,
  AgendaLuxMiniCalendar,
  AgendaLuxQuickActions,
  AgendaLuxShell,
  AgendaLuxTypeChips,
  AgendaLuxUpcoming,
} from "@/components/agenda-lux";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import {
  AGENDAMENTO_STATUS_LABEL,
  fetchAgendaKpis,
  fetchAgendamentos,
  getAgendamentoVisual,
  updateAgendamento,
  type AgendaKpis,
  type Agendamento,
  type AgendamentoStatus,
} from "@/lib/agenda-api";
import { cn } from "@/lib/utils";

function shiftAnchor(view: AgendaViewMode, anchor: Date, dir: -1 | 1) {
  const next = new Date(anchor);
  if (view === "dia") next.setDate(next.getDate() + dir);
  else if (view === "semana") next.setDate(next.getDate() + dir * 7);
  else next.setMonth(next.getMonth() + dir);
  return next;
}

export function TarefasAgendaPainel() {
  const navigate = useNavigate();
  const [visao, setVisao] = useState<AgendaViewMode>("semana");
  const [anchor, setAnchor] = useState(() => new Date());
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [items, setItems] = useState<Agendamento[]>([]);
  const [kpis, setKpis] = useState<AgendaKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [tipo, setTipo] = useState("__all__");
  const [status, setStatus] = useState("__all__");
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

  useEffect(() => {
    void fetchAgendaKpis()
      .then(setKpis)
      .catch(() => setKpis(null));
  }, []);

  const visiveis = items.filter((item) => {
    if (tipo !== "__all__" && getAgendamentoVisual(item) !== tipo) return false;
    if (status !== "__all__" && item.status !== status) return false;
    return true;
  });

  function selecionarDia(day: Date) {
    setAnchor(day);
    setCalendarMonth(startOfMonth(day));
  }

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
    <AgendaLuxShell>
      <AgendaLuxHeader
        actions={
          <Button type="button" onClick={() => void navigate({ to: "/agenda" })}>
            Novo compromisso
          </Button>
        }
      />
      <AgendaLuxKpis kpis={kpis} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <div className="mb-3 flex flex-col gap-2 rounded-xl border border-[#E6EDF2] bg-white px-3 py-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => selecionarDia(new Date())}
              >
                Hoje
              </Button>
              <div className="inline-flex items-center rounded-lg border border-[#E2E8EC] p-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => setAnchor((current) => shiftAnchor(visao, current, -1))}
                  aria-label="Anterior"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => setAnchor((current) => shiftAnchor(visao, current, 1))}
                  aria-label="Próximo"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
              <h2 className="min-w-0 text-base font-semibold capitalize text-[#0B3148]">
                {formatRangeLabel(visao, anchor)}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg border border-[#E2E8EC] bg-white p-0.5">
                {(
                  [
                    ["dia", "Dia"],
                    ["semana", "Semana"],
                    ["mes", "Mês"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setVisao(id)}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                      visao === id
                        ? "bg-[#079ED4] text-white"
                        : "text-[#5C6B76] hover:bg-[#F3FAFD] hover:text-[#0B3148]",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9 w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos os status</SelectItem>
                  {(Object.keys(AGENDAMENTO_STATUS_LABEL) as AgendamentoStatus[]).map((id) => (
                    <SelectItem key={id} value={id}>
                      {AGENDAMENTO_STATUS_LABEL[id]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mb-2">
            <AgendaLuxTypeChips value={tipo} onChange={setTipo} />
          </div>
          <AgendaBoard
            view={visao}
            anchor={anchor}
            items={visiveis}
            loading={loading}
            onSelectDay={selecionarDia}
            onCreateAt={selecionarDia}
            onEdit={(item) => {
              setEditando(item);
              setTitulo(item.titulo);
              setLocal(item.local ?? "");
            }}
          />
        </div>
        <aside className="space-y-3">
          <AgendaLuxMiniCalendar
            month={calendarMonth}
            selected={anchor}
            items={items}
            onSelect={selecionarDia}
            onShiftMonth={(dir) =>
              setCalendarMonth((current) =>
                startOfMonth(new Date(current.getFullYear(), current.getMonth() + dir, 1)),
              )
            }
          />
          <AgendaLuxUpcoming
            items={visiveis}
            onOpen={(item) => {
              setEditando(item);
              setTitulo(item.titulo);
              setLocal(item.local ?? "");
            }}
          />
          <AgendaLuxQuickActions
            onCreate={() => void navigate({ to: "/agenda" })}
            onBlock={() => void navigate({ to: "/agenda" })}
          />
        </aside>
      </div>

      <Dialog open={editando != null} onOpenChange={(aberto) => { if (!aberto) setEditando(null); }}>
        <DialogContent className="max-w-md gap-0 overflow-hidden p-0 sm:rounded-xl">
          {editando ? (
            <>
              <div className="border-b border-[#E6EDF2] px-5 pb-4 pt-5 pr-12">
                <DialogHeader className="space-y-1 text-left">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#05749E]">
                    Compromisso
                  </p>
                  <DialogTitle className="text-lg font-semibold tracking-tight text-[#0B3148]">
                    {editando.titulo}
                  </DialogTitle>
                </DialogHeader>
              </div>
              <div className="space-y-3 px-5 py-4">
                <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
                <Input value={local} placeholder="Local" onChange={(e) => setLocal(e.target.value)} />
              </div>
              <div className="flex flex-wrap justify-end gap-2 border-t border-[#E6EDF2] px-5 py-3">
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
    </AgendaLuxShell>
  );
}
