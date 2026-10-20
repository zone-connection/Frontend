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
  UserX,
  Sparkles,
  Wallet,
  Download,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { TableSortSelect } from "@/components/table-sort-select";
import {
  DEFAULT_TABLE_SORT,
  sortByTableOrder,
  type TableSort,
} from "@/lib/table-sort";
import {
  getLostClientesCache,
  loadLostClientes,
} from "@/lib/lost-clientes-cache";
import type { LostLead } from "@/lib/lost-leads-cache";
import {
  exportLostLeadsToExcel,
  exportLostLeadsToPdf,
} from "@/lib/lost-leads-io";
import { brl, prioridadeBadgeClass } from "@/lib/crm-types";
import { catalogColorBadgeClass } from "@/lib/catalog-colors";
import { useCatalog } from "@/lib/catalog-store";
import { displayEmail } from "@/lib/email";
import { cn } from "@/lib/utils";
import {
  FILTER_BAR_SHELL,
  FILTER_CONTROL,
  FILTER_SEARCH_ICON,
} from "@/lib/filter-bar";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/clientes-perdidos")({
  head: () => ({ meta: [{ title: "Perdas de clientes — Zone Connection" }] }),
  component: ClientesPerdidos,
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

function ClientesPerdidos() {
  const user = getSession();
  const { funnelStages, colorByLabel } = useCatalog();
  const cached = getLostClientesCache();
  const [items, setItems] = useState<LostLead[]>(cached ?? []);
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<TableSort>(DEFAULT_TABLE_SORT);
  const [detail, setDetail] = useState<LostLead | null>(null);

  const refresh = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? Boolean(getLostClientesCache()?.length);
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await loadLostClientes({ force: true });
      setItems(data);
    } catch (err) {
      if (!getLostClientesCache()?.length) {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Não foi possível carregar clientes perdidos.",
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh({ silent: Boolean(cached) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((l) =>
      `${l.nome} ${l.email} ${l.telefone} ${l.motivoPerda} ${l.perdidoPor}`
        .toLowerCase()
        .includes(q),
    );
  }, [items, search]);

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

  return (
    <div>
      <PageHeader
        title="Perdas de clientes"
        description={
          loading
            ? "Carregando..."
            : `${filtered.length} cliente(s) perdido(s) da sua carteira. Só você vê esta lista.${
                refreshing ? " Atualizando…" : ""
              }`
        }
        actions={
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
                    `clientes-perdidos-${new Date().toISOString().slice(0, 10)}.xlsx`,
                    { sheetName: "Clientes perdidos" },
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
                    `clientes-perdidos-${new Date().toISOString().slice(0, 10)}.pdf`,
                    user?.tenant?.name?.trim() || "Imobiliária",
                    {
                      title: "Perda de cliente",
                      entityLabel: "cliente(s)",
                    },
                  )
                }
              >
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <div className={FILTER_BAR_SHELL}>
        <div className="relative min-w-50 max-w-md flex-1">
          <Search className={FILTER_SEARCH_ICON} />
          <Input
            placeholder="Buscar por nome, motivo..."
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

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Excluído por</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  Nenhum cliente perdido.
                </TableCell>
              </TableRow>
            ) : (
              pager.pageItems.map((l) => (
                <TableRow key={l.id} className="hover:bg-muted/40">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-destructive/10 text-destructive text-xs">
                          {initials(l.nome)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">{l.nome}</div>
                        <div className="text-xs text-muted-foreground">
                          {l.telefone}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell
                    className="text-sm max-w-[220px] truncate"
                    title={l.motivoPerda}
                  >
                    {l.motivoPerda}
                  </TableCell>
                  <TableCell className="text-sm">{l.perdidoPor}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {l.perdidoAt}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Detalhes"
                      onClick={() => setDetail(l)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
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
        title={detail?.nome ?? "Cliente perdido"}
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
                          title={detail.origem}
                        >
                          {detail.origem}
                        </Badge>
                      ) : (
                        "—"
                      )
                    }
                  />
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
            </FormDialogActions>
          </>
        )}
      </FormDialogShell>
    </div>
  );
}
