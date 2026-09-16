import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { AgendaDayTable } from "@/components/agenda-day-table";
import {
  AgendaLuxHeader,
  AgendaLuxKpis,
  AgendaLuxMiniCalendar,
  AgendaLuxQuickActions,
  AgendaLuxShell,
  AgendaLuxTypeChips,
  AgendaLuxUpcoming,
} from "@/components/agenda-lux";
import { ModuloAjudaButton } from "@/components/modulo-ajuda";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
  FormSection,
} from "@/components/form-dialog";
import {
  AgendaBoard,
  addDays,
  endOfWeek,
  formatRangeLabel,
  getVisibleRange,
  startOfDay,
  startOfMonth,
  startOfWeek,
  toDateInput,
  type AgendaViewMode,
} from "@/components/agenda-board";
import { TimePicker } from "@/components/time-picker";
import { getSession } from "@/lib/auth";
import { canViewTeamData, isCorretorLike } from "@/lib/permissions";
import { useLeads } from "@/lib/leads-store";
import { ApiError } from "@/lib/api";
import { fetchEquipes, type Equipe } from "@/lib/equipes-api";
import { fetchUsers } from "@/lib/users-api";
import {
  AGENDAMENTO_ALVO_LABEL,
  AGENDAMENTO_ESCOPO_LABEL,
  AGENDAMENTO_RECURRENCE_FREQ,
  AGENDAMENTO_RECURRENCE_LABEL,
  AGENDAMENTO_STATUS,
  AGENDAMENTO_STATUS_LABEL,
  AGENDAMENTO_TIPOS,
  AGENDAMENTO_TIPO_LABEL,
  AGENDAMENTO_TIPO_SOFT,
  WEEKDAY_OPTIONS,
  aprovarAgendamento,
  createAgendamento,
  deleteAgendamento,
  fetchAgendamentos,
  fetchAgendaKpis,
  fetchSolicitacoesAgenda,
  isAgendamentoAniversario,
  recusarAgendamento,
  updateAgendamento,
  type Agendamento,
  type AgendaKpis,
  type AgendamentoAlvo,
  type AgendamentoEscopo,
  type AgendamentoRecurrenceFreq,
  type AgendamentoStatus,
  type AgendamentoTipo,
  type CreateAgendamentoInput,
} from "@/lib/agenda-api";
import { AgendamentoTipoOption, AgendamentoTipoPicker } from "@/components/agenda-tipo-option";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Inbox,
  Loader2,
  Network,
  Plus,
  Trash2,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SOFT_BTN } from "@/lib/soft-btn";
import { STATUS_CHIP_CLASS } from "@/lib/catalog-colors";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type LayoutMode = "tabela" | "calendario";
type AgendaSection = "agenda" | "solicitacoes";

type AgendaSearch = {
  corretorId?: string;
  nome?: string;
  google?: string;
};

export const Route = createFileRoute("/_app/agenda")({
  head: () => ({ meta: [{ title: "Agenda — Zone Connection" }] }),
  validateSearch: (search: Record<string, unknown>): AgendaSearch => {
    const corretorId =
      typeof search.corretorId === "string" && search.corretorId.trim()
        ? search.corretorId.trim()
        : undefined;
    const nome =
      typeof search.nome === "string" && search.nome.trim()
        ? search.nome.trim()
        : undefined;
    const google =
      typeof search.google === "string" && search.google.trim()
        ? search.google.trim()
        : undefined;
    return {
      ...(corretorId ? { corretorId } : {}),
      ...(corretorId && nome ? { nome } : {}),
      ...(google ? { google } : {}),
    };
  },
  component: AgendaPage,
});

type FormAlvo = AgendamentoAlvo | "corretor";

type FormState = {
  leadId: string;
  clienteId: string;
  atribuidoParaId: string;
  titulo: string;
  tipo: AgendamentoTipo;
  escopo: AgendamentoEscopo;
  status: AgendamentoStatus;
  alvoTipo: FormAlvo;
  alvoEquipeId: string;
  alvoGerenteId: string;
  alvoCorretorId: string;
  date: string;
  timeStart: string;
  timeEnd: string;
  local: string;
  observacoes: string;
  recurrenceFreq: AgendamentoRecurrenceFreq;
  recurrenceDays: number[];
  recurrenceUntil: string;
  seriesId: string | null;
};

const emptyForm = (): FormState => {
  const now = new Date();
  return {
    leadId: "",
    clienteId: "",
    atribuidoParaId: "",
    titulo: "",
    tipo: "tarefa",
    escopo: "pessoal",
    status: "agendado",
    alvoTipo: "todos",
    alvoEquipeId: "",
    alvoGerenteId: "",
    alvoCorretorId: "",
    date: toDateInput(now),
    timeStart: toTimeInput(now),
    timeEnd: "",
    local: "",
    observacoes: "",
    recurrenceFreq: "unica",
    recurrenceDays: [now.getDay()],
    recurrenceUntil: "",
    seriesId: null,
  };
};

function toTimeInput(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function combineLocalIso(date: string, time: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0).toISOString();
}

function formatAgendaPreview(date: string, timeStart: string, timeEnd: string) {
  if (!date || !timeStart) return "";
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return "";
  const dateLabel = dt.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return timeEnd
    ? `${dateLabel} · ${timeStart} – ${timeEnd}`
    : `${dateLabel} · ${timeStart}`;
}

function AgendaPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const user = getSession();
  const isPlatformAdmin = user?.role === "super_admin";
  const isManager = user ? canViewTeamData(user.role) : false;
  const isAdmin = user?.role === "admin";
  const isGerente = user?.role === "gerente";
  /** Fila corretor→gerente: só gerente aprova e corretor acompanha. Admin não participa. */
  const showSolicitacoes = !isAdmin && !isPlatformAdmin;
  const { leads, assignees, loading: leadsLoading } = useLeads();

  const [layoutMode, setLayoutMode] = useState<LayoutMode>("calendario");
  const [section, setSection] = useState<AgendaSection>("agenda");
  const [view, setView] = useState<AgendaViewMode>("semana");
  const [selectedDay, setSelectedDay] = useState<Date>(() =>
    startOfDay(new Date()),
  );

  const [items, setItems] = useState<Agendamento[]>([]);
  const [kpis, setKpis] = useState<AgendaKpis | null>(null);
  const [solicitacoes, setSolicitacoes] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [assignUsers, setAssignUsers] = useState<
    Array<{ id: string; name: string; role: string }>
  >([]);
  const [calendarMonth, setCalendarMonth] = useState(() =>
    startOfMonth(new Date()),
  );
  const [filterEquipeId, setFilterEquipeId] = useState("__all__");
  const [filterCorretorId, setFilterCorretorId] = useState(
    () => search.corretorId ?? "__all__",
  );
  const [filterTipo, setFilterTipo] = useState<string>("__all__");
  const [filterStatus, setFilterStatus] = useState<string>("__all__");

  const [open, setOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteSeriesId, setDeleteSeriesId] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const visibleRange = useMemo(
    () => getVisibleRange("mes", selectedDay),
    [selectedDay],
  );

  const visibleLeads = useMemo(() => {
    if (!user) return [];
    if (!isManager) {
      return leads.filter(
        (l) => l.corretorId === user.id || l.corretor === user.name,
      );
    }
    if (filterCorretorId !== "__all__") {
      return leads.filter((l) => l.corretorId === filterCorretorId);
    }
    if (filterEquipeId !== "__all__") {
      const eq = equipes.find((e) => e.id === filterEquipeId);
      if (eq) {
        const ids = new Set([eq.gerenteId, ...eq.membros.map((m) => m.id)]);
        return leads.filter((l) => l.corretorId && ids.has(l.corretorId));
      }
    }
    return leads;
  }, [leads, user, isManager, filterCorretorId, filterEquipeId, equipes]);

  const corretorFilterOptions = useMemo(() => {
    let list = [...assignees];

    if (isAdmin) {
      for (const e of equipes) {
        if (
          e.gerente &&
          !list.some((a) => a.id === e.gerente!.id) &&
          (filterEquipeId === "__all__" || e.id === filterEquipeId)
        ) {
          list.push({
            id: e.gerente.id,
            name: e.gerente.name,
            role: "gerente",
          });
        }
      }
    }

    if (filterEquipeId !== "__all__") {
      const eq = equipes.find((e) => e.id === filterEquipeId);
      if (eq) {
        const ids = new Set([eq.gerenteId, ...eq.membros.map((m) => m.id)]);
        list = list.filter((a) => ids.has(a.id));
      }
    }

    // Garante o usuário aberto via /usuarios → Ver agenda.
    if (
      search.corretorId &&
      search.nome &&
      !list.some((a) => a.id === search.corretorId)
    ) {
      list = [
        ...list,
        { id: search.corretorId, name: search.nome, role: "gerente" },
      ];
    }

    return list.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [
    assignees,
    equipes,
    filterEquipeId,
    isAdmin,
    search.corretorId,
    search.nome,
  ]);

  const viewedAgendaName = useMemo(() => {
    if (filterCorretorId === "__all__") return null;
    return (
      search.nome ||
      corretorFilterOptions.find((a) => a.id === filterCorretorId)?.name ||
      null
    );
  }, [filterCorretorId, search.nome, corretorFilterOptions]);

  useEffect(() => {
    if (search.corretorId) {
      setFilterCorretorId(search.corretorId);
      setSection("agenda");
    }
  }, [search.corretorId]);

  useEffect(() => {
    if (!search.google) return;
    void navigate({
      to: "/configuracoes",
      search: {
        google: search.google,
        secao: "conta",
        item: "conexoes",
      },
      replace: true,
    });
  }, [search.google, navigate]);

  function setAgendaUserFilter(userId: string) {
    setFilterCorretorId(userId);
    const option = corretorFilterOptions.find((a) => a.id === userId);
    void navigate({
      to: "/agenda",
      search:
        userId === "__all__"
          ? {}
          : {
              corretorId: userId,
              ...(option?.name || search.nome
                ? { nome: option?.name ?? search.nome }
                : {}),
            },
      replace: true,
    });
  }

  const gerenteOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const e of equipes) {
      if (e.gerente) map.set(e.gerente.id, e.gerente);
    }
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR"),
    );
  }, [equipes]);

  const corretorAssignOptions = useMemo(() => {
    const fromUsers = isAdmin
      ? assignUsers
      : assignUsers.filter((u) => isCorretorLike(u.role));
    if (fromUsers.length > 0) {
      return fromUsers
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    }
    return assignees
      .filter((a) => (isAdmin ? true : isCorretorLike(a.role)))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [assignees, assignUsers, isAdmin]);

  const corretorAlvoOptions = useMemo(
    () => corretorAssignOptions.filter((c) => isCorretorLike(c.role ?? "")),
    [corretorAssignOptions],
  );

  const assignRoleLabel = (role: string) => {
    if (role === "admin") return "Admin";
    if (role === "gerente") return "Gerente";
    if (role === "analista") return "Analista";
    if (role === "corretor") return "Corretor";
    if (role === "treinee") return "Treinee";
    return role;
  };

  const tiposDisponiveis = useMemo(() => {
    if (isAdmin || isGerente) return AGENDAMENTO_TIPOS;
    return AGENDAMENTO_TIPOS.filter((t) => t !== "bloqueio");
  }, [isAdmin, isGerente]);

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (isAdmin && filterEquipeId !== "__all__") n += 1;
    if (isManager && filterCorretorId !== "__all__") n += 1;
    if (filterTipo !== "__all__") n += 1;
    if (filterStatus !== "__all__") n += 1;
    return n;
  }, [
    isAdmin,
    isManager,
    filterEquipeId,
    filterCorretorId,
    filterTipo,
    filterStatus,
  ]);

  function clearAgendaFilters() {
    setFilterEquipeId("__all__");
    setFilterCorretorId("__all__");
    setFilterTipo("__all__");
    setFilterStatus("__all__");
    void navigate({ to: "/agenda", search: {}, replace: true });
  }

  const leadOptions = useMemo(
    () => visibleLeads.filter((l) => l.tipo === "lead"),
    [visibleLeads],
  );
  const clienteOptions = useMemo(
    () => visibleLeads.filter((l) => l.tipo === "cliente"),
    [visibleLeads],
  );

  useEffect(() => {
    if (!isAdmin && !isGerente) return;
    void fetchEquipes()
      .then((list) => setEquipes(list.filter((e) => e.status === "ativo")))
      .catch(() => setEquipes([]));
    void fetchUsers({ status: "ativo", page: 1, limit: 100 })
      .then((res) =>
        setAssignUsers(
          res.data
            .filter((u) => u.role !== "super_admin")
            .map((u) => ({ id: u.id, name: u.name, role: u.role })),
        ),
      )
      .catch(() => setAssignUsers([]));
  }, [isAdmin, isGerente]);

  useEffect(() => {
    if (!showSolicitacoes && section === "solicitacoes") {
      setSection("agenda");
    }
  }, [showSolicitacoes, section]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const [data, sols, kpiData] = await Promise.all([
        fetchAgendamentos({
          from: visibleRange.from.toISOString(),
          to: visibleRange.to.toISOString(),
          equipeId:
            isAdmin && filterEquipeId !== "__all__"
              ? filterEquipeId
              : undefined,
          corretorId:
            isManager && filterCorretorId !== "__all__"
              ? filterCorretorId
              : undefined,
          tipo:
            filterTipo !== "__all__" && filterTipo !== "aniversario"
              ? (filterTipo as AgendamentoTipo)
              : undefined,
          status:
            filterStatus !== "__all__"
              ? (filterStatus as AgendamentoStatus)
              : undefined,
        }),
        showSolicitacoes ? fetchSolicitacoesAgenda() : Promise.resolve([]),
        fetchAgendaKpis({
          equipeId:
            isAdmin && filterEquipeId !== "__all__"
              ? filterEquipeId
              : undefined,
          corretorId:
            isManager && filterCorretorId !== "__all__"
              ? filterCorretorId
              : undefined,
        }),
      ]);
      setItems(data);
      setSolicitacoes(sols);
      setKpis(kpiData);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar a agenda.",
      );
    } finally {
      setLoading(false);
    }
  }, [
    visibleRange.from,
    visibleRange.to,
    isAdmin,
    isManager,
    showSolicitacoes,
    filterEquipeId,
    filterCorretorId,
    filterTipo,
    filterStatus,
  ]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const visibleAgendaItems = useMemo(() => {
    const base =
      filterStatus === "cancelado"
        ? items
        : items.filter((item) => item.status !== "cancelado");
    if (filterTipo === "aniversario") {
      return base.filter((item) => isAgendamentoAniversario(item));
    }
    return base;
  }, [items, filterStatus, filterTipo]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function selectLead(id: string) {
    setForm((prev) => ({
      ...prev,
      leadId: id,
      clienteId: "",
    }));
  }

  function selectCliente(id: string) {
    setForm((prev) => ({
      ...prev,
      clienteId: id,
      leadId: "",
    }));
  }

  function openCreate(day?: Date, hour?: number, tipo?: AgendamentoTipo) {
    setFormMode("create");
    setEditingId(null);
    const base = emptyForm();
    const target = day ? startOfDay(day) : selectedDay;
    base.date = toDateInput(target);
    if (hour != null) {
      base.timeStart = `${String(hour).padStart(2, "0")}:00`;
      if (hour === 23) {
        base.timeEnd = "23:59";
      } else if (hour === 0) {
        base.timeEnd = "00:30";
      } else {
        base.timeEnd = `${String(hour + 1).padStart(2, "0")}:00`;
      }
    }
    if (tipo) base.tipo = tipo;
    if ((isAdmin || isGerente) && filterCorretorId !== "__all__") {
      const option = corretorFilterOptions.find(
        (a) => a.id === filterCorretorId,
      );
      if (option && isCorretorLike(option.role)) {
        if (isAdmin) {
          base.alvoTipo = "corretor";
          base.alvoCorretorId = filterCorretorId;
        } else {
          base.atribuidoParaId = filterCorretorId;
        }
      }
    }
    setForm(base);
    setOpen(true);
  }

  function openEdit(item: Agendamento) {
    if (isAgendamentoAniversario(item)) {
      toast.message("Aniversário", {
        description: "Evento automático — somente leitura na agenda.",
      });
      return;
    }
    if (item.autor.role === "admin" && user?.role !== "admin") {
      toast.error(
        "Apenas administradores podem editar compromissos da equipe.",
      );
      return;
    }
    if (item.tipo === "bloqueio" && isCorretorLike(user?.role)) {
      toast.message("Horário bloqueado", {
        description: item.titulo,
      });
      return;
    }
    if (
      item.atribuidoParaId &&
      user?.id &&
      item.atribuidoParaId === user.id &&
      item.autor.id !== user.id
    ) {
      toast.message("Tarefa atribuída", {
        description: "Use o botão de concluir na lista para marcar como feita.",
      });
      return;
    }
    const start = new Date(item.startsAt);
    const end = item.endsAt ? new Date(item.endsAt) : null;
    setFormMode("edit");
    setEditingId(item.id);
    setForm({
      leadId: item.lead?.tipo === "lead" ? (item.leadId ?? "") : "",
      clienteId: item.lead?.tipo === "cliente" ? (item.leadId ?? "") : "",
      atribuidoParaId: item.atribuidoParaId ?? "",
      titulo: item.titulo,
      tipo: item.tipo,
      escopo: item.escopo,
      status: item.status,
      alvoTipo:
        item.alvoTipo && item.alvoTipo !== "nenhum" ? item.alvoTipo : "nenhum",
      alvoEquipeId: item.alvoEquipeId ?? "",
      alvoGerenteId: item.alvoGerenteId ?? "",
      alvoCorretorId: "",
      date: toDateInput(start),
      timeStart: toTimeInput(start),
      timeEnd: end ? toTimeInput(end) : "",
      local: item.local ?? "",
      observacoes: item.observacoes ?? "",
      recurrenceFreq: item.recurrenceFreq ?? "unica",
      recurrenceDays:
        item.recurrenceDays?.length > 0
          ? item.recurrenceDays
          : [start.getDay()],
      recurrenceUntil: item.recurrenceUntil
        ? toDateInput(new Date(item.recurrenceUntil))
        : "",
      seriesId: item.seriesId ?? null,
    });
    setOpen(true);
  }

  function validateForm(): CreateAgendamentoInput | null {
    const isPersonalPlatformAgenda = user?.role === "super_admin";
    const isBloqueio = form.tipo === "bloqueio";
    const atribuidoParaId =
      form.alvoTipo === "corretor"
        ? form.alvoCorretorId || null
        : form.atribuidoParaId || null;
    const isAdminEvent =
      user?.role === "admin" &&
      form.tipo !== "bloqueio" &&
      !atribuidoParaId &&
      form.alvoTipo !== "corretor" &&
      form.alvoTipo !== "nenhum";
    const leadId =
      isAdminEvent || isPersonalPlatformAgenda || isBloqueio || atribuidoParaId
        ? null
        : form.leadId || form.clienteId || null;

    if (
      !isAdminEvent &&
      !isPersonalPlatformAgenda &&
      !isBloqueio &&
      !atribuidoParaId &&
      form.escopo === "com_gerente" &&
      !leadId
    ) {
      toast.error(
        "Selecione um lead ou cliente para compromissos com o gerente.",
      );
      return null;
    }
    if (
      user?.role === "admin" &&
      (isBloqueio || (!atribuidoParaId && form.tipo !== "bloqueio")) &&
      !atribuidoParaId &&
      form.alvoTipo === "equipe" &&
      !form.alvoEquipeId
    ) {
      toast.error("Selecione a equipe do evento.");
      return null;
    }
    if (
      user?.role === "admin" &&
      !atribuidoParaId &&
      form.alvoTipo === "gerente" &&
      !form.alvoGerenteId
    ) {
      toast.error("Selecione o gerente do evento.");
      return null;
    }
    if (
      user?.role === "admin" &&
      !form.atribuidoParaId &&
      form.alvoTipo === "corretor" &&
      !form.alvoCorretorId
    ) {
      toast.error("Selecione o corretor do evento.");
      return null;
    }
    if (!form.titulo.trim() || form.titulo.trim().length < 2) {
      toast.error("Informe um título.");
      return null;
    }
    if (!form.date || !form.timeStart) {
      toast.error("Informe data e horário de início.");
      return null;
    }
    if (isBloqueio && !form.timeEnd) {
      toast.error("Informe o horário de término do bloqueio.");
      return null;
    }
    if (
      isBloqueio &&
      form.recurrenceFreq !== "unica" &&
      !form.recurrenceUntil
    ) {
      toast.error("Informe a data final da recorrência.");
      return null;
    }
    if (
      isBloqueio &&
      form.recurrenceFreq === "semanal" &&
      form.recurrenceDays.length === 0
    ) {
      toast.error("Selecione ao menos um dia da semana.");
      return null;
    }

    const startsAt = combineLocalIso(form.date, form.timeStart);
    const endsAt = form.timeEnd
      ? combineLocalIso(form.date, form.timeEnd)
      : null;

    if (endsAt && new Date(endsAt).getTime() < new Date(startsAt).getTime()) {
      toast.error("O horário de término deve ser após o início.");
      return null;
    }

    const showAdminAlvo =
      user?.role === "admin" &&
      !atribuidoParaId &&
      form.alvoTipo !== "corretor";

    return {
      leadId,
      atribuidoParaId,
      titulo: form.titulo.trim(),
      tipo: form.tipo,
      escopo:
        isAdminEvent ||
        isPersonalPlatformAgenda ||
        isBloqueio ||
        atribuidoParaId
          ? "pessoal"
          : form.escopo,
      ...(showAdminAlvo
        ? {
            alvoTipo:
              form.alvoTipo === "corretor" ? "nenhum" : form.alvoTipo,
            alvoEquipeId:
              form.alvoTipo === "equipe" ? form.alvoEquipeId || null : null,
            alvoGerenteId:
              form.alvoTipo === "gerente" ? form.alvoGerenteId || null : null,
          }
        : {}),
      startsAt,
      endsAt,
      local: form.local.trim() || null,
      observacoes: form.observacoes.trim() || null,
      ...(isBloqueio
        ? {
            recurrenceFreq: form.recurrenceFreq,
            recurrenceDays:
              form.recurrenceFreq === "semanal" ? form.recurrenceDays : [],
            recurrenceUntil:
              form.recurrenceFreq === "unica"
                ? null
                : combineLocalIso(form.recurrenceUntil, "23:59"),
          }
        : {}),
    };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const payload = validateForm();
    if (!payload) return;

    setSaving(true);
    try {
      if (formMode === "create") {
        const created = await createAgendamento(payload);
        if (created.solicitacaoStatus === "pendente") {
          toast.success("Solicitação enviada ao gerente.");
          setSection("solicitacoes");
        } else if (payload.tipo === "bloqueio") {
          toast.success(
            payload.recurrenceFreq && payload.recurrenceFreq !== "unica"
              ? "Horários bloqueados (recorrência criada)."
              : "Horário bloqueado.",
          );
        } else if (payload.atribuidoParaId) {
          toast.success(
            form.alvoTipo === "corretor"
              ? "Compromisso agendado para o corretor."
              : "Tarefa atribuída.",
          );
        } else {
          toast.success(
            user?.role === "admin"
              ? form.alvoTipo === "nenhum"
                ? "Tarefa pessoal agendada."
                : form.alvoTipo === "gerente"
                ? "Evento agendado para o gerente."
                : form.alvoTipo === "gerentes"
                  ? "Evento agendado para todos os gerentes."
                  : form.alvoTipo === "equipe"
                    ? "Evento agendado para a equipe."
                    : "Evento agendado para todas as equipes."
              : payload.escopo === "pessoal"
                ? "Tarefa agendada."
                : "Compromisso criado.",
          );
        }
      } else if (editingId) {
        await updateAgendamento(editingId, {
          titulo: payload.titulo,
          tipo: payload.tipo,
          escopo: payload.escopo,
          startsAt: payload.startsAt,
          endsAt: payload.endsAt,
          local: payload.local,
          observacoes: payload.observacoes,
          ...(payload.alvoTipo
            ? {
                alvoTipo: payload.alvoTipo,
                alvoEquipeId: payload.alvoEquipeId,
                alvoGerenteId: payload.alvoGerenteId,
              }
            : {}),
          status: form.status,
        });
        toast.success("Compromisso atualizado.");
      }
      setOpen(false);
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar o compromisso.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleAprovar(id: string) {
    setActingId(id);
    try {
      await aprovarAgendamento(id);
      toast.success("Solicitação aprovada.");
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível aprovar.",
      );
    } finally {
      setActingId(null);
    }
  }

  async function handleRecusar(id: string) {
    const motivo = window.prompt("Motivo da recusa (opcional):") ?? undefined;
    setActingId(id);
    try {
      await recusarAgendamento(id, motivo || undefined);
      toast.success("Solicitação recusada.");
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível recusar.",
      );
    } finally {
      setActingId(null);
    }
  }

  async function handleComplete(item: Agendamento) {
    if (isAgendamentoAniversario(item)) return;
    if (item.status !== "agendado") return;
    setCompletingId(item.id);
    try {
      await updateAgendamento(item.id, { status: "concluido" });
      toast.success("Tarefa concluída.");
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível concluir a tarefa.",
      );
    } finally {
      setCompletingId(null);
    }
  }

  async function handleCancelStatus(item: Agendamento) {
    if (isAgendamentoAniversario(item)) return;
    if (item.status !== "agendado") return;
    setCancelingId(item.id);
    try {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      await updateAgendamento(item.id, { status: "cancelado" });
      toast.success("Compromisso cancelado.");
      await loadItems();
    } catch (err) {
      await loadItems();
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível cancelar o compromisso.",
      );
    } finally {
      setCancelingId(null);
    }
  }

  async function handleDelete(series: "one" | "all" = "one") {
    if (!deleteId) return;
    try {
      await deleteAgendamento(deleteId, { series });
      toast.success(
        series === "all"
          ? "Série de bloqueios excluída."
          : "Compromisso excluído.",
      );
      setDeleteId(null);
      setDeleteSeriesId(null);
      setOpen(false);
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível excluir o compromisso.",
      );
    }
  }

  function goToday() {
    const today = startOfDay(new Date());
    setSelectedDay(today);
    setCalendarMonth(startOfMonth(today));
  }

  function shiftAgenda(direction: -1 | 1) {
    if (layoutMode === "tabela") {
      setSelectedDay((d) => addDays(d, direction));
      return;
    }
    if (view === "dia") {
      setSelectedDay((d) => addDays(d, direction));
      return;
    }
    if (view === "semana") {
      setSelectedDay((d) => addDays(d, direction * 7));
      return;
    }
    setSelectedDay((d) =>
      startOfMonth(new Date(d.getFullYear(), d.getMonth() + direction, 1)),
    );
  }

  function handleSelectDay(day: Date) {
    const next = startOfDay(day);
    setSelectedDay(next);
    setCalendarMonth(startOfMonth(next));
  }

  const rangeTitle =
    layoutMode === "tabela"
      ? selectedDay.toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : formatRangeLabel(view, selectedDay);

  return (
    <AgendaLuxShell>
      <AgendaLuxHeader
        help={<ModuloAjudaButton />}
        actions={
          section === "agenda" ? (
            <Button onClick={() => openCreate()}>
              <Plus className="mr-1 h-4 w-4" />
              Novo compromisso
            </Button>
          ) : null
        }
      />

      {viewedAgendaName && section === "agenda" ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-2.5 text-sm">
          <span>
            Agenda de <strong>{viewedAgendaName}</strong>
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setAgendaUserFilter("__all__")}
          >
            Voltar à minha visão
          </Button>
        </div>
      ) : null}

      <div className="mb-4 inline-flex rounded-full border border-black/5 bg-card p-1">
        <button
          type="button"
          onClick={() => setSection("agenda")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
            section === "agenda"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <CalendarDays className="w-4 h-4" />
          Agenda
        </button>
        {showSolicitacoes ? (
          <button
            type="button"
            onClick={() => setSection("solicitacoes")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              section === "solicitacoes"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Inbox className="w-4 h-4" />
            Solicitações
            {solicitacoes.length > 0 ? (
              <Badge className="h-5 min-w-5 bg-amber-500 px-1.5 text-[10px] hover:bg-amber-500">
                {solicitacoes.length > 9 ? "9+" : solicitacoes.length}
              </Badge>
            ) : null}
          </button>
        ) : null}
      </div>

      {section === "solicitacoes" ? (
        <div className="overflow-hidden rounded-2xl border border-black/5 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_20px_rgba(15,23,42,0.05)]">
          <div className="border-b px-4 py-3 bg-muted/20">
            <h3 className="text-sm font-semibold">
              {isGerente ? "Aguardando sua aprovação" : "Aguardando o gerente"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isGerente
                ? "Visitas e reuniões pedidas pelos corretores da equipe."
                : "Compromissos com o gerente que você enviou e ainda não foram respondidos."}
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando…
            </div>
          ) : solicitacoes.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground px-4">
              <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40" />
              Nenhuma solicitação pendente no momento.
            </div>
          ) : (
            <ul className="divide-y">
              {solicitacoes.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="font-medium text-sm truncate">{s.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.startsAt).toLocaleString("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                      {" · "}
                      {s.lead?.nome ?? "Sem contato"}
                      {isGerente ? ` · ${s.autor.name}` : null}
                      {" · "}
                      {AGENDAMENTO_TIPO_LABEL[s.tipo]}
                    </p>
                  </div>
                  {isGerente ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className={SOFT_BTN}
                        disabled={actingId === s.id}
                        onClick={() => void handleRecusar(s.id)}
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        Recusar
                      </Button>
                      <Button
                        size="sm"
                        disabled={actingId === s.id}
                        onClick={() => void handleAprovar(s.id)}
                      >
                        {actingId === s.id ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5 mr-1" />
                        )}
                        Aprovar
                      </Button>
                    </div>
                  ) : (
                    <Badge variant="secondary" className={STATUS_CHIP_CLASS}>
                      Aguardando
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <>
          <AgendaLuxKpis kpis={kpis} />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0">
          <div className="mb-3 flex flex-col gap-2 rounded-2xl border border-black/5 bg-card px-3 py-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToday}
              >
                Hoje
              </Button>
              <div className="inline-flex items-center rounded-full border border-black/5 p-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => shiftAgenda(-1)}
                  aria-label="Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  onClick={() => shiftAgenda(1)}
                  aria-label="Próximo"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <h2 className="min-w-0 text-base font-semibold capitalize">
                {rangeTitle}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-full border border-black/5 p-0.5">
                {(
                  [
                    { id: "dia", label: "Dia", mode: "calendario" as const },
                    { id: "semana", label: "Semana", mode: "calendario" as const },
                    { id: "mes", label: "Mês", mode: "calendario" as const },
                    { id: "lista", label: "Lista", mode: "tabela" as const },
                  ] as const
                ).map((opt) => {
                  const active =
                    opt.mode === "tabela"
                      ? layoutMode === "tabela"
                      : layoutMode === "calendario" && view === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        if (opt.mode === "tabela") {
                          setLayoutMode("tabela");
                          return;
                        }
                        setLayoutMode("calendario");
                        setView(opt.id);
                      }}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "rounded-full",
                      activeFiltersCount > 0 && "border-primary",
                    )}
                  >
                    <Filter className="w-4 h-4 mr-1.5" />
                    Filtros
                    {activeFiltersCount > 0 ? (
                      <Badge className="ml-1.5 h-5 min-w-5 px-1.5 text-[10px]">
                        {activeFiltersCount}
                      </Badge>
                    ) : null}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 space-y-3 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">Filtros</p>
                    {activeFiltersCount > 0 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={clearAgendaFilters}
                      >
                        Limpar
                      </Button>
                    ) : null}
                  </div>

                  {isAdmin && equipes.length > 0 ? (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Equipe
                      </Label>
                      <Select
                        value={filterEquipeId}
                        onValueChange={(v) => {
                          setFilterEquipeId(v);
                          setFilterCorretorId("__all__");
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Equipe" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">
                            Todas as equipes
                          </SelectItem>
                          {equipes.map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}

                  {isManager ? (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">
                        {isAdmin ? "Corretor / Gerente" : "Corretor"}
                      </Label>
                      <Select
                        value={filterCorretorId}
                        onValueChange={setAgendaUserFilter}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Corretor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__all__">
                            {isAdmin
                              ? "Todos (visão geral)"
                              : "Todos os corretores"}
                          </SelectItem>
                          {corretorFilterOptions.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.name}
                              {a.role === "gerente" ? " (gerente)" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Tipo
                    </Label>
                    <Select value={filterTipo} onValueChange={setFilterTipo}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Todos os tipos</SelectItem>
                        {AGENDAMENTO_TIPOS.map((t) => (
                          <SelectItem key={t} value={t}>
                            <AgendamentoTipoOption tipo={t} />
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Status
                    </Label>
                    <Select
                      value={filterStatus}
                      onValueChange={setFilterStatus}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Todos os status</SelectItem>
                        {AGENDAMENTO_STATUS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {AGENDAMENTO_STATUS_LABEL[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="mb-2">
            <AgendaLuxTypeChips value={filterTipo} onChange={setFilterTipo} />
          </div>

          {layoutMode === "tabela" ? (
            <AgendaDayTable
              day={selectedDay}
              items={visibleAgendaItems}
              loading={loading}
              showCorretor={isManager}
              currentUserRole={user?.role}
              currentUserId={user?.id}
              completingId={completingId}
              cancelingId={cancelingId}
              onSelectDay={handleSelectDay}
              onCreateAt={openCreate}
              onEdit={openEdit}
              onComplete={(item) => void handleComplete(item)}
              onCancel={(item) => void handleCancelStatus(item)}
            />
          ) : (
            <AgendaBoard
              view={view}
              anchor={selectedDay}
              items={visibleAgendaItems}
              loading={loading}
              onSelectDay={handleSelectDay}
              onCreateAt={openCreate}
              onEdit={openEdit}
            />
          )}
            </div>
            <aside className="space-y-3">
              <AgendaLuxMiniCalendar
                month={calendarMonth}
                selected={selectedDay}
                items={items}
                onSelect={handleSelectDay}
                onShiftMonth={(dir) =>
                  setCalendarMonth((current) =>
                    startOfMonth(
                      new Date(
                        current.getFullYear(),
                        current.getMonth() + dir,
                        1,
                      ),
                    ),
                  )
                }
              />
              <AgendaLuxUpcoming
                items={visibleAgendaItems}
                onOpen={openEdit}
              />
              <AgendaLuxQuickActions
                onCreate={() => openCreate()}
                onBlock={() => openCreate(selectedDay, undefined, "bloqueio")}
              />
            </aside>
          </div>
        </>
      )}

      <FormDialogShell
        open={open}
        onOpenChange={setOpen}
        icon={<CalendarDays className="w-5 h-5" />}
        title={
          formMode === "create"
            ? form.tipo === "bloqueio"
              ? "Bloquear horário"
              : form.atribuidoParaId
                ? "Atribuir tarefa"
                : "Novo compromisso"
            : form.tipo === "bloqueio"
              ? "Editar bloqueio"
              : "Editar compromisso"
        }
        description={
          form.tipo === "bloqueio"
            ? "Trave um horário para impedir novos agendamentos sobrepostos."
            : form.atribuidoParaId
              ? "A tarefa aparecerá na agenda do corretor selecionado."
              : "Defina data e horário. Lead/cliente é opcional em tarefas pessoais."
        }
        footer={
          <FormDialogActions>
            {formMode === "edit" && editingId ? (
              <Button
                type="button"
                variant="destructive"
                className="mr-auto"
                onClick={() => {
                  setDeleteId(editingId);
                  setDeleteSeriesId(form.seriesId);
                }}
                disabled={saving}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Excluir
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className={SOFT_BTN}
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" form="agenda-form" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Salvando…
                </>
              ) : formMode === "create" ? (
                form.tipo === "bloqueio" ? (
                  "Bloquear"
                ) : form.atribuidoParaId ? (
                  "Atribuir"
                ) : (
                  "Agendar"
                )
              ) : (
                "Salvar"
              )}
            </Button>
          </FormDialogActions>
        }
      >
        <form
          id="agenda-form"
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <FormDialogBody className="overflow-y-scroll">
            {isAdmin && !form.atribuidoParaId ? (
              <FormSection
                title="Público do evento"
                icon={<Network className="w-4 h-4 text-primary" />}
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Quem deve ver</Label>
                    <Select
                      value={form.alvoTipo}
                      onValueChange={(v) => {
                        const alvo = v as FormAlvo;
                        setForm((prev) => ({
                          ...prev,
                          alvoTipo: alvo,
                          alvoEquipeId:
                            alvo === "equipe" ? prev.alvoEquipeId : "",
                          alvoGerenteId:
                            alvo === "gerente" ? prev.alvoGerenteId : "",
                          alvoCorretorId:
                            alvo === "corretor" ? prev.alvoCorretorId : "",
                          atribuidoParaId:
                            alvo === "corretor" || alvo === "nenhum"
                              ? ""
                              : prev.atribuidoParaId,
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nenhum">
                          {AGENDAMENTO_ALVO_LABEL.nenhum}
                        </SelectItem>
                        <SelectItem value="todos">
                          {AGENDAMENTO_ALVO_LABEL.todos}
                        </SelectItem>
                        <SelectItem value="equipe">
                          {AGENDAMENTO_ALVO_LABEL.equipe}
                        </SelectItem>
                        <SelectItem value="gerentes">
                          {AGENDAMENTO_ALVO_LABEL.gerentes}
                        </SelectItem>
                        <SelectItem value="gerente">
                          {AGENDAMENTO_ALVO_LABEL.gerente}
                        </SelectItem>
                        <SelectItem value="corretor">Um corretor</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">
                      {form.alvoTipo === "nenhum"
                        ? "Só você vê este compromisso na sua agenda."
                        : form.alvoTipo === "gerente"
                        ? "Somente o gerente escolhido verá este evento (corretores não). Se ele conectou o Google Agenda, a cópia também vai para lá."
                        : form.alvoTipo === "gerentes"
                          ? "Todos os gerentes verão este evento (corretores não). Quem conectou o Google Agenda recebe uma cópia."
                          : form.alvoTipo === "equipe"
                            ? "Gerente e corretores da equipe escolhida verão este evento. Quem conectou o Google Agenda recebe uma cópia."
                            : form.alvoTipo === "corretor"
                              ? "O compromisso aparece na agenda do corretor escolhido e ele recebe notificação."
                              : "Todos os usuários verão este evento na agenda. Quem conectou o Google Agenda recebe uma cópia."}
                    </p>
                  </div>

                  {form.alvoTipo === "equipe" ? (
                    <div className="space-y-2">
                      <Label>Equipe</Label>
                      <Select
                        value={form.alvoEquipeId || "__none__"}
                        onValueChange={(v) =>
                          setField("alvoEquipeId", v === "__none__" ? "" : v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar equipe" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">—</SelectItem>
                          {equipes.map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}

                  {form.alvoTipo === "gerente" ? (
                    <div className="space-y-2">
                      <Label>Gerente</Label>
                      <Select
                        value={form.alvoGerenteId || "__none__"}
                        onValueChange={(v) =>
                          setField("alvoGerenteId", v === "__none__" ? "" : v)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar gerente" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">—</SelectItem>
                          {gerenteOptions.map((g) => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}

                  {form.alvoTipo === "corretor" ? (
                    <div className="space-y-2">
                      <Label>Corretor</Label>
                      <Select
                        value={form.alvoCorretorId || undefined}
                        onValueChange={(v) => setField("alvoCorretorId", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um corretor" />
                        </SelectTrigger>
                        <SelectContent>
                          {corretorAlvoOptions.length === 0 ? (
                            <div className="px-2 py-3 text-sm text-muted-foreground">
                              Nenhum corretor cadastrado.
                            </div>
                          ) : (
                            corretorAlvoOptions.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                </div>
              </FormSection>
            ) : null}

            {!isPlatformAdmin &&
            form.tipo !== "bloqueio" &&
            !form.atribuidoParaId &&
            (!isAdmin || form.alvoTipo === "nenhum") ? (
              <FormSection
                title="Contato (opcional)"
                icon={<User className="w-4 h-4 text-primary" />}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Lead</Label>
                    <Select
                      value={form.leadId || "__none__"}
                      onValueChange={(v) =>
                        v === "__none__"
                          ? setField("leadId", "")
                          : selectLead(v)
                      }
                      disabled={formMode === "edit" || leadsLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar lead" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        {leadOptions.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Cliente</Label>
                    <Select
                      value={form.clienteId || "__none__"}
                      onValueChange={(v) =>
                        v === "__none__"
                          ? setField("clienteId", "")
                          : selectCliente(v)
                      }
                      disabled={formMode === "edit" || leadsLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        {clienteOptions.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </FormSection>
            ) : null}

            <FormSection
              title="Detalhes"
              icon={<CalendarDays className="w-4 h-4 text-primary" />}
            >
              {form.date && form.timeStart ? (
                <div
                  className={cn(
                    "flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2.5 text-sm",
                    AGENDAMENTO_TIPO_SOFT[form.tipo],
                  )}
                >
                  <Clock className="h-4 w-4 shrink-0" />
                  <span className="font-semibold capitalize">
                    {formatAgendaPreview(
                      form.date,
                      form.timeStart,
                      form.timeEnd,
                    )}
                  </span>
                  <span className="ml-auto text-xs font-medium opacity-80">
                    {AGENDAMENTO_TIPO_LABEL[form.tipo]}
                  </span>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="titulo">Título</Label>
                <Input
                  id="titulo"
                  value={form.titulo}
                  onChange={(e) => setField("titulo", e.target.value)}
                  placeholder={
                    form.tipo === "bloqueio"
                      ? "Ex.: Reunião interna"
                      : "Ex.: Visita ao empreendimento"
                  }
                  maxLength={160}
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de compromisso</Label>
                <AgendamentoTipoPicker
                  value={form.tipo}
                  options={tiposDisponiveis}
                  disabled={formMode === "edit"}
                  onChange={(tipo) => {
                    setForm((prev) => ({
                      ...prev,
                      tipo,
                      atribuidoParaId:
                        tipo === "bloqueio" ? "" : prev.atribuidoParaId,
                      escopo:
                        isAdmin ||
                        isPlatformAdmin ||
                        tipo === "bloqueio" ||
                        prev.atribuidoParaId
                          ? "pessoal"
                          : tipo === "visita" || tipo === "reuniao"
                            ? "com_gerente"
                            : prev.escopo === "com_gerente" &&
                                (tipo === "tarefa" || tipo === "ligacao")
                              ? "pessoal"
                              : prev.escopo,
                      timeEnd:
                        tipo === "bloqueio" && !prev.timeEnd
                          ? prev.timeStart
                            ? (() => {
                                const [hh, mm] = prev.timeStart
                                  .split(":")
                                  .map(Number);
                                const next = (hh + 1) % 24;
                                return `${String(next).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
                              })()
                            : "15:00"
                          : prev.timeEnd,
                    }));
                  }}
                />
              </div>

              {!isAdmin &&
              !isPlatformAdmin &&
              form.tipo !== "bloqueio" &&
              !form.atribuidoParaId ? (
                <div className="space-y-2">
                  <Label>Participação</Label>
                  <Select
                    value={form.escopo}
                    onValueChange={(v) =>
                      setField("escopo", v as AgendamentoEscopo)
                    }
                    disabled={formMode === "edit"}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pessoal">
                        {AGENDAMENTO_ESCOPO_LABEL.pessoal}
                      </SelectItem>
                      <SelectItem value="com_gerente">
                        {AGENDAMENTO_ESCOPO_LABEL.com_gerente}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    {form.escopo === "com_gerente"
                      ? isCorretorLike(user?.role)
                        ? "Será enviada solicitação ao gerente para aprovar."
                        : "Compromisso com participação do gerente."
                      : "Tarefa só sua — sem aprovação (ex.: ligar para o cliente)."}
                  </p>
                </div>
              ) : null}

              {(isAdmin || isGerente) &&
              form.tipo !== "bloqueio" &&
              form.alvoTipo !== "corretor" &&
              form.alvoTipo !== "nenhum" ? (
                <div className="space-y-2">
                  <Label>
                    {isAdmin ? "Atribuir a" : "Atribuir ao corretor"}
                  </Label>
                  <Select
                    value={form.atribuidoParaId || "__none__"}
                    onValueChange={(v) =>
                      setForm((prev) => ({
                        ...prev,
                        atribuidoParaId: v === "__none__" ? "" : v,
                        escopo: "pessoal",
                        leadId: "",
                        clienteId: "",
                      }))
                    }
                    disabled={formMode === "edit"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Ninguém (agenda própria)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">
                        Ninguém (agenda própria / equipe)
                      </SelectItem>
                      {corretorAssignOptions.length === 0 ? (
                        <div className="px-2 py-3 text-sm text-muted-foreground">
                          Nenhum corretor cadastrado.
                        </div>
                      ) : (
                        corretorAssignOptions.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {isAdmin
                              ? `${c.name} (${assignRoleLabel(c.role ?? "")})`
                              : c.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    {isAdmin
                      ? "A tarefa aparece na agenda da pessoa escolhida e ela recebe notificação."
                      : "A tarefa aparece na agenda do corretor e ele recebe notificação."}
                  </p>
                </div>
              ) : null}

              {formMode === "edit" ? (
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) =>
                      setField("status", v as AgendamentoStatus)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AGENDAMENTO_STATUS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {AGENDAMENTO_STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="date">Data</Label>
                  <Input
                    id="date"
                    type="date"
                    value={form.date}
                    onChange={(e) => setField("date", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeStart">Início</Label>
                  <TimePicker
                    id="timeStart"
                    value={form.timeStart}
                    onChange={(v) => setField("timeStart", v)}
                    placeholder="--:--"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeEnd">
                    {form.tipo === "bloqueio" ? "Término" : "Término (opc.)"}
                  </Label>
                  <TimePicker
                    id="timeEnd"
                    value={form.timeEnd}
                    onChange={(v) => setField("timeEnd", v)}
                    placeholder="--:--"
                    allowClear={form.tipo !== "bloqueio"}
                  />
                </div>
              </div>

              {form.tipo === "bloqueio" && formMode === "create" ? (
                <div className="space-y-4 rounded-lg border border-dashed p-3">
                  <div className="space-y-2">
                    <Label>Recorrência</Label>
                    <Select
                      value={form.recurrenceFreq}
                      onValueChange={(v) =>
                        setField(
                          "recurrenceFreq",
                          v as AgendamentoRecurrenceFreq,
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AGENDAMENTO_RECURRENCE_FREQ.map((f) => (
                          <SelectItem key={f} value={f}>
                            {AGENDAMENTO_RECURRENCE_LABEL[f]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {form.recurrenceFreq === "semanal" ? (
                    <div className="space-y-2">
                      <Label>Dias da semana</Label>
                      <div className="flex flex-wrap gap-3">
                        {WEEKDAY_OPTIONS.map((d) => {
                          const checked = form.recurrenceDays.includes(d.value);
                          return (
                            <label
                              key={d.value}
                              className="inline-flex items-center gap-2 text-sm"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) => {
                                  setForm((prev) => {
                                    const days = new Set(prev.recurrenceDays);
                                    if (v === true) days.add(d.value);
                                    else days.delete(d.value);
                                    return {
                                      ...prev,
                                      recurrenceDays: Array.from(days).sort(
                                        (a, b) => a - b,
                                      ),
                                    };
                                  });
                                }}
                              />
                              {d.label}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {form.recurrenceFreq !== "unica" ? (
                    <div className="space-y-2">
                      <Label htmlFor="recurrenceUntil">Repetir até</Label>
                      <Input
                        id="recurrenceUntil"
                        type="date"
                        value={form.recurrenceUntil}
                        onChange={(e) =>
                          setField("recurrenceUntil", e.target.value)
                        }
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}

              {form.tipo !== "bloqueio" ? (
                <div className="space-y-2">
                  <Label htmlFor="local">Local</Label>
                  <Input
                    id="local"
                    value={form.local}
                    onChange={(e) => setField("local", e.target.value)}
                    placeholder="Endereço ou ponto de encontro"
                    maxLength={160}
                  />
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="obs">Observações</Label>
                <Textarea
                  id="obs"
                  value={form.observacoes}
                  onChange={(e) => setField("observacoes", e.target.value)}
                  placeholder={
                    form.tipo === "bloqueio"
                      ? "Motivo do bloqueio…"
                      : "Detalhes do compromisso…"
                  }
                  rows={3}
                  maxLength={2000}
                />
              </div>
            </FormSection>
          </FormDialogBody>
        </form>
      </FormDialogShell>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(v) => {
          if (!v) {
            setDeleteId(null);
            setDeleteSeriesId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteSeriesId ? "Excluir bloqueio?" : "Excluir compromisso?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteSeriesId
                ? "Este bloqueio faz parte de uma série recorrente."
                : "Esta ação não pode ser desfeita."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {deleteSeriesId ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleDelete("all")}
              >
                Excluir série inteira
              </Button>
            ) : null}
            <AlertDialogAction onClick={() => void handleDelete("one")}>
              {deleteSeriesId ? "Excluir só este" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AgendaLuxShell>
  );
}
