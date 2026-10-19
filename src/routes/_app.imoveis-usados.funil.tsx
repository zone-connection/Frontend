import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/app-shell";
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
import { fetchFunilAtivo, type Funil, type FunilEtapa } from "@/lib/funis-api";
import {
  fetchLeads,
  mapApiLead,
  updateLeadStageApi,
} from "@/lib/leads-api";
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
import { FILTER_CONTROL } from "@/lib/filter-bar";
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

type VisaoFunil = "todos" | "usados" | "lancamentos";

const FORA_LANCAMENTO = "fora-lancamento";

function etapaDoLead(etapas: FunilEtapa[], stage: string) {
  return etapas.find((etapa) => etapa.slug === stage || etapa.id === stage);
}

async function fetchTodosLeads() {
  const limit = 200;
  const first = await fetchLeads({ page: 1, limit, tipo: "lead" });
  const rows = [...first.data];
  for (let page = 2; page <= first.meta.totalPages; page += 1) {
    const next = await fetchLeads({ page, limit, tipo: "lead" });
    rows.push(...next.data);
  }
  return rows.map(mapApiLead);
}

function UsadosFunilPage() {
  const user = getSession();
  const isCorretor = user ? !canViewTeamData(user.role) : true;
  const [visao, setVisao] = useState<VisaoFunil>("todos");
  const [funil, setFunil] = useState<Funil | null>(null);
  const [funilLancamento, setFunilLancamento] = useState<Funil | null>(null);
  const [leads, setLeads] = useState<ReturnType<typeof mapApiLead>[]>([]);
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
      const [funilAtivo, vendas, funilComercial, contatos] = await Promise.all([
        fetchFunilAtivo("venda_usados").catch(() => null),
        fetchVendasUsado().catch(() => [] as VendaUsado[]),
        fetchFunilAtivo("comercial").catch(() => null),
        fetchTodosLeads().catch(() => []),
      ]);
      setFunil(funilAtivo);
      setItems(vendas);
      setFunilLancamento(funilComercial);
      setLeads(contatos);
      if (!funilAtivo && !funilComercial) {
        throw new Error("Não foi possível carregar os funis.");
      }
    } catch (err) {
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

  const stagesLancamento = useMemo(
    () =>
      (funilLancamento?.etapas ?? [])
        .filter((etapa) => etapa.active)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((etapa) => ({
          id: etapa.id,
          label: etapa.label,
          color: etapa.color,
        })),
    [funilLancamento],
  );

  const leadsVisiveis = useMemo(() => {
    const etapas = funilLancamento?.etapas ?? [];
    return leads.filter((lead) => {
      if (funilLancamento && lead.funilId && lead.funilId !== funilLancamento.id) {
        return false;
      }
      return matchesMonitoramentoFiltro(lead.monitoramento, filterMonitoramento);
    }).map((lead) => ({
      lead,
      etapa: etapaDoLead(etapas, lead.stage),
    }));
  }, [funilLancamento, leads, filterMonitoramento]);

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

  async function moveLead(cardId: string, etapaId: string) {
    if (etapaId === FORA_LANCAMENTO) return;
    const etapa = funilLancamento?.etapas.find((item) => item.id === etapaId);
    const lead = leads.find((item) => item.id === cardId);
    if (!etapa || !lead || lead.stage === etapa.slug) return;
    const previous = leads;
    setMovingId(cardId);
    setLeads((current) =>
      current.map((item) =>
        item.id === cardId ? { ...item, stage: etapa.slug } : item,
      ),
    );
    try {
      const updated = mapApiLead(await updateLeadStageApi(cardId, etapa.slug));
      setLeads((current) =>
        current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
      );
    } catch (err) {
      setLeads(previous);
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível mover o lead.",
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
        title="Funil"
        description="Lançamentos e venda de usados no mesmo lugar. Cada card só muda de etapa dentro do próprio funil."
        actionsClassName="lg:max-w-none"
        actions={
          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <div className="flex gap-1 rounded-full border bg-background p-0.5">
                {(
                  [
                    ["todos", "Todos"],
                    ["lancamentos", "Lançamentos"],
                    ["usados", "Venda de usados"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setVisao(id)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium",
                      visao === id ? "bg-[#079ED4] text-white" : "text-[#5C6B76]",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Select
                value={filterMonitoramento}
                onValueChange={(value) =>
                  setFilterMonitoramento(value as MonitoramentoFiltro)
                }
              >
                <SelectTrigger className={cn("w-52", FILTER_CONTROL)}>
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
      ) : (
        <div className="space-y-8">
          {visao !== "usados" ? (
            <section>
              <h2 className="mb-2 text-sm font-semibold text-[#0B3148]">Lançamentos</h2>
              {stagesLancamento.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Não há funil de lançamentos ativo com etapas.
                </p>
              ) : (
                <OperationFunnelBoard
                  stages={[
                    ...stagesLancamento,
                    ...(leadsVisiveis.some((item) => !item.etapa)
                      ? [{ id: FORA_LANCAMENTO, label: "Fora das etapas", color: "#8B98A3" }]
                      : []),
                  ]}
                  movingId={movingId}
                  onMove={(cardId, etapaId) => void moveLead(cardId, etapaId)}
                  onScrollChange={onScrollChange}
                  scrollApiRef={scrollBoard}
                  cards={leadsVisiveis.map(({ lead, etapa }) => ({
                    id: lead.id,
                    etapaId: etapa?.id ?? FORA_LANCAMENTO,
                    title: lead.nome,
                    subtitle: lead.empreendimento?.nome ?? lead.origem,
                    phone: lead.telefone,
                    meta: lead.renda != null ? formatBrl(lead.renda) : undefined,
                    value: lead.renda ?? 0,
                    href: `/leads`,
                    footer: lead.corretor.split(" ")[0],
                    updatedAt: lead.updatedAt,
                    actionLabel: "Lead",
                    tags: [{ label: "Lançamento", className: "bg-[#E7F4FA] text-[#05749E]" }],
                    monitoramento: lead.monitoramento,
                  }))}
                />
              )}
            </section>
          ) : null}
          {visao !== "lancamentos" ? (
            <section>
              <h2 className="mb-2 text-sm font-semibold text-[#0B3148]">Venda de usados</h2>
      {stages.length === 0 ? (
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
            </section>
          ) : null}
        </div>
      )}
      <VendaUsadoDetalheDialog
        venda={detail}
        stages={stages}
        open={!!detail}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
        actions={
          detail
            ? [
                {
                  label: "Abrir ficha",
                  href: `/imoveis-usados/vendas/${detail.id}`,
                },
                ...(proprietarioDe(detail).id
                  ? [
                      {
                        label: "Ver proprietário",
                        href: `/captacao/proprietarios/${proprietarioDe(detail).id}`,
                      },
                    ]
                  : []),
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
      />
    </>
  );
}
