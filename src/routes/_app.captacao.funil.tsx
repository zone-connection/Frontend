import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { CaptacaoDetalheDialog } from "@/components/captacao-detalhe-dialog";
import { LostMotivoFields } from "@/components/lost-motivo-fields";
import {
  FunilScrollControls,
  OperationFunnelBoard,
} from "@/components/operation-funnel-board";
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
import {
  fetchCaptacao,
  fetchCaptacoes,
  formatBrl,
  updateCaptacao,
  type Captacao,
} from "@/lib/captacao-api";
import { BRAND_GRADIENT_BTN, BRAND_GRADIENT_STYLE } from "@/lib/brand-gradient";
import { fetchFunilAtivo, type Funil } from "@/lib/funis-api";
import {
  applyOperacaoFunilThreshold,
  matchesMonitoramentoFiltro,
  MONITORAMENTO_FILTRO_OPTIONS,
  type MonitoramentoFiltro,
} from "@/lib/lead-monitoramento";
import { canViewTeamData } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { FileText, Loader2, Plus, UserRound } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/captacao/funil")({
  component: CaptacaoFunilPage,
});

function formatFunilDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("pt-BR");
}

function CaptacaoFunilPage() {
  const user = getSession();
  const isCorretor = user ? !canViewTeamData(user.role) : true;
  const [funil, setFunil] = useState<Funil | null>(null);
  const [items, setItems] = useState<Captacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [canScroll, setCanScroll] = useState({ left: false, right: false });
  const [detail, setDetail] = useState<Captacao | null>(null);
  const [lostTarget, setLostTarget] = useState<{
    id: string;
    etapaId: string;
  } | null>(null);
  const [lostMotivo, setLostMotivo] = useState("");
  const [lostMotivoOutro, setLostMotivoOutro] = useState("");
  const [filterMonitoramento, setFilterMonitoramento] =
    useState<MonitoramentoFiltro>("todos");
  const scrollBoard = useRef<((direction: -1 | 1) => void) | null>(null);

  const onScrollChange = useCallback((state: { left: boolean; right: boolean }) => {
    setCanScroll(state);
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [funilAtivo, captacoes] = await Promise.all([
        fetchFunilAtivo("captacao"),
        fetchCaptacoes(),
      ]);
      setFunil(funilAtivo);
      setItems(captacoes);
    } catch (err) {
      setFunil(null);
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar o funil de captação.",
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

  function isPerdidoEtapa(etapaId: string) {
    return funil?.etapas.find((etapa) => etapa.id === etapaId)?.papel === "perdido";
  }

  function resolveMotivoPerda() {
    const motivo =
      lostMotivo === "__outro__" ? lostMotivoOutro.trim() : lostMotivo.trim();
    return motivo;
  }

  async function persistMove(
    cardId: string,
    etapaId: string,
    extra: Record<string, unknown> = {},
  ) {
    const previous = items;
    const previousDetail = detail;
    setMovingId(cardId);
    setItems((current) =>
      current.map((item) =>
        item.id === cardId ? { ...item, funilEtapaId: etapaId } : item,
      ),
    );
    try {
      const updated = await updateCaptacao(cardId, {
        funilEtapaId: etapaId,
        ...extra,
      });
      setItems((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      if (detail?.id === cardId) setDetail(updated);
      return true;
    } catch (err) {
      setItems(previous);
      if (previousDetail) setDetail(previousDetail);
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível mover a captação.",
      );
      return false;
    } finally {
      setMovingId(null);
    }
  }

  async function moveCard(cardId: string, etapaId: string) {
    if (isPerdidoEtapa(etapaId)) {
      setLostTarget({ id: cardId, etapaId });
      return;
    }
    await persistMove(cardId, etapaId);
  }

  function openDetail(cardId: string) {
    const found = decoratedItems.find((item) => item.id === cardId) ?? null;
    setDetail(found);
    void fetchCaptacao(cardId)
      .then((full) => {
        setDetail({
          ...full,
          monitoramento: found?.monitoramento ?? full.monitoramento,
        });
      })
      .catch(() => {
        /* mantém o card já aberto */
      });
  }

  async function moveDetailToStage(etapaId: string) {
    if (!detail || detail.funilEtapaId === etapaId) return;
    if (isPerdidoEtapa(etapaId)) {
      setLostTarget({ id: detail.id, etapaId });
      return;
    }
    const ok = await persistMove(detail.id, etapaId);
    if (ok) {
      const stage = stages.find((item) => item.id === etapaId);
      toast.success(
        `${detail.proprietario.nome} movido para ${stage?.label ?? "a nova etapa"}`,
      );
    }
  }

  async function confirmLost() {
    if (!lostTarget) return;
    const motivo = resolveMotivoPerda();
    if (!motivo) {
      toast.error("Selecione o motivo da perda.");
      return;
    }
    const ok = await persistMove(lostTarget.id, lostTarget.etapaId, {
      motivoPerda: motivo,
    });
    if (ok) {
      toast.success("Perda registrada.");
      setLostTarget(null);
      setLostMotivo("");
      setLostMotivoOutro("");
    }
  }

  return (
    <>
      <PageHeader
        title="Funil de captação"
        description="Arraste as captações entre as etapas do funil ativo."
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
                <Link to="/captacao/captacoes">
                  <Plus className="mr-1 h-4 w-4" />
                  Nova captação
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
          Não há funil de Captação ativo com etapas. Configure em Configurações.
        </p>
      ) : (
        <OperationFunnelBoard
          stages={stages}
          movingId={movingId}
          onMove={(cardId, etapaId) => void moveCard(cardId, etapaId)}
          onCardClick={openDetail}
          onScrollChange={onScrollChange}
          scrollApiRef={scrollBoard}
          cards={visibleItems.map((item) => ({
            id: item.id,
            etapaId: item.funilEtapaId || item.funilEtapa.id,
            title: item.proprietario.nome,
            subtitle: item.imovel.titulo,
            phone: item.proprietario.telefone ?? "",
            meta: formatBrl(item.valorPretendido ?? item.valorAvaliacao),
            value: item.valorPretendido ?? item.valorAvaliacao ?? 0,
            href: `/captacao/captacoes/${item.id}`,
            footer: item.responsavel.name.split(" ")[0],
            updatedAt: formatFunilDate(item.updatedAt),
            actionLabel: "Detalhes",
            priority: item.exclusividade ? "alta" : "baixa",
            monitoramento: item.monitoramento,
            tags: [
              ...(item.canceladoPeloProprietario
                ? [
                    {
                      label: "Cancelado pelo proprietário",
                      className: "bg-red-600 text-white",
                    },
                  ]
                : []),
              ...(item.sugestaoProprietario
                ? [
                    {
                      label: "Sugestão do proprietário",
                      className: "bg-violet-600 text-white",
                    },
                  ]
                : []),
            ],
          }))}
        />
      )}
      <CaptacaoDetalheDialog
        captacao={detail}
        open={!!detail}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
        sidebarActions={
          detail
            ? [
                {
                  label: "Abrir ficha",
                  icon: FileText,
                  href: `/captacao/captacoes/${detail.id}`,
                },
                {
                  label: "Ver proprietário",
                  icon: UserRound,
                  href: `/captacao/proprietarios/${detail.proprietario.id}`,
                },
              ]
            : []
        }
        stageControl={
          detail ? (
            <Select
              value={detail.funilEtapaId}
              onValueChange={(value) => void moveDetailToStage(value)}
            >
              <SelectTrigger className="h-9 w-full">
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
          ) : null
        }
        perdaAction={
          detail && detail.funilEtapa.papel !== "perdido"
            ? {
                label: "Dar perda",
                onClick: () => {
                  const etapa = funil?.etapas.find(
                    (item) => item.papel === "perdido" && item.active,
                  );
                  if (!etapa) {
                    toast.error(
                      "Não há etapa de perdido no funil de captação.",
                    );
                    return;
                  }
                  setLostTarget({ id: detail.id, etapaId: etapa.id });
                },
              }
            : undefined
        }
      />
      <AlertDialog
        open={!!lostTarget}
        onOpenChange={(open) => {
          if (!open) {
            setLostTarget(null);
            setLostMotivo("");
            setLostMotivoOutro("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Por que esta captação foi perdida?</AlertDialogTitle>
            <AlertDialogDescription>
              {lostTarget
                ? "A captação vai para a etapa Perdido. Informe o motivo para o time acompanhar."
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-1">
            <LostMotivoFields
              value={lostMotivo}
              outroValue={lostMotivoOutro}
              onChange={setLostMotivo}
              onOutroChange={setLostMotivoOutro}
              selectId="captacao-lost-motivo"
              outroId="captacao-lost-motivo-outro"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmLost();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar perda
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
