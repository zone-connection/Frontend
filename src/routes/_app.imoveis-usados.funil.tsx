import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { FormDialogActions } from "@/components/form-dialog";
import {
  FunilScrollControls,
  OperationFunnelBoard,
} from "@/components/operation-funnel-board";
import { VendaUsadoDetalheDialog } from "@/components/venda-usado-detalhe-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { BRAND_GRADIENT_BTN, BRAND_GRADIENT_STYLE } from "@/lib/brand-gradient";
import { imovelCapaUrl } from "@/lib/captacao-api";
import { fetchFunilAtivo, type Funil } from "@/lib/funis-api";
import {
  fetchVendasUsado,
  formatBrl,
  updateVendaUsado,
  type VendaUsado,
} from "@/lib/imoveis-usados-api";
import {
  applyOperacaoFunilThreshold,
  matchesMonitoramentoFiltro,
  MONITORAMENTO_FILTRO_OPTIONS,
  type MonitoramentoFiltro,
} from "@/lib/lead-monitoramento";
import { canViewTeamData } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/imoveis-usados/funil")({
  component: UsadosFunilPage,
});

function formatFunilDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("pt-BR");
}

function proprietarioDe(item: VendaUsado) {
  const raw = item.imovel.proprietario as
    | { id: string; nome: string; telefone?: string }
    | undefined;
  return {
    nome: raw?.nome ?? "Proprietário",
    telefone: raw?.telefone ?? "",
    id: raw?.id,
  };
}

function UsadosFunilPage() {
  const user = getSession();
  const isCorretor = user ? !canViewTeamData(user.role) : true;
  const [funil, setFunil] = useState<Funil | null>(null);
  const [items, setItems] = useState<VendaUsado[]>([]);
  const [loading, setLoading] = useState(true);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [canScroll, setCanScroll] = useState({ left: false, right: false });
  const [detail, setDetail] = useState<VendaUsado | null>(null);
  const [filterMonitoramento, setFilterMonitoramento] =
    useState<MonitoramentoFiltro>("todos");
  const scrollBoard = useRef<((direction: -1 | 1) => void) | null>(null);

  const onScrollChange = useCallback((state: { left: boolean; right: boolean }) => {
    setCanScroll(state);
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [funilAtivo, vendas] = await Promise.all([
        fetchFunilAtivo("venda_usados"),
        fetchVendasUsado(),
      ]);
      setFunil(funilAtivo);
      setItems(vendas);
    } catch (err) {
      setFunil(null);
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar o funil de venda de usados.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const decoratedItems = useMemo(() => {
    if (!funil) return items;
    return items.map((item) => applyOperacaoFunilThreshold(item, funil));
  }, [funil, items]);

  const visibleItems = useMemo(
    () =>
      decoratedItems.filter((item) =>
        matchesMonitoramentoFiltro(item.monitoramento, filterMonitoramento),
      ),
    [decoratedItems, filterMonitoramento],
  );

  const stages = useMemo(
    () =>
      (funil?.etapas ?? [])
        .filter((etapa) => etapa.active)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((etapa) => ({
          id: etapa.id,
          label: etapa.label,
          color: etapa.color,
        })),
    [funil],
  );

  async function moveCard(cardId: string, etapaId: string) {
    const previous = items;
    setMovingId(cardId);
    setItems((current) =>
      current.map((item) =>
        item.id === cardId ? { ...item, funilEtapaId: etapaId } : item,
      ),
    );
    try {
      const updated = await updateVendaUsado(cardId, { funilEtapaId: etapaId });
      setItems((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (err) {
      setItems(previous);
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível mover o imóvel.",
      );
    } finally {
      setMovingId(null);
    }
  }

  function openDetail(cardId: string) {
    setDetail(decoratedItems.find((item) => item.id === cardId) ?? null);
  }

  async function moveDetailToStage(etapaId: string) {
    if (!detail || detail.funilEtapaId === etapaId) return;
    const previous = detail;
    const stage = stages.find((item) => item.id === etapaId);
    setDetail({
      ...detail,
      funilEtapaId: etapaId,
      funilEtapa: {
        ...detail.funilEtapa,
        id: etapaId,
        label: stage?.label ?? detail.funilEtapa.label,
        color: stage?.color ?? detail.funilEtapa.color,
      },
    });
    toast.success(
      `${proprietarioDe(detail).nome} movido para ${stage?.label ?? "a nova etapa"}`,
    );
    try {
      const updated = await updateVendaUsado(detail.id, {
        funilEtapaId: etapaId,
      });
      setItems((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setDetail(updated);
    } catch (err) {
      setDetail(previous);
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível mover o imóvel.",
      );
    }
  }

  return (
    <>
      <PageHeader
        title="Funil de venda de usados"
        description="Arraste os imóveis entre as etapas do funil ativo."
        actionsClassName="lg:max-w-none"
        actions={
          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Select
                value={filterMonitoramento}
                onValueChange={(value) =>
                  setFilterMonitoramento(value as MonitoramentoFiltro)
                }
              >
                <SelectTrigger className="h-8 w-52 rounded-full bg-background py-0">
                  <SelectValue placeholder="Monitoramento" />
                </SelectTrigger>
                <SelectContent>
                  {MONITORAMENTO_FILTRO_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!isCorretor && (
                <Button
                  size="sm"
                  asChild
                  className={cn("h-8 rounded-full", BRAND_GRADIENT_BTN)}
                  style={BRAND_GRADIENT_STYLE}
                >
                  <Link
                    to="/configuracoes"
                    search={{ secao: "operacao", item: "funil" }}
                  >
                    Configurar funil
                  </Link>
                </Button>
              )}
              <Button
                asChild
                size="sm"
                className={cn("h-8 rounded-full", BRAND_GRADIENT_BTN)}
                style={BRAND_GRADIENT_STYLE}
              >
                <Link to="/imoveis">
                  <Plus className="mr-1 h-4 w-4" />
                  Imóveis
                </Link>
              </Button>
            </div>
            <FunilScrollControls
              canScrollLeft={canScroll.left}
              canScrollRight={canScroll.right}
              onScroll={(direction) => scrollBoard.current?.(direction)}
            />
          </div>
        }
      />
      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando…
        </div>
      ) : stages.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Não há funil de Venda de Usados ativo com etapas. Configure em
          Configurações.
        </p>
      ) : (
        <OperationFunnelBoard
          stages={stages}
          movingId={movingId}
          onMove={(cardId, etapaId) => void moveCard(cardId, etapaId)}
          onCardClick={openDetail}
          onScrollChange={onScrollChange}
          scrollApiRef={scrollBoard}
          cards={visibleItems.map((item) => {
            const proprietario = proprietarioDe(item);
            return {
              id: item.id,
              etapaId: item.funilEtapaId || item.funilEtapa.id,
              title: proprietario.nome,
              subtitle: item.imovel.titulo,
              phone: proprietario.telefone,
              meta: formatBrl(item.precoVenda),
              value: item.precoVenda ?? 0,
              href: `/imoveis-usados/vendas/${item.id}`,
              imageUrl: imovelCapaUrl(item.imovel),
              footer: item.responsavel.name.split(" ")[0],
              updatedAt: formatFunilDate(item.dataDisponibilizacao),
              actionLabel: "Detalhes",
              priority:
                item.status === "reservado"
                  ? "alta"
                  : item.status === "disponivel"
                    ? "media"
                    : "baixa",
              monitoramento: item.monitoramento,
            };
          })}
        />
      )}
      <VendaUsadoDetalheDialog
        venda={detail}
        open={!!detail}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
        footer={
          detail ? (
            <FormDialogActions>
              <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 sm:[&_button]:w-full">
                <Button type="button" variant="outline" asChild>
                  <Link
                    to="/imoveis-usados/vendas/$id"
                    params={{ id: detail.id }}
                  >
                    Abrir ficha
                  </Link>
                </Button>
                {proprietarioDe(detail).id ? (
                  <Button type="button" variant="outline" asChild>
                    <Link
                      to="/captacao/proprietarios/$id"
                      params={{ id: proprietarioDe(detail).id! }}
                    >
                      Ver proprietário
                    </Link>
                  </Button>
                ) : null}
                <div className="flex min-w-0 items-center gap-2 sm:col-span-2">
                  <span className="shrink-0 text-xs text-muted-foreground">
                    Etapa:
                  </span>
                  <Select
                    value={detail.funilEtapaId}
                    onValueChange={(value) => void moveDetailToStage(value)}
                  >
                    <SelectTrigger className="h-9 min-w-0 flex-1">
                      <SelectValue placeholder="Selecione a etapa" />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          {stage.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </FormDialogActions>
          ) : null
        }
      />
    </>
  );
}
