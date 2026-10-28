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
      />
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
            size="sm"
            variant={situacao === id ? "default" : "outline"}
            onClick={() => setSituacao(id)}
          >
            {label}
          </Button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <PagePanel>
          <h2 className="mb-3 text-sm font-semibold">Nova implantação</h2>
          <div className="space-y-3">
            <div className="space-y-1">
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
            <div className="space-y-1">
              <Label>Início</Label>
              <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Prazo</Label>
              <Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Justificativa de novo ciclo</Label>
              <Textarea value={justificativa} onChange={(e) => setJustificativa(e.target.value)} />
            </div>
            <Button type="button" disabled={!tenantId || !inicio || !prazo} onClick={() => void criar()}>
              Abrir implantação
            </Button>
          </div>
        </PagePanel>
        <PagePanel>
          {loading ? <p className="text-sm text-muted-foreground">Carregando...</p> : null}
          {!loading && items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma implantação neste recorte.</p>
          ) : (
            <ul className="divide-y">
              {items.map((item) => (
                <li key={item.id}>
                  <button type="button" className="flex w-full items-center justify-between gap-3 py-3 text-left" onClick={() => void abrir(item.id)}>
                    <span>
                      <span className="block text-sm font-medium">{item.tenantNome}</span>
                      <span className="text-xs text-muted-foreground">
                        {STATUS_LABEL[item.status] ?? item.status}
                        {item.atrasado ? " · Atrasada" : ""}
                        {item.responsavelNome ? ` · ${item.responsavelNome}` : ""}
                        {item.contratoCodigo ? ` · ${item.contratoCodigo}` : ""}
                      </span>
                    </span>
                    <span className="text-sm font-semibold">{item.progresso}%</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </PagePanel>
      </div>
      {aberto ? (
        <PagePanel>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">{aberto.tenantNome}</h2>
              <p className="text-xs text-muted-foreground">
                Prazo {new Date(aberto.prazoPrevisto).toLocaleDateString("pt-BR")} · {aberto.progresso}% das etapas obrigatórias
              </p>
            </div>
            <Select value={aberto.status} onValueChange={(value) => void mudarStatus(value)}>
              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABEL).map(([id, label]) => (
                  <SelectItem key={id} value={id}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ul className="divide-y">
            {aberto.etapas.map((etapa) => (
              <li key={etapa.id} className="space-y-2 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm">
                    {etapa.ordem}. {etapa.titulo}
                    {etapa.obrigatoria ? "" : " (opcional)"}
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
                  placeholder="Pendência"
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
            <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
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
