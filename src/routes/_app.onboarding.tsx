import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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

const STATUS_DOT: Record<string, string> = {
  nao_iniciado: "bg-[#ADB5BD]",
  em_andamento: "bg-[#3B82F6]",
  aguardando_cliente: "bg-[#F59F00]",
  aguardando_equipe: "bg-[#F59F00]",
  concluido: "bg-[#12B886]",
  cancelado: "bg-[#ADB5BD]",
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
  const [criando, setCriando] = useState(false);

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
      setCriando(false);
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
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[13px]">
            <thead className="bg-[#F8F9FA] text-[12px] text-[#868E96]">
              <tr>
                <th className="px-4 py-3 font-medium">Imobiliária</th>
                <th className="px-3 py-3 font-medium">Progresso</th>
                <th className="px-3 py-3 font-medium">Responsável</th>
                <th className="px-3 py-3 font-medium">Prazo</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {!loading && items.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-14 text-center text-[#868E96]">Nenhuma implantação neste recorte.</td></tr>
              ) : items.map((item) => (
                <tr key={item.id} className={cn("border-t border-[#F1F3F5]", aberto?.id === item.id && "bg-[#F4FBF8]")}>
                  <td className="px-4 py-3.5 font-medium text-[#1A1D23] dark:text-[#f8fafc]">
                    <span className="block max-w-[240px] truncate">{item.tenantNome}</span>
                    <span className="block text-[12px] font-normal text-[#868E96]">{item.tenantPlano}{item.contratoCodigo ? ` · ${item.contratoCodigo}` : ""}</span>
                  </td>
                  <td className="px-3 py-3.5">
                    <span className="mb-1 block text-[12px] font-medium tabular-nums text-[#495057]">{item.progresso}%</span>
                    <span className="block h-1.5 w-24 overflow-hidden rounded-full bg-[#E9ECEF]">
                      <span className="block h-full rounded-full bg-[#12B886]" style={{ width: `${item.progresso}%` }} />
                    </span>
                  </td>
                  <td className="px-3 py-3.5 text-[#495057]">{item.responsavelNome ?? "—"}</td>
                  <td className="px-3 py-3.5 text-[#495057]">{new Date(item.prazoPrevisto).toLocaleDateString("pt-BR")}</td>
                  <td className="px-3 py-3.5">
                    <span className="inline-flex items-center gap-1.5 text-[13px] text-[#495057]">
                      <span className={cn("size-1.5 rounded-full", item.atrasado ? "bg-[#E03131]" : STATUS_DOT[item.status] ?? "bg-[#ADB5BD]")} />
                      {item.atrasado ? "Atrasada" : STATUS_LABEL[item.status] ?? item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <Button type="button" variant="outline" className="h-8 rounded-lg border-[#DEE2E6] px-3 text-[12px]" onClick={() => void abrir(item.id)}>Abrir</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-[#F1F3F5] px-4 py-3 text-[12px] text-[#868E96]">{loading ? "Carregando..." : `${items.length} implantação(ões)`}</p>
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
