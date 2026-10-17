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
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  ArrowRight,
  BedDouble,
  Building2,
  CalendarDays,
  Car,
  Eye,
  Images,
  LayoutGrid,
  LayoutList,
  Loader2,
  MapPin,
  Maximize2,
  Pencil,
  Search,
  SlidersHorizontal,
  Trash2,
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
  const [ordem, setOrdem] = useState("recentes");
  const [etapa, setEtapa] = useState("");
  const filtrosAtivos =
    Number(Boolean(filtros.cidade.trim())) +
    Number(Boolean(filtros.origem.trim())) +
    Number(Boolean(filtros.exclusividade)) +
    Number(ordem !== "recentes") +
    Number(Boolean(etapa));
  const etapas = useMemo(() => {
    const labels = new Set(items.map((item) => item.funilEtapa.label).filter(Boolean));
    return [...labels];
  }, [items]);
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = items.filter((item) => {
      if (etapa && item.funilEtapa.label !== etapa) return false;
      if (!q) return true;
      const hay = [
        item.proprietario.nome,
        item.imovel.titulo,
        item.imovel.cidade,
        item.imovel.bairro,
        item.imovel.estado,
        item.responsavel.name,
        item.origem,
        item.funilEtapa.label,
        CAPTACAO_IMOVEL_TIPO_LABEL[item.imovel.tipo],
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
    const next = [...filtered];
    if (ordem === "maior") {
      next.sort(
        (a, b) => (b.valorPretendido ?? 0) - (a.valorPretendido ?? 0),
      );
    } else if (ordem === "menor") {
      next.sort(
        (a, b) => (a.valorPretendido ?? 0) - (b.valorPretendido ?? 0),
      );
    } else {
      next.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return next;
  }, [items, search, ordem, etapa]);
  const pager = useTablePager(visible, search);

  function setVista(next: Vista) {
    setVistaState(next);
    try {
      localStorage.setItem(VISTA_KEY, next);
    } catch {
      /* ignore */
    }
  }

  async function load(next = filtros) {
    setLoading(true);
    try {
      setItems(
        await fetchCaptacoes({
          origem: next.origem || undefined,
          exclusividade:
            next.exclusividade === ""
              ? undefined
              : next.exclusividade === "sim",
          cidade: next.cidade || undefined,
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
        <div>
          <Label className={FILTER_LABEL}>Filtro</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn("h-9 gap-2", FILTER_CONTROL)}
              >
                <SlidersHorizontal className="h-4 w-4 text-[#079ED4]" />
                Filtro
                {filtrosAtivos > 0 ? (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#079ED4] px-1.5 text-[11px] font-semibold text-white">
                    {filtrosAtivos}
                  </span>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[min(92vw,36rem)] space-y-4 p-4">
              <div className="flex items-center gap-3 rounded-2xl border border-[#079ED4]/25 bg-[#F3FAFD] px-4 py-3 text-[#05749E]">
                <span className="grid size-10 place-items-center rounded-xl bg-[#E7F4FA] text-[#079ED4]">
                  <SlidersHorizontal className="size-5" />
                </span>
                <div>
                  <p className="text-2xl font-semibold leading-none tabular-nums text-[#0B3148]">
                    {visible.length}
                  </p>
                  <p className="mt-1 text-xs">resultados encontrados</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className={FILTER_LABEL}>Ordenar por</Label>
                  <Select value={ordem} onValueChange={setOrdem}>
                    <SelectTrigger className={FILTER_CONTROL}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recentes">Mais recentes</SelectItem>
                      <SelectItem value="maior">Maior valor</SelectItem>
                      <SelectItem value="menor">Menor valor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={FILTER_LABEL}>Status</Label>
                  <Select
                    value={etapa || "__all__"}
                    onValueChange={(value) => setEtapa(value === "__all__" ? "" : value)}
                  >
                    <SelectTrigger className={FILTER_CONTROL}>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todos</SelectItem>
                      {etapas.map((label) => (
                        <SelectItem key={label} value={label}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                <div className="flex items-end gap-2">
                  {filtrosAtivos > 0 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className={cn("h-9 flex-1", FILTER_CONTROL)}
                      onClick={() => {
                        const empty = { origem: "", exclusividade: "", cidade: "" };
                        setFiltros(empty);
                        setOrdem("recentes");
                        setEtapa("");
                        void load(empty);
                      }}
                    >
                      Limpar
                    </Button>
                  ) : null}
                  <Button
                    className={cn("h-9 flex-1", BRAND_GRADIENT_BTN)}
                    style={BRAND_GRADIENT_STYLE}
                    onClick={() => void load()}
                  >
                    Filtrar
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
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
          {pager.pageItems.map((item) => {
            const capa = imovelCapaUrl(item.imovel);
            const local = [
              item.imovel.bairro,
              [item.imovel.cidade, item.imovel.estado].filter(Boolean).join("/"),
            ]
              .filter(Boolean)
              .join(" · ");
            const quartos = item.imovel.quartos;
            const vagas = item.imovel.vagas;
            const area = item.imovel.areaConstruida ?? item.imovel.area;
            const acao =
              item.monitoramento?.problemas[0]?.titulo ||
              (item.funilEtapa.label
                ? `Etapa: ${item.funilEtapa.label}`
                : "Sem próxima ação");
            const stageColor = item.funilEtapa.color || "#079ED4";
            return (
              <article
                key={item.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-black/5 bg-card shadow-[0_8px_24px_-18px_rgba(11,49,72,0.45)] dark:border-white/10"
              >
                <div className="relative h-44 bg-[#E7F4FA] dark:bg-[#102838]">
                  {capa ? (
                    <img
                      src={capa}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[#05749E]">
                      <Building2 className="h-10 w-10 opacity-40" />
                    </div>
                  )}
                  <span
                    className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm"
                    style={{ backgroundColor: stageColor }}
                  >
                    {item.funilEtapa.label || "Captação"}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Excluir"
                    className="absolute right-2 top-2 h-8 w-8 rounded-full bg-white/90 text-[#5C6B76] hover:bg-white hover:text-destructive dark:bg-[#141a22]/90"
                    onClick={() => setPendingDelete(item)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex flex-1 flex-col gap-2.5 p-4">
                  <div>
                    <h3 className="text-base font-semibold text-[#0B3148] dark:text-[#f8fafc]">
                      {item.imovel.titulo ||
                        CAPTACAO_IMOVEL_TIPO_LABEL[item.imovel.tipo]}
                    </h3>
                    {local ? (
                      <p className="mt-1 flex items-start gap-1.5 text-sm text-[#5C6B76] dark:text-[#94a3b8]">
                        <MapPin className="mt-0.5 size-3.5 shrink-0 text-[#079ED4]" />
                        {local}
                      </p>
                    ) : null}
                  </div>
                  <p className="text-lg font-bold tabular-nums text-[#0B3148] dark:text-[#f8fafc]">
                    {formatBrl(item.valorPretendido ?? item.valorAvaliacao)}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-[#5C6B76] dark:text-[#94a3b8]">
                    {quartos != null ? (
                      <span className="inline-flex items-center gap-1">
                        <BedDouble className="size-3.5 text-[#079ED4]" />
                        {quartos} {quartos === 1 ? "quarto" : "quartos"}
                      </span>
                    ) : null}
                    {vagas != null ? (
                      <span className="inline-flex items-center gap-1">
                        <Car className="size-3.5 text-[#079ED4]" />
                        {vagas} {vagas === 1 ? "vaga" : "vagas"}
                      </span>
                    ) : null}
                    {area != null ? (
                      <span className="inline-flex items-center gap-1">
                        <Maximize2 className="size-3.5 text-[#079ED4]" />
                        {area} m²
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-auto flex items-center gap-2 rounded-xl bg-[#F3FAFD] px-3 py-2 text-xs font-medium text-[#05749E] dark:bg-[#102838] dark:text-[#7DD3FC]">
                    <CalendarDays className="size-3.5 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{acao}</span>
                    <ArrowRight className="size-3.5 shrink-0" />
                  </p>
                  {(item.canceladoPeloProprietario ||
                    item.sugestaoProprietario ||
                    item.exclusividade) && (
                    <div className="flex flex-wrap gap-1">
                      {item.canceladoPeloProprietario ? (
                        <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                          Cancelado
                        </span>
                      ) : null}
                      {item.sugestaoProprietario ? (
                        <span className="rounded-full bg-violet-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                          Sugestão
                        </span>
                      ) : null}
                      {item.exclusividade ? (
                        <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                          Exclusividade
                        </span>
                      ) : null}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full border-[#D3EBF5] text-[#0B3148] dark:border-white/15 dark:text-[#E7F4FA]"
                      asChild
                    >
                      <Link to="/captacao/captacoes/$id" params={{ id: item.id }}>
                        Ver detalhes
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className={cn("rounded-full", BRAND_GRADIENT_BTN)}
                      style={BRAND_GRADIENT_STYLE}
                      asChild
                    >
                      <Link
                        to="/captacao/imoveis/$id"
                        params={{ id: item.imovel.id }}
                      >
                        <Images className="mr-1.5 size-3.5" />
                        Fotos e ficha
                      </Link>
                    </Button>
                  </div>
                </div>
              </article>
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
