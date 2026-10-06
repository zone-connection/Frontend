import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Lock, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
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
import { getSession } from "@/lib/auth";
import {
  PRIORIDADE_LABEL,
  comentarTarefa,
  createTarefa,
  deleteTarefa,
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

const FILTROS: { id: TarefaFiltro; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "hoje", label: "Hoje" },
  { id: "proximas", label: "Próximas" },
  { id: "atrasadas", label: "Atrasadas" },
  { id: "concluidas", label: "Concluídas" },
];

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
    session?.tenant?.tarefasEnabled ?? null,
  );
  const [filtro, setFiltro] = useState<TarefaFiltro>("hoje");
  const [items, setItems] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Tarefa | null>(null);
  const [form, setForm] = useState<TarefaInput>(() =>
    emptyForm(session?.id ?? ""),
  );
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [nota, setNota] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const acesso = await fetchTarefasAcesso();
      setEnabled(acesso.enabled);
      if (!acesso.enabled) return;
      setItems(await fetchTarefas({ filtro }));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Falha ao carregar tarefas.");
    } finally {
      setLoading(false);
    }
  }, [filtro]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!enabled) return;
    void fetchUsers({ status: "ativo", limit: 200 }).then((res) => {
      setUsers(res.data.map((u) => ({ id: u.id, name: u.name })));
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

  const grupos = useMemo(() => {
    if (filtro !== "todas" && filtro !== "hoje") return [{ titulo: "", items }];
    const map = new Map<string, Tarefa[]>();
    for (const item of items) {
      const key = item.atrasada ? "Atrasadas" : item.data;
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return [...map.entries()].map(([titulo, list]) => ({ titulo, items: list }));
  }, [filtro, items]);

  if (enabled === false) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-start gap-4 py-16">
        <Lock className="h-8 w-8" />
        <h1 className="text-2xl font-semibold">Gestão de tarefas</h1>
        <p className="text-muted-foreground">
          Organize sua rotina diretamente pelo CRM. Este recurso está disponível
          como adicional ao seu plano.
        </p>
        <Button asChild>
          <Link to="/configuracoes">Conhecer recurso</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Minhas tarefas"
        description="Pendências, lembretes e follow-ups da rotina comercial."
        actions={
          <Button onClick={abrirNova} disabled={!enabled}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nova tarefa
          </Button>
        }
      />
      <div className="flex flex-wrap gap-2">
        {FILTROS.map((item) => (
          <Button
            key={item.id}
            size="sm"
            variant={filtro === item.id ? "default" : "outline"}
            onClick={() => setFiltro(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Carregando…</p> : null}
      {!loading && items.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nenhuma tarefa neste filtro.
        </p>
      ) : null}
      {grupos.map((grupo) => (
        <section key={grupo.titulo || "lista"} className="space-y-2">
          {grupo.titulo ? (
            <h2 className="text-sm font-medium">
              {grupo.titulo === "Atrasadas" ? "Atrasadas" : formatDia(grupo.titulo)}
            </h2>
          ) : null}
          <ul className="space-y-2">
            {grupo.items.map((tarefa) => (
              <li
                key={tarefa.id}
                className={`rounded-xl border p-3 ${tarefa.atrasada ? "border-amber-500 bg-amber-500/10" : ""}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{tarefa.titulo}</p>
                    <p className="text-sm text-muted-foreground">
                      {tarefa.horario ?? "Sem horário"} · {formatDia(tarefa.data)} ·{" "}
                      {PRIORIDADE_LABEL[tarefa.prioridade]} · {tarefa.responsavel.name}
                    </p>
                    {tarefa.agendaEventoId ? (
                      <p className="text-sm">
                        <Link
                          to="/agenda"
                          search={{ dia: tarefa.data }}
                          className="underline"
                        >
                          Também na agenda
                        </Link>
                      </p>
                    ) : null}
                    <p className="text-sm">
                      {[
                        tarefa.contexto.lead ? `Lead: ${tarefa.contexto.lead.nome}` : null,
                        tarefa.contexto.imovel
                          ? `Imóvel: ${tarefa.contexto.imovel.rotulo}`
                          : null,
                        tarefa.contexto.atendimento
                          ? `Atendimento: ${tarefa.contexto.atendimento.titulo}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {tarefa.status === "aberta" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void updateTarefa(tarefa.id, { status: "concluida" }).then(load)
                        }
                      >
                        Concluir
                      </Button>
                    ) : null}
                    <Button size="sm" variant="outline" onClick={() => abrirEdicao(tarefa)}>
                      {tarefa.atrasada ? "Reagendar" : "Editar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void deleteTarefa(tarefa.id).then(load)}
                    >
                      Excluir
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
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
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function formatDia(ymd: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
}
