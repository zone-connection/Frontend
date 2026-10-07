import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import { getSession, type Role } from "@/lib/auth";
import {
  comentarTarefa,
  createTarefa,
  fetchTarefas,
  fetchTarefasAcesso,
  updateTarefa,
  type Tarefa,
  type TarefaFiltro,
  type TarefaInput,
  type TarefaLembrete,
  type TarefaPrioridade,
  type TarefaRecorrencia,
} from "@/lib/tarefas-api";
import { fetchUsers } from "@/lib/users-api";

export const Route = createFileRoute("/_app/tarefas")({
  head: () => ({ meta: [{ title: "Tarefas — Zone Connection" }] }),
  component: TarefasPage,
});

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

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
  const [editing, setEditing] = useState<Tarefa | null>(null);
  const [form, setForm] = useState<TarefaInput>(() =>
    emptyForm(session?.id ?? ""),
  );
  const [users, setUsers] = useState<{ id: string; name: string; role: Role }[]>([]);
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
      descricao: tarefa.descricao,
      lembrete: tarefa.lembrete,
      lembreteMinutos: tarefa.lembreteMinutos ?? 10,
      recorrencia: tarefa.recorrencia,
      diasSemana: tarefa.diasSemana,
      intervaloDias: tarefa.intervaloDias ?? 1,
      leadId: tarefa.leadId ?? undefined,
      agendamentoId: tarefa.agendamentoId ?? undefined,
      imovelId: tarefa.imovelId ?? undefined,
    });
    setOpen(true);
  }

  async function salvar() {
    const payload: TarefaInput = {
      ...form,
      titulo: form.titulo.trim(),
      horario: form.horario?.trim() || undefined,
      leadId: form.leadId || undefined,
      agendamentoId: form.agendamentoId || undefined,
      imovelId: form.imovelId || undefined,
    };
    try {
      if (editing) await updateTarefa(editing.id, payload);
      else await createTarefa(payload);
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

  return (
    <div className="space-y-4">
      {enabled === false ? (
        <p className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
          Os exemplos abaixo são demonstração. Tarefas reais entram a partir do plano Prata.{" "}
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
          if (next === "calendario") setVisao("semana");
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
        onOpen={(tarefa) => {
          if (tarefa.demonstracao) return;
          abrirEdicao(tarefa);
        }}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
            <p className="text-sm text-muted-foreground">Um novo passo para o seu dia.</p>
          </DialogHeader>
          <div className="grid gap-3">
            <Field label="Título">
              <Input
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data">
                <Input
                  type="date"
                  value={form.data}
                  onChange={(e) => setForm({ ...form, data: e.target.value })}
                />
              </Field>
              <Field label="Horário">
                <Input
                  type="time"
                  value={form.horario ?? ""}
                  onChange={(e) => setForm({ ...form, horario: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Responsável">
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={form.responsavelId}
                onChange={(e) => setForm({ ...form, responsavelId: e.target.value })}
              >
                {atribuiveis.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                    {u.role === "corretor" ? " · Corretor" : u.role === "treinee" ? " · Trainee" : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Prioridade">
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={form.prioridade}
                onChange={(e) =>
                  setForm({ ...form, prioridade: e.target.value as TarefaPrioridade })
                }
              >
                <option value="alta">Alta</option>
                <option value="media">Média</option>
                <option value="baixa">Baixa</option>
              </select>
            </Field>
            <Field label="Descrição">
              <Textarea
                value={form.descricao ?? ""}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              />
            </Field>
            <Field label="Lembrete por e-mail">
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={form.lembrete}
                onChange={(e) =>
                  setForm({ ...form, lembrete: e.target.value as TarefaLembrete })
                }
              >
                <option value="nenhum">Sem lembrete</option>
                <option value="no_horario">No horário da tarefa</option>
                <option value="min_5">5 minutos antes</option>
                <option value="min_15">15 minutos antes</option>
                <option value="min_30">30 minutos antes</option>
                <option value="hora_1">1 hora antes</option>
                <option value="dia_1">1 dia antes</option>
                <option value="personalizado">Personalizado</option>
              </select>
            </Field>
            {form.lembrete === "personalizado" ? (
              <Field label="Minutos antes">
                <Input
                  type="number"
                  min={0}
                  value={form.lembreteMinutos ?? 0}
                  onChange={(e) =>
                    setForm({ ...form, lembreteMinutos: Number(e.target.value) })
                  }
                />
              </Field>
            ) : null}
            <Field label="Recorrência">
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={form.recorrencia}
                onChange={(e) =>
                  setForm({ ...form, recorrencia: e.target.value as TarefaRecorrencia })
                }
              >
                <option value="nenhuma">Não repetir</option>
                <option value="diaria">Diariamente</option>
                <option value="semanal">Semanalmente</option>
                <option value="mensal">Mensalmente</option>
                <option value="dias_especificos">Dias específicos</option>
                <option value="personalizado">Personalizado</option>
              </select>
            </Field>
            {form.recorrencia === "dias_especificos" ? (
              <div className="flex flex-wrap gap-2">
                {DIAS.map((dia, index) => {
                  const on = form.diasSemana?.includes(index);
                  return (
                    <Button
                      key={dia}
                      type="button"
                      size="sm"
                      variant={on ? "default" : "outline"}
                      onClick={() => {
                        const cur = form.diasSemana ?? [];
                        setForm({
                          ...form,
                          diasSemana: on
                            ? cur.filter((d) => d !== index)
                            : [...cur, index],
                        });
                      }}
                    >
                      {dia}
                    </Button>
                  );
                })}
              </div>
            ) : null}
            {form.recorrencia === "personalizado" ? (
              <Field label="A cada quantos dias">
                <Input
                  type="number"
                  min={1}
                  value={form.intervaloDias ?? 1}
                  onChange={(e) =>
                    setForm({ ...form, intervaloDias: Number(e.target.value) })
                  }
                />
              </Field>
            ) : null}
            <Field label="ID do lead (opcional)">
              <Input
                value={form.leadId ?? ""}
                onChange={(e) => setForm({ ...form, leadId: e.target.value })}
              />
            </Field>
            <Field label="ID do atendimento (opcional)">
              <Input
                value={form.agendamentoId ?? ""}
                onChange={(e) => setForm({ ...form, agendamentoId: e.target.value })}
              />
            </Field>
            <Field label="ID do imóvel (opcional)">
              <Input
                value={form.imovelId ?? ""}
                onChange={(e) => setForm({ ...form, imovelId: e.target.value })}
              />
            </Field>
            {editing ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Notas</p>
                <ul className="space-y-1 text-sm">
                  {editing.comentarios.map((c) => (
                    <li key={c.id}>
                      <span className="text-muted-foreground">{c.autor.name}: </span>
                      {c.texto}
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <Input value={nota} onChange={(e) => setNota(e.target.value)} />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (!nota.trim()) return;
                      void comentarTarefa(editing.id, nota.trim()).then(() => {
                        setNota("");
                        void load();
                      });
                    }}
                  >
                    Registrar
                  </Button>
                </div>
              </div>
            ) : null}
            <Button onClick={() => void salvar()}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

