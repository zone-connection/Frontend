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
import { fetchUsadosResumo, type UsadosResumo } from "@/lib/imoveis-usados-api";
import { fetchFunilAtivo, type Funil } from "@/lib/funis-api";
import { SOFT_BTN } from "@/lib/soft-btn";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Building2,
  Calendar,
  ClipboardCheck,
  FileSignature,
  FileText,
  KeyRound,
  Loader2,
  Plus,
  Store,
  Users,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/imoveis-usados/visao-geral")({
  component: UsadosVisaoGeralPage,
});

function UsadosVisaoGeralPage() {
  const [resumo, setResumo] = useState<UsadosResumo | null>(null);
  const [funil, setFunil] = useState<Funil | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void Promise.all([
      fetchUsadosResumo(),
      fetchFunilAtivo("venda_usados").catch(() => null),
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
        title="Venda de Usados"
        description="Disponibilize imóveis captados e acompanhe a comercialização até a pós-venda."
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/imoveis-usados/interessados">
                <Users className="mr-1 h-4 w-4" />
                Interessados
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/imoveis">
                <Plus className="mr-1 h-4 w-4" />
                Imóveis
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
          <OverviewFunnelPanel
            title="Funil de venda de usados"
            description="Todas as etapas do funil ativo, com o volume em cada uma."
            action={
              <Button
                asChild
                variant="outline"
                size="sm"
                className={cn("h-8 text-xs", SOFT_BTN)}
              >
                <Link to="/imoveis-usados/funil">Ver funil</Link>
              </Button>
            }
            data={funnelBarsFromFunil(funil, resumo.porEtapa ?? [])}
            emptyLabel="Não há funil de Venda de usados ativo com etapas."
          />
          <OperationSection title="Estoque" description="Situação dos imóveis em venda.">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <FinanceKpiCard
                label="Disponíveis"
                value={resumo.disponiveis}
                tone="emerald"
                icon={Store}
                format="number"
                detail="Prévia"
                href="/imoveis-usados/estoque"
                search={{ status: "disponivel" }}
              />
              <FinanceKpiCard
                label="Reservados"
                value={resumo.reservados}
                tone="orange"
                icon={Building2}
                format="number"
                detail="Prévia"
                href="/imoveis-usados/estoque"
                search={{ status: "reservado" }}
              />
              <FinanceKpiCard
                label="Vendidos"
                value={resumo.vendidos}
                tone="blue"
                icon={Building2}
                format="number"
                detail="Prévia"
                href="/imoveis-usados/estoque"
                search={{ status: "vendido" }}
              />
              <FinanceKpiCard
                label="Interessados"
                value={resumo.interessados}
                tone="violet"
                icon={Users}
                format="number"
                href="/imoveis-usados/interessados"
              />
            </div>
          </OperationSection>
          <OperationSection title="Comercialização" description="Visitas e propostas em andamento.">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <FinanceKpiCard
                label="Visitas agendadas"
                value={resumo.visitasAgendadas}
                tone="teal"
                icon={Calendar}
                format="number"
                detail="Prévia"
                href="/imoveis-usados/visitas"
                search={{ periodo: "hoje" }}
              />
              <FinanceKpiCard
                label="Visitas realizadas"
                value={resumo.visitasRealizadas}
                tone="emerald"
                icon={Calendar}
                format="number"
                detail="Prévia"
                href="/imoveis-usados/visitas"
                search={{ periodo: "realizadas" }}
              />
              <FinanceKpiCard
                label="Propostas recebidas"
                value={resumo.propostasRecebidas}
                tone="blue"
                icon={FileText}
                format="number"
                detail="Prévia"
                href="/imoveis-usados/propostas"
                search={{ fila: "todas" }}
              />
              <FinanceKpiCard
                label="Em negociação"
                value={resumo.propostasEmNegociacao}
                tone="orange"
                icon={FileText}
                format="number"
                detail="Prévia"
                href="/imoveis-usados/propostas"
                search={{ fila: "em_analise" }}
              />
              <FinanceKpiCard
                label="Propostas aceitas"
                value={resumo.propostasAceitas}
                tone="violet"
                icon={FileText}
                format="number"
                detail="Prévia"
                href="/imoveis-usados/propostas"
                search={{ fila: "aceita" }}
              />
            </div>
          </OperationSection>
          <OperationSection title="Fechamento" description="Documentação e contratos.">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <FinanceKpiCard
                label="Fechamentos em andamento"
                value={resumo.fechamentosAndamento}
                tone="orange"
                icon={ClipboardCheck}
                format="number"
              />
              <FinanceKpiCard
                label="Documentação pendente"
                value={resumo.documentacaoPendente}
                tone="orange"
                icon={ClipboardCheck}
                format="number"
              />
              <FinanceKpiCard
                label="Aguardando assinatura"
                value={resumo.contratosAguardandoAssinatura}
                tone="teal"
                icon={FileSignature}
                format="number"
              />
            </div>
          </OperationSection>
          <OperationSection title="Pós-venda e chaves">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <FinanceKpiCard
                label="Pós-vendas em andamento"
                value={resumo.posVendasAndamento}
                tone="blue"
                icon={ClipboardCheck}
                format="number"
              />
              <FinanceKpiCard
                label="Pós-vendas pendentes"
                value={resumo.posVendasPendentes}
                tone="orange"
                icon={ClipboardCheck}
                format="number"
              />
              <FinanceKpiCard
                label="Pendências atrasadas"
                value={resumo.pendenciasAtrasadas}
                tone="red"
                icon={AlertTriangle}
                format="number"
              />
              <FinanceKpiCard
                label="Chaves retiradas"
                value={resumo.chavesRetiradas}
                tone="teal"
                icon={KeyRound}
                format="number"
              />
              <FinanceKpiCard
                label="Chaves perdidas"
                value={resumo.chavesPerdidas}
                tone="orange"
                icon={KeyRound}
                format="number"
              />
            </div>
          </OperationSection>
        </div>
      ) : null}
    </>
  );
}
