import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { TablePager } from "@/components/table-pager";
import { useTablePager } from "@/lib/use-table-pager";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  DetailField,
} from "@/components/form-dialog";
import { ContatoContratoFields } from "@/components/contato-contrato-fields";
import { CorPicker } from "@/components/cor-picker";
import { FlowTrack } from "@/components/flow-bar";
import {
  Plus,
  MoreHorizontal,
  KeyRound,
  Ban,
  Pencil,
  Trash2,
  Eye,
  UserPlus,
  Search,
  CheckCircle2,
  Sparkles,
  Shield,
  Copy,
  Check,
  Clock3,
  Kanban,
  CalendarDays,
  Users,
  IdCard,
  FileText,
} from "lucide-react";
import { getSession, type Role, type UserStatus } from "@/lib/auth";
import {
  isAnalistaAllowed,
  isFinanceiroRoleAllowed,
  isGerenteAllowed,
} from "@/lib/tenant-modules";
import { canViewTeamData, isCorretorLike } from "@/lib/permissions";
import { TableSortSelect } from "@/components/table-sort-select";
import {
  DEFAULT_TABLE_SORT,
  sortByTableOrder,
  type TableSort,
} from "@/lib/table-sort";
import { ApiError } from "@/lib/api";
import { useLeads } from "@/lib/leads-store";
import type { Lead } from "@/lib/crm-types";
import { fetchFunilAtivo, type FunilEtapa } from "@/lib/funis-api";
import {
  fetchDashboardEsteiraCorretor,
  type DashboardEsteiraCorretor,
} from "@/lib/dashboard-api";
import {
  createUser,
  creciProcessoBadgeClass,
  CRECI_PROCESSO_ETAPAS,
  CRECI_PROCESSO_HINT,
  CRECI_PROCESSO_LABEL,
  CRECI_PROCESSO_SHORT,
  CRECI_PROCESSO_STATUS,
  deleteUser,
  fetchUserPresenceWeek,
  fetchUsers,
  fetchUsersPresenceToday,
  fetchUsersQuota,
  normalizeCreciStatus,
  resetUserPassword,
  updateUser,
  updateUserStatus,
  type ApiUser,
  type CreciProcessoStatus,
  type UserPresenceToday,
  type UserPresenceWeek,
  type UsersQuota,
} from "@/lib/users-api";
import { PLANO_LABELS } from "@/lib/tenant-modules";
import {
  formatPhone,
  isValidPhone,
  PHONE_INVALID_MESSAGE,
  PHONE_PLACEHOLDER,
} from "@/lib/phone";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  FILTER_BAR_SHELL,
  FILTER_CONTROL,
  FILTER_SEARCH_ICON,
} from "@/lib/filter-bar";
import { STATUS_CHIP_CLASS } from "@/lib/catalog-colors";
import { FinanceKpiCard } from "@/components/finance-kpi-card";

export const Route = createFileRoute("/_app/usuarios")({
  head: () => ({ meta: [{ title: "Usuários — Zone Connection" }] }),
  component: Usuarios,
});

/** Cache da lista para abrir a tela sem esperar a API (sincroniza em background). */
const USERS_CACHE_KEY = "crm_users_cache_v4";
let usersMemoryCache: ApiUser[] | null = null;

function getUsersCache(): ApiUser[] | null {
  if (usersMemoryCache) return usersMemoryCache;
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(USERS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ApiUser[];
    if (!Array.isArray(parsed)) return null;
    usersMemoryCache = parsed;
    return parsed;
  } catch {
    return null;
  }
}

function setUsersCache(users: ApiUser[]) {
  usersMemoryCache = users;
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(USERS_CACHE_KEY, JSON.stringify(users));
  } catch {
    // quota / private mode — ignore
  }
}

const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Administrador",
  gerente: "Gerente",
  corretor: "Corretor",
  analista: "Analista",
  treinee: "Treinee",
  financeiro: "Financeiro",
  assistente: "Assistente",
};

const STATUS_LABEL: Record<UserStatus, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
};

const PASSWORD_HINT = "Mín. 8 caracteres, com maiúscula, minúscula e número.";

type FormMode = "create" | "edit";
type FormState = {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  dataNascimento: string;
  cargo: string;
  creciStatus: CreciProcessoStatus;
  creci: string;
  cpf: string;
  rg: string;
  endereco: string;
  cep: string;
  cor: string;
  role: Role;
  status: UserStatus;
  password: string;
  financeiroCanCreate: boolean;
  financeiroCanEdit: boolean;
  financeiroCanDelete: boolean;
};

const emptyForm = (): FormState => ({
  name: "",
  email: "",
  phone: "",
  whatsapp: "",
  dataNascimento: "",
  cargo: "",
  creciStatus: "nao_iniciado",
  creci: "",
  cpf: "",
  rg: "",
  endereco: "",
  cep: "",
  cor: "",
  role: "corretor",
  status: "ativo",
  password: "",
  financeiroCanCreate: true,
  financeiroCanEdit: true,
  financeiroCanDelete: true,
});

function toDateInput(value: string | null | undefined) {
  return value?.slice(0, 10) ?? "";
}

function formatBirthDate(value: string | null | undefined) {
  const day = toDateInput(value);
  if (!day) return "—";
  const [y, m, d] = day.split("-");
  return y && m && d ? `${d}/${m}/${y}` : "—";
}

function userToForm(u: ApiUser): FormState {
  return {
    name: u.name,
    email: u.email,
    phone: u.phone ? formatPhone(u.phone) : "",
    whatsapp: u.whatsapp ? formatPhone(u.whatsapp) : "",
    dataNascimento: toDateInput(u.dataNascimento),
    cargo: u.cargo ?? "",
    creciStatus: normalizeCreciStatus(u.creciStatus, u.creci),
    creci: u.creci ?? "",
    cpf: u.cpf ?? "",
    rg: u.rg ?? "",
    endereco: u.endereco ?? "",
    cep: u.cep ?? "",
    cor: u.cor ?? "",
    role: u.role,
    status: u.status,
    password: "",
    financeiroCanCreate: u.financeiroCanCreate !== false,
    financeiroCanEdit: u.financeiroCanEdit !== false,
    financeiroCanDelete: u.financeiroCanDelete !== false,
  };
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function roleBadgeClass(role: Role) {
  const size = STATUS_CHIP_CLASS;
  if (role === "admin") return `${size} bg-primary/15 text-primary border-primary/30`;
  if (role === "gerente") return `${size} bg-info/15 text-info border-info/30`;
  if (role === "analista")
    return `${size} bg-sky-500/15 text-sky-700 border-sky-500/30`;
  if (role === "treinee")
    return `${size} bg-emerald-500/15 text-emerald-700 border-emerald-500/30`;
  if (role === "financeiro")
    return `${size} bg-amber-500/15 text-amber-800 border-amber-500/30`;
  return `${size} bg-muted text-muted-foreground`;
}

function formatLastAccess(iso: string | null): string {
  if (!iso) return "Nunca";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const min = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const days = Math.floor(h / 24);
  if (days === 1) return "ontem";
  if (days < 30) return `há ${days} dias`;
  return d.toLocaleDateString("pt-BR");
}

function userHasCreci(u: Pick<ApiUser, "creci">) {
  return Boolean(u.creci?.trim());
}

function CreciAndamentoBadge({
  user,
  short = false,
}: {
  user: Pick<ApiUser, "creci" | "creciStatus">;
  short?: boolean;
}) {
  const status = normalizeCreciStatus(user.creciStatus, user.creci);
  return (
    <Badge
      variant="outline"
      className={cn("max-w-full truncate", creciProcessoBadgeClass(status))}
      title={CRECI_PROCESSO_LABEL[status]}
    >
      {short ? CRECI_PROCESSO_SHORT[status] : CRECI_PROCESSO_LABEL[status]}
    </Badge>
  );
}

/** Corretor do sistema ou qualquer usuário com CRECI cadastrado. */
function isBrokerForStats(u: ApiUser) {
  return u.role === "corretor" || userHasCreci(u);
}

function formatTimeToday(seconds: number | undefined): string {
  if (seconds == null || seconds <= 0) return "—";
  if (seconds < 60) return "< 1 min";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

function CreciRatioBar({
  label,
  count,
  total,
  tone,
  onClick,
}: {
  label: string;
  count: number;
  total: number;
  tone: "emerald" | "orange";
  onClick: () => void;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <button type="button" onClick={onClick} className="w-full text-left">
      <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">
          {count} de {total} ({Math.round(pct)}%)
        </span>
      </div>
      <FlowTrack percent={pct} tone={tone} />
    </button>
  );
}

const WEEKDAY_LABEL: Record<number, string> = {
  0: "Seg",
  1: "Ter",
  2: "Qua",
  3: "Qui",
  4: "Sex",
  5: "Sáb",
  6: "Dom",
};

function formatWeekDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  // getUTCDay: 0=Dom … 6=Sáb → índice seg=0
  const weekdayIdx = (utc.getUTCDay() + 6) % 7;
  return `${WEEKDAY_LABEL[weekdayIdx]} ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}

function todayDateKeyBrasil(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function isStrongPassword(value: string) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value);
}

function Usuarios() {
  const navigate = useNavigate();
  const session = getSession();
  const isAdmin = session?.role === "admin";
  const isGerente = session?.role === "gerente";
  const isManager = session ? canViewTeamData(session.role) : false;
  const canCreateBroker =
    isAdmin || isGerente || session?.role === "analista";
  const canUseAnalista = isAnalistaAllowed(
    session?.tenant?.plano,
    session?.tenant?.modules ?? null,
  );
  const canUseGerente = isGerenteAllowed(session?.tenant?.plano);
  const canUseFinanceiro = isFinanceiroRoleAllowed(
    session?.tenant?.plano,
    session?.tenant?.modules ?? null,
  );
  const isSolo = session?.tenant?.plano === "solo";
  const canCreateAdmin = isAdmin && !isSolo;
  const { leads, refresh: refreshLeads } = useLeads();

  const cachedUsers = getUsersCache();
  const [users, setUsersState] = useState<ApiUser[]>(cachedUsers ?? []);
  // Só bloqueia com "Carregando..." na primeira visita sem cache.
  const [loading, setLoading] = useState(!cachedUsers);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<TableSort>(DEFAULT_TABLE_SORT);
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [creciFilter, setCreciFilter] = useState("all");
  const [quota, setQuota] = useState<UsersQuota | null>(null);
  const [presenceByUser, setPresenceByUser] = useState<
    Record<string, UserPresenceToday>
  >({});

  /** Atualiza estado + cache juntos. */
  const setUsers = useCallback((updater: (prev: ApiUser[]) => ApiUser[]) => {
    setUsersState((prev) => {
      const next = updater(prev);
      setUsersCache(next);
      return next;
    });
  }, []);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [detail, setDetail] = useState<ApiUser | null>(null);
  const [weekPresence, setWeekPresence] = useState<UserPresenceWeek | null>(
    null,
  );
  const [weekPresenceLoading, setWeekPresenceLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ApiUser | null>(null);
  const deleteTargetRef = useRef<ApiUser | null>(null);
  const [credentials, setCredentials] = useState<{
    name: string;
    email: string;
    password: string;
    title: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<"email" | "password" | null>(
    null,
  );

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      try {
        const [page, q, presence] = await Promise.all([
          fetchUsers({ page: 1, limit: 100 }),
          isAdmin ? fetchUsersQuota().catch(() => null) : Promise.resolve(null),
          fetchUsersPresenceToday().catch(() => [] as UserPresenceToday[]),
        ]);
        setUsers(() => page.data);
        if (q) setQuota(q);
        const map: Record<string, UserPresenceToday> = {};
        for (const row of presence) map[row.userId] = row;
        setPresenceByUser(map);
      } catch (err) {
        if (!opts?.silent) {
          toast.error(
            err instanceof ApiError
              ? err.message
              : "Não foi possível carregar os usuários.",
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [setUsers, isAdmin],
  );

  useEffect(() => {
    void load({ silent: Boolean(cachedUsers) });
    // Só no mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!detail) {
      setWeekPresence(null);
      setWeekPresenceLoading(false);
      return;
    }
    let cancelled = false;
    setWeekPresence(null);
    setWeekPresenceLoading(true);
    void fetchUserPresenceWeek(detail.id)
      .then((week) => {
        if (!cancelled) setWeekPresence(week);
      })
      .catch(() => {
        if (!cancelled) setWeekPresence(null);
      })
      .finally(() => {
        if (!cancelled) setWeekPresenceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [detail?.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (q) {
        const hay =
          `${u.name} ${u.email} ${u.phone ?? ""} ${u.cargo ?? ""} ${u.creci ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (creciFilter === "com" && !u.creci?.trim()) return false;
      if (creciFilter === "sem" && u.creci?.trim()) return false;
      return true;
    });
  }, [users, search, roleFilter, statusFilter, creciFilter]);

  const sorted = useMemo(
    () =>
      sortByTableOrder(
        filtered,
        sort,
        (u) => u.name,
        (u) => u.createdAt,
      ),
    [filtered, sort],
  );
  const pager = useTablePager(
    sorted,
    `${search}|${roleFilter}|${statusFilter}|${creciFilter}|${sort}`,
  );

  const adminStats = useMemo(() => {
    const corretores = users.filter(isBrokerForStats);
    const comCreci = corretores.filter(userHasCreci).length;
    const loggedSeconds = corretores
      .map((u) => presenceByUser[u.id]?.secondsToday ?? 0)
      .filter((seconds) => seconds > 0);
    const avgSeconds =
      loggedSeconds.length > 0
        ? Math.round(
            loggedSeconds.reduce((sum, seconds) => sum + seconds, 0) /
              loggedSeconds.length,
          )
        : 0;
    return {
      corretores: corretores.length,
      comCreci,
      semCreci: corretores.length - comCreci,
      avgSeconds,
      loggedInToday: loggedSeconds.length,
    };
  }, [users, presenceByUser]);

  function filterCorretoresCreci(kind: "com" | "sem") {
    const sameCom = kind === "com" && creciFilter === "com" && roleFilter === "all";
    const sameSem =
      kind === "sem" && creciFilter === "sem" && roleFilter === "corretor";
    if (sameCom || sameSem) {
      setRoleFilter("all");
      setCreciFilter("all");
      return;
    }
    if (kind === "com") {
      setRoleFilter("all");
      setCreciFilter("com");
      return;
    }
    setRoleFilter("corretor");
    setCreciFilter("sem");
  }

  function openCreate() {
    if (quota && quota.restantes <= 0) {
      toast.error(
        `Limite do plano atingido (${quota.usados}/${quota.limite}). Peça usuários extras ao administrador da plataforma.`,
      );
      return;
    }
    setFormMode("create");
    setEditingId(null);
    setForm(emptyForm());
    setFormOpen(true);
  }

  function openEdit(u: ApiUser) {
    setFormMode("edit");
    setEditingId(u.id);
    setForm(userToForm(u));
    setFormOpen(true);
    setDetail(null);
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function syncTeam() {
    // Assignees dos leads em background (sem travar a UI).
    void refreshLeads({ silent: true });
  }

  async function copyText(value: string, field: "email" | "password") {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      toast.success(field === "email" ? "E-mail copiado." : "Senha copiada.");
      window.setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (formMode === "create" && !canCreateBroker) {
      toast.error("Você não tem permissão para cadastrar usuários.");
      return;
    }
    if (formMode === "edit" && !isAdmin) {
      toast.error("Apenas administradores podem editar usuários.");
      return;
    }
    if (!isAdmin && form.role !== "corretor") {
      toast.error("Gerentes e analistas podem cadastrar somente corretores.");
      return;
    }
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();
    const whatsapp = form.whatsapp.trim();
    const cargo = form.cargo.trim();
    const creciStatus = form.creciStatus;
    const creci =
      creciStatus === "nao_iniciado" ? "" : form.creci.trim();
    const cor = form.cor.trim();

    if (!name || !email) {
      toast.error("Preencha nome e e-mail.");
      return;
    }
    if (phone && !isValidPhone(phone)) {
      toast.error(PHONE_INVALID_MESSAGE);
      return;
    }
    if (whatsapp && !isValidPhone(whatsapp)) {
      toast.error("Informe um WhatsApp válido com DDD.");
      return;
    }
    if (creciStatus === "creci_recebido" && creci.length < 3) {
      toast.error("Informe o CRECI do usuário.");
      return;
    }
    if (formMode === "create" && !isStrongPassword(form.password)) {
      toast.error(PASSWORD_HINT);
      return;
    }

    setSaving(true);
    try {
      if (formMode === "create") {
        const created = await createUser({
          name,
          email,
          password: form.password,
          phone: phone || undefined,
          whatsapp: whatsapp || undefined,
          dataNascimento: form.dataNascimento || null,
          cargo: cargo || undefined,
          creci: creci || undefined,
          cpf: form.cpf.trim() || undefined,
          rg: form.rg.trim() || undefined,
          endereco: form.endereco.trim() || undefined,
          cep: form.cep.trim() || undefined,
          creciStatus,
          cor: cor || undefined,
          role: form.role,
          status: form.status,
          financeiroCanView: true,
          financeiroCanCreate: form.financeiroCanCreate,
          financeiroCanEdit: form.financeiroCanEdit,
          financeiroCanDelete: form.financeiroCanDelete,
        });
        setUsers((prev) => [
          created,
          ...prev.filter((u) => u.id !== created.id),
        ]);
        setFormOpen(false);
        setCredentials({
          name: created.name,
          email: created.email,
          password: form.password,
          title: "Credenciais do novo usuário",
        });
        void fetchUsersQuota()
          .then(setQuota)
          .catch(() => undefined);
      } else if (editingId) {
        const updated = await updateUser(editingId, {
          name,
          email,
          phone: phone || null,
          whatsapp: whatsapp || null,
          dataNascimento: form.dataNascimento || null,
          cargo: cargo || null,
          creci: creci || null,
          cpf: form.cpf.trim() || null,
          rg: form.rg.trim() || null,
          endereco: form.endereco.trim() || null,
          cep: form.cep.trim() || null,
          creciStatus,
          cor: cor || null,
          role: form.role,
          status: form.status,
          financeiroCanView: true,
          financeiroCanCreate: form.financeiroCanCreate,
          financeiroCanEdit: form.financeiroCanEdit,
          financeiroCanDelete: form.financeiroCanDelete,
        });
        setUsers((prev) =>
          prev.map((u) => (u.id === updated.id ? updated : u)),
        );
        toast.success("Usuário atualizado.");
        setFormOpen(false);
      }
      void syncTeam();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível salvar.",
      );
    } finally {
      setSaving(false);
    }
  }

  function requestDelete(u: ApiUser) {
    deleteTargetRef.current = u;
    window.setTimeout(() => setDeleteTarget(u), 0);
  }

  async function confirmDelete() {
    const target = deleteTargetRef.current ?? deleteTarget;
    if (!target) return;
    deleteTargetRef.current = null;
    if (
      !isAdmin &&
      !(isGerente && isCorretorLike(target.role))
    ) {
      toast.error("Você não tem permissão para excluir este usuário.");
      setDeleteTarget(null);
      return;
    }
    // Otimista: some da tabela na hora; volta se a API falhar.
    setUsers((prev) => prev.filter((u) => u.id !== target.id));
    setDeleteTarget(null);
    setDetail(null);
    toast.success(`Usuário ${target.name} excluído.`);
    try {
      await deleteUser(target.id);
      void syncTeam();
    } catch (err) {
      setUsers((prev) => [target, ...prev.filter((u) => u.id !== target.id)]);
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível excluir.",
      );
    }
  }

  async function toggleStatus(u: ApiUser) {
    const next: UserStatus = u.status === "ativo" ? "inativo" : "ativo";
    // Otimista: badge muda na hora; volta se a API falhar.
    setUsers((prev) =>
      prev.map((x) => (x.id === u.id ? { ...x, status: next } : x)),
    );
    if (detail?.id === u.id) setDetail((d) => (d ? { ...d, status: next } : d));
    toast.success(
      next === "ativo" ? `${u.name} reativado.` : `${u.name} inativado.`,
    );
    try {
      const updated = await updateUserStatus(u.id, next);
      setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      void syncTeam();
    } catch (err) {
      setUsers((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, status: u.status } : x)),
      );
      if (detail?.id === u.id)
        setDetail((d) => (d ? { ...d, status: u.status } : d));
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível alterar o status.",
      );
    }
  }

  async function handleResetPassword(u: ApiUser) {
    try {
      const result = await resetUserPassword(u.id);
      if (result.temporaryPassword) {
        setDetail(null);
        setCredentials({
          name: u.name,
          email: u.email,
          password: result.temporaryPassword,
          title: "Senha temporária gerada",
        });
      } else {
        toast.success(`Senha de ${u.name} redefinida.`);
      }
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível resetar a senha.",
      );
    }
  }

  return (
    <div>
      <PageHeader
        title="Usuários"
        description={
          loading
            ? "Carregando usuários..."
            : isAdmin
              ? quota
                ? `${filtered.length} de ${users.length} · ${quota.usados}/${quota.limite} no plano ${PLANO_LABELS[quota.plano].split(" — ")[0]}`
                : `${filtered.length} de ${users.length} usuários`
              : `Membros da sua equipe — ${filtered.length} usuário(s). E-mail visível; use Resetar senha se alguém esquecer.`
        }
        actions={
          canCreateBroker ? (
            <Button
              size="sm"
              onClick={openCreate}
              disabled={Boolean(quota && quota.restantes <= 0)}
              title={
                quota && quota.restantes <= 0
                  ? "Limite do plano atingido"
                  : undefined
              }
            >
              <Plus className="w-4 h-4 mr-1" />
              Novo usuário
            </Button>
          ) : undefined
        }
      />

      {isAdmin ? (
        <section className="mb-4 grid gap-3 grid-cols-1 sm:grid-cols-2">
          <FinanceKpiCard
            label="Total de corretores"
            value={adminStats.corretores}
            icon={Users}
            tone="blue-1"
            format="number"
            onClick={() => {
              setRoleFilter("corretor");
              setCreciFilter("all");
            }}
          />
          <FinanceKpiCard
            label="Tempo médio dos corretores"
            value={adminStats.avgSeconds}
            valueLabel={
              adminStats.avgSeconds > 0
                ? formatTimeToday(adminStats.avgSeconds)
                : "—"
            }
            icon={Clock3}
            tone="blue-2"
            format="number"
            suffix={
              adminStats.loggedInToday > 0
                ? `hoje · ${adminStats.loggedInToday} logados`
                : "hoje"
            }
          />
        </section>
      ) : null}

      {isAdmin && adminStats.corretores > 0 ? (
        <Card className="mb-4 space-y-4 p-4">
          <CreciRatioBar
            label="Com CRECI"
            count={adminStats.comCreci}
            total={adminStats.corretores}
            tone="emerald"
            onClick={() => filterCorretoresCreci("com")}
          />
          <CreciRatioBar
            label="Sem CRECI"
            count={adminStats.semCreci}
            total={adminStats.corretores}
            tone="orange"
            onClick={() => filterCorretoresCreci("sem")}
          />
        </Card>
      ) : null}

      <div className={FILTER_BAR_SHELL}>
        <div className="relative min-w-0 flex-1">
          <Search className={FILTER_SEARCH_ICON} />
          <Input
            placeholder="Buscar por nome, e-mail, telefone ou CRECI..."
            className={cn("pl-9 h-9", FILTER_CONTROL)}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <TableSortSelect
          value={sort}
          onChange={setSort}
          className={FILTER_CONTROL}
        />
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className={cn("w-44 h-9", FILTER_CONTROL)}>
            <SelectValue />
          </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os perfis</SelectItem>
              <SelectItem value="admin">Administrador</SelectItem>
              {canUseGerente && (
                <SelectItem value="gerente">Gerente</SelectItem>
              )}
              {canUseAnalista && (
                <SelectItem value="analista">Analista</SelectItem>
              )}
              <SelectItem value="treinee">Treinee</SelectItem>
              {canUseFinanceiro && (
                <SelectItem value="financeiro">Financeiro</SelectItem>
              )}
              <SelectItem value="corretor">Corretor</SelectItem>
            </SelectContent>
          </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className={cn("w-36 h-9", FILTER_CONTROL)}>
            <SelectValue />
          </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
            </SelectContent>
          </Select>
        <Select value={creciFilter} onValueChange={setCreciFilter}>
          <SelectTrigger className={cn("w-40 h-9", FILTER_CONTROL)}>
            <SelectValue />
          </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">CRECI: todos</SelectItem>
              <SelectItem value="com">Com CRECI</SelectItem>
              <SelectItem value="sem">Sem CRECI</SelectItem>
            </SelectContent>
          </Select>
      </div>

      <Card className="min-w-0 overflow-hidden">
        <Table
          containerClassName="overflow-x-auto overscroll-x-contain touch-pan-x [-webkit-overflow-scrolling:touch]"
          className="w-full min-w-7xl table-fixed [&_th]:px-3 [&_td]:overflow-hidden [&_td]:px-3 [&_th]:whitespace-nowrap"
        >
          <TableHeader>
            <TableRow>
              <TableHead className="w-[16%]">Nome</TableHead>
              <TableHead className="w-[18%]">Email</TableHead>
              <TableHead className="w-[10%]">Telefone</TableHead>
              <TableHead className="w-[8%]">CRECI</TableHead>
              <TableHead className="w-[12%]">Andamento CRECI</TableHead>
              <TableHead className="w-[9%]">Perfil</TableHead>
              <TableHead className="w-[8%]">Status</TableHead>
              <TableHead className="w-[10%]">Último acesso</TableHead>
              <TableHead className="w-[8%]">Tempo hoje</TableHead>
              <TableHead className="w-12 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  Carregando usuários...
                </TableCell>
              </TableRow>
            ) : sorted.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              pager.pageItems.map((u) => (
                <TableRow key={u.id} className="hover:bg-muted/40">
                  <TableCell className="min-w-0">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarFallback className="avatar-fallback-brand text-xs">
                          {initials(u.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span
                        className="table-person-name min-w-0 truncate text-sm"
                        title={u.name}
                      >
                        {u.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell
                    className="min-w-0 truncate text-sm"
                    title={u.email}
                  >
                    {u.email}
                  </TableCell>
                  <TableCell
                    className="min-w-0 truncate text-sm"
                    title={u.phone || undefined}
                  >
                    {u.phone || "—"}
                  </TableCell>
                  <TableCell
                    className="min-w-0 truncate text-sm"
                    title={u.creci || undefined}
                  >
                    {u.creci || "—"}
                  </TableCell>
                  <TableCell className="min-w-0">
                    <CreciAndamentoBadge user={u} short />
                  </TableCell>
                  <TableCell className="min-w-0">
                    <Badge
                      variant="outline"
                      className={cn(
                        "max-w-full truncate",
                        roleBadgeClass(u.role),
                      )}
                      title={ROLE_LABEL[u.role]}
                    >
                      {ROLE_LABEL[u.role]}
                    </Badge>
                  </TableCell>
                  <TableCell className="min-w-0">
                    <Badge
                      variant={u.status === "ativo" ? "default" : "secondary"}
                      className="max-w-full truncate"
                      title={STATUS_LABEL[u.status]}
                    >
                      {STATUS_LABEL[u.status]}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className="min-w-0 truncate text-xs text-muted-foreground"
                    title={formatLastAccess(u.lastLoginAt)}
                  >
                    {formatLastAccess(u.lastLoginAt)}
                  </TableCell>
                  <TableCell className="min-w-0 truncate text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      {presenceByUser[u.id]?.online ? (
                        <span
                          className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"
                          title="Online agora"
                        />
                      ) : null}
                      {formatTimeToday(presenceByUser[u.id]?.secondsToday)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDetail(u)}>
                          <Eye className="w-3.5 h-3.5 mr-2" />
                          Ver detalhes
                        </DropdownMenuItem>
                        {((isAdmin &&
                          (u.role === "corretor" || u.role === "gerente")) ||
                          (isManager &&
                            session?.role === "gerente" &&
                            isCorretorLike(u.role))) && (
                          <DropdownMenuItem
                            onClick={() =>
                              void navigate({
                                to: "/agenda",
                                search: { corretorId: u.id, nome: u.name },
                              })
                            }
                          >
                            <CalendarDays className="w-3.5 h-3.5 mr-2" />
                            Ver agenda
                          </DropdownMenuItem>
                        )}
                        {isAdmin && (
                          <DropdownMenuItem onClick={() => openEdit(u)}>
                            <Pencil className="w-3.5 h-3.5 mr-2" />
                            Editar
                          </DropdownMenuItem>
                        )}
                        {(isAdmin || (isManager && isCorretorLike(u.role))) && (
                          <DropdownMenuItem
                            onClick={() => void handleResetPassword(u)}
                          >
                            <KeyRound className="w-3.5 h-3.5 mr-2" />
                            Gerar senha temporária
                          </DropdownMenuItem>
                        )}
                        {isAdmin && (
                          <DropdownMenuItem
                            disabled={
                              session?.id === u.id && u.status === "ativo"
                            }
                            onClick={() => void toggleStatus(u)}
                          >
                            {u.status === "ativo" ? (
                              <>
                                <Ban className="w-3.5 h-3.5 mr-2" />
                                Inativar
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                                Reativar
                              </>
                            )}
                          </DropdownMenuItem>
                        )}
                        {(isAdmin ||
                          (isGerente && isCorretorLike(u.role))) && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              disabled={session?.id === u.id}
                              onSelect={() => requestDelete(u)}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePager
          page={pager.page}
          totalPages={pager.totalPages}
          total={pager.total}
          onPageChange={pager.setPage}
        />
      </Card>

      <FormDialogShell
        open={formOpen}
        onOpenChange={setFormOpen}
        icon={
          formMode === "edit" ? (
            <Pencil className="w-5 h-5" />
          ) : (
            <UserPlus className="w-5 h-5" />
          )
        }
        title={formMode === "edit" ? "Editar usuário" : "Novo usuário"}
        description={
          formMode === "edit"
            ? "Atualize os dados de acesso da equipe."
            : "Cadastre um novo acesso ao CRM."
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <FormDialogBody>
            <FormSection
              icon={<Sparkles className="w-3.5 h-3.5 text-primary" />}
              title="Dados"
            >
              <div className="space-y-1.5">
                <Label
                  htmlFor="usr-nome"
                  className="text-xs text-muted-foreground"
                >
                  Nome completo
                </Label>
                <Input
                  id="usr-nome"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="Ex.: Marina Alves"
                  className="h-10 bg-background"
                  autoFocus
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="usr-email"
                    className="text-xs text-muted-foreground"
                  >
                    E-mail
                  </Label>
                  <Input
                    id="usr-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                    placeholder="nome@imob.com"
                    className="h-10 bg-background"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="usr-tel"
                    className="text-xs text-muted-foreground"
                  >
                    Telefone
                  </Label>
                  <Input
                    id="usr-tel"
                    type="tel"
                    value={form.phone}
                    onChange={(e) =>
                      setField("phone", formatPhone(e.target.value))
                    }
                    placeholder={PHONE_PLACEHOLDER}
                    className="h-10 bg-background"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="usr-wa"
                  className="text-xs text-muted-foreground"
                >
                  WhatsApp
                </Label>
                <Input
                  id="usr-wa"
                  type="tel"
                  value={form.whatsapp}
                  onChange={(e) =>
                    setField("whatsapp", formatPhone(e.target.value))
                  }
                  placeholder={PHONE_PLACEHOLDER}
                  className="h-10 bg-background"
                />
                <p className="text-[11px] text-muted-foreground">
                  Usado para enviar o resultado da análise ao corretor.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="usr-nascimento"
                  className="text-xs text-muted-foreground"
                >
                  Data de nascimento
                </Label>
                <Input
                  id="usr-nascimento"
                  type="date"
                  value={form.dataNascimento}
                  onChange={(e) => setField("dataNascimento", e.target.value)}
                  className="h-10 bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="usr-cargo"
                  className="text-xs text-muted-foreground"
                >
                  Cargo
                </Label>
                <Input
                  id="usr-cargo"
                  value={form.cargo}
                  onChange={(e) => setField("cargo", e.target.value)}
                  placeholder="Ex.: Corretor sênior"
                  className="h-10 bg-background"
                />
              </div>
              <CorPicker
                id="usr-cor"
                value={form.cor}
                onChange={(hex) => setField("cor", hex)}
                previewLabel={form.name}
              />
            </FormSection>
            <FormSection
              icon={<FileText className="w-3.5 h-3.5 text-primary" />}
              title="Para contratos"
              description="Opcional. CPF, RG e endereço do corretor entram no contrato quando existirem."
            >
              <ContatoContratoFields
                idPrefix="usr"
                values={{
                  cpf: form.cpf,
                  rg: form.rg,
                  endereco: form.endereco,
                  cep: form.cep,
                }}
                onChange={(patch) =>
                  setForm((prev) => ({ ...prev, ...patch }))
                }
              />
            </FormSection>
            <FormSection
              icon={<IdCard className="w-3.5 h-3.5 text-primary" />}
              title="Processo CRECI"
              description="Acompanhe o andamento da documentação até o CRECI ser recebido."
            >
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Etapa atual
                </Label>
                <Select
                  value={form.creciStatus}
                  onValueChange={(v) => {
                    const next = v as CreciProcessoStatus;
                    setForm((prev) => ({
                      ...prev,
                      creciStatus: next,
                      creci: next === "nao_iniciado" ? "" : prev.creci,
                    }));
                  }}
                >
                  <SelectTrigger className="h-10 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CRECI_PROCESSO_STATUS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {CRECI_PROCESSO_LABEL[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  {CRECI_PROCESSO_HINT[form.creciStatus]}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {CRECI_PROCESSO_ETAPAS.map((status, index) => {
                  const current = CRECI_PROCESSO_ETAPAS.findIndex(
                    (item) => item === form.creciStatus,
                  );
                  const reached = current >= 0 && index <= current;
                  const active = form.creciStatus === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          creciStatus: status,
                        }))
                      }
                      className={cn(
                        "rounded-lg border px-2 py-2 text-left transition-colors",
                        active
                          ? "border-primary bg-primary/10"
                          : reached
                            ? "border-primary/30 bg-primary/5"
                            : "bg-background",
                      )}
                    >
                      <div className="text-[10px] font-medium text-muted-foreground">
                        {index + 1}ª etapa
                      </div>
                      <div className="text-xs font-medium leading-snug">
                        {CRECI_PROCESSO_SHORT[status]}
                      </div>
                    </button>
                  );
                })}
              </div>
              {form.creciStatus === "creci_recebido" ? (
                <div className="space-y-1.5">
                  <Label
                    htmlFor="usr-creci"
                    className="text-xs text-muted-foreground"
                  >
                    Número do CRECI
                  </Label>
                  <Input
                    id="usr-creci"
                    value={form.creci}
                    onChange={(e) => setField("creci", e.target.value)}
                    placeholder="Ex.: 12345-J"
                    className="h-10 bg-background"
                    maxLength={40}
                  />
                </div>
              ) : null}
            </FormSection>
            <FormSection
              icon={<Shield className="w-3.5 h-3.5 text-primary" />}
              title="Acesso"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Perfil
                  </Label>
                  <Select
                    value={form.role}
                    onValueChange={(v) => {
                      const role = v as Role;
                      setField("role", role);
                      if (role !== "financeiro") {
                        setField("financeiroCanCreate", true);
                        setField("financeiroCanEdit", true);
                        setField("financeiroCanDelete", true);
                      }
                    }}
                  >
                    <SelectTrigger className="h-10 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {isAdmin && (
                        <>
                          {(canCreateAdmin || form.role === "admin") && (
                            <SelectItem value="admin">Administrador</SelectItem>
                          )}
                          {canUseGerente && (
                            <SelectItem value="gerente">Gerente</SelectItem>
                          )}
                          {canUseAnalista && (
                            <SelectItem value="analista">Analista</SelectItem>
                          )}
                          <SelectItem value="treinee">Treinee</SelectItem>
                          {canUseFinanceiro && (
                            <SelectItem value="financeiro">
                              Financeiro
                            </SelectItem>
                          )}
                        </>
                      )}
                      <SelectItem value="corretor">Corretor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Status
                  </Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setField("status", v as UserStatus)}
                    disabled={formMode === "edit" && editingId === session?.id}
                  >
                    <SelectTrigger className="h-10 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.role === "financeiro" ? (
                <div className="space-y-3 rounded-xl border border-primary/15 bg-primary/5 p-3">
                  <div>
                    <p className="text-sm font-medium">Permissões do Financeiro</p>
                    <p className="text-xs text-muted-foreground">
                      Este perfil acessa só o módulo Financeiro. Visualizar
                      sempre fica ativo.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center justify-between gap-3 rounded-lg border bg-background/80 px-3 py-2">
                      <Label className="text-xs">Visualizar</Label>
                      <Switch checked disabled />
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg border bg-background/80 px-3 py-2">
                      <Label htmlFor="fin-create" className="text-xs">
                        Criar
                      </Label>
                      <Switch
                        id="fin-create"
                        checked={form.financeiroCanCreate}
                        onCheckedChange={(v) =>
                          setField("financeiroCanCreate", v)
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg border bg-background/80 px-3 py-2">
                      <Label htmlFor="fin-edit" className="text-xs">
                        Editar
                      </Label>
                      <Switch
                        id="fin-edit"
                        checked={form.financeiroCanEdit}
                        onCheckedChange={(v) =>
                          setField("financeiroCanEdit", v)
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg border bg-background/80 px-3 py-2">
                      <Label htmlFor="fin-delete" className="text-xs">
                        Excluir
                      </Label>
                      <Switch
                        id="fin-delete"
                        checked={form.financeiroCanDelete}
                        onCheckedChange={(v) =>
                          setField("financeiroCanDelete", v)
                        }
                      />
                    </div>
                  </div>
                </div>
              ) : null}
              {formMode === "create" && (
                <div className="space-y-1.5">
                  <Label
                    htmlFor="usr-senha"
                    className="text-xs text-muted-foreground"
                  >
                    Senha inicial
                  </Label>
                  <Input
                    id="usr-senha"
                    type="text"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(e) => setField("password", e.target.value)}
                    placeholder="Ex.: Senha@123"
                    className="h-10 bg-background"
                    required
                  />
                  <p
                    className={cn(
                      "text-[11px]",
                      form.password && !isStrongPassword(form.password)
                        ? "text-destructive"
                        : "text-muted-foreground",
                    )}
                  >
                    {PASSWORD_HINT}
                  </p>
                </div>
              )}
            </FormSection>
          </FormDialogBody>
          <FormDialogActions hint="As alterações são salvas no banco.">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFormOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving
                ? "Salvando..."
                : formMode === "edit"
                  ? "Salvar alterações"
                  : "Criar usuário"}
            </Button>
          </FormDialogActions>
        </form>
      </FormDialogShell>

      <FormDialogShell
        open={!!detail}
        onOpenChange={(o) => {
          if (!o) {
            setDetail(null);
            setWeekPresence(null);
          }
        }}
        icon={<Eye className="w-5 h-5" />}
        title={detail?.name ?? "Detalhes do usuário"}
        className={
          isCorretorLike(detail?.role)
            ? "max-w-[min(96vw,78rem)]"
            : undefined
        }
        description={
          detail ? (
            <span className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={roleBadgeClass(detail.role)}>
                {ROLE_LABEL[detail.role]}
              </Badge>
              <Badge
                variant={detail.status === "ativo" ? "default" : "secondary"}
                className={STATUS_CHIP_CLASS}
                title={STATUS_LABEL[detail.status]}
              >
                {STATUS_LABEL[detail.status]}
              </Badge>
            </span>
          ) : undefined
        }
      >
        {detail && (
          <>
            <FormDialogBody
              className={cn(
                isCorretorLike(detail.role) && "bg-muted/20",
              )}
            >
              {isCorretorLike(detail.role) ? (
                <BrokerPipeline brokerId={detail.id} leads={leads} />
              ) : null}
              <FormSection
                icon={<Sparkles className="w-3.5 h-3.5 text-primary" />}
                title="Contato"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-[11px] text-muted-foreground">
                      E-mail
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium break-all">
                        {detail.email}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => void copyText(detail.email, "email")}
                        title="Copiar e-mail"
                      >
                        {copiedField === "email" ? (
                          <Check className="w-3.5 h-3.5 text-primary" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <DetailField label="Telefone" value={detail.phone || "—"} />
                  <DetailField
                    label="WhatsApp"
                    value={detail.whatsapp || "—"}
                  />
                  <DetailField
                    label="Nascimento"
                    value={formatBirthDate(detail.dataNascimento)}
                  />
                  <DetailField label="Cargo" value={detail.cargo || "—"} />
                  <DetailField label="CRECI" value={detail.creci || "—"} />
                  <DetailField
                    label="Andamento CRECI"
                    value={<CreciAndamentoBadge user={detail} />}
                  />
                  <DetailField
                    label="Último acesso"
                    value={formatLastAccess(detail.lastLoginAt)}
                  />
                  <DetailField
                    label="Tempo hoje"
                    value={
                      presenceByUser[detail.id]?.online
                        ? `${formatTimeToday(presenceByUser[detail.id]?.secondsToday)} · online`
                        : formatTimeToday(
                            presenceByUser[detail.id]?.secondsToday,
                          )
                    }
                  />
                </div>
              </FormSection>
              <FormSection
                icon={<Clock3 className="w-3.5 h-3.5 text-primary" />}
                title="Tempo logado na semana"
              >
                {weekPresenceLoading ? (
                  <p className="text-xs text-muted-foreground">
                    Carregando presença da semana...
                  </p>
                ) : !weekPresence ? (
                  <p className="text-xs text-muted-foreground">
                    Não foi possível carregar o tempo da semana.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-xs text-muted-foreground">
                        Segunda a domingo (horário de Brasília)
                      </span>
                      <span className="text-sm font-medium">
                        Total {formatTimeToday(weekPresence.secondsWeek)}
                      </span>
                    </div>
                    <ul className="divide-y divide-border/60 rounded-md border border-border/60">
                      {weekPresence.days.map((day) => {
                        const isToday = day.dateKey === todayDateKeyBrasil();
                        return (
                          <li
                            key={day.dateKey}
                            className={cn(
                              "flex items-center justify-between gap-3 px-3 py-2 text-sm",
                              isToday && "bg-muted/40",
                            )}
                          >
                            <span
                              className={cn(
                                "text-muted-foreground",
                                isToday && "font-medium text-foreground",
                              )}
                            >
                              {formatWeekDayLabel(day.dateKey)}
                              {isToday ? " · hoje" : ""}
                            </span>
                            <span className="tabular-nums font-medium">
                              {formatTimeToday(day.seconds)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </FormSection>
              <FormSection
                icon={<Shield className="w-3.5 h-3.5 text-primary" />}
                title="Acesso"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailField label="Perfil" value={ROLE_LABEL[detail.role]} />
                  <DetailField
                    label="Status"
                    value={STATUS_LABEL[detail.status]}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  A senha original não pode ser visualizada (fica
                  criptografada). Use <strong>Gerar senha temporária</strong> se
                  o usuário esquecer.
                </p>
              </FormSection>
            </FormDialogBody>
            <FormDialogActions>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDetail(null)}
              >
                Fechar
              </Button>
              {((isAdmin &&
                (detail.role === "corretor" || detail.role === "gerente")) ||
                (session?.role === "gerente" &&
                  isCorretorLike(detail.role))) && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setDetail(null);
                    void navigate({
                      to: "/agenda",
                      search: { corretorId: detail.id, nome: detail.name },
                    });
                  }}
                >
                  <CalendarDays className="w-4 h-4 mr-1" />
                  Ver agenda
                </Button>
              )}
              {(isAdmin || (isManager && isCorretorLike(detail.role))) && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void handleResetPassword(detail)}
                >
                  <KeyRound className="w-4 h-4 mr-1" />
                  Gerar senha temporária
                </Button>
              )}
              {isAdmin && (
                <Button type="button" onClick={() => openEdit(detail)}>
                  <Pencil className="w-4 h-4 mr-1" />
                  Editar
                </Button>
              )}
              {(isAdmin ||
                (isGerente && isCorretorLike(detail.role))) &&
                session?.id !== detail.id && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      setDetail(null);
                      requestDelete(detail);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Excluir
                  </Button>
                )}
            </FormDialogActions>
          </>
        )}
      </FormDialogShell>

      <FormDialogShell
        open={!!credentials}
        onOpenChange={(o) => !o && setCredentials(null)}
        icon={<KeyRound className="w-5 h-5" />}
        title={credentials?.title ?? "Credenciais"}
        description={
          credentials
            ? `Anote e entregue a ${credentials.name}. A senha só aparece agora.`
            : undefined
        }
      >
        {credentials && (
          <>
            <FormDialogBody>
              <FormSection
                icon={<Shield className="w-3.5 h-3.5 text-primary" />}
                title="Acesso"
              >
                <div className="space-y-3">
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
                    <div className="text-[11px] text-muted-foreground">
                      E-mail
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-sm break-all">
                        {credentials.email}
                      </code>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() =>
                          void copyText(credentials.email, "email")
                        }
                      >
                        {copiedField === "email" ? (
                          <Check className="w-3.5 h-3.5 mr-1" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 mr-1" />
                        )}
                        Copiar
                      </Button>
                    </div>
                  </div>
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-1">
                    <div className="text-[11px] text-muted-foreground">
                      Senha temporária
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-sm font-semibold tracking-wide break-all">
                        {credentials.password}
                      </code>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() =>
                          void copyText(credentials.password, "password")
                        }
                      >
                        {copiedField === "password" ? (
                          <Check className="w-3.5 h-3.5 mr-1" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 mr-1" />
                        )}
                        Copiar
                      </Button>
                    </div>
                  </div>
                </div>
              </FormSection>
            </FormDialogBody>
            <FormDialogActions hint="Peça ao usuário para trocar a senha no perfil após o login.">
              <Button type="button" onClick={() => setCredentials(null)}>
                Entendi
              </Button>
            </FormDialogActions>
          </>
        )}
      </FormDialogShell>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Tem certeza que deseja excluir ${deleteTarget.name}? Esta ação não pode ser desfeita.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDelete()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BrokerPipeline({
  brokerId,
  leads,
}: {
  brokerId: string;
  leads: Lead[];
}) {
  const [stages, setStages] = useState<FunilEtapa[]>([]);
  const [period, setPeriod] = useState<"all" | "month" | "30d">("month");
  const [stageFilter, setStageFilter] = useState("__all__");
  const [metrics, setMetrics] = useState<DashboardEsteiraCorretor | null>(null);

  useEffect(() => {
    let active = true;
    void fetchFunilAtivo("comercial")
      .then((funil) => {
        if (active) {
          setStages(
            funil.etapas
              .filter((stage) => stage.active)
              .sort((a, b) => a.sortOrder - b.sortOrder),
          );
        }
      })
      .catch(() => {
        if (active) setStages([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const today = new Date();
    let active = true;
    void fetchDashboardEsteiraCorretor(brokerId, {
      mes: today.getMonth() + 1,
      ano: today.getFullYear(),
    })
      .then((esteira) => {
        if (active) {
          setMetrics(esteira);
        }
      })
      .catch(() => {
        if (active) setMetrics(null);
      });
    return () => {
      active = false;
    };
  }, [brokerId]);

  const brokerLeads = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastThirtyDays = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return leads.filter((lead) => {
      if (lead.corretorId !== brokerId) return false;
      if (stageFilter !== "__all__" && lead.stage !== stageFilter) return false;
      if (period === "all") return true;
      const createdAt = lead.createdAt ? new Date(lead.createdAt) : null;
      if (!createdAt || Number.isNaN(createdAt.getTime())) return false;
      return period === "month"
        ? createdAt >= startOfMonth
        : createdAt >= lastThirtyDays;
    });
  }, [brokerId, leads, period, stageFilter]);

  const visibleStages = useMemo(() => {
    if (metrics?.etapas.length) {
      return metrics.etapas.map((stage, sortOrder) => ({
        id: stage.id,
        slug: stage.slug,
        label: stage.label,
        color: "bg-muted",
        sortOrder,
      }));
    }
    if (stages.length) return stages;
    return Array.from(new Set(brokerLeads.map((lead) => lead.stage))).map(
      (slug, sortOrder) => ({
        id: slug,
        slug,
        label: slug,
        color: "bg-muted",
        sortOrder,
      }),
    );
  }, [brokerLeads, metrics?.etapas, stages]);

  const oldestLead = useMemo(
    () =>
      brokerLeads.reduce<Lead | null>((oldest, lead) => {
        if (!oldest) return lead;
        return new Date(lead.updatedAt) < new Date(oldest.updatedAt)
          ? lead
          : oldest;
      }, null),
    [brokerLeads],
  );
  const oldestDays = oldestLead
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(oldestLead.updatedAt).getTime()) /
            (24 * 60 * 60 * 1000),
        ),
      )
    : 0;
  const money = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const selectedPipelineStage =
    metrics?.etapas.find((stage) => stage.slug === stageFilter) ??
    metrics?.etapas[0] ??
    null;

  return (
    <FormSection
      icon={<Kanban className="w-3.5 h-3.5 text-primary" />}
      title="Esteira do corretor"
    >
      <div className="rounded-xl border bg-card p-2.5 text-foreground shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide">
              Minha esteira
            </p>
            <p className="text-[10px] text-muted-foreground">
              Visão comercial do corretor no período selecionado
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
          <Select value={period} onValueChange={(value) => setPeriod(value as typeof period)}>
            <SelectTrigger className="h-7 w-28 bg-background text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Este mês</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="all">Todo o período</SelectItem>
            </SelectContent>
          </Select>
          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="h-7 w-32 bg-background text-[11px]">
              <SelectValue placeholder="Todas as etapas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas as etapas</SelectItem>
              {visibleStages.map((stage) => (
                <SelectItem key={stage.id} value={stage.slug}>
                  {stage.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          <PipelineMetric
            label="VGV do mês"
            value={money(metrics?.indicadores.vgv ?? 0)}
          />
          <PipelineMetric
            label="Conversão"
            value={`${(metrics?.indicadores.conversao ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
          />
          <PipelineMetric
            label="Vendas"
            value={String(metrics?.indicadores.vendas ?? 0)}
          />
          <PipelineMetric
            label="Mais antiga parada"
            value={
              metrics?.indicadores.maisAntigo
                ? `${metrics.indicadores.maisAntigo.diasParado}d`
                : oldestLead
                  ? `${oldestDays}d`
                  : "—"
            }
          />
        </div>
        <div className="mt-3 flex w-full items-start justify-between gap-0">
          {visibleStages.map((stage, index) => {
            const count =
              metrics?.etapas.find((item) => item.slug === stage.slug)?.total ??
              brokerLeads.filter((lead) => lead.stage === stage.slug).length;
            const theme = [
              {
                circle:
                  "border-slate-300 bg-gradient-to-br from-slate-100 to-slate-400 text-slate-950 shadow-slate-400/40",
                line: "from-slate-300 via-amber-400 to-amber-500",
              },
              {
                circle:
                  "border-amber-300 bg-gradient-to-br from-amber-200 to-amber-500 text-amber-950 shadow-amber-400/50",
                line: "from-amber-400 via-fuchsia-400 to-fuchsia-500",
              },
              {
                circle:
                  "border-fuchsia-300 bg-gradient-to-br from-fuchsia-200 to-purple-600 text-white shadow-fuchsia-500/50",
                line: "from-fuchsia-500 via-sky-400 to-sky-500",
              },
              {
                circle:
                  "border-sky-300 bg-gradient-to-br from-sky-200 to-blue-600 text-white shadow-sky-500/50",
                line: "from-sky-500 via-emerald-400 to-emerald-500",
              },
              {
                circle:
                  "border-emerald-300 bg-gradient-to-br from-emerald-200 to-emerald-500 text-emerald-950 shadow-emerald-500/50",
                line: "from-emerald-500 via-rose-400 to-rose-500",
              },
              {
                circle:
                  "border-rose-300 bg-gradient-to-br from-rose-200 to-rose-500 text-rose-950 shadow-rose-500/50",
                line: "from-rose-500 to-rose-500",
              },
            ][index % 6]!;
            return (
              <div key={stage.id} className="flex flex-1 items-center last:flex-none">
                <button
                  type="button"
                  onClick={() =>
                    setStageFilter((current) =>
                      current === stage.slug ? "__all__" : stage.slug,
                    )
                  }
                  className={cn(
                    "group flex w-20 shrink-0 flex-col items-center gap-1 text-center",
                    stageFilter === stage.slug && "scale-105",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 flex-col items-center justify-center rounded-full border-2 text-sm font-extrabold shadow-md transition-transform group-hover:scale-110",
                      theme.circle,
                    )}
                  >
                    <span className="leading-none">{count}</span>
                    <span className="text-[7px] font-bold uppercase tracking-wider opacity-75">
                      docs
                    </span>
                  </span>
                  <span className="max-w-20 truncate text-[8px] font-bold uppercase tracking-wide text-muted-foreground">
                    {stage.label}
                  </span>
                </button>
                {index < visibleStages.length - 1 ? (
                  <span
                    className={cn(
                      "mb-5 h-0.5 min-w-2 flex-1 rounded-full bg-linear-to-r",
                      theme.line,
                    )}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-lg border bg-muted/20">
        <div className="flex items-center justify-between gap-3 border-b bg-muted/40 px-3 py-2">
          <p className="text-xs font-bold uppercase tracking-wide">
            {selectedPipelineStage?.label ?? "Documentações"}
          </p>
          <span className="text-[11px] text-muted-foreground">
            {selectedPipelineStage?.total ?? 0} na bandeja
          </span>
        </div>
        {selectedPipelineStage?.contatos.length ? (
          <div className="divide-y">
            {selectedPipelineStage.contatos.slice(0, 5).map((contato) => (
              <div
                key={contato.id}
                className="flex items-center justify-between gap-3 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold">{contato.nome}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {contato.empreendimento?.nome ?? "Documentação"}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  Atualizado{" "}
                  {new Date(contato.updatedAt).toLocaleDateString("pt-BR")}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-3 py-3 text-center text-[11px] text-muted-foreground">
            Nenhuma documentação nesta etapa.
          </p>
        )}
      </div>
    </FormSection>
  );
}

function PipelineMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/40 px-2 py-1.5">
      <p className="text-[8px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 truncate text-xs font-bold text-primary">{value}</p>
    </div>
  );
}
