import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Clock3,
  Flag,
  Home,
  Mail,
  Repeat,
  Save,
  Type,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AgendamentoTipoPicker } from "@/components/agenda-tipo-option";
import { AGENDAMENTO_TIPOS, AGENDAMENTO_TIPO_LABEL, type AgendamentoTipo } from "@/lib/agenda-api";
import { TarefasPainel } from "@/components/tarefas-painel";
import { TarefasModuloNav, type TarefaSecao } from "@/components/tarefas-modulo-nav";
import { TarefasAgendaPainel } from "@/components/tarefas-agenda-painel";
import { TarefasVinculos } from "@/components/tarefas-vinculos";
import { hojeYmd, type TarefaVisao } from "@/components/tarefas-calendario";
import { tarefasDemonstracao, type TarefaVisivel } from "@/lib/tarefas-mock";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { getSession, type Role } from "@/lib/auth";
import {
  comentarTarefa,
  createTarefa,
  fetchTarefas,
  fetchTarefasAcesso,
  PRIORIDADE_LABEL,
  updateTarefa,
  type Tarefa,
  type TarefaFiltro,
  type TarefaInput,
  type TarefaLembrete,
  type TarefaPrioridade,
  type TarefaRecorrencia,
} from "@/lib/tarefas-api";
import { fetchUsers } from "@/lib/users-api";
import { fetchEquipes, type Equipe } from "@/lib/equipes-api";
import { fetchLeads } from "@/lib/leads-api";
import { fetchEmpreendimentos } from "@/lib/empreendimentos-api";
import { IdSearchSelect } from "@/components/id-search-select";
import {
  AGENDAMENTO_ALVO_LABEL,
  AGENDAMENTO_ALVOS,
  AGENDAMENTO_ESCOPO_LABEL,
  createAgendamento,
  updateAgendamento,
  type Agendamento,
  type AgendamentoAlvo,
  type AgendamentoEscopo,
  type AgendamentoRecurrenceFreq,
} from "@/lib/agenda-api";
import { rotuloImovel } from "@/components/agenda-visita-ocupacao";
import { cn } from "@/lib/utils";
import { fetchImoveisCaptados, fetchVendasUsado } from "@/lib/imoveis-usados-api";
import { fetchCaptacaoImoveis } from "@/lib/captacao-api";
import { fetchMuralChaves, type MuralChave } from "@/lib/mural-chaves-api";

export const Route = createFileRoute("/_app/tarefas")({
  head: () => ({ meta: [{ title: "Tarefas â€” Zone Connection" }] }),
  component: TarefasPage,
});

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "SÃ¡b"];

function emptyForm(userId: string): TarefaInput {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
  return {
    titulo: "",
    data: today,
    responsavelId: userId,
    horario: "",
    prioridade: "media",
    tipo: "tarefa",
    descricao: "",
    lembrete: "nenhum",
    recorrencia: "nenhuma",
    diasSemana: [],
    intervaloDias: 1,
    lembreteMinutos: 10,
  };
}

function TarefasPage() {
  const session = getSession();
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState<boolean | null>(
    session?.tenant?.plano === "prata" ||
      session?.tenant?.plano === "ouro" ||
      session?.tenant?.tarefasEnabled
      ? true
      : (session?.tenant?.tarefasEnabled ?? null),
  );
  const [secao, setSecao] = useState<TarefaSecao>("geral");
  const [filtro, setFiltro] = useState<TarefaFiltro>("hoje");
  const [visao, setVisao] = useState<TarefaVisao>("lista");
  const [anchor, setAnchor] = useState(hojeYmd);
  const [items, setItems] = useState<TarefaVisivel[]>([]);
  const [demos, setDemos] = useState<TarefaVisivel[]>(() => tarefasDemonstracao());
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [detalhe, setDetalhe] = useState<TarefaVisivel | null>(null);
  const [editing, setEditing] = useState<Tarefa | null>(null);
  const [form, setForm] = useState<TarefaInput>(() =>
    emptyForm(session?.id ?? ""),
  );
  const [users, setUsers] = useState<{ id: string; name: string; role: Role }[]>([]);
  const [leads, setLeads] = useState<{ id: string; nome: string; extra: string; telefone: string }[]>([]);
  const [clientes, setClientes] = useState<{ id: string; nome: string; extra: string; telefone: string }[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<{ id: string; nome: string }[]>([]);
  const [verEquipe, setVerEquipe] = useState(false);
  const [usuarioId, setUsuarioId] = useState("");
  const [nota, setNota] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const acesso = await fetchTarefasAcesso();
      setEnabled(acesso.enabled);
      if (!acesso.enabled) return;
      setItems(await fetchTarefas({ filtro: "todas" }));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Falha ao carregar tarefas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!enabled) return;
    void fetchUsers({ status: "ativo", limit: 200 }).then((res) => {
      setUsers(res.data.map((u) => ({ id: u.id, name: u.name, role: u.role })));
    });
  }, [enabled]);

  useEffect(() => {
    if (!open) return;
    void fetchLeads({ tipo: "lead", limit: 200 }).then((res) => {
      setLeads(
        res.data.map((item) => ({
          id: item.id,
          nome: item.nome,
          extra: [item.telefone, item.cidade].filter(Boolean).join(" "),
          telefone: item.telefone ?? "",
        })),
      );
    });
    void fetchLeads({ tipo: "cliente", limit: 200 }).then((res) => {
      setClientes(
        res.data.map((item) => ({
          id: item.id,
          nome: item.nome,
          extra: [item.telefone, item.cidade].filter(Boolean).join(" "),
          telefone: item.telefone ?? "",
        })),
      );
    });
    void fetchEmpreendimentos({ ativo: true }).then((rows) => {
      setEmpreendimentos(rows.map((item) => ({ id: item.id, nome: item.nome })));
    });
  }, [open]);

  function abrirNova() {
    setEditing(null);
    setNota("");
    setForm(emptyForm(session?.id ?? ""));
    setOpen(true);
  }

  function abrirEdicao(tarefa: Tarefa) {
    setEditing(tarefa);
    setNota("");
    setForm({
      titulo: tarefa.titulo,
      data: tarefa.data,
      responsavelId: tarefa.responsavel.id,
      horario: tarefa.horario ?? "",
      prioridade: tarefa.prioridade,
      tipo: tarefa.tipo ?? "tarefa",
      descricao: tarefa.descricao,
      lembrete: tarefa.lembrete,
      lembreteMinutos: tarefa.lembreteMinutos ?? 10,
      recorrencia: tarefa.recorrencia,
      diasSemana: tarefa.diasSemana,
      intervaloDias: tarefa.intervaloDias ?? 1,
      leadId: tarefa.leadId ?? undefined,
      agendamentoId: tarefa.agendamentoId ?? undefined,
      imovelId: tarefa.imovelId ?? undefined,
      empreendimentoId: tarefa.empreendimentoId ?? undefined,
    });
    setOpen(true);
  }

  async function salvar(extra?: {
    muralChaveId?: string;
    horarioFim?: string;
    local?: string;
    toleranciaAtiva?: boolean;
    escopo?: AgendamentoEscopo;
    alvoTipo?: AgendamentoAlvo;
    alvoEquipeId?: string;
    atribuidoParaId?: string;
    recurrenceFreq?: AgendamentoRecurrenceFreq;
    recurrenceDays?: number[];
    recurrenceUntil?: string;
  }) {
    const tipo = form.tipo ?? "tarefa";
    const titulo = form.titulo.trim();
    if (titulo.length < 2) {
      toast.error("Informe um título.");
      return;
    }
    if ((tipo === "visita" || tipo === "retirada_chave") && !form.imovelId && !form.empreendimentoId) {
      toast.error("Selecione o imóvel ou o empreendimento.");
      return;
    }
    if (tipo === "retirada_chave" && !extra?.muralChaveId) {
      toast.error("Esse imóvel não tem chave livre no mural.");
      return;
    }
    if (tipo === "bloqueio" && !extra?.horarioFim) {
      toast.error("Informe o horário de término do bloqueio.");
      return;
    }
    try {
      if (!editing && tipo !== "tarefa") {
        const inicio = form.horario?.trim() || "09:00";
        const fim = extra?.horarioFim || horaSeguinte(inicio);
        await createAgendamento({
          titulo,
          tipo,
          escopo: extra?.escopo ?? "pessoal",
          atribuidoParaId: extra?.atribuidoParaId || form.responsavelId || null,
          leadId: extra?.atribuidoParaId ? null : form.leadId || null,
          alvoTipo: extra?.alvoTipo && extra.alvoTipo !== "nenhum" ? extra.alvoTipo : undefined,
          alvoEquipeId: extra?.alvoTipo === "equipe" ? extra.alvoEquipeId || null : null,
          startsAt: isoLocal(form.data, inicio),
          endsAt:
            extra?.horarioFim || tipo === "visita" || tipo === "reuniao" || tipo === "bloqueio"
              ? isoLocal(form.data, fim)
              : null,
          local: extra?.local?.trim() || null,
          observacoes: form.descricao?.trim() || null,
          empreendimentoId: form.empreendimentoId || null,
          imovelId: form.imovelId || null,
          muralChaveId: extra?.muralChaveId || null,
          toleranciaAtiva: tipo === "visita" ? Boolean(extra?.toleranciaAtiva) : false,
          recurrenceFreq: tipo === "bloqueio" ? extra?.recurrenceFreq ?? "unica" : undefined,
          recurrenceDays: tipo === "bloqueio" ? extra?.recurrenceDays : undefined,
          recurrenceUntil: tipo === "bloqueio" ? extra?.recurrenceUntil || null : undefined,
        });
      } else {
        const payload: TarefaInput = {
          ...form,
          titulo,
          horario: form.horario?.trim() || undefined,
          leadId: form.leadId || undefined,
          agendamentoId: form.agendamentoId || undefined,
          imovelId: form.imovelId || undefined,
          empreendimentoId: form.empreendimentoId || undefined,
        };
        if (editing) await updateTarefa(editing.id, payload);
        else await createTarefa(payload);
      }
      setOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    }
  }

  const role = session?.role;
  const podeVerEquipe = role === "admin" || role === "super_admin" || role === "gerente";
  const atribuiveis = users.filter((usuario) => {
    if (role === "admin" || role === "super_admin") return true;
    if (role === "gerente") {
      return usuario.role === "corretor" || usuario.role === "treinee" || usuario.id === session?.id;
    }
    return usuario.id === session?.id;
  });
  const usuariosFiltro = users.filter((usuario) => {
    if (role === "admin" || role === "super_admin") return true;
    return usuario.role === "corretor" || usuario.role === "treinee";
  });
  const reais = verEquipe
    ? items.filter((item) => !usuarioId || item.responsavel.id === usuarioId)
    : items.filter((item) => item.responsavel.id === session?.id);
  const painel = verEquipe ? reais : [...demos, ...reais];

  if (open) {
    return (
      <CriarCompromisso
        editing={Boolean(editing)}
        form={form}
        setForm={setForm}
        atribuiveis={atribuiveis}
        leads={leads}
        clientes={clientes}
        empreendimentos={empreendimentos}
        nota={nota}
        setNota={setNota}
        comentarios={editing?.comentarios ?? []}
        onBack={() => setOpen(false)}
        onSave={(extra) => void salvar(extra)}
        onNota={() => {
          if (!editing || !nota.trim()) return;
          void comentarTarefa(editing.id, nota.trim()).then(() => {
            setNota("");
            void load();
          });
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {enabled === false ? (
        <p className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
          Os exemplos abaixo sÃ£o demonstraÃ§Ã£o. Tarefas reais entram a partir do plano Prata.{" "}
          <Link to="/configuracoes" className="underline">
            Conhecer recurso
          </Link>
        </p>
      ) : null}
      <TarefasModuloNav
        secao={secao}
        abertas={painel.filter((item) => item.status === "aberta").length}
        onChange={(next) => {
          setSecao(next);
          if (next === "tarefas" || next === "geral") setVisao("lista");
        }}
      />
      {secao === "calendario" ? (
        <TarefasAgendaPainel />
      ) : secao === "leads" || secao === "imoveis" || secao === "atendimentos" ? (
        <TarefasVinculos secao={secao} items={painel} onOpen={(tarefa) => {
          if (!tarefa.demonstracao) abrirEdicao(tarefa);
        }} />
      ) : (
      <TarefasPainel
        modo={secao === "tarefas" ? "lista" : "geral"}
        items={painel}
        filtro={filtro}
        visao={visao}
        anchor={anchor}
        onFiltro={setFiltro}
        onVisao={setVisao}
        onAnchor={setAnchor}
        onOpen={(tarefa) => setDetalhe(tarefa)}
        onComplete={(tarefa) => {
          if (tarefa.demonstracao) {
            setDemos((current) =>
              current.map((item) =>
                item.id === tarefa.id
                  ? {
                      ...item,
                      status: item.status === "concluida" ? "aberta" : "concluida",
                      atrasada: false,
                    }
                  : item,
              ),
            );
            return;
          }
          void updateTarefa(tarefa.id, {
            status: tarefa.status === "concluida" ? "aberta" : "concluida",
          }).then(load);
        }}
        onCreate={() => {
          if (enabled === false) {
            toast.error("Tarefas reais entram a partir do plano Prata.");
            return;
          }
          abrirNova();
        }}
        podeVerEquipe={podeVerEquipe}
        verEquipe={verEquipe}
        usuarios={usuariosFiltro}
        usuarioId={usuarioId}
        onVerEquipe={(ativo) => {
          setVerEquipe(ativo);
          if (!ativo) setUsuarioId("");
        }}
        onUsuario={setUsuarioId}
      />
      )}
      {loading ? <p className="text-sm text-muted-foreground">Carregando tarefas…</p> : null}

      <Dialog open={detalhe != null} onOpenChange={(aberto) => { if (!aberto) setDetalhe(null); }}>
        <DialogContent className="max-w-md gap-0 overflow-hidden p-0 sm:rounded-xl [&>button]:right-3 [&>button]:top-3 [&>button]:rounded-lg [&>button]:text-[#5C6B76] [&>button]:hover:bg-[#F3FAFD]">
          {detalhe ? (
            <>
              <div className="border-b border-[#E6EDF2] px-5 pb-4 pt-5 pr-12">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#E7F4FA] px-2 py-0.5 text-[11px] font-medium text-[#05749E]">
                    {AGENDAMENTO_TIPO_LABEL[detalhe.tipo ?? "tarefa"]}
                  </span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", PRIORIDADE_CHIP[detalhe.prioridade])}>
                    {PRIORIDADE_LABEL[detalhe.prioridade]}
                  </span>
                </div>
                <DialogHeader className="mt-2 space-y-0 text-left">
                  <DialogTitle className="text-lg font-semibold tracking-tight text-[#0B3148]">
                    {detalhe.titulo}
                  </DialogTitle>
                </DialogHeader>
              </div>
              <div className="space-y-2 px-5 py-4">
                <DetalheLinha icon={CalendarDays} label="Quando" value={formatQuando(detalhe.data, detalhe.horario)} />
                <DetalheLinha icon={UserRound} label="Responsável" value={detalhe.responsavel.name} />
                {detalhe.contexto.lead ? (
                  <DetalheLinha icon={Users} label="Lead" value={detalhe.contexto.lead.nome} />
                ) : null}
                {detalhe.contexto.imovel ? (
                  <DetalheLinha icon={Home} label="Imóvel" value={detalhe.contexto.imovel.rotulo} />
                ) : null}
                {detalhe.descricao ? (
                  <p className="rounded-xl border border-[#E6EDF2] bg-white px-3 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap text-[#16324A]">
                    {detalhe.descricao}
                  </p>
                ) : null}
              </div>
              <div className="flex justify-end gap-2 border-t border-[#E6EDF2] px-5 py-3">
                {detalhe.status === "aberta" ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const atual = detalhe;
                      setDetalhe(null);
                      if (atual.demonstracao) {
                        setDemos((current) =>
                          current.map((item) =>
                            item.id === atual.id ? { ...item, status: "cancelada", atrasada: false } : item,
                          ),
                        );
                        setFiltro("canceladas");
                        return;
                      }
                      void updateTarefa(atual.id, { status: "cancelada" }).then(() => {
                        setFiltro("canceladas");
                        void load();
                      });
                    }}
                  >
                    Cancelar tarefa
                  </Button>
                ) : null}
                {!detalhe.demonstracao ? (
                  <Button
                    type="button"
                    onClick={() => {
                      const atual = detalhe;
                      setDetalhe(null);
                      abrirEdicao(atual);
                    }}
                  >
                    Editar
                  </Button>
                ) : null}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

    </div>
  );
}

const PRIORIDADE_CHIP: Record<TarefaPrioridade, string> = {
  alta: "bg-[#FFD6DE] text-[#C01048]",
  media: "bg-[#FFE4C4] text-[#B54708]",
  baixa: "bg-[#C9F4EC] text-[#0B6E62]",
};

function formatQuando(data: string, horario?: string) {
  const [ano, mes, dia] = data.split("-").map(Number);
  if (!ano || !mes || !dia) return horario ? `${data} · ${horario}` : data;
  const label = new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  return horario ? `${label} · ${horario}` : label;
}

function DetalheLinha({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#E6EDF2] bg-[#F8FBFC] px-3 py-2.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#E7F6FB] text-[#079ED4]">
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] text-[#8B98A3]">{label}</p>
        <p className="truncate text-[13px] font-medium text-[#16324A]">{value}</p>
      </div>
    </div>
  );
}

const selectClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white pl-4 pr-10 text-sm shadow-none";

function horaSeguinte(horario: string) {
  const [hora, minuto] = horario.split(":").map(Number);
  const proxima = Number.isFinite(hora) ? (hora + 1) % 24 : 10;
  return `${String(proxima).padStart(2, "0")}:${String(minuto || 0).padStart(2, "0")}`;
}

function isoLocal(data: string, horario: string) {
  const [ano, mes, dia] = data.split("-").map(Number);
  const [hora, minuto] = horario.split(":").map(Number);
  return new Date(ano, mes - 1, dia, hora || 0, minuto || 0, 0, 0).toISOString();
}

function chaveLivre(chaves: MuralChave[], imovelId?: string, empreendimentoId?: string) {
  const livre = (chave: MuralChave) => chave.status !== "em_uso";
  if (imovelId) {
    return chaves.find((chave) => chave.imovel?.id === imovelId && livre(chave))?.id ?? "";
  }
  if (empreendimentoId) {
    return (
      chaves.find(
        (chave) => chave.empreendimento?.id === empreendimentoId && livre(chave) && !chave.imovel,
      )?.id ??
      chaves.find((chave) => chave.empreendimento?.id === empreendimentoId && livre(chave))?.id ??
      ""
    );
  }
  return "";
}

function CriarCompromisso({
  editing,
  form,
  setForm,
  atribuiveis,
  leads,
  clientes,
  empreendimentos,
  nota,
  setNota,
  comentarios,
  onBack,
  onSave,
  onNota,
}: {
  editing: boolean;
  form: TarefaInput;
  setForm: (form: TarefaInput) => void;
  atribuiveis: { id: string; name: string; role: Role }[];
  leads: { id: string; nome: string; extra: string; telefone: string }[];
  clientes: { id: string; nome: string; extra: string; telefone: string }[];
  empreendimentos: { id: string; nome: string }[];
  nota: string;
  setNota: (nota: string) => void;
  comentarios: { id: string; texto: string; autor: { name: string } }[];
  onBack: () => void;
  onSave: (extra?: { muralChaveId?: string; horarioFim?: string }) => void;
  onNota: () => void;
}) {
  const tipo = form.tipo ?? "tarefa";
  const descricao = form.descricao ?? "";
  const [imoveis, setImoveis] = useState<{ id: string; label: string; hint: string }[]>([]);
  const [chaves, setChaves] = useState<MuralChave[]>([]);
  const [horarioFim, setHorarioFim] = useState("");
  const [local, setLocal] = useState("");
  const [tolerancia, setTolerancia] = useState(false);
  const [escopo, setEscopo] = useState<AgendamentoEscopo>("pessoal");
  const [alvoTipo, setAlvoTipo] = useState<AgendamentoAlvo>("nenhum");
  const [alvoEquipeId, setAlvoEquipeId] = useState("");
  const [atribuidoId, setAtribuidoId] = useState("");
  const [repetir, setRepetir] = useState<AgendamentoRecurrenceFreq>("unica");
  const [repetirAte, setRepetirAte] = useState("");
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const role = getSession()?.role;
  const gestor = role === "admin" || role === "super_admin" || role === "gerente";
  const comPessoa = tipo === "tarefa" || tipo === "ligacao" || tipo === "reuniao" || tipo === "visita";
  const comLugar = tipo === "visita" || tipo === "retirada_chave";
  const chaveId = chaveLivre(chaves, form.imovelId, form.empreendimentoId);
  const chave = chaves.find((item) => item.id === chaveId);

  useEffect(() => {
    if (!comLugar) return;
    void Promise.all([
      fetchEmpreendimentos({ ativo: true }).catch(() => []),
      fetchCaptacaoImoveis().catch(() => []),
      fetchImoveisCaptados().catch(() => []),
      fetchVendasUsado().catch(() => []),
    ]).then(([emps, captados, captacaoSemVenda, vendas]) => {
      const lista = new Map<string, { id: string; label: string; hint: string }>();
      for (const item of emps) {
        lista.set(`emp:${item.id}`, { id: `emp:${item.id}`, label: item.nome, hint: "Lançamento" });
      }
      for (const item of captados) {
        lista.set(`imovel:${item.id}`, {
          id: `imovel:${item.id}`,
          label: rotuloImovel(item),
          hint: "Captação",
        });
      }
      for (const item of captacaoSemVenda) {
        lista.set(`imovel:${item.id}`, {
          id: `imovel:${item.id}`,
          label: rotuloImovel(item),
          hint: "Captação",
        });
      }
      for (const venda of vendas) {
        if (!venda.imovel?.id) continue;
        lista.set(`imovel:${venda.imovel.id}`, {
          id: `imovel:${venda.imovel.id}`,
          label: rotuloImovel(venda.imovel),
          hint: "Venda de usado",
        });
      }
      setImoveis([...lista.values()].sort((a, b) => a.label.localeCompare(b.label, "pt-BR")));
    });
    void fetchMuralChaves()
      .then(setChaves)
      .catch(() => setChaves([]));
  }, [comLugar]);

  useEffect(() => {
    if (!gestor) return;
    void fetchEquipes().then(setEquipes).catch(() => setEquipes([]));
  }, [gestor]);
  return (
    <div className="w-full space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
            <CalendarDays className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {editing ? "Editar compromisso" : "Criar compromisso"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Agende um novo compromisso e mantenha seu time organizado.
            </p>
          </div>
        </div>
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
      </div>

      <div className="space-y-6 rounded-3xl border border-primary/10 bg-gradient-to-br from-card to-primary/[0.03] p-6 shadow-sm">
        <Section icon={CalendarDays} title="Tipo de compromisso" hint="Escolha qual é o tipo de compromisso.">
          <AgendamentoTipoPicker
            appearance="soft"
            value={form.tipo ?? "tarefa"}
            options={AGENDAMENTO_TIPOS}
            onChange={(tipo: AgendamentoTipo) => setForm({ ...form, tipo })}
          />
        </Section>

        <Section icon={Type} title="Título" hint="Descreva rapidamente o compromisso.">
          <Input
            className={selectClass}
            placeholder="Ex: Visita ao imóvel, reunião com cliente..."
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
          />
        </Section>

        <div className="grid gap-4 sm:grid-cols-2">
          <Section icon={CalendarDays} title="Data">
            <Input className={selectClass} type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
          </Section>
          <Section icon={Clock3} title="Horário">
            <Input className={selectClass} type="time" value={form.horario ?? ""} onChange={(e) => setForm({ ...form, horario: e.target.value })} />
          </Section>
        </div>

        <div className={tipo === "tarefa" ? "grid gap-4 sm:grid-cols-2" : undefined}>
        <Section icon={UserRound} title="Responsável">
          <select className={selectClass} value={form.responsavelId} onChange={(e) => setForm({ ...form, responsavelId: e.target.value })}>
            {atribuiveis.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
                {u.role === "corretor" ? " · Corretor" : u.role === "treinee" ? " · Trainee" : ""}
              </option>
            ))}
          </select>
        </Section>
        {tipo === "tarefa" ? (
          <Section icon={Flag} title="Prioridade">
            <select className={selectClass} value={form.prioridade} onChange={(e) => setForm({ ...form, prioridade: e.target.value as TarefaPrioridade })}>
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </select>
          </Section>
        ) : null}
        </div>

        {tipo !== "ligacao" && tipo !== "outro" ? (
          <Section icon={Clock3} title={tipo === "bloqueio" ? "Término" : "Término (opcional)"}>
            <Input className={selectClass} type="time" value={horarioFim} onChange={(e) => setHorarioFim(e.target.value)} />
          </Section>
        ) : null}

        {gestor && tipo !== "bloqueio" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Section icon={Users} title="Quem pode ver">
              <select className={selectClass} value={alvoTipo} onChange={(e) => setAlvoTipo(e.target.value as AgendamentoAlvo)}>
                {AGENDAMENTO_ALVOS.map((alvo) => (
                  <option key={alvo} value={alvo}>{AGENDAMENTO_ALVO_LABEL[alvo]}</option>
                ))}
              </select>
            </Section>
            {alvoTipo === "equipe" ? (
              <Section icon={Users} title="Equipe">
                <select className={selectClass} value={alvoEquipeId} onChange={(e) => setAlvoEquipeId(e.target.value)}>
                  <option value="">Selecione</option>
                  {equipes.map((equipe) => (
                    <option key={equipe.id} value={equipe.id}>{equipe.name}</option>
                  ))}
                </select>
              </Section>
            ) : (
              <Section icon={UserRound} title="Atribuir a">
                <select className={selectClass} value={atribuidoId} onChange={(e) => setAtribuidoId(e.target.value)}>
                  <option value="">Ninguém (minha agenda)</option>
                  {atribuiveis.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </Section>
            )}
          </div>
        ) : null}

        {!gestor && tipo !== "bloqueio" ? (
          <Section icon={Users} title="Participação">
            <select className={selectClass} value={escopo} onChange={(e) => setEscopo(e.target.value as AgendamentoEscopo)}>
              <option value="pessoal">{AGENDAMENTO_ESCOPO_LABEL.pessoal}</option>
              <option value="com_gerente">{AGENDAMENTO_ESCOPO_LABEL.com_gerente}</option>
            </select>
            <p className="text-xs text-muted-foreground">
              {escopo === "com_gerente"
                ? "Será enviada uma solicitação para o gerente aprovar."
                : "Fica só com você, sem aprovação."}
            </p>
          </Section>
        ) : null}

        {tipo === "visita" || tipo === "reuniao" || tipo === "outro" ? (
          <Section icon={Building2} title="Local">
            <Input className={selectClass} value={local} placeholder="Endereço ou sala" onChange={(e) => setLocal(e.target.value)} />
          </Section>
        ) : null}

        {tipo === "visita" ? (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={tolerancia} onChange={(e) => setTolerancia(e.target.checked)} />
            Reservar tolerância depois da visita
          </label>
        ) : null}

        {tipo === "bloqueio" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Section icon={Repeat} title="Repetir bloqueio">
              <select className={selectClass} value={repetir} onChange={(e) => setRepetir(e.target.value as AgendamentoRecurrenceFreq)}>
                <option value="unica">Não repetir</option>
                <option value="semanal">Toda semana</option>
                <option value="mensal">Todo mês</option>
              </select>
            </Section>
            {repetir !== "unica" ? (
              <Section icon={CalendarDays} title="Até">
                <Input className={selectClass} type="date" value={repetirAte} onChange={(e) => setRepetirAte(e.target.value)} />
              </Section>
            ) : null}
          </div>
        ) : null}

        {comPessoa ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Section icon={Users} title="Cliente">
            <IdSearchSelect
              value={clientes.some((item) => item.id === form.leadId) ? form.leadId ?? "" : ""}
              options={clientes.map((item) => ({ id: item.id, label: item.nome, keywords: item.extra, hint: item.telefone }))}
              onChange={(id) => setForm({ ...form, leadId: id || undefined })}
              placeholder="Selecionar cliente"
              searchPlaceholder="Pesquisar cliente…"
              emptyLabel="Nenhum cliente cadastrado"
            />
          </Section>
          <Section icon={Users} title="Lead">
            <IdSearchSelect
              value={leads.some((item) => item.id === form.leadId) ? form.leadId ?? "" : ""}
              options={leads.map((item) => ({ id: item.id, label: item.nome, keywords: item.extra, hint: item.telefone }))}
              onChange={(id) => setForm({ ...form, leadId: id || undefined })}
              placeholder="Selecionar lead"
              searchPlaceholder="Pesquisar lead…"
              emptyLabel="Nenhum lead cadastrado"
            />
          </Section>
        </div>
        ) : null}

        {comLugar ? (
          <Section icon={Building2} title="Imóvel ou lançamento">
            <IdSearchSelect
              value={form.imovelId ? `imovel:${form.imovelId}` : form.empreendimentoId ? `emp:${form.empreendimentoId}` : ""}
              options={imoveis.map((item) => ({ id: item.id, label: item.label, hint: item.hint, keywords: item.hint }))}
              onChange={(id) => {
                if (!id) {
                  setForm({ ...form, imovelId: undefined, empreendimentoId: undefined });
                  return;
                }
                if (id.startsWith("emp:")) {
                  setForm({ ...form, empreendimentoId: id.slice(4), imovelId: undefined });
                  return;
                }
                setForm({ ...form, imovelId: id.slice(7), empreendimentoId: undefined });
              }}
              placeholder="Selecionar imóvel ou lançamento"
              searchPlaceholder="Pesquisar captação, usado ou lançamento…"
              emptyLabel="Nenhum imóvel cadastrado"
            />
            {form.imovelId || form.empreendimentoId ? (
              <p className="text-xs text-muted-foreground">
                {chave
                  ? `A chave ${chave.identificador} será registrada como retirada no mural.`
                  : "Nenhuma chave livre vinculada. O compromisso segue sem retirada."}
              </p>
            ) : null}
          </Section>
        ) : null}

        {tipo === "tarefa" || tipo === "outro" || tipo === "reuniao" ? (
        <Section icon={Type} title="Descrição">
          <div className="relative">
            <Textarea
              className="min-h-28 rounded-xl"
              maxLength={500}
              placeholder="Adicione mais detalhes sobre o compromisso..."
              value={descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value.slice(0, 500) })}
            />
            <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">{descricao.length}/500</span>
          </div>
        </Section>
        ) : null}

        {tipo === "tarefa" ? (
        <>
        <Section icon={Mail} title="Lembrete por e-mail">
          <select className={selectClass} value={form.lembrete} onChange={(e) => setForm({ ...form, lembrete: e.target.value as TarefaLembrete })}>
            <option value="nenhum">Sem lembrete</option>
            <option value="no_horario">No horário da tarefa</option>
            <option value="min_5">5 minutos antes</option>
            <option value="min_15">15 minutos antes</option>
            <option value="min_30">30 minutos antes</option>
            <option value="hora_1">1 hora antes</option>
            <option value="dia_1">1 dia antes</option>
            <option value="personalizado">Personalizado</option>
          </select>
        </Section>
        {form.lembrete === "personalizado" ? (
          <Section icon={Clock3} title="Minutos antes">
            <Input className={selectClass} type="number" min={0} value={form.lembreteMinutos ?? 0} onChange={(e) => setForm({ ...form, lembreteMinutos: Number(e.target.value) })} />
          </Section>
        ) : null}
        <Section icon={Repeat} title="Recorrência">
          <select className={selectClass} value={form.recorrencia} onChange={(e) => setForm({ ...form, recorrencia: e.target.value as TarefaRecorrencia })}>
            <option value="nenhuma">Não repetir</option>
            <option value="diaria">Diariamente</option>
            <option value="semanal">Semanalmente</option>
            <option value="mensal">Mensalmente</option>
            <option value="dias_especificos">Dias específicos</option>
            <option value="personalizado">Personalizado</option>
          </select>
        </Section>
        {form.recorrencia === "dias_especificos" ? (
          <div className="flex flex-wrap gap-2">
            {DIAS.map((dia, index) => {
              const on = form.diasSemana?.includes(index);
              return (
                <Button key={dia} type="button" size="sm" variant={on ? "default" : "outline"} onClick={() => {
                  const cur = form.diasSemana ?? [];
                  setForm({ ...form, diasSemana: on ? cur.filter((d) => d !== index) : [...cur, index] });
                }}>
                  {dia}
                </Button>
              );
            })}
          </div>
        ) : null}
        {form.recorrencia === "personalizado" ? (
          <Section icon={Repeat} title="A cada quantos dias">
            <Input className={selectClass} type="number" min={1} value={form.intervaloDias ?? 1} onChange={(e) => setForm({ ...form, intervaloDias: Number(e.target.value) })} />
          </Section>
        ) : null}
        </>
        ) : null}

        {editing ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">Notas</p>
            <ul className="space-y-1 text-sm">
              {comentarios.map((c) => (
                <li key={c.id}>
                  <span className="text-muted-foreground">{c.autor.name}: </span>
                  {c.texto}
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Input value={nota} onChange={(e) => setNota(e.target.value)} />
              <Button type="button" variant="outline" onClick={onNota}>Registrar</Button>
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3 border-t pt-4">
          <Button type="button" variant="outline" onClick={onBack}>
            <X className="h-4 w-4" />
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() =>
              onSave({
                muralChaveId: comLugar ? chaveId : undefined,
                horarioFim: horarioFim || undefined,
                local,
                toleranciaAtiva: tolerancia,
                escopo,
                alvoTipo,
                alvoEquipeId,
                atribuidoParaId: atribuidoId || undefined,
                recurrenceFreq: repetir,
                recurrenceDays: form.diasSemana,
                recurrenceUntil: repetirAte,
              })
            }
          >
            <Save className="h-4 w-4" />
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: typeof CalendarDays;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {title}
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {children}
    </section>
  );
}

