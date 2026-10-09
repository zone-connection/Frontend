import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  CircleUser,
  Filter,
  Globe,
  Loader2,
  Pencil,
  Search,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { DashDonut, DashDonutLegend } from "@/components/dash-donut";
import { dashCardTone, type FinanceKpiTone } from "@/components/finance-kpi-card";
import { PagePanel } from "@/components/page-panel";
import {
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
  FormSection,
} from "@/components/form-dialog";
import { SemConexao } from "@/components/sem-conexao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { canViewModule, isCorretorLike } from "@/lib/permissions";
import { origemBadgeClass } from "@/lib/catalog-colors";
import { fetchConstrutoras, type Construtora } from "@/lib/construtoras-api";
import {
  displayFonte,
  fetchDocumentacaoCorretores,
  fetchDocumentacoes,
  updateDocumentacao,
  type Documentacao,
  type DocumentacaoCorretor,
} from "@/lib/documentacao-api";
import { isStatusVendido } from "@/lib/documentacao-status";
import {
  fetchEmpreendimentos,
  type Empreendimento,
} from "@/lib/empreendimentos-api";
import { fetchEquipes, type Equipe } from "@/lib/equipes-api";
import {
  formatMoneyInput,
  maskMoneyInput,
  parseOptionalMoneyInput,
} from "@/lib/money-input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CadastroVendasBronzePage } from "@/components/cadastro-vendas-bronze-page";
import { FILTRO_CAMPO, FiltrosPainel } from "@/components/filtros-painel";

type VendasSearch = {
  comVgv?: boolean;
};

function parseComVgv(value: unknown): boolean | undefined {
  if (value === true || value === "1" || value === "true") return true;
  return undefined;
}

export const Route = createFileRoute("/_app/vendas")({
  head: () => ({ meta: [{ title: "Vendas — Zone Connection" }] }),
  validateSearch: (search: Record<string, unknown>): VendasSearch => {
    const comVgv = parseComVgv(search.comVgv);
    return comVgv ? { comVgv } : {};
  },
  component: VendasPage,
});

function brl(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function dateDay(value: string | null | undefined) {
  return value?.slice(0, 10) ?? "";
}

function dateBr(value: string | null | undefined) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : "—";
}

type VendaEditForm = {
  nome: string;
  construtoraId: string;
  empreendimentoId: string;
  corretorId: string;
  gerenteId: string;
  dataVenda: string;
  vgv: string;
};

function emptyVendaEditForm(): VendaEditForm {
  return {
    nome: "",
    construtoraId: "",
    empreendimentoId: "",
    corretorId: "",
    gerenteId: "",
    dataVenda: "",
    vgv: "",
  };
}

function toVendaEditForm(doc: Documentacao): VendaEditForm {
  return {
    nome: doc.nome ?? "",
    construtoraId: doc.construtoraId ?? "",
    empreendimentoId: doc.empreendimentoId ?? "",
    corretorId: doc.corretorId ?? doc.lead?.corretorId ?? "",
    gerenteId: doc.gerenteId ?? "",
    dataVenda: dateDay(doc.dataVenda),
    vgv: doc.vgv != null ? formatMoneyInput(doc.vgv) : "",
  };
}

const APPLY_FILTERS_BTN =
  "h-9 rounded-lg border-0 bg-[#079ED4] px-3.5 text-[13.5px] font-medium text-white shadow-none before:hidden hover:bg-[#0689b8] hover:brightness-100";

const VENDA_PANEL = "!rounded-lg border-[#E2E8EC] !shadow-none";

const BRAND_RAMP = ["#079ED4", "#0C7C86", "#0B3148", "#4FB6DE", "#164866", "#8B98A3"];

function isoDay(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function rangeForPeriod(period: "30" | "90" | "365" | "all") {
  if (period === "all") return { dataDe: "", dataAte: "" };
  const ate = new Date();
  const de = new Date();
  de.setDate(ate.getDate() - (Number(period) - 1));
  return { dataDe: isoDay(de), dataAte: isoDay(ate) };
}

function previousRange(dataDe: string, dataAte: string) {
  if (!dataDe || !dataAte) return null;
  const start = new Date(`${dataDe}T12:00:00`);
  const end = new Date(`${dataAte}T12:00:00`);
  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - (days - 1));
  return { dataDe: isoDay(prevStart), dataAte: isoDay(prevEnd) };
}

function trendLabel(current: number, previous: number) {
  if (previous === 0) return current === 0 ? "0%" : "+100%";
  const pct = Math.round(((current - previous) / previous) * 100);
  return `${pct > 0 ? "+" : ""}${pct}%`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return (letters || "?").toUpperCase();
}

const AVATAR_TONES = [
  "bg-[#079ED4]",
  "bg-[#0C7C86]",
  "bg-[#3B6FD8]",
  "bg-[#164866]",
];

function PersonCell({ name, detail }: { name: string; detail?: string }) {
  const tone = AVATAR_TONES[name.charCodeAt(0) % AVATAR_TONES.length];
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white",
          tone,
        )}
      >
        {initials(name)}
      </span>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-[#1A242C]">{name}</div>
        {detail ? (
          <div className="truncate text-xs text-[#8B98A3]">{detail}</div>
        ) : null}
      </div>
    </div>
  );
}

function VendaKpi({
  label,
  value,
  hint,
  trend,
  icon: Icon,
  tone = "teal",
  active = false,
  onClick,
}: {
  label: string;
  value: string;
  hint?: string;
  trend?: string;
  icon: typeof Filter;
  tone?: FinanceKpiTone;
  active?: boolean;
  onClick?: () => void;
}) {
  const paint = dashCardTone(tone);
  const className = cn(
    "relative flex min-w-0 flex-col overflow-hidden rounded-xl border px-3.5 py-3 text-left",
    paint.card,
    active && "ring-2 ring-[#079ED4]/45",
    onClick && "cursor-pointer",
  );
  const up = !trend || trend.startsWith("+") || trend === "0%";
  const body = (
    <>
      <div className="relative flex items-center gap-2">
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", paint.disc)}>
          <Icon className="size-4" />
        </span>
        <span className={cn("text-[13px]", paint.label)}>{label}</span>
      </div>
      <span className={cn("relative mt-2 text-[22px] font-semibold leading-none tracking-tight tabular-nums", paint.ink)}>
        {value}
      </span>
      {trend ? (
        <span className={cn("relative mt-1.5 text-[11px] leading-snug", up ? "text-[#067647]" : "text-[#C01048]")}>
          {up ? "↑ " : "↓ "}
          {trend.replace(/^[+-]/, "")} em relação ao período anterior
        </span>
      ) : hint ? (
        <span className={cn("relative mt-1.5 text-[11px]", paint.label)}>{hint}</span>
      ) : (
        <span className="mt-1.5 block h-4" aria-hidden />
      )}
    </>
  );
  if (!onClick) return <div className={className}>{body}</div>;
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={className}>
      {body}
    </button>
  );
}

function VendasPage() {
  const user = getSession();
  if (user?.tenant?.plano === "bronze") {
    return <CadastroVendasBronzePage />;
  }
  return <VendasDocumentacaoPage />;
}

function VendasDocumentacaoPage() {
  const user = getSession();
  const navigate = useNavigate();
  const comVgv = Route.useSearch().comVgv === true;
  const isSolo = user?.tenant?.plano === "solo";
  const ownSalesOnly = isCorretorLike(user?.role);
  const showTeamFilters = !isSolo && !ownSalesOnly;
  const canView = canViewModule(user, "vendas");
  const canEdit = user?.role === "admin";
  const [docs, setDocs] = useState<Documentacao[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [docCorretores, setDocCorretores] = useState<DocumentacaoCorretor[]>(
    [],
  );
  const [construtoras, setConstrutoras] = useState<Construtora[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [editing, setEditing] = useState<Documentacao | null>(null);
  const [editForm, setEditForm] = useState<VendaEditForm>(emptyVendaEditForm);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const emptyFilters = useMemo(
    () => ({
      search: "",
      equipeId: "__all__",
      gerenteId: "__all__",
      corretorId: "__all__",
      origem: "__all__",
      dataDe: "",
      dataAte: "",
    }),
    [],
  );
  const [draft, setDraft] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [periodo, setPeriodo] = useState<"30" | "90" | "365" | "all">("all");
  const PAGE_SIZE = 20;

  useEffect(() => {
    const range = rangeForPeriod(periodo);
    setDraft((prev) => ({ ...prev, ...range }));
    setApplied((prev) => ({ ...prev, ...range }));
  }, [periodo]);

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    Promise.all([
      fetchDocumentacoes(undefined, undefined, true),
      showTeamFilters ? fetchEquipes() : Promise.resolve([] as Equipe[]),
    ])
      .then(([documentacoes, equipesData]) => {
        if (!active) return;
        const sold = documentacoes.filter((doc) => isStatusVendido(doc.status2));
        setDocs(
          ownSalesOnly && user?.id
            ? sold.filter(
                (doc) => (doc.corretorId ?? doc.lead?.corretorId) === user.id,
              )
            : sold,
        );
        setEquipes(equipesData);
      })
      .catch((error) => {
        if (!active) return;
        toast.error(
          error instanceof ApiError
            ? error.message
            : "Não foi possível carregar as vendas.",
        );
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [canView, showTeamFilters, ownSalesOnly, user?.id]);

  const corretorEquipe = useMemo(() => {
    const map = new Map<string, Equipe>();
    for (const equipe of equipes) {
      for (const membro of equipe.membros) map.set(membro.id, equipe);
    }
    return map;
  }, [equipes]);

  const gerentes = useMemo(() => {
    const map = new Map<string, string>();
    for (const equipe of equipes) {
      map.set(equipe.gerente.id, equipe.gerente.name);
    }
    for (const doc of docs) {
      if (doc.gerente) map.set(doc.gerente.id, doc.gerente.name);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [docs, equipes]);

  const corretores = useMemo(() => {
    const map = new Map<string, string>();
    for (const equipe of equipes) {
      for (const membro of equipe.membros) {
        if (membro.role === "corretor") map.set(membro.id, membro.name);
      }
    }
    for (const doc of docs) {
      const corretor = doc.corretor ?? doc.lead?.corretor;
      if (corretor) map.set(corretor.id, corretor.name);
    }
    return [...map.entries()]
      .filter(([id]) => {
        if (draft.equipeId === "__all__") return true;
        return corretorEquipe.get(id)?.id === draft.equipeId;
      })
      .sort((a, b) => a[1].localeCompare(b[1], "pt-BR"));
  }, [docs, equipes, draft.equipeId, corretorEquipe]);

  const origens = useMemo(
    () =>
      [
        ...new Set(
          docs.flatMap((doc) => {
            const origem = doc.lead?.origem?.trim();
            return origem ? [origem] : [];
          }),
        ),
      ].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [docs],
  );

  const filtered = useMemo(() => {
    const query = normalize(applied.search);
    return docs.filter((doc) => {
      const docCorretorId = doc.corretorId ?? doc.lead?.corretorId;
      const equipe = docCorretorId
        ? corretorEquipe.get(docCorretorId)
        : undefined;
      const docGerenteId = doc.gerenteId ?? equipe?.gerenteId ?? null;
      // Igual ao dashboard: dataVenda; se vazia, cadastro da ficha.
      const vendaDay = dateDay(doc.dataVenda) || dateDay(doc.createdAt);
      if (applied.equipeId !== "__all__" && equipe?.id !== applied.equipeId)
        return false;
      if (
        applied.gerenteId !== "__all__" &&
        docGerenteId !== applied.gerenteId
      )
        return false;
      if (
        applied.corretorId !== "__all__" &&
        docCorretorId !== applied.corretorId
      )
        return false;
      if (applied.origem !== "__all__" && doc.lead?.origem !== applied.origem)
        return false;
      if (applied.dataDe && (!vendaDay || vendaDay < applied.dataDe))
        return false;
      if (applied.dataAte && (!vendaDay || vendaDay > applied.dataAte))
        return false;
      if (comVgv && doc.vgv == null) return false;
      if (!query) return true;
      return normalize(
        [
          doc.nome,
          doc.construtora?.nome,
          doc.empreendimento?.nome,
          doc.corretor?.name ?? doc.lead?.corretor?.name,
          doc.gerente?.name,
          doc.lead?.origem,
          equipe?.name,
        ]
          .filter(Boolean)
          .join(" "),
      ).includes(query);
    });
  }, [docs, applied, corretorEquipe, comVgv]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  useEffect(() => {
    setPage(1);
  }, [applied]);

  const totalVgv = filtered.reduce((sum, doc) => sum + (doc.vgv ?? 0), 0);
  const comVgvCount = filtered.filter((doc) => doc.vgv != null).length;
  const previousRows = useMemo(() => {
    const window = previousRange(applied.dataDe, applied.dataAte);
    if (!window) return [];
    return docs.filter((doc) => {
      const vendaDay = dateDay(doc.dataVenda) || dateDay(doc.createdAt);
      if (!vendaDay || vendaDay < window.dataDe || vendaDay > window.dataAte) return false;
      if (comVgv && doc.vgv == null) return false;
      return true;
    });
  }, [docs, applied.dataDe, applied.dataAte, comVgv]);
  const hasWindow = Boolean(applied.dataDe && applied.dataAte);
  const vendasTrend = hasWindow
    ? trendLabel(filtered.length, previousRows.length)
    : undefined;
  const vgvTrend = hasWindow
    ? trendLabel(
        totalVgv,
        previousRows.reduce((sum, doc) => sum + (doc.vgv ?? 0), 0),
      )
    : undefined;
  const origemDonut = useMemo(() => {
    const counts = new Map<string, number>();
    for (const doc of filtered) {
      const label = doc.lead?.origem?.trim() || "Sem origem";
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"))
      .map(([label, value], index) => ({
        label,
        value,
        color: BRAND_RAMP[index % BRAND_RAMP.length],
      }));
  }, [filtered]);

  const verTodasAsVendas = () => {
    void navigate({ to: "/vendas", search: {} });
  };

  const clearFilters = () => {
    setDraft(emptyFilters);
    setApplied(emptyFilters);
    if (comVgv) verTodasAsVendas();
  };

  const applyFilters = () => {
    setApplied({ ...draft });
  };

  const gerenteIdOfCorretor = (corretorId: string) => {
    if (!corretorId) return "";
    return (
      docCorretores.find((item) => item.id === corretorId)?.gerenteId ??
      equipes.find((equipe) =>
        equipe.membros.some((membro) => membro.id === corretorId),
      )?.gerenteId ??
      ""
    );
  };

  const corretorSelectOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const item of docCorretores) map.set(item.id, item);
    for (const equipe of equipes) {
      for (const membro of equipe.membros) {
        if (!map.has(membro.id)) {
          map.set(membro.id, { id: membro.id, name: membro.name });
        }
      }
    }
    if (editing?.corretor && !map.has(editing.corretor.id)) {
      map.set(editing.corretor.id, editing.corretor);
    }
    const leadCorretor = editing?.lead?.corretor;
    if (leadCorretor && !map.has(leadCorretor.id)) {
      map.set(leadCorretor.id, leadCorretor);
    }
    return [...map.values()].sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR"),
    );
  }, [docCorretores, equipes, editing]);

  const gerenteSelectOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const equipe of equipes) {
      map.set(equipe.gerente.id, equipe.gerente);
    }
    for (const item of docCorretores) {
      if (item.gerente) map.set(item.gerente.id, item.gerente);
    }
    if (editing?.gerente && !map.has(editing.gerente.id)) {
      map.set(editing.gerente.id, editing.gerente);
    }
    return [...map.values()].sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR"),
    );
  }, [equipes, docCorretores, editing]);

  const empreendimentosDaConstrutora = useMemo(() => {
    const list = !editForm.construtoraId
      ? empreendimentos
      : empreendimentos.filter(
          (item) => item.construtoraId === editForm.construtoraId,
        );
    const current = editing?.empreendimento;
    if (
      current &&
      editForm.empreendimentoId === current.id &&
      !list.some((item) => item.id === current.id)
    ) {
      return [current, ...list];
    }
    return list;
  }, [
    empreendimentos,
    editForm.construtoraId,
    editForm.empreendimentoId,
    editing,
  ]);

  async function ensureEditCatalogs() {
    if (docCorretores.length && construtoras.length && empreendimentos.length) {
      return;
    }
    const [corretoresData, construtorasData, empreendimentosData] =
      await Promise.all([
        fetchDocumentacaoCorretores().catch(() => [] as DocumentacaoCorretor[]),
        fetchConstrutoras().catch(() => [] as Construtora[]),
        fetchEmpreendimentos({ ativo: true }).catch(() => [] as Empreendimento[]),
      ]);
    setDocCorretores(corretoresData);
    setConstrutoras(construtorasData);
    setEmpreendimentos(empreendimentosData);
  }

  async function openEdit(doc: Documentacao) {
    if (!canEdit) return;
    setEditing(doc);
    const form = toVendaEditForm(doc);
    if (isSolo && user?.id && !form.corretorId) {
      form.corretorId = user.id;
    }
    if (isSolo) form.gerenteId = "";
    setEditForm(form);
    try {
      await ensureEditCatalogs();
      setEditOpen(true);
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Não foi possível carregar os dados para edição.",
      );
    }
  }

  async function handleSaveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const nome = editForm.nome.trim();
    if (nome.length < 2) {
      toast.error("Informe o nome do cliente.");
      return;
    }
    const vgv = parseOptionalMoneyInput(editForm.vgv);
    if (editForm.vgv.trim() && vgv == null) {
      toast.error("VGV inválido.");
      return;
    }
    setSaving(true);
    try {
      const saved = await updateDocumentacao(editing.id, {
        nome,
        construtoraId: editForm.construtoraId || null,
        empreendimentoId: editForm.empreendimentoId || null,
        corretorId: isSolo
          ? editForm.corretorId || user?.id || null
          : editForm.corretorId || null,
        gerenteId: isSolo ? null : editForm.gerenteId || null,
        dataVenda: editForm.dataVenda || null,
        vgv: vgv == null ? null : Math.round(vgv),
      });
      setDocs((current) =>
        current.map((item) => (item.id === saved.id ? saved : item)),
      );
      setEditOpen(false);
      setEditing(null);
      toast.success("Venda atualizada. A ficha de Documentação também mudou.");
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Não foi possível salvar a venda.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!canView) {
    return (
      <div>
        <PageHeader
          title="Vendas"
          description="Processos finalizados com venda."
        />
        <SemConexao
          title="Acesso restrito"
          description="Peça ao administrador para liberar o módulo Vendas nas permissões do seu usuário."
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="mb-1 text-xs text-[#8B98A3]">
            <Link to="/dashboard" className="hover:text-[#0B3148]">Início</Link>
            <span className="px-1.5">/</span>
            <span className="text-[#5C6B76]">Vendas</span>
          </p>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-[#0B3148]">
            <BarChart3 className="size-5 text-[#079ED4]" />
            Vendas
          </h1>
          <p className="mt-1 max-w-xl text-sm text-[#5C6B76]">
            Acompanhe o desempenho das suas vendas e filtre os resultados conforme o período e critérios desejados.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={periodo}
            onValueChange={(value) =>
              setPeriodo(value as "30" | "90" | "365" | "all")
            }
          >
            <SelectTrigger className="h-9 w-[170px] rounded-lg border-[#E2E8EC] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="365">Últimos 12 meses</SelectItem>
              <SelectItem value="all">Todo o período</SelectItem>
            </SelectContent>
          </Select>
          <Button asChild className={APPLY_FILTERS_BTN}>
            <Link to="/documentacao">Ver documentação</Link>
          </Button>
        </div>
      </div>
      {comVgv ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#D3EBF5] bg-[#E7F4FA] px-4 py-2.5 text-sm text-[#0B3148]">
          <span>Mostrando só as vendas que já têm VGV.</span>
          <Button type="button" variant="outline" size="sm" onClick={verTodasAsVendas}>
            Ver todas
          </Button>
        </div>
      ) : null}

      <div className="mb-4 grid min-w-0 items-start gap-3 md:grid-cols-2 xl:grid-cols-4">
        <VendaKpi
          label="Vendas filtradas"
          value={String(filtered.length)}
          trend={vendasTrend}
          icon={Filter}
          tone="teal"
        />
        {ownSalesOnly ? null : (
          <VendaKpi
            label="VGV vendido"
            value={brl(totalVgv)}
            trend={vgvTrend}
            icon={Wallet}
            tone="blue"
          />
        )}
        <VendaKpi
          label="Vendas com VGV"
          value={String(comVgvCount)}
          hint={`de ${filtered.length}`}
          icon={BarChart3}
          tone="emerald"
          active={comVgv}
          onClick={() => {
            if (comVgv) verTodasAsVendas();
            else void navigate({ to: "/vendas", search: { comVgv: true } });
          }}
        />
        <div className="rounded-xl border border-[#9DCEF5] bg-gradient-to-br from-[#D3ECFE] to-[#F4F9FE] px-3.5 py-3">
          <h2 className="text-[13px] font-semibold text-[#16324A]">Origem das vendas</h2>
          <p className="text-[11px] text-[#8B98A3]">De onde vieram as vendas do recorte.</p>
          <div className="mt-2 flex items-center gap-2">
            <DashDonut
              items={origemDonut}
              emptyLabel="Nenhuma venda neste recorte"
              centerLabel="vendas"
              compact
              className="shrink-0"
            />
            <DashDonutLegend items={origemDonut} className="mt-0 min-w-0 flex-1" />
          </div>
        </div>
      </div>

      <div className="mt-5">
      <FiltrosPainel
        kicker="Vendas"
        description="Busca, equipe, origem e período."
        confirmLabel="Aplicar filtros"
        onConfirm={applyFilters}
        onClear={clearFilters}
        activeCount={
          [
            draft.search.trim() !== "",
            draft.equipeId !== "__all__",
            draft.gerenteId !== "__all__",
            draft.corretorId !== "__all__",
            draft.origem !== "__all__",
            draft.dataDe !== "",
            draft.dataAte !== "",
          ].filter(Boolean).length
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Search className="size-3.5 text-[#079ED4]" />
              Busca
            </Label>
            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8B98A3]" />
              <Input
                value={draft.search}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, search: event.target.value }))
                }
                placeholder="Cliente, empreendimento ou responsável"
                className={cn(FILTRO_CAMPO, "!pl-9")}
              />
            </div>
          </div>
          {showTeamFilters ? (
            <>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Users className="size-3.5 text-[#079ED4]" />
                  Equipe
                </Label>
                <Select
                  value={draft.equipeId}
                  onValueChange={(value) =>
                    setDraft((prev) => ({
                      ...prev,
                      equipeId: value,
                      corretorId: "__all__",
                    }))
                  }
                >
                  <SelectTrigger className={FILTRO_CAMPO}>
                    <SelectValue placeholder="Todas as equipes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas as equipes</SelectItem>
                    {equipes.map((equipe) => (
                      <SelectItem key={equipe.id} value={equipe.id}>
                        {equipe.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <UserRound className="size-3.5 text-[#079ED4]" />
                  Gerente
                </Label>
                <Select
                  value={draft.gerenteId}
                  onValueChange={(value) =>
                    setDraft((prev) => ({ ...prev, gerenteId: value }))
                  }
                >
                  <SelectTrigger className={FILTRO_CAMPO}>
                    <SelectValue placeholder="Todos os gerentes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos os gerentes</SelectItem>
                    {gerentes.map(([id, name]) => (
                      <SelectItem key={id} value={id}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <CircleUser className="size-3.5 text-[#079ED4]" />
                  Corretor
                </Label>
                <Select
                  value={draft.corretorId}
                  onValueChange={(value) =>
                    setDraft((prev) => ({ ...prev, corretorId: value }))
                  }
                >
                  <SelectTrigger className={FILTRO_CAMPO}>
                    <SelectValue placeholder="Todos os corretores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos os corretores</SelectItem>
                    {corretores.map(([id, name]) => (
                      <SelectItem key={id} value={id}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : null}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Globe className="size-3.5 text-[#079ED4]" />
              Origem
            </Label>
            <Select
              value={draft.origem}
              onValueChange={(value) =>
                setDraft((prev) => ({ ...prev, origem: value }))
              }
            >
              <SelectTrigger className={FILTRO_CAMPO}>
                <SelectValue placeholder="Todas as origens" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas as origens</SelectItem>
                {origens.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vendas-data-de" className="flex items-center gap-1.5">
              <CalendarDays className="size-3.5 text-[#079ED4]" />
              De
            </Label>
            <Input
              id="vendas-data-de"
              type="date"
              value={draft.dataDe}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  dataDe: event.target.value,
                }))
              }
              className={FILTRO_CAMPO}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vendas-data-ate" className="flex items-center gap-1.5">
              <CalendarDays className="size-3.5 text-[#079ED4]" />
              Até
            </Label>
            <Input
              id="vendas-data-ate"
              type="date"
              value={draft.dataAte}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  dataAte: event.target.value,
                }))
              }
              className={FILTRO_CAMPO}
            />
          </div>
        </div>
      </FiltrosPainel>
      </div>

      <PagePanel className={cn("mt-4", VENDA_PANEL)} title="Lista de vendas" description="Vendas no recorte filtrado." action={<span className="text-xs text-[#8B98A3]">{filtered.length} resultados</span>}>
      <Card className="overflow-hidden rounded-xl border-0 bg-transparent shadow-none">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Carregando vendas…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Nenhuma venda encontrada para os filtros selecionados.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto overflow-y-hidden">
              <Table className="[&_th]:bg-[#F7F9FA] [&_th]:px-4 [&_th]:font-medium [&_td]:h-10 [&_td]:px-4">
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Empreendimento</TableHead>
                    <TableHead>Origem</TableHead>
                    {!isSolo ? <TableHead>Equipe</TableHead> : null}
                    {!isSolo ? <TableHead>Gerente</TableHead> : null}
                    <TableHead>Corretor</TableHead>
                    <TableHead>Data da venda</TableHead>
                    <TableHead className="text-right">VGV</TableHead>
                    {canEdit ? (
                      <TableHead className="text-right">Ações</TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((doc) => {
                    const docCorretorId = doc.corretorId ?? doc.lead?.corretorId;
                    const equipe = docCorretorId
                      ? corretorEquipe.get(docCorretorId)
                      : undefined;
                    const origemLabel = displayFonte(
                      doc.lead?.origem || doc.fonte,
                    );
                    return (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <PersonCell
                            name={doc.nome}
                            detail={doc.construtora?.nome ?? "Sem construtora"}
                          />
                        </TableCell>
                        <TableCell>{doc.empreendimento?.nome ?? "—"}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={origemBadgeClass(origemLabel)}
                            title={origemLabel}
                          >
                            {origemLabel}
                          </Badge>
                        </TableCell>
                        {!isSolo ? (
                          <TableCell>{equipe?.name ?? "—"}</TableCell>
                        ) : null}
                        {!isSolo ? (
                          <TableCell>
                            <PersonCell
                              name={doc.gerente?.name ?? equipe?.gerente.name ?? "—"}
                            />
                          </TableCell>
                        ) : null}
                        <TableCell>
                          <PersonCell
                            name={doc.corretor?.name ?? doc.lead?.corretor?.name ?? "—"}
                          />
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {dateBr(doc.dataVenda || doc.createdAt)}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums whitespace-nowrap">
                          {doc.vgv != null ? brl(doc.vgv) : "—"}
                        </TableCell>
                        {canEdit ? (
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Editar venda"
                              onClick={() => void openEdit(doc)}
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Editar venda</span>
                            </Button>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-col gap-2 border-t px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>
                Exibindo {pageItems.length} de {filtered.length} resultado
                {filtered.length === 1 ? "" : "s"}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </button>
                <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-[#E7F4FA] px-2 font-semibold tabular-nums text-[#0B3148]">
                  {currentPage}
                  {totalPages > 1 ? ` / ${totalPages}` : ""}
                </span>
                <button
                  type="button"
                  className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40 cursor-pointer"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Próxima página"
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </Card>
      </PagePanel>

      <FormDialogShell
        open={editOpen}
        onOpenChange={(open) => {
          if (saving) return;
          setEditOpen(open);
          if (!open) setEditing(null);
        }}
        icon={<Pencil className="h-5 w-5" />}
        title="Editar venda"
        description="A alteração grava na ficha de Documentação — é o mesmo registro."
        className="max-w-2xl"
        footer={
          <FormDialogActions hint="Corretor, gerente, data e VGV ficam iguais em Documentação.">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditOpen(false);
                setEditing(null);
              }}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" form="venda-edit-form" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </FormDialogActions>
        }
      >
        <form
          id="venda-edit-form"
          onSubmit={(event) => void handleSaveEdit(event)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <FormDialogBody>
            <FormSection title="Venda">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="venda-cliente">Cliente</Label>
                  <Input
                    id="venda-cliente"
                    value={editForm.nome}
                    onChange={(event) =>
                      setEditForm((prev) => ({
                        ...prev,
                        nome: event.target.value,
                      }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Construtora</Label>
                  <Select
                    value={editForm.construtoraId || "__none__"}
                    onValueChange={(value) =>
                      setEditForm((prev) => ({
                        ...prev,
                        construtoraId: value === "__none__" ? "" : value,
                        empreendimentoId: "",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      {editing?.construtora &&
                      !construtoras.some(
                        (item) => item.id === editing.construtora?.id,
                      ) ? (
                        <SelectItem
                          key={editing.construtora.id}
                          value={editing.construtora.id}
                        >
                          {editing.construtora.nome}
                        </SelectItem>
                      ) : null}
                      {construtoras.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Empreendimento</Label>
                  <Select
                    value={editForm.empreendimentoId || "__none__"}
                    onValueChange={(value) =>
                      setEditForm((prev) => ({
                        ...prev,
                        empreendimentoId: value === "__none__" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      {empreendimentosDaConstrutora.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Corretor</Label>
                  <Select
                    value={editForm.corretorId || "__none__"}
                    onValueChange={(value) => {
                      const corretorId = value === "__none__" ? "" : value;
                      setEditForm((prev) => ({
                        ...prev,
                        corretorId,
                        gerenteId: isSolo
                          ? ""
                          : corretorId
                            ? gerenteIdOfCorretor(corretorId) || prev.gerenteId
                            : prev.gerenteId,
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">—</SelectItem>
                      {corretorSelectOptions.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!isSolo ? (
                  <div className="space-y-2">
                    <Label>Gerente</Label>
                    <Select
                      value={editForm.gerenteId || "__none__"}
                      onValueChange={(value) =>
                        setEditForm((prev) => ({
                          ...prev,
                          gerenteId: value === "__none__" ? "" : value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        {gerenteSelectOptions.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="venda-data">Data da venda</Label>
                  <Input
                    id="venda-data"
                    type="date"
                    value={editForm.dataVenda}
                    onChange={(event) =>
                      setEditForm((prev) => ({
                        ...prev,
                        dataVenda: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="venda-vgv">VGV (R$)</Label>
                  <Input
                    id="venda-vgv"
                    inputMode="numeric"
                    placeholder="0,00"
                    value={editForm.vgv}
                    onChange={(event) =>
                      setEditForm((prev) => ({
                        ...prev,
                        vgv: maskMoneyInput(event.target.value),
                      }))
                    }
                  />
                </div>
              </div>
            </FormSection>
          </FormDialogBody>
        </form>
      </FormDialogShell>
    </div>
  );
}
