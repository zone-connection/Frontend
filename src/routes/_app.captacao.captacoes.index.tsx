import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { CatalogUnidadeImoveis } from "@/components/catalog-unidade-imoveis";
import { lostLeadAvatarClass } from "@/components/lost-leads-lux";
import { TablePager } from "@/components/table-pager";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTablePager } from "@/lib/use-table-pager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useCatalog } from "@/lib/catalog-store";
import {
  CAPTACAO_IMOVEL_TIPO_LABEL,
  deleteCaptacao,
  fetchCaptacoes,
  formatBrl,
  imovelCapaUrl,
  type Captacao,
} from "@/lib/captacao-api";
import {
  catalogColorBadgeClass,
  catalogColorBadgeStyle,
  STATUS_CHIP_CLASS,
} from "@/lib/catalog-colors";
import {
  FILTER_BAR_STACK,
  FILTER_CONTROL,
  FILTER_LABEL,
  FILTER_SEARCH_ICON,
  FILTER_VISTA_BTN,
  FILTER_VISTA_BTN_ACTIVE,
  FILTER_VISTA_WRAP,
  TABLE_LUX,
} from "@/lib/filter-bar";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { ImovelFotoThumb } from "@/components/imovel-foto-thumb";
import { BRAND_GRADIENT_BTN, BRAND_GRADIENT_STYLE } from "@/lib/brand-gradient";
import { cn } from "@/lib/utils";
import {
  Building2,
  Eye,
  LayoutGrid,
  LayoutList,
  Loader2,
  MapPin,
  Pencil,
  Ruler,
  Search,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/captacao/captacoes/")({
  component: CaptacoesPage,
});

type Vista = "cards" | "tabela";
const VISTA_KEY = "captacoes.vista";
const TABLE_CHIP =
  "h-6 w-auto max-w-[8.5rem] min-w-0 shrink rounded-full border-transparent px-2.5 py-0 text-[10px] font-semibold leading-6 shadow-none";

function getVista(): Vista {
  try {
    return localStorage.getItem(VISTA_KEY) === "tabela" ? "tabela" : "cards";
  } catch {
    return "cards";
  }
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function CaptacoesPage() {
  const navigate = useNavigate();
  const { colorByLabel } = useCatalog();
  const [items, setItems] = useState<Captacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [cadastroTick, setCadastroTick] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<Captacao | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [vista, setVistaState] = useState<Vista>(() => getVista());
  const [filtros, setFiltros] = useState({
    origem: "",
    exclusividade: "",
    cidade: "",
  });
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const hay = [
        item.proprietario.nome,
        item.imovel.titulo,
        item.imovel.cidade,
        item.imovel.bairro,
        item.responsavel.name,
        item.origem,
        item.funilEtapa.label,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, search]);
  const pager = useTablePager(visible, search);

  function setVista(next: Vista) {
    setVistaState(next);
    try {
      localStorage.setItem(VISTA_KEY, next);
    } catch {
      /* ignore */
    }
  }

  async function load() {
    setLoading(true);
    try {
      setItems(
        await fetchCaptacoes({
          origem: filtros.origem || undefined,
          exclusividade:
            filtros.exclusividade === ""
              ? undefined
              : filtros.exclusividade === "sim",
          cidade: filtros.cidade || undefined,
        }),
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível listar.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteCaptacao(pendingDelete.id);
      toast.success("Captação excluída.");
      setPendingDelete(null);
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível excluir.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Captações"
        description="Processos no funil de Captação. A etapa inicial vem do funil ativo."
        actions={
          <Button
            size="sm"
            onClick={() => setCadastroTick((tick) => tick + 1)}
            className={cn("h-8 rounded-full", BRAND_GRADIENT_BTN)}
            style={BRAND_GRADIENT_STYLE}
          >
            <Building2 className="mr-1 h-4 w-4" />
            Cadastrar captação
          </Button>
        }
      />

      <div className={FILTER_BAR_STACK}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <Label htmlFor="buscar-captacao" className={FILTER_LABEL}>
              Buscar
            </Label>
            <div className="relative">
              <Search className={FILTER_SEARCH_ICON} />
              <Input
                id="buscar-captacao"
                placeholder="Proprietário, imóvel ou cidade…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={cn("pl-9", FILTER_CONTROL)}
              />
            </div>
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label className={FILTER_LABEL}>Cidade</Label>
            <Input
              className={FILTER_CONTROL}
              placeholder="Todas"
              value={filtros.cidade}
              onChange={(e) => setFiltros({ ...filtros, cidade: e.target.value })}
            />
          </div>
          <div>
            <Label className={FILTER_LABEL}>Origem</Label>
            <Input
              className={FILTER_CONTROL}
              placeholder="Todas"
              value={filtros.origem}
              onChange={(e) => setFiltros({ ...filtros, origem: e.target.value })}
            />
          </div>
          <div>
            <Label className={FILTER_LABEL}>Exclusividade</Label>
            <Select
              value={filtros.exclusividade || "__all__"}
              onValueChange={(value) =>
                setFiltros({
                  ...filtros,
                  exclusividade: value === "__all__" ? "" : value,
                })
              }
            >
              <SelectTrigger className={FILTER_CONTROL}>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas</SelectItem>
                <SelectItem value="sim">Sim</SelectItem>
                <SelectItem value="nao">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              className={cn("w-full", FILTER_CONTROL)}
              onClick={() => void load()}
            >
              Filtrar
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Carregando…
        </div>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
            <Building2 className="h-8 w-8 opacity-40" />
            <p className="max-w-sm text-center">
              {items.length === 0
                ? "Nenhuma captação cadastrada. Use “Cadastrar captação” para começar."
                : "Nenhuma captação encontrada para a busca ou os filtros."}
            </p>
          </CardContent>
        </Card>
      ) : vista === "tabela" ? (
        <Card className="overflow-hidden rounded-2xl">
          <Table className={TABLE_LUX}>
            <TableHeader>
              <TableRow>
                <TableHead>Proprietário</TableHead>
                <TableHead>Imóvel</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Exclusividade</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead className="w-28 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pager.pageItems.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() =>
                    void navigate({
                      to: "/captacao/captacoes/$id",
                      params: { id: item.id },
                    })
                  }
                >
                  <TableCell>
                    <div className="flex min-w-40 items-center gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback
                          className={cn(
                            "text-xs text-white",
                            lostLeadAvatarClass(item.proprietario.nome),
                          )}
                        >
                          {initials(item.proprietario.nome)}
                        </AvatarFallback>
                      </Avatar>
                      <Link
                        to="/captacao/proprietarios/$id"
                        params={{ id: item.proprietario.id }}
                        className="truncate text-sm font-medium hover:underline"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {item.proprietario.nome}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link
                      to="/captacao/imoveis/$id"
                      params={{ id: item.imovel.id }}
                      className="flex min-w-0 items-center gap-2 hover:underline"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <ImovelFotoThumb src={imovelCapaUrl(item.imovel)} alt="" />
                      <span className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {item.imovel.titulo}
                      </p>
                      {item.imovel.cidade ? (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {item.imovel.cidade}
                        </p>
                      ) : null}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm uppercase tracking-wide text-muted-foreground">
                    {item.responsavel.name}
                  </TableCell>
                  <TableCell>
                    {item.canceladoPeloProprietario ? (
                      <span className="mb-1 inline-flex rounded-full bg-rose-500 px-2.5 py-1 text-[11px] font-semibold text-white">
                        Cancelado pelo proprietário
                      </span>
                    ) : null}
                    {item.sugestaoProprietario ? (
                      <span className="mb-1 inline-flex rounded-full bg-violet-500 px-2.5 py-1 text-[11px] font-semibold text-white">
                        Sugestão do proprietário
                      </span>
                    ) : null}
                    {item.origem ? (
                      <Badge
                        className={cn(
                          STATUS_CHIP_CLASS,
                          TABLE_CHIP,
                          catalogColorBadgeClass(
                            colorByLabel("origem", item.origem),
                          ),
                        )}
                        style={catalogColorBadgeStyle(
                          colorByLabel("origem", item.origem),
                        )}
                        title={item.origem}
                      >
                        {item.origem}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    {item.exclusividade ? (
                      <span className="inline-flex rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-semibold text-white">
                        Sim
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Não</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold tabular-nums">
                    {item.valorPretendido != null
                      ? formatBrl(item.valorPretendido)
                      : "—"}
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Ver detalhes"
                        asChild
                      >
                        <Link
                          to="/captacao/captacoes/$id"
                          params={{ id: item.id }}
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Editar"
                        asChild
                      >
                        <Link
                          to="/captacao/captacoes/$id"
                          params={{ id: item.id }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        title="Excluir"
                        onClick={() => setPendingDelete(item)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePager
            page={pager.page}
            totalPages={pager.totalPages}
            total={pager.total}
            onPageChange={pager.setPage}
          />
        </Card>
      ) : (
        <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {pager.pageItems.map((item) => (
            <Card
              key={item.id}
              role="link"
              tabIndex={0}
              onClick={() =>
                void navigate({
                  to: "/captacao/captacoes/$id",
                  params: { id: item.id },
                })
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void navigate({
                    to: "/captacao/captacoes/$id",
                    params: { id: item.id },
                  });
                }
              }}
              className="group cursor-pointer overflow-hidden rounded-2xl border-black/5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-md"
            >
              <div className="relative h-40 overflow-hidden bg-muted">
                {imovelCapaUrl(item.imovel) ? (
                  <img
                    src={imovelCapaUrl(item.imovel) ?? ""}
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
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">
                    {item.imovel.titulo}
                  </CardTitle>
                  <div className="flex shrink-0 gap-0.5" onClick={(event) => event.stopPropagation()}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Ver detalhes"
                      asChild
                    >
                      <Link
                        to="/captacao/captacoes/$id"
                        params={{ id: item.id }}
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Editar"
                      asChild
                    >
                      <Link
                        to="/captacao/captacoes/$id"
                        params={{ id: item.id }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Excluir"
                      onClick={() => setPendingDelete(item)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {item.proprietario.nome}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
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
                  {item.canceladoPeloProprietario ? (
                    <Badge className="bg-red-600 text-white hover:bg-red-600">
                      Cancelado pelo proprietário
                    </Badge>
                  ) : null}
                  {item.sugestaoProprietario ? (
                    <Badge className="bg-violet-600 text-white hover:bg-violet-600">
                      Sugestão do proprietário
                    </Badge>
                  ) : null}
                  {item.origem ? (
                    <Badge
                      className={cn(
                        STATUS_CHIP_CLASS,
                        catalogColorBadgeClass(
                          colorByLabel("origem", item.origem),
                        ),
                      )}
                      style={catalogColorBadgeStyle(
                        colorByLabel("origem", item.origem),
                      )}
                      title={item.origem}
                    >
                      {item.origem}
                    </Badge>
                  ) : null}
                  {item.exclusividade ? (
                    <Badge className={cn(STATUS_CHIP_CLASS, "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300")}>
                      Exclusividade
                    </Badge>
                  ) : null}
                  <Badge
                    className={cn(STATUS_CHIP_CLASS, "bg-sky-500/15 text-sky-700 dark:text-sky-300")}
                    title={CAPTACAO_IMOVEL_TIPO_LABEL[item.imovel.tipo]}
                  >
                    {CAPTACAO_IMOVEL_TIPO_LABEL[item.imovel.tipo]}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {item.responsavel.name.split(" ")[0]}
                  </span>
                  {item.imovel.area != null ? (
                    <span className="inline-flex items-center gap-1">
                      <Ruler className="h-3.5 w-3.5" />
                      {item.imovel.area} m²
                    </span>
                  ) : null}
                  {item.imovel.bairro ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {item.imovel.bairro}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm font-semibold text-primary">
                  {formatBrl(item.valorPretendido ?? item.valorAvaliacao)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        <TablePager
          page={pager.page}
          totalPages={pager.totalPages}
          total={pager.total}
          onPageChange={pager.setPage}
        />
        </>
      )}

      <CatalogUnidadeImoveis
        hideList
        createTick={cadastroTick}
        iniciarCaptacao
        onChanged={() => void load()}
      />
      <ConfirmDeleteDialog
        open={pendingDelete != null}
        onOpenChange={(next) => {
          if (!next) setPendingDelete(null);
        }}
        title="Excluir captação?"
        description={
          pendingDelete
            ? `A captação de ${pendingDelete.proprietario.nome} será removida. O imóvel permanece cadastrado.`
            : ""
        }
        loading={deleting}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
