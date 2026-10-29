import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, UserRound } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import {
  CENTRAL_AREA,
  CENTRAL_FIELD,
  CentralCard,
  CentralLabel,
} from "@/components/central-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import {
  createOnboarding,
  fetchOnboarding,
  fetchOnboardings,
  updateOnboarding,
  updateOnboardingEtapa,
  type OnboardingDetalhe,
  type OnboardingItem,
} from "@/lib/onboarding-api";
import { fetchTenants, type Tenant } from "@/lib/tenants-api";
import { isMockId, MOCK_ONBOARDINGS, onboardingsMock } from "@/lib/centrais-mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/onboarding")({
  head: () => ({ meta: [{ title: "Implantação — Zone Connection" }] }),
  component: OnboardingPage,
});

const STATUS_LABEL: Record<string, string> = {
  nao_iniciado: "Não iniciado",
  em_andamento: "Em andamento",
  aguardando_cliente: "Aguardando cliente",
  aguardando_equipe: "Aguardando equipe",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const SITUACOES: Array<[string, string]> = [
  ["abertas", "Em andamento"],
  ["atrasadas", "Atrasadas"],
  ["concluidas", "Concluídas"],
  ["todas", "Todas"],
];

const COLUNAS = [
  { id: "contrato", titulo: "Contrato", ate: 2 },
  { id: "acessos", titulo: "Acessos", ate: 3 },
  { id: "configuracao", titulo: "Configuração", ate: 5 },
  { id: "treinamento", titulo: "Treinamento", ate: 8 },
] as const;

function colunaId(item: OnboardingItem) {
  if (item.status === "concluido" || item.progresso >= 100) return "treinamento";
  const atual = item.etapas.find((etapa) => etapa.obrigatoria && etapa.status !== "concluida");
  const ordem = atual?.ordem ?? 1;
  return COLUNAS.find((coluna) => ordem <= coluna.ate)?.id ?? "treinamento";
}

function diasEmAndamento(inicio: string) {
  const dias = Math.max(0, Math.round((Date.now() - new Date(inicio).getTime()) / 86_400_000));
  return `${dias}d em andamento`;
}

function OnboardingPage() {
  const [situacao, setSituacao] = useState("abertas");
  const [items, setItems] = useState<OnboardingItem[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [aberto, setAberto] = useState<OnboardingDetalhe | null>(null);
  const [tenantId, setTenantId] = useState("");
  const [inicio, setInicio] = useState("");
  const [prazo, setPrazo] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [loading, setLoading] = useState(true);
  const [criando, setCriando] = useState(false);
  const [exemplo, setExemplo] = useState(false);

  async function load(next = situacao) {
    setLoading(true);
    try {
      const rows = await fetchOnboardings(next);
      setExemplo(rows.length === 0);
      setItems(rows.length ? rows : onboardingsMock(next));
    } catch {
      setExemplo(true);
      setItems(onboardingsMock(next));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(situacao);
    void fetchTenants().then(setTenants).catch(() => setTenants([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [situacao]);

  async function abrir(id: string) {
    if (isMockId(id)) {
      setAberto(MOCK_ONBOARDINGS.find((item) => item.id === id) ?? null);
      return;
    }
    try {
      setAberto(await fetchOnboarding(id));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível abrir a implantação.");
    }
  }

  async function criar() {
    try {
      const created = await createOnboarding({
        tenantId,
        inicio,
        prazoPrevisto: prazo,
        justificativa: justificativa.trim() || undefined,
      });
      toast.success("Implantação aberta.");
      setTenantId("");
      setJustificativa("");
      setCriando(false);
      await load();
      await abrir(created.id);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível abrir a implantação.");
    }
  }

  async function mudarStatus(status: string) {
    if (!aberto) return;
    if (isMockId(aberto.id)) {
      toast.message("Exemplo visual. A implantação não é gravada.");
      return;
    }
    try {
      await updateOnboarding(aberto.id, { status });
      await abrir(aberto.id);
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível atualizar o status.");
    }
  }

  async function concluirEtapa(etapaId: string, feita: boolean) {
    if (!aberto) return;
    if (isMockId(aberto.id)) {
      toast.message("Exemplo visual. A implantação não é gravada.");
      return;
    }
    try {
      setAberto(
        await updateOnboardingEtapa(aberto.id, etapaId, {
          status: feita ? "concluida" : "pendente",
        }),
      );
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível atualizar a etapa.");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Implantação"
        description="Acompanhe a entrada de cada imobiliária, do contrato até o treinamento."
      />
      <section className="overflow-hidden rounded-2xl border border-[#E9ECEF] bg-white dark:border-white/10 dark:bg-card">
        <div className="flex gap-1 overflow-x-auto border-b border-[#F1F3F5] px-4 pt-3">
          {SITUACOES.map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={cn(
                "mb-[-1px] flex shrink-0 items-center gap-2 border-b-2 px-3 pb-3 text-[13px]",
                situacao === id ? "border-[#12B886] font-semibold text-[#1A1D23]" : "border-transparent text-[#868E96] hover:text-[#1A1D23]",
              )}
              onClick={() => setSituacao(id)}
            >
              {label}
              {situacao === id ? (
                <span className="rounded-full bg-[#12B886] px-1.5 text-[11px] font-semibold text-white">{loading ? "…" : items.length}</span>
              ) : null}
            </button>
          ))}
        </div>
        <div className="flex justify-end px-4 py-3">
          <Button type="button" className="h-9 rounded-lg border-0 bg-[#12B886] px-3 text-white hover:bg-[#0CA678]" onClick={() => setCriando((v) => !v)}>
            <Plus className="size-3.5" /> Nova implantação
          </Button>
        </div>
        {criando ? (
          <div className="grid gap-4 border-t border-[#F1F3F5] bg-[#F8F9FA] px-4 py-4 md:grid-cols-2">
            <div>
              <CentralLabel>Imobiliária</CentralLabel>
              <Select value={tenantId} onValueChange={setTenantId}>
                <SelectTrigger className={CENTRAL_FIELD}><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>{tenant.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <CentralLabel>Início</CentralLabel>
              <Input className={CENTRAL_FIELD} type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </div>
            <div>
              <CentralLabel>Prazo</CentralLabel>
              <Input className={CENTRAL_FIELD} type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <CentralLabel>Justificativa de novo ciclo</CentralLabel>
              <Textarea className={CENTRAL_AREA} rows={2} value={justificativa} onChange={(e) => setJustificativa(e.target.value)} placeholder="Opcional, se esta imobiliária já teve uma implantação" />
            </div>
            <div>
              <Button type="button" className="h-9 rounded-lg border-0 bg-[#12B886] text-white hover:bg-[#0CA678]" disabled={!tenantId || !inicio || !prazo} onClick={() => void criar()}>
                Abrir implantação
              </Button>
            </div>
          </div>
        ) : null}
        <div className="grid gap-4 overflow-x-auto p-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUNAS.map((coluna) => {
            const cards = items.filter((item) => colunaId(item) === coluna.id);
            return (
              <div key={coluna.id} className="min-w-[220px]">
                <h3 className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-[#1A1D23] dark:text-[#f8fafc]">
                  {coluna.titulo}
                  <span className="font-medium text-[#868E96]">{cards.length}</span>
                </h3>
                <div className="space-y-3">
                  {cards.map((item) => (
                    <article key={item.id} className="rounded-xl border border-[#E6E8EC] bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-white/10 dark:bg-card">
                      <p className="flex items-center gap-2 text-[13px] font-semibold text-[#1A1D23] dark:text-[#f8fafc]">
                        <span className={cn("size-2 shrink-0 rounded-full", item.atrasado ? "bg-[#E03131]" : item.progresso >= 100 ? "bg-[#12B886]" : "bg-[#F59F00]")} />
                        <span className="truncate">{item.tenantNome}</span>
                      </p>
                      <p className="mt-2 flex items-center gap-1.5 text-[12px] text-[#868E96]">
                        <UserRound className="size-3.5" />
                        {item.responsavelNome ?? "Sem responsável"}
                      </p>
                      <p className="mt-1 text-[12px] text-[#868E96]">{diasEmAndamento(item.inicio)}</p>
                      <Button type="button" variant="outline" className="mt-3 h-8 w-full rounded-lg border-[#E6E8EC] text-[12px]" onClick={() => void abrir(item.id)}>
                        Ver fluxo
                      </Button>
                    </article>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {!loading && items.length === 0 ? (
          <p className="px-4 pb-8 text-center text-sm text-[#868E96]">Nenhuma implantação neste recorte.</p>
        ) : null}
        <p className="border-t border-[#F1F3F5] px-4 py-3 text-[12px] text-[#868E96]">{loading ? "Carregando..." : `${items.length} implantação(ões)${exemplo ? " · exemplos de visualização" : ""}`}</p>
      </section>
      {aberto ? (
        <CentralCard
          title={aberto.tenantNome}
          description={`Prazo ${new Date(aberto.prazoPrevisto).toLocaleDateString("pt-BR")} · ${aberto.progresso}% das etapas obrigatórias`}
          action={
            <Select value={aberto.status} onValueChange={(value) => void mudarStatus(value)}>
              <SelectTrigger className={cn(CENTRAL_FIELD, "w-52")}><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABEL).map(([id, label]) => (
                  <SelectItem key={id} value={id}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        >
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-[#E7F4FA] dark:bg-white/10">
            <div className="h-full rounded-full bg-[#079ED4]" style={{ width: `${aberto.progresso}%` }} />
          </div>
          <ul className="grid gap-2">
            {aberto.etapas.map((etapa) => (
              <li key={etapa.id} className="rounded-[22px] border border-[#DCE5EC] bg-white px-4 py-4 dark:border-white/10 dark:bg-transparent">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">
                    {etapa.ordem}. {etapa.titulo}
                    {etapa.obrigatoria ? "" : " · opcional"}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant={etapa.status === "concluida" ? "default" : "outline"}
                    onClick={() => void concluirEtapa(etapa.id, etapa.status !== "concluida")}
                  >
                    {etapa.status === "concluida" ? "Concluída" : "Concluir"}
                  </Button>
                </div>
                <Input
                  className={cn(CENTRAL_FIELD, "mt-3")}
                  placeholder="Pendência desta etapa"
                  defaultValue={etapa.pendencia}
                  onBlur={(event) => {
                    if (event.target.value === etapa.pendencia) return;
                    void updateOnboardingEtapa(aberto.id, etapa.id, {
                      pendencia: event.target.value,
                    }).then(setAberto).catch((error: unknown) => {
                      toast.error(error instanceof ApiError ? error.message : "Não foi possível salvar a pendência.");
                    });
                  }}
                />
              </li>
            ))}
          </ul>
          {aberto.historico?.length ? (
            <ul className="mt-4 space-y-1 border-t pt-3 text-xs text-muted-foreground">
              {aberto.historico.map((evento) => (
                <li key={evento.id}>{evento.autor?.name ?? "Sistema"} · {evento.detalhe}</li>
              ))}
            </ul>
          ) : null}
        </CentralCard>
      ) : null}
    </div>
  );
}
