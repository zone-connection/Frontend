import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import {
  OverviewFunnelPanel,
  funnelBarsFromFunil,
} from "@/components/funnel-bar-chart";
import { OperationSection } from "@/components/operacao-ui";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import {
  fetchCaptacaoResumo,
  type CaptacaoResumo,
} from "@/lib/captacao-api";
import { fetchFunilAtivo, type Funil } from "@/lib/funis-api";
import { useDemoOperacao } from "@/lib/demo-operacao-usados";
import { SOFT_BTN } from "@/lib/soft-btn";
import { cn } from "@/lib/utils";
import { Building2, Home, Kanban, Loader2, Plus, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/captacao/visao-geral")({
  component: CaptacaoVisaoGeralPage,
});

function CaptacaoVisaoGeralPage() {
  const [resumo, setResumo] = useState<CaptacaoResumo | null>(null);
  const [funil, setFunil] = useState<Funil | null>(null);
  const [loading, setLoading] = useState(true);
  const demo = useDemoOperacao();
  const paradas = demo.paradas.filter((item) => item.diasSemMovimento >= 7).length;
  const portal = demo.portal.filter((item) => item.desfecho === "aberto").length;
  const exclusividade = demo.exclusividades.filter((item) => item.venceEmDias <= 30).length;

  useEffect(() => {
    void Promise.all([
      fetchCaptacaoResumo(),
      fetchFunilAtivo("captacao").catch(() => null),
    ])
      .then(([nextResumo, nextFunil]) => {
        setResumo(nextResumo);
        setFunil(nextFunil);
      })
      .catch((err) => {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Não foi possível carregar a visão geral.",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader
        title="Captação"
        description="Acompanhe proprietários, imóveis e o funil de captação."
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/captacao/proprietarios">
                <Users className="mr-1 h-4 w-4" />
                Proprietários
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/captacao/captacoes">
                <Plus className="mr-1 h-4 w-4" />
                Nova captação
              </Link>
            </Button>
          </div>
        }
      />
      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando…
        </div>
      ) : resumo ? (
        <div className="space-y-8">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <FinanceKpiCard
              label="Proprietários"
              value={resumo.proprietarios}
              tone="blue"
              icon={Users}
              format="number"
              variant="dash"
              href="/captacao/proprietarios"
            />
            <FinanceKpiCard
              label="Imóveis"
              value={resumo.imoveis}
              tone="teal"
              icon={Building2}
              format="number"
              variant="dash"
              href="/imoveis"
            />
            <FinanceKpiCard
              label="Captações"
              value={resumo.captacoes}
              tone="violet"
              icon={Kanban}
              format="number"
              variant="dash"
              href="/captacao/captacoes"
            />
            <FinanceKpiCard
              label="Captações ativas"
              value={resumo.captacoesAtivas}
              tone="orange"
              icon={Home}
              format="number"
              variant="dash"
              href="/captacao/funil"
            />
            <FinanceKpiCard
              label="Imóveis captados"
              value={resumo.imoveisCaptados}
              tone="emerald"
              icon={Home}
              format="number"
              variant="dash"
              href="/imoveis"
            />
          </div>
          <OperationSection
            title="Acompanhamento"
            description="Prévia da fila: paradas, portal do proprietário e exclusividade."
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <FinanceKpiCard
                label="Captações paradas"
                value={paradas}
                tone="orange"
                icon={Home}
                format="number"
                variant="dash"
                href="/captacao/fila"
                search={{ aba: "paradas" }}
              />
              <FinanceKpiCard
                label="Avisos do portal"
                value={portal}
                tone="teal"
                icon={Users}
                format="number"
                variant="dash"
                href="/captacao/fila"
                search={{ aba: "portal" }}
              />
              <FinanceKpiCard
                label="Exclusividade a vencer"
                value={exclusividade}
                tone="violet"
                icon={Kanban}
                format="number"
                variant="dash"
                href="/captacao/fila"
                search={{ aba: "exclusividade" }}
              />
            </div>
          </OperationSection>
          <OverviewFunnelPanel
            title="Funil de captação"
            description="Todas as etapas do funil ativo, com o volume em cada uma."
            action={
              <Button
                asChild
                variant="outline"
                size="sm"
                className={cn("h-8 text-xs", SOFT_BTN)}
              >
                <Link to="/captacao/funil">Ver funil</Link>
              </Button>
            }
            data={funnelBarsFromFunil(funil, resumo.porEtapa)}
            emptyLabel="Não há funil de Captação ativo com etapas."
          />
        </div>
      ) : null}
    </>
  );
}
