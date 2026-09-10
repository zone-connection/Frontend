import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Banknote, CheckCircle2, Clock3, Eye, Loader2, Pencil, Percent, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { HideFinanceValuesButton } from "@/components/hide-finance-values-button";
import { useHideFinanceiroValues } from "@/lib/financeiro-prefs";
import { TablePager } from "@/components/table-pager";
import { useTablePager } from "@/lib/use-table-pager";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import { FinanceiroFiltrosBar } from "@/components/financeiro-filtros";
import {
  DetailField,
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
  FormSection,
} from "@/components/form-dialog";
import { ComissaoLancamentoDialog, numberValue, relationName } from "@/components/comissao-lancamento-dialog";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { FILTER_CONTROL } from "@/lib/filter-bar";
import { cn } from "@/lib/utils";
import { canFinanceiroAction, isCorretorLike } from "@/lib/permissions";
import {
  deleteComissao,
  fetchComissoes,
  updateComissao,
  type Comissao,
  type ComissaoStatus,
} from "@/lib/financeiro-api";
import {
  brl,
  formatDate,
  matchesPeriodoFiltro,
  statusBadgeClass,
  statusLabel,
  type PeriodoFiltro,
} from "@/lib/financeiro-mock";

export const Route = createFileRoute("/_app/financeiro/comissao")({
  head: () => ({ meta: [{ title: "Comissão — Zone Connection" }] }),
  validateSearch: (search: Record<string, unknown>): { id?: string } => ({
    id: typeof search.id === "string" ? search.id : undefined,
  }),
  component: Page,
});

const STATUS_OPTIONS = [
  { value: "todos", label: "Todos os status" },
  { value: "pendente", label: "Pendente" },
  { value: "liberada", label: "Liberada" },
  { value: "paga", label: "Paga" },
];

function Page() {
  const { id: comissaoIdFromUrl } = Route.useSearch();
  const navigate = useNavigate();
  const session = getSession();
  const isSolo = session?.tenant?.plano === "solo";
  const role = session?.role;
  const isFinanceTeam =
    role === "admin" || role === "super_admin" || role === "financeiro";
  const isCorretorViewer = isCorretorLike(role);
  const [hideValues] = useHideFinanceiroValues();
  const canCreateFin = isFinanceTeam && canFinanceiroAction(session, "create");
  const canEditFin = isFinanceTeam && canFinanceiroAction(session, "edit");
  const canDeleteFin = isFinanceTeam && canFinanceiroAction(session, "delete");
  const commissionValue = useCallback(
    (item: Comissao) =>
      isCorretorLike(role)
        ? item.valorCorretor
        : role === "gerente"
          ? item.valorGerente
          : item.comissaoBruta,
    [role],
  );
  const commissionValueLabel = isFinanceTeam ? "Total bruto" : "Total a receber";
  const commissionColumnLabel = isFinanceTeam ? "Bruta" : "Sua comissão";
  const [items, setItems] = useState<Comissao[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  // Padrão "tudo": vendas de meses anteriores (jun/jul) não somem no filtro.
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("tudo");
  const [status, setStatus] = useState("todos");
  const [equipe, setEquipe] = useState("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Comissao | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [detail, setDetail] = useState<Comissao | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchComissoes());
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar as comissões.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!comissaoIdFromUrl || items.length === 0) return;
    const found = items.find((item) => item.id === comissaoIdFromUrl);
    if (found) setDetail(found);
  }, [comissaoIdFromUrl, items]);

  function closeDetail() {
    setDetail(null);
    if (comissaoIdFromUrl) {
      void navigate({ to: "/financeiro/comissao", search: {}, replace: true });
    }
  }

  const editingItem = useMemo(
    () => items.find((item) => item.id === editingId) ?? null,
    [items, editingId],
  );

  const equipeOptions = useMemo(() => {
    const names = new Set(
      items
        .map((item) => relationName(item.equipe, ""))
        .filter((name) => name.length > 0),
    );
    return [
      { value: "todos", label: "Todas as equipes" },
      ...[...names].sort().map((name) => ({ value: name, label: name })),
    ];
  }, [items]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (status !== "todos" && item.status !== status) return false;
      if (equipe !== "todos" && relationName(item.equipe) !== equipe)
        return false;
      // Mês atual considera data da venda OU data do lançamento da comissão.
      const inPeriodo =
        matchesPeriodoFiltro(item.dataVenda, periodo) ||
        matchesPeriodoFiltro(item.createdAt, periodo) ||
        Boolean(
          item.dataPrevistaRecebimento &&
            matchesPeriodoFiltro(item.dataPrevistaRecebimento, periodo),
        );
      if (!inPeriodo) return false;
      if (!query) return true;
      return [item.corretor, item.cliente, item.empreendimento, item.equipe]
        .map((value) => relationName(value, "").toLowerCase())
        .some((value) => value.includes(query));
    });
  }, [items, search, periodo, status, equipe]);
  const pager = useTablePager(rows, `${search}|${periodo}|${status}|${equipe}`);

  const kpis = useMemo(() => {
    const sum = (state?: ComissaoStatus) =>
      rows
        .filter((item) => !state || item.status === state)
        .reduce((total, item) => total + numberValue(commissionValue(item)), 0);
    return {
      total: sum(),
      pending: sum("pendente"),
      released: sum("liberada"),
      paid: sum("paga"),
      vgv: rows.reduce((total, item) => total + numberValue(item.vgv), 0),
    };
  }, [rows, commissionValue]);

  function openCreate() {
    setMode("create");
    setEditingId(null);
    setDialogOpen(true);
  }

  function openEdit(item: Comissao) {
    setMode("edit");
    setEditingId(item.id);
    setDialogOpen(true);
  }

  function upsert(item: Comissao) {
    setItems((current) => [
      item,
      ...current.filter((existing) => existing.id !== item.id),
    ]);
  }

  async function handleStatus(item: Comissao, nextStatus: ComissaoStatus) {
    try {
      upsert(await updateComissao(item.id, { status: nextStatus }));
      toast.success(
        nextStatus === "paga"
          ? "Comissão paga — títulos baixados e registrados no fluxo de caixa."
          : `Status alterado para ${statusLabel(nextStatus)}.`,
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível alterar o status.",
      );
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteComissao(deleteTarget.id);
      setItems((current) =>
        current.filter((item) => item.id !== deleteTarget.id),
      );
      setDeleteTarget(null);
      toast.success("Comissão excluída.");
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível excluir a comissão.",
      );
    } finally {
      setDeleting(false);
    }
  }

  const hasActive = Boolean(
    search || periodo !== "tudo" || status !== "todos" || equipe !== "todos",
  );

  return (
    <div>
      <PageHeader
        title="Comissão"
        description={
          isFinanceTeam
            ? "Gestão das comissões por venda. Ao lançar, as fatias já entram em Contas a receber e a pagar; se estiver pendente, o fluxo projeta o recebimento. Ao marcar como paga (aqui ou na baixa), o fluxo registra como realizado."
            : "Acompanhe as comissões disponíveis para o seu perfil"
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <HideFinanceValuesButton />
            {canCreateFin ? (
              <Button type="button" onClick={openCreate}>
                <Plus className="mr-1 size-4" />
                Lançar comissão
              </Button>
            ) : null}
          </div>
        }
      />

      <section className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <FinanceKpiCard
          label={commissionValueLabel}
          value={kpis.total}
          icon={Percent}
          tone="blue-1"
          blurValue={hideValues}
        />
        <FinanceKpiCard
          label="Pendentes"
          value={kpis.pending}
          icon={Clock3}
          tone="blue-2"
          blurValue={hideValues}
        />
        <FinanceKpiCard
          label="Liberadas"
          value={kpis.released}
          icon={Banknote}
          tone="blue-3"
          blurValue={hideValues}
        />
        <FinanceKpiCard
          label="Pagas"
          value={kpis.paid}
          icon={CheckCircle2}
          tone="blue-4"
          blurValue={hideValues}
        />
      </section>

      <FinanceiroFiltrosBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar corretor, cliente, empreendimento…"
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        tipo={status}
        onTipoChange={setStatus}
        tipoOptions={STATUS_OPTIONS}
        extra={
          <Select value={equipe} onValueChange={setEquipe}>
            <SelectTrigger className={cn("w-full sm:w-45", FILTER_CONTROL)}>
              <SelectValue placeholder="Equipe" />
            </SelectTrigger>
            <SelectContent>
              {equipeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        hasActive={hasActive}
        onClear={() => {
          setSearch("");
          setPeriodo("tudo");
          setStatus("todos");
          setEquipe("todos");
        }}
      />

      <div className="overflow-hidden rounded-2xl border border-black/5 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_20px_rgba(15,23,42,0.05)]">
        <div className="overflow-x-auto overflow-y-hidden">
          <Table className="[&_th]:px-4 [&_td]:px-4">
            <TableHeader>
              <TableRow>
                <TableHead className="h-9">Corretor</TableHead>
                <TableHead className="h-9">Equipe</TableHead>
                <TableHead className="h-9">Empreendimento</TableHead>
                <TableHead className="h-9">Cliente</TableHead>
                <TableHead className="h-9">Venda</TableHead>
                <TableHead className="h-9">Prev. receb.</TableHead>
                <TableHead className="h-9 text-right">VGV</TableHead>
                <TableHead className="h-9 text-right">
                  {commissionColumnLabel}
                </TableHead>
                <TableHead className="h-9">Status</TableHead>
                <TableHead className="h-9 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-10 text-center">
                    <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                    <span className="mt-2 block text-sm text-muted-foreground">
                      Carregando comissões…
                    </span>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-8 text-center">
                    {items.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Há {items.length} comissão(ões), mas nenhuma neste
                          filtro.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPeriodo("tudo");
                            setStatus("todos");
                            setEquipe("todos");
                            setSearch("");
                          }}
                        >
                          Ver todas as comissões
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Nenhuma comissão lançada ainda.
                      </p>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                pager.pageItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="py-2 font-medium">
                      {relationName(item.corretor)}
                    </TableCell>
                    <TableCell className="py-2">
                      {relationName(item.equipe)}
                    </TableCell>
                    <TableCell className="py-2">
                      {relationName(item.empreendimento)}
                    </TableCell>
                    <TableCell className="py-2">
                      {relationName(item.cliente)}
                    </TableCell>
                    <TableCell className="py-2 whitespace-nowrap tabular-nums">
                      {formatDate(item.dataVenda)}
                    </TableCell>
                    <TableCell className="py-2 whitespace-nowrap tabular-nums">
                      {item.dataPrevistaRecebimento
                        ? formatDate(item.dataPrevistaRecebimento)
                        : "—"}
                    </TableCell>
                    <TableCell className="py-2 text-right tabular-nums">
                      {brl(numberValue(item.vgv))}
                    </TableCell>
                    <TableCell className="py-2 text-right font-semibold tabular-nums">
                      {commissionValue(item) == null
                        ? "—"
                        : brl(numberValue(commissionValue(item)))}
                    </TableCell>
                    <TableCell className="py-2">
                      {canEditFin ? (
                        <Select
                          value={item.status}
                          onValueChange={(value) =>
                            void handleStatus(item, value as ComissaoStatus)
                          }
                        >
                          <SelectTrigger className="h-8 w-31 border-0 bg-transparent p-0 shadow-none">
                            <Badge
                              variant="outline"
                              className={statusBadgeClass(item.status)}
                            >
                              {statusLabel(item.status)}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.slice(1).map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge
                          variant="outline"
                          className={statusBadgeClass(item.status)}
                        >
                          {statusLabel(item.status)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-2 text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDetail(item)}
                        aria-label="Ver detalhes da comissão"
                        title="Ver detalhes"
                      >
                        <Eye className="size-4" />
                      </Button>
                      {canEditFin ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(item)}
                          aria-label="Editar comissão"
                          title="Editar"
                        >
                          <Pencil className="size-4" />
                        </Button>
                      ) : null}
                      {canDeleteFin ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(item)}
                          aria-label="Excluir comissão"
                          title="Excluir"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      ) : null}
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
        </div>
      </div>
      <p className="mt-2 mb-4 text-xs text-muted-foreground">
        VGV filtrado: {brl(kpis.vgv)} · {rows.length} de {items.length}{" "}
        comissão(ões)
      </p>

      <ComissaoLancamentoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={mode}
        editing={editingItem}
        onSaved={(item, { created }) => {
          upsert(item);
          if (created) {
            setPeriodo("tudo");
            setStatus("todos");
            setEquipe("todos");
            setSearch("");
            void load();
          }
        }}
      />

      <FormDialogShell
        open={Boolean(detail)}
        onOpenChange={(open) => !open && closeDetail()}
        icon={<Eye className="size-5" />}
        title="Detalhes da comissão"
        description={
          detail
            ? `${relationName(detail.cliente)} · ${relationName(detail.empreendimento)}`
            : undefined
        }
        className="max-w-2xl"
        footer={
          <FormDialogActions>
            <Button type="button" variant="outline" onClick={() => closeDetail()}>
              Fechar
            </Button>
            {canEditFin && detail && (
              <Button
                type="button"
                onClick={() => {
                  const item = detail;
                  closeDetail();
                  openEdit(item);
                }}
              >
                <Pencil className="mr-2 size-4" />
                Editar
              </Button>
            )}
          </FormDialogActions>
        }
      >
        {detail && (
          <FormDialogBody>
            <FormSection title="Venda">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <DetailField label="Cliente" value={relationName(detail.cliente)} />
                <DetailField
                  label="Empreendimento"
                  value={relationName(detail.empreendimento)}
                />
                <DetailField
                  label="Corretor"
                  value={relationName(detail.corretor)}
                />
                <DetailField
                  label="Gerente"
                  value={relationName(detail.gerente)}
                />
                <DetailField
                  label="Equipe"
                  value={relationName(detail.equipe)}
                />
                <DetailField
                  label="Data da venda"
                  value={formatDate(detail.dataVenda)}
                />
                <DetailField
                  label="Previsto recebimento"
                  value={
                    detail.dataPrevistaRecebimento
                      ? formatDate(detail.dataPrevistaRecebimento)
                      : "—"
                  }
                />
                <DetailField
                  label="VGV"
                  value={brl(numberValue(detail.vgv))}
                />
                <DetailField
                  label="Status"
                  value={
                    <Badge
                      variant="outline"
                      className={statusBadgeClass(detail.status)}
                    >
                      {statusLabel(detail.status)}
                    </Badge>
                  }
                />
              </div>
            </FormSection>

            {isCorretorViewer ? (
              <>
                <FormSection title="Sua comissão" className="bg-muted/20">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailField
                      label="Participação"
                      value={`${numberValue(detail.percentualCorretor).toLocaleString("pt-BR")}%`}
                    />
                    <DetailField
                      label="Valor a receber"
                      value={
                        <span className="font-semibold text-primary">
                          {brl(numberValue(detail.valorCorretor))}
                        </span>
                      }
                    />
                  </div>
                </FormSection>
                {numberValue(detail.valorPremiacaoCorretor) > 0 && (
                  <FormSection title="Sua premiação">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <DetailField
                        label="Participação"
                        value={`${numberValue(detail.percentualPremiacaoCorretor).toLocaleString("pt-BR")}%`}
                      />
                      <DetailField
                        label="Valor"
                        value={brl(numberValue(detail.valorPremiacaoCorretor))}
                      />
                    </div>
                  </FormSection>
                )}
              </>
            ) : (
              <>
                <FormSection title="Percentuais">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailField
                      label={isSolo ? "Comissão" : "Imobiliária"}
                      value={`${numberValue(detail.percentualImobiliaria).toLocaleString("pt-BR")}%`}
                    />
                    <DetailField
                      label="Tributos"
                      value={`${numberValue(detail.percentualTributos).toLocaleString("pt-BR")}%`}
                    />
                    <DetailField
                      label={isSolo ? "Uso pessoal" : "Corretor"}
                      value={`${numberValue(detail.percentualCorretor).toLocaleString("pt-BR")}%`}
                    />
                    {!isSolo ? (
                      <DetailField
                        label="Gerente"
                        value={`${numberValue(detail.percentualGerente).toLocaleString("pt-BR")}%`}
                      />
                    ) : null}
                    <DetailField
                      label="Caixa"
                      value={`${numberValue(detail.percentualCaixa).toLocaleString("pt-BR")}%`}
                    />
                    {!isSolo ? (
                      <DetailField
                        label="Sócios"
                        value={`${numberValue(detail.percentualSocios).toLocaleString("pt-BR")}%`}
                      />
                    ) : null}
                  </div>
                </FormSection>

                <FormSection title="Valores calculados" className="bg-muted/20">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailField
                      label="Comissão bruta"
                      value={brl(numberValue(detail.comissaoBruta))}
                    />
                    <DetailField
                      label="Tributos"
                      value={brl(numberValue(detail.valorTributos))}
                    />
                    <DetailField
                      label="Comissão líquida"
                      value={
                        <span className="font-semibold text-primary">
                          {brl(numberValue(detail.comissaoLiquida))}
                        </span>
                      }
                    />
                    <DetailField
                      label={isSolo ? "Uso pessoal" : "Corretor"}
                      value={brl(numberValue(detail.valorCorretor))}
                    />
                    {!isSolo ? (
                      <DetailField
                        label="Gerente"
                        value={brl(numberValue(detail.valorGerente))}
                      />
                    ) : null}
                    <DetailField
                      label="Caixa"
                      value={brl(numberValue(detail.valorCaixa))}
                    />
                    {!isSolo ? (
                      <DetailField
                        label="Sócios"
                        value={brl(numberValue(detail.valorSocios))}
                      />
                    ) : null}
                  </div>
                </FormSection>

                {numberValue(detail.valorPremiacao) > 0 && (
                  <FormSection title="Premiação">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <DetailField
                        label="Valor total"
                        value={brl(numberValue(detail.valorPremiacao))}
                      />
                      <DetailField
                        label={isSolo ? "Uso pessoal" : "Corretor"}
                        value={`${brl(numberValue(detail.valorPremiacaoCorretor))} (${numberValue(detail.percentualPremiacaoCorretor).toLocaleString("pt-BR")}%)`}
                      />
                      <DetailField
                        label={isSolo ? "Tributos" : "Imposto"}
                        value={`${brl(numberValue(detail.valorPremiacaoImposto))} (${numberValue(detail.percentualPremiacaoImposto).toLocaleString("pt-BR")}%)`}
                      />
                      <DetailField
                        label={isSolo ? "Caixa" : "Imobiliária"}
                        value={`${brl(numberValue(detail.valorPremiacaoImobiliaria))} (${numberValue(detail.percentualPremiacaoImobiliaria).toLocaleString("pt-BR")}%)`}
                      />
                      {!isSolo ? (
                        <DetailField
                          label="Gerente"
                          value={`${brl(numberValue(detail.valorPremiacaoGerente))} (${numberValue(detail.percentualPremiacaoGerente).toLocaleString("pt-BR")}%)`}
                        />
                      ) : null}
                      <DetailField
                        label="Valor restante"
                        value={brl(numberValue(detail.valorPremiacaoRestante))}
                      />
                    </div>
                  </FormSection>
                )}
              </>
            )}
          </FormDialogBody>
        )}
      </FormDialogShell>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir comissão?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá a comissão de{" "}
              {relationName(deleteTarget?.cliente)} e não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
