import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Clock3,
  Flag,
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
import { TarefasSemana } from "@/components/tarefas-semana";
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
import { fetchLeads } from "@/lib/leads-api";
import { fetchEmpreendimentos } from "@/lib/empreendimentos-api";
import { IdSearchSelect } from "@/components/id-search-select";
import { createAgendamento } from "@/lib/agenda-api";
import { rotuloImovel } from "@/components/agenda-visita-ocupacao";
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

  async function salvar(extra?: { muralChaveId?: string; horarioFim?: string }) {
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
          escopo: "pessoal",
          atribuidoParaId: form.responsavelId || null,
          leadId: form.leadId || null,
          startsAt: isoLocal(form.data, inicio),
          endsAt: isoLocal(form.data, fim),
          observacoes: form.descricao?.trim() || null,
          empreendimentoId: form.empreendimentoId || null,
          imovelId: form.imovelId || null,
          muralChaveId: extra?.muralChaveId || null,
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
          if (next === "calendario") {
            void navigate({ to: "/agenda" });
            return;
          }
          setSecao(next);
          if (next === "tarefas" || next === "geral") setVisao("lista");
        }}
      />
      {secao === "calendario" ? (
        <TarefasSemana />
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
        <DialogContent className="max-w-lg">
          {detalhe ? (
            <>
              <DialogHeader>
                <DialogTitle>{detalhe.titulo}</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {AGENDAMENTO_TIPO_LABEL[detalhe.tipo ?? "tarefa"]} · {PRIORIDADE_LABEL[detalhe.prioridade]}
                </p>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <p>{detalhe.data}{detalhe.horario ? ` · ${detalhe.horario}` : ""}</p>
                <p className="text-muted-foreground">Responsável: {detalhe.responsavel.name}</p>
                {detalhe.contexto.lead ? <p>Lead: {detalhe.contexto.lead.nome}</p> : null}
                {detalhe.contexto.imovel ? <p>Imóvel: {detalhe.contexto.imovel.rotulo}</p> : null}
                {detalhe.descricao ? <p className="whitespace-pre-wrap">{detalhe.descricao}</p> : null}
              </div>
              <div className="flex justify-end gap-2">
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

        {tipo === "bloqueio" ? (
          <Section icon={Clock3} title="Término">
            <Input className={selectClass} type="time" value={horarioFim} onChange={(e) => setHorarioFim(e.target.value)} />
          </Section>
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
                horarioFim: tipo === "bloqueio" ? horarioFim : undefined,
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

