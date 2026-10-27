import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  Clock3,
  FileText,
  Home,
  Loader2,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  AGENDAMENTO_TIPO_LABEL,
  fetchAgendamentos,
  type Agendamento,
  type AgendamentoTipo,
} from "@/lib/agenda-api";
import { getSession } from "@/lib/auth";
import {
  createLembrete,
  deleteLembrete,
  fetchLembretes,
  LEMBRETE_RECORRENCIA_LABEL,
  LEMBRETE_RECORRENCIAS,
  updateLembrete,
  type LembretePessoal,
  type LembreteRecorrencia,
} from "@/lib/lembretes-api";
import { fetchTarefas, type Tarefa, type TarefaEtiqueta } from "@/lib/tarefas-api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/lembretes")({
  head: () => ({ meta: [{ title: "Lembretes — Zone Connection" }] }),
  component: LembretesPage,
});

type Categoria = "reuniao" | "retorno" | "ligacao" | "atualizacao" | "outros";
type Periodo = "hoje" | "semana" | "7dias" | "todos";

type Linha = {
  id: string;
  titulo: string;
  pessoa: string | null;
  responsavel: string;
  data: string;
  hora: string | null;
  duracao: string | null;
  categoria: Categoria;
  lembrete?: LembretePessoal;
};

const CATEGORIAS: { id: "todos" | Categoria; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "reuniao", label: "Reuniões" },
  { id: "retorno", label: "Retornos" },
  { id: "ligacao", label: "Ligações" },
  { id: "atualizacao", label: "Atualizações" },
  { id: "outros", label: "Outros" },
];

const CATEGORIA_VISUAL: Record<
  Categoria,
  { label: string; icon: typeof Bell; well: string; badge: string }
> = {
  reuniao: {
    label: "Reunião",
    icon: Users,
    well: "bg-sky-100 text-sky-600",
    badge: "bg-sky-50 text-sky-700",
  },
  retorno: {
    label: "Retorno",
    icon: Phone,
    well: "bg-violet-100 text-violet-600",
    badge: "bg-violet-50 text-violet-700",
  },
  ligacao: {
    label: "Ligação",
    icon: Phone,
    well: "bg-emerald-100 text-emerald-600",
    badge: "bg-emerald-50 text-emerald-700",
  },
  atualizacao: {
    label: "Atualização",
    icon: FileText,
    well: "bg-amber-100 text-amber-600",
    badge: "bg-amber-50 text-amber-700",
  },
  outros: {
    label: "Outro",
    icon: Home,
    well: "bg-orange-100 text-orange-600",
    badge: "bg-orange-50 text-orange-700",
  },
};

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiError ? err.message : fallback;
}

function ymd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function hoje() {
  return ymd(new Date());
}

function addDays(base: string, days: number) {
  const date = new Date(`${base}T12:00:00`);
  date.setDate(date.getDate() + days);
  return ymd(date);
}

function inicioSemana(base: string) {
  const date = new Date(`${base}T12:00:00`);
  const day = date.getDay();
  const diff = day === 0 ? 6 : day - 1;
  date.setDate(date.getDate() - diff);
  return ymd(date);
}

function fimSemana(base: string) {
  return addDays(inicioSemana(base), 6);
}

function horaDe(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function duracaoEntre(inicio: string, fim: string | null) {
  if (!fim) return null;
  const minutos = Math.round(
    (new Date(fim).getTime() - new Date(inicio).getTime()) / 60000,
  );
  if (minutos <= 0) return null;
  if (minutos % 60 === 0) return `${minutos / 60}h`;
  if (minutos > 60) return `${Math.floor(minutos / 60)}h${minutos % 60}`;
  return `${minutos}min`;
}

function iniciais(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");
}

function categoriaAgendamento(tipo: AgendamentoTipo): Categoria {
  if (tipo === "reuniao") return "reuniao";
  if (tipo === "ligacao") return "ligacao";
  if (tipo === "visita") return "retorno";
  if (tipo === "tarefa") return "atualizacao";
  return "outros";
}

function categoriaTarefa(item: Tarefa): Categoria {
  const etiqueta: TarefaEtiqueta = item.etiqueta;
  if (item.tipo === "reuniao" || etiqueta === "interna") return "reuniao";
  if (item.tipo === "ligacao" || etiqueta === "ligacao") return "ligacao";
  if (etiqueta === "followup" || item.tipo === "visita") return "retorno";
  if (etiqueta === "documentos" || etiqueta === "captacao" || etiqueta === "contrato") {
    return "atualizacao";
  }
  return "outros";
}

function rotuloDia(data: string, hojeYmd: string) {
  if (data === hojeYmd) {
    const texto = new Date(`${data}T12:00:00`).toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return `Hoje · ${texto}`;
  }
  return new Date(`${data}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function LembretesPage() {
  const usuario = getSession();
  const [lembretes, setLembretes] = useState<LembretePessoal[]>([]);
  const [agenda, setAgenda] = useState<Agendamento[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LembretePessoal | null>(null);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [recorrencia, setRecorrencia] = useState<LembreteRecorrencia>("sempre");
  const [categoria, setCategoria] = useState<"todos" | Categoria>("todos");
  const [periodo, setPeriodo] = useState<Periodo>("hoje");
  const [responsavel, setResponsavel] = useState("todos");
  const [busca, setBusca] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const inicio = hoje();
    const fim = addDays(inicio, 7);
    try {
      const [lista, compromissos, doDia, proximas] = await Promise.all([
        fetchLembretes().catch(() => [] as LembretePessoal[]),
        fetchAgendamentos({ from: inicio, to: `${fim}T23:59:59` }).catch(
          () => [] as Agendamento[],
        ),
        fetchTarefas({ filtro: "hoje" }).catch(() => [] as Tarefa[]),
        fetchTarefas({ filtro: "proximas" }).catch(() => [] as Tarefa[]),
      ]);
      setLembretes(lista);
      setAgenda(compromissos);
      const vistas = new Set<string>();
      setTarefas(
        [...doDia, ...proximas].filter((item) => {
          if (item.status !== "aberta" || vistas.has(item.id)) return false;
          vistas.add(item.id);
          return true;
        }),
      );
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível carregar os lembretes."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const linhas = useMemo<Linha[]>(() => {
    const nomeUsuario = usuario?.name ?? "Você";
    const deAgenda: Linha[] = agenda
      .filter((item) => item.status !== "cancelado")
      .map((item) => ({
        id: `agenda-${item.id}`,
        titulo: item.titulo,
        pessoa: item.lead?.nome ?? item.local,
        responsavel: item.atribuidoPara?.name ?? item.autor.name,
        data: ymd(new Date(item.startsAt)),
        hora: horaDe(item.startsAt),
        duracao: duracaoEntre(item.startsAt, item.endsAt),
        categoria: categoriaAgendamento(item.tipo),
      }));
    const deTarefas: Linha[] = tarefas.map((item) => ({
      id: `tarefa-${item.id}`,
      titulo: item.titulo,
      pessoa: item.contexto.lead?.nome ?? AGENDAMENTO_TIPO_LABEL[item.tipo],
      responsavel: item.responsavel.name,
      data: item.data,
      hora: item.horario,
      duracao: null,
      categoria: categoriaTarefa(item),
    }));
    const pessoais: Linha[] = lembretes
      .filter((item) => item.ativo)
      .map((item) => ({
        id: `lembrete-${item.id}`,
        titulo: item.titulo,
        pessoa: item.descricao.trim() || LEMBRETE_RECORRENCIA_LABEL[item.recorrencia],
        responsavel: nomeUsuario,
        data: hoje(),
        hora: null,
        duracao: null,
        categoria: "outros" as const,
        lembrete: item,
      }));
    const vistos = new Set(deTarefas.map((item) => item.titulo + item.data + item.hora));
    return [...deAgenda.filter((item) => !vistos.has(item.titulo + item.data + item.hora)), ...deTarefas, ...pessoais].sort(
      (a, b) =>
        `${a.data}${a.hora ?? "99:99"}`.localeCompare(`${b.data}${b.hora ?? "99:99"}`),
    );
  }, [agenda, lembretes, tarefas, usuario?.name]);

  const hojeYmd = hoje();
  const noPeriodo = linhas.filter((item) => {
    if (periodo === "todos") return true;
    if (periodo === "hoje") return item.data === hojeYmd;
    if (periodo === "semana") {
      return item.data >= inicioSemana(hojeYmd) && item.data <= fimSemana(hojeYmd);
    }
    return item.data >= hojeYmd && item.data <= addDays(hojeYmd, 7);
  });

  const responsaveis = [...new Set(linhas.map((item) => item.responsavel))].sort();
  const visiveis = noPeriodo.filter((item) => {
    if (categoria !== "todos" && item.categoria !== categoria) return false;
    if (responsavel !== "todos" && item.responsavel !== responsavel) return false;
    const termo = busca.trim().toLowerCase();
    if (!termo) return true;
    return `${item.titulo} ${item.pessoa ?? ""} ${item.responsavel}`
      .toLowerCase()
      .includes(termo);
  });

  const grupos = [...new Set(visiveis.map((item) => item.data))].map((data) => ({
    data,
    itens: visiveis.filter((item) => item.data === data),
  }));

  const contagem = (pred: (item: Linha) => boolean) => linhas.filter(pred).length;
  const cards = [
    {
      label: "Hoje",
      valor: contagem((item) => item.data === hojeYmd),
      icon: CalendarDays,
      well: "bg-sky-100 text-sky-600",
    },
    {
      label: "Esta semana",
      valor: contagem(
        (item) =>
          item.data >= inicioSemana(hojeYmd) && item.data <= fimSemana(hojeYmd),
      ),
      icon: CalendarDays,
      well: "bg-violet-100 text-violet-600",
    },
    {
      label: "Próximos 7 dias",
      valor: contagem(
        (item) => item.data >= hojeYmd && item.data <= addDays(hojeYmd, 7),
      ),
      icon: Clock3,
      well: "bg-emerald-100 text-emerald-600",
    },
    {
      label: "Total",
      valor: linhas.length,
      icon: Bell,
      well: "bg-slate-100 text-slate-600",
    },
  ];

  function openCreate() {
    setEditing(null);
    setTitulo("");
    setDescricao("");
    setRecorrencia("sempre");
    setDialogOpen(true);
  }

  function openEdit(item: LembretePessoal) {
    setEditing(item);
    setTitulo(item.titulo);
    setDescricao(item.descricao);
    setRecorrencia(item.recorrencia);
    setDialogOpen(true);
  }

  async function save() {
    const nome = titulo.trim();
    if (!nome) {
      toast.error("Informe o título do lembrete.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateLembrete(editing.id, {
          titulo: nome,
          descricao: descricao.trim(),
          recorrencia,
        });
        toast.success("Lembrete atualizado.");
      } else {
        await createLembrete({
          titulo: nome,
          descricao: descricao.trim(),
          recorrencia,
        });
        toast.success("Lembrete criado. Ele aparece na próxima entrada.");
      }
      setDialogOpen(false);
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível salvar o lembrete."));
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: LembretePessoal) {
    if (!window.confirm(`Excluir o lembrete “${item.titulo}”?`)) return;
    try {
      await deleteLembrete(item.id);
      setLembretes((prev) => prev.filter((row) => row.id !== item.id));
      toast.success("Lembrete excluído.");
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível excluir o lembrete."));
    }
  }

  return (
    <div className="mx-auto max-w-6xl pb-10">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-orange-500">
            <Bell className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Lembretes</h1>
            <p className="text-sm text-muted-foreground">
              Avisos e tarefas do seu dia. Fique por dentro dos próximos compromissos e não perca nada.
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-orange-500 text-white hover:bg-orange-600"
        >
          <Plus className="h-4 w-4" />
          Novo lembrete
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 shadow-sm"
          >
            <span className={cn("flex h-11 w-11 items-center justify-center rounded-xl", card.well)}>
              <card.icon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="text-lg font-semibold leading-tight">
                {card.valor}{" "}
                <span className="text-sm font-normal text-muted-foreground">atividades</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {CATEGORIAS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCategoria(item.id)}
                className={cn(
                  "rounded-full px-3 py-1 text-sm",
                  categoria === item.id
                    ? "bg-orange-500 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar lembretes..."
                className="h-9 w-56 pl-8"
              />
            </div>
            <Select value={periodo} onValueChange={(value) => setPeriodo(value as Periodo)}>
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hoje">Hoje</SelectItem>
                <SelectItem value="semana">Esta semana</SelectItem>
                <SelectItem value="7dias">Próximos 7 dias</SelectItem>
                <SelectItem value="todos">Todos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={responsavel} onValueChange={setResponsavel}>
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os responsáveis</SelectItem>
                {responsaveis.map((nome) => (
                  <SelectItem key={nome} value={nome}>
                    {nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 px-4 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando…
          </div>
        ) : grupos.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            Nenhum lembrete neste filtro.
          </p>
        ) : (
          grupos.map((grupo) => (
            <section key={grupo.data}>
              <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                {rotuloDia(grupo.data, hojeYmd)}
              </div>
              <ul>
                {grupo.itens.map((item) => {
                  const visual = CATEGORIA_VISUAL[item.categoria];
                  const Icon = visual.icon;
                  return (
                    <li
                      key={item.id}
                      className="grid grid-cols-[72px_1fr_auto] items-center gap-3 border-b px-4 py-3 last:border-b-0 sm:grid-cols-[88px_1fr_140px_150px_36px]"
                    >
                      <div className="text-sm">
                        <p className="font-medium">{item.hora ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{item.duracao ?? ""}</p>
                      </div>
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                            visual.well,
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{item.titulo}</p>
                          {item.pessoa ? (
                            <p className="truncate text-xs text-muted-foreground">{item.pessoa}</p>
                          ) : null}
                        </div>
                      </div>
                      <span
                        className={cn(
                          "hidden w-fit rounded-full px-2.5 py-0.5 text-xs font-medium sm:inline-flex",
                          visual.badge,
                        )}
                      >
                        {visual.label}
                      </span>
                      <div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground">
                          {iniciais(item.responsavel)}
                        </span>
                        <span className="truncate">{item.responsavel.split(" ")[0]}</span>
                      </div>
                      {item.lembrete ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(item.lembrete!)}>
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void remove(item.lembrete!)}>
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <span />
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar lembrete" : "Novo lembrete"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="lembrete-titulo">Título</Label>
              <Input
                id="lembrete-titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                maxLength={120}
                placeholder="Ex.: Ligar para o cartório"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lembrete-desc">Descrição (opcional)</Label>
              <Textarea
                id="lembrete-desc"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                maxLength={2000}
                rows={4}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Quando mostrar</Label>
              <Select
                value={recorrencia}
                onValueChange={(value) => setRecorrencia(value as LembreteRecorrencia)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEMBRETE_RECORRENCIAS.map((opcao) => (
                    <SelectItem key={opcao} value={opcao}>
                      {LEMBRETE_RECORRENCIA_LABEL[opcao]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
