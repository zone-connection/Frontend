import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { PillTabs, StatusChip, TableFrame, vendaStatusTone } from "@/components/operacao-ui";
import { TablePager } from "@/components/table-pager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CAPTACAO_IMOVEL_TIPO_LABEL,
  formatBrl,
  imovelCapaUrl,
} from "@/lib/captacao-api";
import {
  catalogColorBadgeClass,
  catalogColorBadgeStyle,
  STATUS_CHIP_CLASS,
} from "@/lib/catalog-colors";
import {
  FILTER_CONTROL,
  FILTER_LABEL,
  FILTER_SEARCH_ICON,
  FILTER_VISTA_BTN,
  FILTER_VISTA_BTN_ACTIVE,
  FILTER_VISTA_WRAP,
  TABLE_LUX,
} from "@/lib/filter-bar";
import {
  fetchVendasUsado,
  VENDA_STATUS_LABEL,
  type VendaUsado,
  type VendaUsadoStatus,
} from "@/lib/imoveis-usados-api";
import { ApiError } from "@/lib/api";
import { useTablePager } from "@/lib/use-table-pager";
import { cn } from "@/lib/utils";
import {
  Building2,
  Eye,
  LayoutGrid,
  LayoutList,
  Loader2,
  MapPin,
  Search,
  User,
} from "lucide-react";
import { toast } from "sonner";

type Search = { status?: VendaUsadoStatus };
type Vista = "cards" | "tabela";
const VISTA_KEY = "usados.estoque.vista";
const TABLE_CHIP =
  "h-6 w-auto max-w-[8.5rem] min-w-0 shrink rounded-full border-transparent px-2.5 py-0 text-[10px] font-semibold leading-6 shadow-none";

const STATUS_OPTS: Array<VendaUsadoStatus | "todos"> = [
  "todos",
  "disponivel",
  "reservado",
  "vendido",
];

export const Route = createFileRoute("/_app/imoveis-usados/estoque")({
  validateSearch: (search: Record<string, unknown>): Search => {
    const status = search.status;
    if (
      status === "disponivel" ||
      status === "reservado" ||
      status === "vendido" ||
      status === "indisponivel"
    ) {
      return { status };
    }
    return {};
  },
  component: EstoquePage,
});

function getVista(): Vista {
  try {
    return localStorage.getItem(VISTA_KEY) === "tabela" ? "tabela" : "cards";
  } catch {
    return "cards";
  }
}

function diasNoMercado(iso: string) {
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000),
  );
}

function EstoquePage() {
  const { status } = Route.useSearch();
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [items, setItems] = useState<VendaUsado[]>([]);
  const [loading, setLoading] = useState(true);
  const [vista, setVistaState] = useState<Vista>(() => getVista());
  const filtro = status ?? "todos";

  function setVista(next: Vista) {
    setVistaState(next);
    try {
      localStorage.setItem(VISTA_KEY, next);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    setLoading(true);
    fetchVendasUsado()
      .then(setItems)
      .catch((err) => {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Não foi possível carregar o estoque.",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return items.filter((item) => {
      if (filtro !== "todos" && item.status !== filtro) return false;
      if (!q) return true;
      const hay = [
        item.imovel.titulo,
        item.imovel.bairro,
        item.imovel.cidade,
        item.imovel.proprietario?.nome,
        item.responsavel.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [busca, filtro, items]);
  const pager = useTablePager(lista, `${busca}|${filtro}`);

  return (
    <>
      <PageHeader
        title="Estoque"
        description="Disponível, reservado e vendido, com preço e dias no mercado."
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <PillTabs
          value={filtro}
          onChange={(id) => {
            void navigate({
              to: "/imoveis-usados/estoque",
              search: id === "todos" ? {} : { status: id as VendaUsadoStatus },
            });
          }}
          items={STATUS_OPTS.map((id) => ({
            id,
            label:
              id === "todos"
                ? `Todos (${items.length})`
                : `${VENDA_STATUS_LABEL[id]} (${items.filter((item) => item.status === id).length})`,
          }))}
        />
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
            <Search className={FILTER_SEARCH_ICON} />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar imóvel, bairro ou dono"
              className={cn("pl-9", FILTER_CONTROL)}
            />
          </div>
          <div>
            <Label className={FILTER_LABEL}>Exibir</Label>
            <div className={FILTER_VISTA_WRAP}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  FILTER_VISTA_BTN,
                  vista === "cards" && FILTER_VISTA_BTN_ACTIVE,
                )}
                title="Ver cards"
                onClick={() => setVista("cards")}
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="ml-1.5">Cards</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  FILTER_VISTA_BTN,
                  vista === "tabela" && FILTER_VISTA_BTN_ACTIVE,
                )}
                title="Ver tabela"
                onClick={() => setVista("tabela")}
              >
                <LayoutList className="h-4 w-4" />
                <span className="ml-1.5">Tabela</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando…
        </div>
      ) : vista === "tabela" ? (
        <>
          <TableFrame>
            <Table className={TABLE_LUX}>
              <TableHeader>
                <TableRow>
                  <TableHead>Imóvel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Dias no mercado</TableHead>
                  <TableHead>Responsável</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pager.pageItems.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-sm text-muted-foreground"
                    >
                      Nenhum imóvel neste filtro.
                    </TableCell>
                  </TableRow>
                ) : (
                  pager.pageItems.map((item) => {
                    const capa = imovelCapaUrl(item.imovel);
                    return (
                      <TableRow key={item.id} className="hover:bg-muted/40">
                        <TableCell>
                          <Link
                            to="/imoveis-usados/vendas/$id"
                            params={{ id: item.id }}
                            className="flex items-center gap-3 hover:underline"
                          >
                            {capa ? (
                              <img
                                src={capa}
                                alt=""
                                className="h-12 w-16 shrink-0 rounded-md object-cover"
                              />
                            ) : (
                              <span className="h-12 w-16 shrink-0 rounded-md bg-muted" />
                            )}
                            <div>
                              <div className="text-sm font-medium">
                                {item.imovel.titulo}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {item.imovel.bairro} · {item.imovel.cidade}
                              </div>
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell>
                          <StatusChip tone={vendaStatusTone(item.status)}>
                            {VENDA_STATUS_LABEL[item.status]}
                          </StatusChip>
                        </TableCell>
                        <TableCell className="text-sm font-semibold tabular-nums">
                          {formatBrl(item.precoVenda)}
                        </TableCell>
                        <TableCell className="text-sm tabular-nums">
                          {diasNoMercado(item.dataDisponibilizacao)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.responsavel.name}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableFrame>
          <TablePager
            page={pager.page}
            totalPages={pager.totalPages}
            total={pager.total}
            onPageChange={pager.setPage}
          />
        </>
      ) : pager.pageItems.length === 0 ? (
        <p className="rounded-2xl border px-4 py-8 text-center text-sm text-muted-foreground">
          Nenhum imóvel neste filtro.
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {pager.pageItems.map((item) => {
              const capa = imovelCapaUrl(item.imovel);
              const dias = diasNoMercado(item.dataDisponibilizacao);
              return (
                <Card
                  key={item.id}
                  className="group overflow-hidden rounded-2xl border-black/5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-md"
                >
                  <Link
                    to="/imoveis-usados/vendas/$id"
                    params={{ id: item.id }}
                    className="block"
                  >
                    <div className="relative h-40 overflow-hidden bg-muted">
                      {capa ? (
                        <img
                          src={capa}
                          alt=""
                          className="relative h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Building2 className="h-10 w-10 text-muted-foreground/40" />
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-black/60 to-transparent" />
                      {item.imovel.cidade ? (
                        <Badge className="absolute bottom-3 right-3 border-white/20 bg-black/45 text-white hover:bg-black/55">
                          {item.imovel.cidade}
                        </Badge>
                      ) : null}
                    </div>
                  </Link>
                  <CardHeader className="pb-2 pt-4">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-snug">
                        {item.imovel.titulo}
                      </CardTitle>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        title="Ver detalhes"
                        asChild
                      >
                        <Link
                          to="/imoveis-usados/vendas/$id"
                          params={{ id: item.id }}
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.imovel.proprietario?.nome ?? "Proprietário"}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      <StatusChip tone={vendaStatusTone(item.status)}>
                        {VENDA_STATUS_LABEL[item.status]}
                      </StatusChip>
                      {item.funilEtapa?.label ? (
                        <Badge
                          className={cn(
                            STATUS_CHIP_CLASS,
                            TABLE_CHIP,
                            "rounded-full",
                            catalogColorBadgeClass(item.funilEtapa.color),
                          )}
                          style={catalogColorBadgeStyle(item.funilEtapa.color)}
                          title={item.funilEtapa.label}
                        >
                          {item.funilEtapa.label}
                        </Badge>
                      ) : null}
                      {item.imovel.tipo ? (
                        <Badge
                          className={cn(
                            STATUS_CHIP_CLASS,
                            "bg-sky-500/15 text-sky-700 dark:text-sky-300",
                          )}
                        >
                          {CAPTACAO_IMOVEL_TIPO_LABEL[item.imovel.tipo] ??
                            item.imovel.tipo}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {item.responsavel.name.split(" ")[0]}
                      </span>
                      {item.imovel.bairro ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {item.imovel.bairro}
                        </span>
                      ) : null}
                      <span>
                        {dias} {dias === 1 ? "dia" : "dias"} no mercado
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-primary">
                      {formatBrl(item.precoVenda)}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <TablePager
            page={pager.page}
            totalPages={pager.totalPages}
            total={pager.total}
            onPageChange={pager.setPage}
          />
        </>
      )}
    </>
  );
}
