import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  AgendaBoard,
  formatRangeLabel,
  getVisibleRange,
  startOfMonth,
  toDateInput,
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
  fetchSolicitacoesAgenda,
  aprovarAgendamento,
  recusarAgendamento,
  getAgendamentoVisual,
  updateAgendamento,
  type AgendaKpis,
  type Agendamento,
  type AgendamentoStatus,
  type AgendamentoTipo,
} from "@/lib/agenda-api";
import { getSession } from "@/lib/auth";
import { fetchEquipes } from "@/lib/equipes-api";
import { fetchEmpreendimentos } from "@/lib/empreendimentos-api";
import { canViewTeamData } from "@/lib/permissions";
import { fetchUsers } from "@/lib/users-api";
import { cn } from "@/lib/utils";

function kpisDoPeriodo(atual: Agendamento[], anterior: Agendamento[]): AgendaKpis {
  const contar = (lista: Agendamento[]) => {
    const ativos = lista.filter((item) => item.status !== "cancelado" && getAgendamentoVisual(item) !== "aniversario");
    return {
      compromissos: ativos.length,
      atendimentos: ativos.filter((item) => item.tipo === "ligacao").length,
      reunioes: ativos.filter((item) => item.tipo === "reuniao").length,
      propostas: ativos.filter((item) => item.tipo === "tarefa" || /proposta/i.test(item.titulo)).length,
      visitas: ativos.filter((item) => item.tipo === "visita").length,
    };
  };
  const agora = contar(atual);
  const antes = contar(anterior);
  const card = (chave: keyof typeof agora) => ({ hoje: agora[chave], ontem: antes[chave] });
  return {
    compromissos: card("compromissos"),
    atendimentos: card("atendimentos"),
    reunioes: card("reunioes"),
    propostas: card("propostas"),
    visitas: card("visitas"),
  };
}

function shiftAnchor(view: AgendaViewMode, anchor: Date, dir: -1 | 1) {
  const next = new Date(anchor);
  if (view === "dia") next.setDate(next.getDate() + dir);
  else if (view === "semana") next.setDate(next.getDate() + dir * 7);
  else next.setMonth(next.getMonth() + dir);
  return next;
}

export function TarefasAgendaPainel({
  compacto = false,
  visaoInicial,
  anchorYmd,
  onAnchorYmd,
  onCreateAt,
}: {
  compacto?: boolean;
  visaoInicial?: AgendaViewMode;
  anchorYmd?: string;
  onAnchorYmd?: (ymd: string) => void;
  onCreateAt?: (day: Date, hour?: number) => void;
} = {}) {
  const session = getSession();
  const gestor = canViewTeamData(session?.role);
  const gerente = session?.role === "gerente" || session?.role === "admin" || session?.role === "super_admin";
  const [visao, setVisao] = useState<AgendaViewMode>(visaoInicial ?? "semana");
  useEffect(() => {
    if (visaoInicial) setVisao(visaoInicial);
  }, [visaoInicial]);
  const [anchor, setAnchor] = useState(() => (anchorYmd ? new Date(`${anchorYmd}T12:00:00`) : new Date()));
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [items, setItems] = useState<Agendamento[]>([]);
  const [kpis, setKpis] = useState<AgendaKpis | null>(null);
  const [kpisMes, setKpisMes] = useState<AgendaKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [tipo, setTipo] = useState("__all__");
  const [status, setStatus] = useState("__all__");
  const [equipeId, setEquipeId] = useState("__all__");
  const [corretorId, setCorretorId] = useState("__all__");
  const [empreendimentoId, setEmpreendimentoId] = useState("__all__");
  const [equipes, setEquipes] = useState<{ id: string; nome: string }[]>([]);
  const [corretores, setCorretores] = useState<{ id: string; name: string }[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<{ id: string; nome: string }[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<Agendamento[]>([]);
  const [editando, setEditando] = useState<Agendamento | null>(null);
  const [titulo, setTitulo] = useState("");
  const [local, setLocal] = useState("");

  const carregar = useCallback(async () => {
    const range = getVisibleRange(visao, anchor);
    setLoading(true);
    try {
      const tipoApi = tipo !== "__all__" && tipo !== "aniversario" ? (tipo as AgendamentoTipo) : undefined;
      const [data, sols, kpiData] = await Promise.all([
        fetchAgendamentos({
          from: range.from.toISOString(),
          to: range.to.toISOString(),
          equipeId: gestor && equipeId !== "__all__" ? equipeId : undefined,
          corretorId: gestor && corretorId !== "__all__" ? corretorId : undefined,
          empreendimentoId: empreendimentoId !== "__all__" ? empreendimentoId : undefined,
          tipo: tipoApi,
          status: status !== "__all__" ? (status as AgendamentoStatus) : undefined,
        }),
        gerente || session?.role === "corretor" ? fetchSolicitacoesAgenda().catch(() => []) : Promise.resolve([]),
        fetchAgendaKpis({
          equipeId: gestor && equipeId !== "__all__" ? equipeId : undefined,
          corretorId: gestor && corretorId !== "__all__" ? corretorId : undefined,
        }).catch(() => null),
      ]);
      setItems(data);
      setSolicitacoes(sols);
      setKpis(kpiData);
      if (visao === "mes") {
        const anterior = getVisibleRange("mes", shiftAnchor("mes", anchor, -1));
        const prev = await fetchAgendamentos({
          from: anterior.from.toISOString(),
          to: anterior.to.toISOString(),
          equipeId: gestor && equipeId !== "__all__" ? equipeId : undefined,
          corretorId: gestor && corretorId !== "__all__" ? corretorId : undefined,
          empreendimentoId: empreendimentoId !== "__all__" ? empreendimentoId : undefined,
          tipo: tipoApi,
          status: status !== "__all__" ? (status as AgendamentoStatus) : undefined,
        }).catch(() => []);
        setKpisMes(kpisDoPeriodo(data, prev));
      } else {
        setKpisMes(null);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [visao, anchor, gestor, gerente, session?.role, equipeId, corretorId, empreendimentoId, tipo, status]);

  useEffect(() => {
    if (visaoInicial) setVisao(visaoInicial);
  }, [visaoInicial]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (!gestor) return;
    void fetchEquipes().then((rows) => setEquipes(rows.filter((item) => item.status === "ativo").map((item) => ({ id: item.id, nome: item.name })))).catch(() => setEquipes([]));
    void fetchUsers({ status: "ativo", page: 1, limit: 100 }).then((res) => setCorretores(res.data.filter((item) => item.role !== "super_admin").map((item) => ({ id: item.id, name: item.name })))).catch(() => setCorretores([]));
    void fetchEmpreendimentos({ ativo: true }).then((rows) => setEmpreendimentos(rows.map((item) => ({ id: item.id, nome: item.nome })))).catch(() => setEmpreendimentos([]));
  }, [gestor]);

  const visiveis = items.filter((item) => {
    if (tipo !== "__all__" && getAgendamentoVisual(item) !== tipo) return false;
    if (status !== "__all__" && item.status !== status) return false;
    return true;
  });

  function selecionarDia(day: Date) {
    setAnchor(day);
    setCalendarMonth(startOfMonth(day));
    onAnchorYmd?.(toDateInput(day));
  }

  function criarNoHorario(day: Date, hour?: number) {
    if (onCreateAt) {
      onCreateAt(day, hour);
      return;
    }
    selecionarDia(day);
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
      {compacto ? null : (
      <>
      <AgendaLuxHeader
        actions={
          <Button type="button" onClick={() => onCreateAt?.(anchor)}>
            Novo compromisso
          </Button>
        }
      />
      <AgendaLuxKpis kpis={kpis} />
      </>
      )}
      {visao === "mes" ? <AgendaLuxKpis kpis={kpisMes} escopo="mes" /> : null}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <div className="mb-3 flex flex-col gap-2 rounded-xl border border-[#E6EDF2] bg-white px-3 py-2 dark:border-white/10 dark:bg-[#141a22] lg:flex-row lg:items-center lg:justify-between">
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
              <h2 className="min-w-0 text-base font-semibold capitalize text-[#0B3148] dark:text-[#f8fafc]">
                {formatRangeLabel(visao, anchor)}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {compacto ? null : (
              <div className="inline-flex rounded-lg border border-[#E2E8EC] bg-white p-0.5 dark:border-white/15 dark:bg-[#0b0f14]">
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
                        : "text-[#5C6B76] hover:bg-[#F3FAFD] hover:text-[#0B3148] dark:text-[#94a3b8] dark:hover:bg-[#1c2430] dark:hover:text-[#f8fafc]",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              )}
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
          {gestor ? (
            <div className="mb-2 grid gap-2 sm:grid-cols-3">
              <Filtro label="Equipe" value={equipeId} onChange={setEquipeId} options={[{ id: "__all__", label: "Todas as equipes" }, ...equipes.map((item) => ({ id: item.id, label: item.nome }))]} />
              <Filtro label="Corretor" value={corretorId} onChange={setCorretorId} options={[{ id: "__all__", label: "Minha agenda" }, ...corretores.map((item) => ({ id: item.id, label: item.name }))]} />
              <Filtro label="Empreendimento" value={empreendimentoId} onChange={setEmpreendimentoId} options={[{ id: "__all__", label: "Todos os imóveis" }, ...empreendimentos.map((item) => ({ id: item.id, label: item.nome }))]} />
            </div>
          ) : null}
          {solicitacoes.length > 0 ? (
            <ul className="mb-2 divide-y rounded-xl border bg-card">
              {solicitacoes.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="font-medium">{item.titulo}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{new Date(item.startsAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
                  </span>
                  {gerente ? (
                    <span className="flex gap-1">
                      <Button type="button" size="sm" onClick={() => void aprovarAgendamento(item.id).then(() => carregar())}>Aprovar</Button>
                      <Button type="button" size="sm" variant="destructive" onClick={() => void recusarAgendamento(item.id).then(() => carregar())}>Recusar</Button>
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Aguardando o gerente</span>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
          <AgendaBoard
            view={visao}
            anchor={anchor}
            items={visiveis}
            loading={loading}
            onSelectDay={selecionarDia}
            onCreateAt={criarNoHorario}
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
            onCreate={() => onCreateAt?.(anchor)}
            onBlock={() => onCreateAt?.(anchor)}
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
                  <DialogTitle className="text-lg font-semibold tracking-tight text-[#0B3148] dark:text-[#f8fafc]">
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

function Filtro({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9" aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {options.map((item) => (
          <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
