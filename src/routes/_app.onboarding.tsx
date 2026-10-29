import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import {
  CENTRAL_AREA,
  CENTRAL_BTN,
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

  async function load(next = situacao) {
    setLoading(true);
    try {
      setItems(await fetchOnboardings(next));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível listar as implantações.");
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
      await load();
      await abrir(created.id);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível abrir a implantação.");
    }
  }

  async function mudarStatus(status: string) {
    if (!aberto) return;
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
        actions={
          <div className="flex flex-wrap gap-2">
            {[
              ["abertas", "Em andamento"],
              ["atrasadas", "Atrasadas"],
              ["concluidas", "Concluídas"],
              ["todas", "Todas"],
            ].map(([id, label]) => (
              <Button
                key={id}
                type="button"
                variant="outline"
                className={cn(
                  "h-11 rounded-[16px] px-4",
                  situacao === id
                    ? "border-[#008FD0] bg-[#008FD0] text-white hover:bg-[#008FD0] hover:text-white"
                    : "border-[#DCE5EC] bg-white text-[#153047] hover:bg-[#F6F8FA]",
                )}
                onClick={() => setSituacao(id)}
              >
                {label}
              </Button>
            ))}
          </div>
        }
      />
      <CentralCard title="Nova implantação" description="Escolha a imobiliária e o prazo. A justificativa só entra num novo ciclo.">
        <div className="grid gap-5 md:grid-cols-2">
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
          <div className="space-y-1.5">
            <CentralLabel>Início</CentralLabel>
            <Input className={CENTRAL_FIELD} type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <CentralLabel>Prazo</CentralLabel>
            <Input className={CENTRAL_FIELD} type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button type="button" className={cn(CENTRAL_BTN, "w-full")} disabled={!tenantId || !inicio || !prazo} onClick={() => void criar()}>
              Abrir implantação
            </Button>
          </div>
          <div className="md:col-span-2">
            <CentralLabel>Justificativa de novo ciclo</CentralLabel>
            <Textarea className={CENTRAL_AREA} rows={2} value={justificativa} onChange={(e) => setJustificativa(e.target.value)} placeholder="Opcional, se esta imobiliária já teve uma implantação" />
          </div>
        </div>
      </CentralCard>
      <CentralCard title="Implantações" description={loading ? "Carregando..." : `${items.length} neste recorte`}>
        {!loading && items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma implantação neste recorte.</p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="w-full rounded-[22px] border border-[#DCE5EC] bg-[#F6F8FA] px-5 py-4 text-left transition-colors hover:border-[#79CCE7] dark:border-white/10 dark:bg-white/5"
                  onClick={() => void abrir(item.id)}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{item.tenantNome}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {STATUS_LABEL[item.status] ?? item.status}
                        {item.atrasado ? " · Atrasada" : ""}
                        {item.responsavelNome ? ` · ${item.responsavelNome}` : ""}
                      </span>
                    </span>
                    <span className="rounded-full bg-[#E7F4FA] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[#05749E] dark:bg-[#079ED4]/15 dark:text-[#7DD3FC]">{item.progresso}%</span>
                  </span>
                  <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-[#E7F4FA] dark:bg-white/10">
                    <span className="block h-full rounded-full bg-[#079ED4]" style={{ width: `${item.progresso}%` }} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CentralCard>
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
