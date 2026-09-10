import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  Pencil,
  ReceiptText,
  RotateCcw,
  Search,
  UsersRound,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
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
import { canViewModule } from "@/lib/permissions";
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
import { BRAND_GRADIENT_STYLE } from "@/lib/brand-gradient";
import {
  FILTER_BAR_SURFACE,
  FILTER_CONTROL,
  FILTER_SEARCH_ICON,
} from "@/lib/filter-bar";

export const Route = createFileRoute("/_app/vendas")({
  head: () => ({ meta: [{ title: "Vendas — Zone Connection" }] }),
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
    corretorId: doc.corretorId ?? doc.lead.corretorId ?? "",
    gerenteId: doc.gerenteId ?? "",
    dataVenda: dateDay(doc.dataVenda),
    vgv: doc.vgv != null ? formatMoneyInput(doc.vgv) : "",
  };
}

const APPLY_FILTERS_BTN =
  "rounded-md border-0 bg-transparent text-white shadow-sm hover:bg-transparent hover:brightness-110";
const APPLY_FILTERS_STYLE = BRAND_GRADIENT_STYLE;

function VendasPage() {
  const user = getSession();
  const isSolo = user?.tenant?.plano === "solo";
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
  const PAGE_SIZE = 20;

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    Promise.all([
      fetchDocumentacoes(undefined, undefined, true),
      isSolo ? Promise.resolve([] as Equipe[]) : fetchEquipes(),
    ])
      .then(([documentacoes, equipesData]) => {
        if (!active) return;
        setDocs(documentacoes.filter((doc) => isStatusVendido(doc.status2)));
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
  }, [canView, isSolo]);

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
      const corretor = doc.corretor ?? doc.lead.corretor;
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
      [...new Set(docs.map((doc) => doc.lead.origem).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b, "pt-BR"),
      ),
    [docs],
  );

  const filtered = useMemo(() => {
    const query = normalize(applied.search);
    return docs.filter((doc) => {
      const docCorretorId = doc.corretorId ?? doc.lead.corretorId;
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
      if (applied.origem !== "__all__" && doc.lead.origem !== applied.origem)
        return false;
      if (applied.dataDe && (!vendaDay || vendaDay < applied.dataDe))
        return false;
      if (applied.dataAte && (!vendaDay || vendaDay > applied.dataAte))
        return false;
      if (!query) return true;
      return normalize(
        [
          doc.nome,
          doc.construtora?.nome,
          doc.empreendimento?.nome,
          doc.corretor?.name ?? doc.lead.corretor?.name,
          doc.gerente?.name,
          doc.lead.origem,
          equipe?.name,
        ]
          .filter(Boolean)
          .join(" "),
      ).includes(query);
    });
  }, [docs, applied, corretorEquipe]);

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
  const comVgv = filtered.filter((doc) => (doc.vgv ?? 0) > 0).length;

  const clearFilters = () => {
    setDraft(emptyFilters);
    setApplied(emptyFilters);
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
    const leadCorretor = editing?.lead.corretor;
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
      <PageHeader
        title="Vendas"
        description="Todas as vendas — use o período nos filtros se quiser restringir o intervalo."
      />

      <section className="grid gap-3 grid-cols-2 xl:grid-cols-3">
        <FinanceKpiCard
          label="Vendas filtradas"
          value={filtered.length}
          icon={ReceiptText}
          tone="blue-1"
          format="number"
        />
        <FinanceKpiCard
          label="VGV vendido"
          value={totalVgv}
          icon={Wallet}
          tone="blue-2"
        />
        <FinanceKpiCard
          label="Vendas com VGV"
          value={comVgv}
          icon={UsersRound}
          tone="blue-3"
          format="number"
          suffix={`de ${filtered.length}`}
        />
      </section>

      <div className={cn("mt-5", FILTER_BAR_SURFACE)}>
        <div className="space-y-3">
          <div
            className={cn(
              "grid gap-3",
              !isSolo &&
                "lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]",
            )}
          >
            <div className="relative min-w-0">
              <Search className={FILTER_SEARCH_ICON} />
              <Input
                value={draft.search}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, search: event.target.value }))
                }
                placeholder="Buscar cliente, empreendimento ou responsável..."
                className={cn("rounded-sm pl-9", FILTER_CONTROL)}
              />
            </div>
            {!isSolo ? (
              <>
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
                  <SelectTrigger className={cn("rounded-sm", FILTER_CONTROL)}>
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
                <Select
                  value={draft.gerenteId}
                  onValueChange={(value) =>
                    setDraft((prev) => ({ ...prev, gerenteId: value }))
                  }
                >
                  <SelectTrigger className={cn("rounded-sm", FILTER_CONTROL)}>
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
              </>
            ) : null}
          </div>

          <div
            className={cn(
              "grid gap-3",
              isSolo
                ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]"
                : "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto]",
            )}
          >
            {!isSolo ? (
              <Select
                value={draft.corretorId}
                onValueChange={(value) =>
                  setDraft((prev) => ({ ...prev, corretorId: value }))
                }
              >
                <SelectTrigger className={cn("rounded-sm", FILTER_CONTROL)}>
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
            ) : null}
            <Select
              value={draft.origem}
              onValueChange={(value) =>
                setDraft((prev) => ({ ...prev, origem: value }))
              }
            >
              <SelectTrigger className={cn("rounded-sm", FILTER_CONTROL)}>
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

            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:flex-nowrap">
              <div className="relative min-w-0 flex-1">
                <CalendarDays className={FILTER_SEARCH_ICON} />
                <Input
                  type="date"
                  value={draft.dataDe}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      dataDe: event.target.value,
                    }))
                  }
                  className={cn("rounded-sm pl-9", FILTER_CONTROL)}
                  aria-label="Data inicial"
                  title="Data inicial"
                />
              </div>
              <span className="shrink-0 text-sm text-muted-foreground">até</span>
              <div className="relative min-w-0 flex-1">
                <CalendarDays className={FILTER_SEARCH_ICON} />
                <Input
                  type="date"
                  value={draft.dataAte}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      dataAte: event.target.value,
                    }))
                  }
                  className={cn("rounded-sm pl-9", FILTER_CONTROL)}
                  aria-label="Data final"
                  title="Data final"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 lg:justify-start">
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Limpar filtros
              </button>
              <Button
                type="button"
                onClick={applyFilters}
                className={APPLY_FILTERS_BTN}
                style={APPLY_FILTERS_STYLE}
              >
                <Filter className="mr-1.5 h-4 w-4" />
                Aplicar filtros
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Card className="mt-4 overflow-hidden rounded-2xl">
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
              <Table className="[&_th]:px-4 [&_td]:px-4">
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
                    const docCorretorId = doc.corretorId ?? doc.lead.corretorId;
                    const equipe = docCorretorId
                      ? corretorEquipe.get(docCorretorId)
                      : undefined;
                    const origemLabel = displayFonte(
                      doc.lead.origem || doc.fonte,
                    );
                    return (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="table-person-name">{doc.nome}</div>
                          <div className="text-xs text-muted-foreground">
                            {doc.construtora?.nome ?? "Sem construtora"}
                          </div>
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
                            <span className="table-person-name text-sm">
                              {doc.gerente?.name ?? equipe?.gerente.name ?? "—"}
                            </span>
                          </TableCell>
                        ) : null}
                        <TableCell>
                          <span className="table-person-name text-sm">
                            {doc.corretor?.name ?? doc.lead.corretor?.name ?? "—"}
                          </span>
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
                <span className="px-2 tabular-nums text-foreground">
                  Página {currentPage}
                  {totalPages > 1 ? ` de ${totalPages}` : ""}
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
