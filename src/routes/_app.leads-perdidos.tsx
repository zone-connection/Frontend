import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Eye,
  Trash2,
  UserX,
  Sparkles,
  Wallet,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
} from "lucide-react";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { TableSortSelect } from "@/components/table-sort-select";
import {
  DEFAULT_TABLE_SORT,
  sortByTableOrder,
  type TableSort,
} from "@/lib/table-sort";
import { deleteLeadApi, deleteLeadsBulkApi } from "@/lib/leads-api";
import {
  getLostLeadsCache,
  loadLostLeads,
  removeLostLeadFromCache,
  removeLostLeadsFromCache,
  type LostLead,
} from "@/lib/lost-leads-cache";
import {
  exportLostLeadsToExcel,
  exportLostLeadsToPdf,
} from "@/lib/lost-leads-io";
import { brl, prioridadeBadgeClass } from "@/lib/crm-types";
import {
  catalogColorBadgeClass,
  catalogColorBadgeStyle,
} from "@/lib/catalog-colors";
import { useCatalog } from "@/lib/catalog-store";
import { displayEmail } from "@/lib/email";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  FILTER_BAR_SHELL,
  FILTER_CONTROL,
  FILTER_SEARCH_ICON,
} from "@/lib/filter-bar";

export const Route = createFileRoute("/_app/leads-perdidos")({
  head: () => ({ meta: [{ title: "Leads Perdidos — Zone Connection" }] }),
  component: LeadsPerdidos,
});

function initials(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function LeadsPerdidos() {
  const user = getSession();
  const isPlatformAdmin = user?.role === "super_admin";
  const { funnelStages, colorByLabel } = useCatalog();
  const cached = getLostLeadsCache();
  const [leads, setLeads] = useState<LostLead[]>(cached ?? []);
  // Só mostra "Carregando..." na primeira visita sem cache.
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<TableSort>(DEFAULT_TABLE_SORT);
  const [detail, setDetail] = useState<LostLead | null>(null);
  const [purgeTarget, setPurgeTarget] = useState<LostLead | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkPurgeOpen, setBulkPurgeOpen] = useState(false);
  const [bulkPurging, setBulkPurging] = useState(false);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? Boolean(getLostLeadsCache()?.length);
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await loadLostLeads({ force: true });
      setLeads(data);
    } catch (err) {
      // Com cache na tela, não apaga a lista — só avisa.
      if (!getLostLeadsCache()?.length) {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Não foi possível carregar leads perdidos.",
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh({ silent: Boolean(cached) });
    // Só no mount — refresh cobre o sync em background.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) =>
      `${l.nome} ${l.email} ${l.telefone} ${l.motivoPerda} ${l.corretor} ${l.perdidoPor}`
        .toLowerCase()
        .includes(q),
    );
  }, [leads, search]);

  const sorted = useMemo(
    () =>
      sortByTableOrder(
        filtered,
        sort,
        (l) => l.nome,
        (l) => l.createdAt,
      ),
    [filtered, sort],
  );
  const pager = useTablePager(sorted, `${search}|${sort}`);

  const allVisibleIds = useMemo(() => sorted.map((l) => l.id), [sorted]);
  const allSelected =
    allVisibleIds.length > 0 &&
    allVisibleIds.every((id) => selectedIds.has(id));
  const someSelected = allVisibleIds.some((id) => selectedIds.has(id));
  const selectedCount = selectedIds.size;

  function toggleSelectAll(checked: boolean) {
    setSelectedIds(checked ? new Set(allVisibleIds) : new Set());
  }

  function toggleSelectOne(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function confirmPurge() {
    if (!purgeTarget) return;
    const target = purgeTarget;
    // Otimista: some da lista na hora.
    setLeads((prev) => prev.filter((l) => l.id !== target.id));
    removeLostLeadFromCache(target.id);
    setPurgeTarget(null);
    if (detail?.id === target.id) setDetail(null);
    toast.success(`Lead ${target.nome} excluído definitivamente.`);

    try {
      await deleteLeadApi(target.id);
    } catch (err) {
      // Rollback
      setLeads((prev) => [target, ...prev.filter((l) => l.id !== target.id)]);
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível excluir.",
      );
      void refresh({ silent: true });
    }
  }

  async function confirmBulkPurge() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    const targets = leads.filter((l) => ids.includes(l.id));
    setBulkPurgeOpen(false);
    setBulkPurging(true);
    setLeads((prev) => prev.filter((l) => !ids.includes(l.id)));
    removeLostLeadsFromCache(ids);
    setSelectedIds(new Set());
    if (detail && ids.includes(detail.id)) setDetail(null);

    try {
      const result = await deleteLeadsBulkApi(ids);
      const failed = result.failedIds;
      if (failed.length > 0) {
        const failedSet = new Set(failed);
        const restore = targets.filter((l) => failedSet.has(l.id));
        setLeads((prev) => {
          const existing = new Set(prev.map((l) => l.id));
          return [...restore.filter((l) => !existing.has(l.id)), ...prev];
        });
        toast.error(
          `${result.deleted} excluído(s), ${failed.length} com erro. A lista foi atualizada.`,
        );
        void refresh({ silent: true });
      } else {
        toast.success(
          result.deleted === 1
            ? "1 lead excluído definitivamente."
            : `${result.deleted} leads excluídos definitivamente.`,
        );
      }
    } catch (err) {
      setLeads((prev) => {
        const existing = new Set(prev.map((l) => l.id));
        return [...targets.filter((l) => !existing.has(l.id)), ...prev];
      });
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível excluir os leads.",
      );
      void refresh({ silent: true });
    } finally {
      setBulkPurging(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Leads Perdidos"
        description={
          loading
            ? "Carregando..."
            : `${filtered.length} lead(s) removidos da operação.${
                refreshing ? " Atualizando…" : ""
              }`
        }
        actions={
          <>
            {selectedCount > 0 && (
              <Button
                variant="destructive"
                size="sm"
                disabled={bulkPurging}
                onClick={() => setBulkPurgeOpen(true)}
              >
                {bulkPurging ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-1" />
                )}
                Excluir ({selectedCount})
              </Button>
            )}
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={loading || filtered.length === 0}
              >
                <Download className="w-4 h-4 mr-1" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() =>
                  exportLostLeadsToExcel(
                    filtered,
                    `leads-perdidos-${new Date().toISOString().slice(0, 10)}.xlsx`,
                  )
                }
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  exportLostLeadsToPdf(
                    filtered,
                    `leads-perdidos-${new Date().toISOString().slice(0, 10)}.pdf`,
                    user?.tenant?.name?.trim() || "Imobiliária",
                  )
                }
              >
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </>
        }
      />

      <div className={FILTER_BAR_SHELL}>
        <div className="relative min-w-50 max-w-md flex-1">
          <Search className={FILTER_SEARCH_ICON} />
          <Input
            placeholder={
              isPlatformAdmin
                ? "Buscar por nome, motivo..."
                : "Buscar por nome, motivo, corretor..."
            }
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
      </div>

      <Card className="overflow-hidden">
        <Table className="[&_th]:px-4 [&_td]:px-4">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 pr-0">
                <Checkbox
                  checked={
                    allSelected ? true : someSelected ? "indeterminate" : false
                  }
                  onCheckedChange={(v) => toggleSelectAll(v === true)}
                  aria-label="Selecionar todos os leads perdidos"
                  disabled={filtered.length === 0 || bulkPurging}
                />
              </TableHead>
              <TableHead>Lead</TableHead>
              <TableHead>Motivo</TableHead>
              {isPlatformAdmin ? null : <TableHead>Corretor</TableHead>}
              <TableHead>Excluído por</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={isPlatformAdmin ? 6 : 7}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isPlatformAdmin ? 6 : 7}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  Nenhum lead perdido.
                </TableCell>
              </TableRow>
            ) : (
              pager.pageItems.map((l) => (
                <TableRow
                  key={l.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => setDetail(l)}
                  data-state={selectedIds.has(l.id) ? "selected" : undefined}
                >
                  <TableCell
                    className="pr-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={selectedIds.has(l.id)}
                      onCheckedChange={(v) => toggleSelectOne(l.id, v === true)}
                      aria-label={`Selecionar ${l.nome}`}
                      disabled={bulkPurging}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="avatar-fallback-brand text-xs">
                          {initials(l.nome)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="table-person-name text-sm">{l.nome}</div>
                        <div className="text-xs text-muted-foreground">
                          {l.telefone}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell
                    className="text-sm max-w-55 truncate"
                    title={l.motivoPerda}
                  >
                    {l.motivoPerda}
                  </TableCell>
                  {isPlatformAdmin ? null : (
                  <TableCell className="table-person-name text-sm">
                    {l.corretor}
                  </TableCell>
                  )}
                  <TableCell className="text-sm">{l.perdidoPor}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {l.perdidoAt}
                  </TableCell>
                  <TableCell
                    className="text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Detalhes"
                        onClick={() => setDetail(l)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        title="Excluir definitivamente"
                        onClick={() => setPurgeTarget(l)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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
        open={!!detail}
        onOpenChange={(o) => !o && setDetail(null)}
        icon={<UserX className="w-5 h-5" />}
        title={detail?.nome ?? "Lead perdido"}
        description={detail ? `Motivo: ${detail.motivoPerda}` : undefined}
      >
        {detail && (
          <>
            <FormDialogBody>
              <FormSection
                icon={<Sparkles className="w-3.5 h-3.5 text-primary" />}
                title="Contato"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailField label="Telefone" value={detail.telefone} />
                  <DetailField
                    label="E-mail"
                    value={displayEmail(detail.email) || "—"}
                  />
                  <DetailField
                    label="Origem"
                    value={
                      detail.origem ? (
                        <Badge
                          className={catalogColorBadgeClass(
                            colorByLabel("origem", detail.origem),
                          )}
                          style={catalogColorBadgeStyle(
                            colorByLabel("origem", detail.origem),
                          )}
                          title={detail.origem}
                        >
                          {detail.origem}
                        </Badge>
                      ) : (
                        "—"
                      )
                    }
                  />
                  {isPlatformAdmin ? null : (
                    <DetailField label="Corretor" value={detail.corretor} />
                  )}
                </div>
              </FormSection>
              <FormSection
                icon={<Wallet className="w-3.5 h-3.5 text-primary" />}
                title="Interesse"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailField label="Interesse" value={detail.interesse} />
                  <DetailField
                    label="Renda"
                    value={detail.renda != null ? brl(detail.renda) : "—"}
                  />
                  <DetailField
                    label="Prioridade"
                    value={
                      <Badge
                        className={prioridadeBadgeClass(detail.prioridade)}
                      >
                        {detail.prioridade}
                      </Badge>
                    }
                  />
                  <DetailField
                    label="Última etapa"
                    value={
                      funnelStages.find((s) => s.id === detail.stage)?.name ??
                      detail.stage
                    }
                  />
                  <DetailField label="Excluído em" value={detail.perdidoAt} />
                  <DetailField label="Excluído por" value={detail.perdidoPor} />
                </div>
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
              <Button
                type="button"
                variant="destructive"
                onClick={() => setPurgeTarget(detail)}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Excluir definitivamente
              </Button>
            </FormDialogActions>
          </>
        )}
      </FormDialogShell>

      <AlertDialog
        open={!!purgeTarget}
        onOpenChange={(o) => !o && setPurgeTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir definitivamente?</AlertDialogTitle>
            <AlertDialogDescription>
              {purgeTarget
                ? `${purgeTarget.nome} será removido do banco para sempre. Esta ação não pode ser desfeita.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void confirmPurge();
              }}
            >
              Excluir do banco
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={bulkPurgeOpen}
        onOpenChange={(o) => !o && setBulkPurgeOpen(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir {selectedCount} lead(s) definitivamente?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedCount === allVisibleIds.length && search.trim() === ""
                ? `Todos os ${selectedCount} lead(s) da lista serão removidos do banco para sempre. Esta ação não pode ser desfeita.`
                : `${selectedCount} lead(s) selecionado(s) serão removidos do banco para sempre. Esta ação não pode ser desfeita.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkPurging}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkPurging}
              onClick={(e) => {
                e.preventDefault();
                void confirmBulkPurge();
              }}
            >
              {bulkPurging ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Excluindo…
                </>
              ) : (
                "Excluir do banco"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
