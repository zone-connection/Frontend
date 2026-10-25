import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import {
  FunilScrollControls,
  OperationFunnelBoard,
} from "@/components/operation-funnel-board";
import { SkeletonKanban } from "@/components/skeletons";
import { useDeferredLoading } from "@/hooks/use-deferred-loading";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { BRAND_GRADIENT_BTN, BRAND_GRADIENT_STYLE } from "@/lib/brand-gradient";
import { fetchFunilAtivo, type Funil } from "@/lib/funis-api";
import {
  fetchPosVendasUsado,
  formatBrl,
  moverPosVendaEtapa,
  type PosVendaUsado,
} from "@/lib/imoveis-usados-api";
import { canViewTeamData } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/imoveis-usados/pos-venda")({
  component: PosVendaFunilPage,
});

function imovelLabel(item: PosVendaUsado) {
  const imovel = item.venda?.imovel;
  if (!imovel) return "Imóvel";
  const parts = [
    imovel.logradouro,
    imovel.numero,
    imovel.bairro,
    imovel.cidade,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : (imovel.tipo ?? "Imóvel");
}

function PosVendaFunilPage() {
  const user = getSession();
  const isCorretor = user ? !canViewTeamData(user.role) : true;
  const [funil, setFunil] = useState<Funil | null>(null);
  const [items, setItems] = useState<PosVendaUsado[]>([]);
  const [loading, setLoading] = useState(true);
  const showKanbanSkeleton = useDeferredLoading(loading && items.length === 0);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [canScroll, setCanScroll] = useState({ left: false, right: false });
  const scrollBoard = useRef<((direction: -1 | 1) => void) | null>(null);

  const onScrollChange = useCallback(
    (state: { left: boolean; right: boolean }) => {
      setCanScroll(state);
    },
    [],
  );

  async function load() {
    setLoading(true);
    try {
      const [funilAtivo, posVendas] = await Promise.all([
        fetchFunilAtivo("pos_venda"),
        fetchPosVendasUsado(),
      ]);
      setFunil(funilAtivo);
      setItems(posVendas);
    } catch (err) {
      setFunil(null);
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar o funil de pós-venda.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

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

  const visibleItems = useMemo(() => {
    if (!isCorretor || !user) return items;
    return items.filter((item) => item.responsavel.id === user.id);
  }, [items, isCorretor, user]);

  async function moveCard(cardId: string, etapaId: string) {
    const card = items.find((item) => item.id === cardId);
    const vendaId = card?.vendaUsadoId ?? card?.venda?.id;
    if (!card || !vendaId) return;
    if (card.funilEtapaId === etapaId) return;

    const previous = items;
    setMovingId(cardId);
    setItems((current) =>
      current.map((item) =>
        item.id === cardId ? { ...item, funilEtapaId: etapaId } : item,
      ),
    );
    try {
      const updated = await moverPosVendaEtapa(vendaId, etapaId);
      setItems((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (err) {
      setItems(previous);
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível mover o processo.",
      );
    } finally {
      setMovingId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Funil de pós-venda"
        description="Acompanhe leads e vendas encaminhadas após a conclusão."
        actionsClassName="lg:max-w-none"
        actions={
          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap items-center justify-end gap-2">
              {!isCorretor ? (
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
              ) : null}
            </div>
            <FunilScrollControls
              canScrollLeft={canScroll.left}
              canScrollRight={canScroll.right}
              onScroll={(direction) => scrollBoard.current?.(direction)}
            />
          </div>
        }
      />
      {showKanbanSkeleton ? (
        <SkeletonKanban />
      ) : stages.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Não há funil de pós-venda ativo com etapas. O administrador pode criar
          ou ativar um funil em Configurações → Funis.
        </p>
      ) : (
        <OperationFunnelBoard
          stages={stages}
          movingId={movingId}
          onMove={(cardId, etapaId) => void moveCard(cardId, etapaId)}
          onScrollChange={onScrollChange}
          scrollApiRef={scrollBoard}
          cards={visibleItems
            .filter((item) => item.funilEtapaId)
            .map((item) => ({
              id: item.id,
              etapaId: item.funilEtapaId!,
              title: item.lead?.nome ?? item.interessado.nome,
              subtitle: imovelLabel(item),
              phone: item.lead?.telefone ?? undefined,
              meta:
                item.venda?.valor != null
                  ? formatBrl(Number(item.venda.valor))
                  : undefined,
              value:
                item.venda?.valor != null ? Number(item.venda.valor) : 0,
              href: `/imoveis-usados/vendas/${item.vendaUsadoId ?? item.venda?.id ?? ""}`,
              footer: item.responsavel.name.split(" ")[0],
              updatedAt: item.encaminhadoEm
                ? new Date(item.encaminhadoEm).toLocaleDateString("pt-BR")
                : undefined,
              actionLabel: "Abrir venda",
              priority:
                item.status === "aguardando_pendencia"
                  ? "alta"
                  : item.status === "em_andamento"
                    ? "media"
                    : "baixa",
            }))}
        />
      )}
    </>
  );
}
