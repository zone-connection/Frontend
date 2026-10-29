import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { PagePanel } from "@/components/page-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
          <div className="flex flex-wrap gap-1.5">
            {[
              ["abertas", "Em andamento"],
              ["atrasadas", "Atrasadas"],
              ["concluidas", "Concluídas"],
              ["todas", "Todas"],
            ].map(([id, label]) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={situacao === id ? "default" : "outline"}
                onClick={() => setSituacao(id)}
              >
                {label}
              </Button>
            ))}
          </div>
        }
      />
      <PagePanel title="Nova implantação" description="Escolha a imobiliária e o prazo. A justificativa só entra num novo ciclo.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_10rem_10rem_auto]">
          <div className="space-y-1.5">
            <Label>Imobiliária</Label>
            <Select value={tenantId} onValueChange={setTenantId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {tenants.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>{tenant.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Início</Label>
            <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Prazo</Label>
            <Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button type="button" className="w-full xl:w-auto" disabled={!tenantId || !inicio || !prazo} onClick={() => void criar()}>
              Abrir implantação
            </Button>
          </div>
          <div className="space-y-1.5 md:col-span-2 xl:col-span-4">
            <Label>Justificativa de novo ciclo</Label>
            <Textarea rows={2} value={justificativa} onChange={(e) => setJustificativa(e.target.value)} placeholder="Opcional, se esta imobiliária já teve uma implantação" />
          </div>
        </div>
      </PagePanel>
      <PagePanel title="Implantações" description={loading ? "Carregando..." : `${items.length} neste recorte`}>
        {!loading && items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma implantação neste recorte.</p>
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="w-full rounded-xl border border-black/5 bg-muted/30 px-3 py-3 text-left transition-colors hover:bg-muted/60"
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
                    <span className="text-sm font-semibold tabular-nums text-[#0678a8]">{item.progresso}%</span>
                  </span>
                  <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white">
                    <span className="block h-full rounded-full bg-[#079ED4]" style={{ width: `${item.progresso}%` }} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PagePanel>
      {aberto ? (
        <PagePanel
          title={aberto.tenantNome}
          description={`Prazo ${new Date(aberto.prazoPrevisto).toLocaleDateString("pt-BR")} · ${aberto.progresso}% das etapas obrigatórias`}
          action={
            <Select value={aberto.status} onValueChange={(value) => void mudarStatus(value)}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABEL).map(([id, label]) => (
                  <SelectItem key={id} value={id}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        >
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-[#079ED4]" style={{ width: `${aberto.progresso}%` }} />
          </div>
          <ul className="grid gap-2">
            {aberto.etapas.map((etapa) => (
              <li key={etapa.id} className="rounded-xl border border-black/5 px-3 py-3">
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
                  className="mt-2"
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
        </PagePanel>
      ) : null}
    </div>
  );
}
