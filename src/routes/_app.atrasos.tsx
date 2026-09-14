import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlarmClockOff,
  CircleCheckBig,
  ListChecks,
  Loader2,
  PauseCircle,
  RefreshCw,
  Search,
  TriangleAlert,
  UserRoundMinus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { CorretoresAtrasosGrid, EquipesReatribuicaoGrid } from "@/components/corretores-atrasos";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import { SemConexao } from "@/components/sem-conexao";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { fetchCorretoresMonitoramento } from "@/lib/leads-api";
import { resumoAtrasos } from "@/lib/lead-monitoramento";
import type {
  CorretorMonitoramento,
  EquipeReatribuicaoResumo,
} from "@/lib/lead-monitoramento";
import { canViewModule } from "@/lib/permissions";
import {
  FILTER_CONTROL,
  FILTER_SEARCH_ICON,
} from "@/lib/filter-bar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/atrasos")({
  head: () => ({ meta: [{ title: "Atrasos — Zone Connection" }] }),
  component: Page,
});

function Page() {
  const user = getSession();
  const canView = canViewModule(user, "atrasos");
  const isGerente = user?.role === "gerente";
  const isPlatformAdmin = user?.role === "super_admin";
  const [rows, setRows] = useState<CorretorMonitoramento[]>([]);
  const [equipes, setEquipes] = useState<EquipeReatribuicaoResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busca, setBusca] = useState("");

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!canView) {
        setLoading(false);
        return;
      }
      if (opts?.silent) setRefreshing(true);
      else setLoading(true);
      try {
        const data = await fetchCorretoresMonitoramento();
        setRows(data.corretores ?? []);
        setEquipes(data.equipes ?? []);
      } catch (err) {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Não foi possível carregar os atrasos.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [canView],
  );

  useEffect(() => {
    void load();
  }, [load]);

  /** A busca acha o corretor pelo nome dele ou pelo nome de um lead atrasado. */
  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return rows;
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(termo) ||
        row.leads.some((lead) => lead.nome.toLowerCase().includes(termo)),
    );
  }, [rows, busca]);

  const equipesFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return equipes;
    return equipes.filter((equipe) =>
      equipe.name.toLowerCase().includes(termo),
    );
  }, [equipes, busca]);

  const resumo = useMemo(() => resumoAtrasos(rows, equipes), [rows, equipes]);
  const corretoresComAtraso = useMemo(
    () => filtrados.filter((row) => row.totalAtrasos > 0).length,
    [filtrados],
  );

  if (!canView) {
    return (
      <div>
        <PageHeader
          title="Atrasos"
          description="Leads parados, fora do prazo ou com tarefa atrasada."
        />
        <SemConexao
          title="Acesso restrito"
          description="Peça ao administrador para liberar o módulo Atrasos nas permissões do seu usuário."
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Atrasos"
        description={
          isGerente
            ? "Leads da sua equipe parados, fora do prazo da etapa ou com tarefa atrasada."
            : isPlatformAdmin
              ? "Empresas paradas, fora do prazo da etapa ou com tarefa atrasada."
            : "Leads parados, fora do prazo da etapa ou com tarefa atrasada, por corretor."
        }
        actions={
          <div className="flex items-end gap-2">
            <div className="relative max-w-xs min-w-50 flex-1">
              <Search className={FILTER_SEARCH_ICON} />
              <Input
                placeholder={
                  isPlatformAdmin
                    ? "Buscar empresa..."
                    : "Buscar corretor ou lead..."
                }
                className={cn("h-9 bg-background pl-9", FILTER_CONTROL)}
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => void load({ silent: true })}
              disabled={refreshing}
            >
              <RefreshCw
                className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
              />
              Atualizar
            </Button>
          </div>
        }
      />

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        <FinanceKpiCard
          label="Leads em atraso"
          value={resumo.leads}
          icon={TriangleAlert}
          tone="rose"
          format="number"
        />
        <FinanceKpiCard
          label="Sem movimentação"
          value={resumo.semMovimentacao}
          icon={PauseCircle}
          tone="orange"
          format="number"
        />
        <FinanceKpiCard
          label="Fora do prazo da etapa"
          value={resumo.foraDoPrazo}
          icon={AlarmClockOff}
          tone="red"
          format="number"
        />
        <FinanceKpiCard
          label="Tarefas atrasadas"
          value={resumo.tarefas}
          icon={ListChecks}
          tone="violet"
          format="number"
        />
        <FinanceKpiCard
          label="Perdidos na reatribuição (corretores)"
          value={resumo.perdidosCorretores}
          icon={UserRoundMinus}
          tone="blue"
          format="number"
        />
        <FinanceKpiCard
          label="Perdidos na reatribuição (equipes)"
          value={resumo.perdidosEquipes}
          icon={Users}
          tone="teal"
          format="number"
        />
      </section>

      <p className="mt-3 text-xs text-muted-foreground">
        {isPlatformAdmin
          ? "Clique na empresa para abrir o funil."
          : `${corretoresComAtraso} corretor${corretoresComAtraso === 1 ? "" : "es"} com pendências · clique no lead para abrir o funil.`}
      </p>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando atrasos…
        </div>
      ) : rows.length === 0 && equipes.length === 0 ? (
        <Card className="mt-4 flex flex-col items-center gap-2 px-6 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CircleCheckBig className="h-6 w-6" />
          </span>
          <p className="text-sm font-semibold">Nenhum atraso no momento</p>
          <p className="max-w-md text-xs text-muted-foreground">
            Todos os leads estão dentro do prazo da etapa, com movimentação
            recente e sem tarefa vencida.
          </p>
        </Card>
      ) : filtrados.length === 0 && equipesFiltradas.length === 0 ? (
        <Card className="mt-4 px-6 py-12 text-center text-sm text-muted-foreground">
          Nenhum corretor, equipe ou lead encontrado para “{busca.trim()}”.
        </Card>
      ) : (
        <>
          {filtrados.length > 0 ? (
            <CorretoresAtrasosGrid
              rows={filtrados}
              leadsVisiveis={5}
              className="mt-4 mb-6 xl:grid-cols-2 2xl:grid-cols-3"
            />
          ) : null}
          {equipesFiltradas.length > 0 ? (
            <section className="mb-6">
              <h2 className="mb-2 text-sm font-semibold">
                Equipes — leads perdidos na reatribuição
              </h2>
              <EquipesReatribuicaoGrid equipes={equipesFiltradas} />
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
