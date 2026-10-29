import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { ClipboardList, Clock, MapPin, Phone, Plus } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import {
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
} from "@/components/form-dialog";
import { FunilColumnShell } from "@/components/funil-column-shell";
import { Card } from "@/components/ui/card";
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
import { fetchTenants, updateTenant, type Tenant } from "@/lib/tenants-api";
import { PLANO_LABELS, type TenantPlano } from "@/lib/tenant-modules";
import { isMockId, MOCK_ONBOARDINGS, onboardingsMock } from "@/lib/centrais-mock";
import { nextCatalogColor } from "@/lib/catalog-colors";
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

const COLUNAS = [
  { id: "contrato", titulo: "Contrato", ate: 2, color: nextCatalogColor(0) },
  { id: "acessos", titulo: "Acessos", ate: 3, color: nextCatalogColor(1) },
  { id: "configuracao", titulo: "Configuração", ate: 5, color: nextCatalogColor(2) },
  { id: "treinamento", titulo: "Treinamento", ate: 8, color: nextCatalogColor(3) },
  { id: "implantada", titulo: "Implantada", ate: 8, color: nextCatalogColor(14) },
] as const;

const PERCENTUAL_COR: Record<(typeof COLUNAS)[number]["id"], string> = {
  contrato: "text-slate-600",
  acessos: "text-blue-600",
  configuracao: "text-indigo-600",
  treinamento: "text-violet-600",
  implantada: "text-green-600",
};

const PLANO_COR: Record<string, string> = {
  solo: "bg-sky-100 text-sky-800",
  bronze: "bg-amber-100 text-amber-900",
  prata: "bg-slate-200 text-slate-700",
  ouro: "bg-yellow-200 text-yellow-900",
};

function colunaId(item: OnboardingItem) {
  if (item.status === "concluido" || item.progresso >= 100) return "implantada";
  const atual = item.etapas.find((etapa) => etapa.obrigatoria && etapa.status !== "concluida");
  const ordem = atual?.ordem ?? 1;
  return COLUNAS.find((coluna) => ordem <= coluna.ate)?.id ?? "treinamento";
}

function diasEmAndamento(inicio: string) {
  const dias = Math.max(0, Math.round((Date.now() - new Date(inicio).getTime()) / 86_400_000));
  return `${dias}d em andamento`;
}

function OnboardingPage() {
  const [items, setItems] = useState<OnboardingItem[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [aberto, setAberto] = useState<OnboardingDetalhe | null>(null);
  const [tenantId, setTenantId] = useState("");
  const [plano, setPlano] = useState<TenantPlano>("bronze");
  const [inicio, setInicio] = useState("");
  const [prazo, setPrazo] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [loading, setLoading] = useState(true);
  const [criando, setCriando] = useState(false);
  const [exemplo, setExemplo] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const rows = await fetchOnboardings("todas");
      setExemplo(rows.length === 0);
      setItems(rows.length ? rows : onboardingsMock("todas"));
    } catch {
      setExemplo(true);
      setItems(onboardingsMock("todas"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    void fetchTenants().then(setTenants).catch(() => setTenants([]));
  }, []);

  async function mover(id: string, destino: (typeof COLUNAS)[number]["id"]) {
    const item = items.find((row) => row.id === id);
    if (!item || colunaId(item) === destino) return;
    const indice = COLUNAS.findIndex((coluna) => coluna.id === destino);
    const feitasAte = indice <= 0 ? 0 : COLUNAS[indice - 1].ate;
    if (isMockId(id)) {
      setItems((prev) => prev.map((row) => {
        if (row.id !== id) return row;
        const etapas = row.etapas.map((etapa) => ({
          ...etapa,
          status: (etapa.ordem <= feitasAte ? "concluida" : "pendente") as "concluida" | "pendente",
        }));
        const obrigatorias = etapas.filter((etapa) => etapa.obrigatoria);
        const feitas = obrigatorias.filter((etapa) => etapa.status === "concluida").length;
        const progresso = destino === "implantada" || obrigatorias.length === 0
          ? 100
          : Math.round((feitas / obrigatorias.length) * 100);
        return {
          ...row,
          etapas,
          progresso,
          status: destino === "implantada" ? "concluido" : feitasAte === 0 ? "nao_iniciado" : "em_andamento",
        };
      }));
      return;
    }
    try {
      if (destino !== "implantada" && item.status === "concluido") {
        await updateOnboarding(id, { status: "em_andamento" });
      }
      for (const etapa of item.etapas) {
        const status = etapa.ordem <= feitasAte ? "concluida" : "pendente";
        if (etapa.status !== status) {
          await updateOnboardingEtapa(id, etapa.id, { status });
        }
      }
      if (destino === "implantada") {
        await updateOnboarding(id, { status: "concluido" });
      }
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível mover a implantação.");
    }
  }

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
      const cliente = tenants.find((item) => item.id === tenantId);
      if (cliente && cliente.plano !== plano) {
        await updateTenant(tenantId, { plano });
      }
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
      <section className="space-y-3">
        <div className="flex justify-end">
          <Button type="button" className="h-9 shrink-0" onClick={() => setCriando(true)}>
            <Plus className="size-3.5" /> Nova implantação
          </Button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-4">
          {COLUNAS.map((coluna) => {
            const cards = items.filter((item) => colunaId(item) === coluna.id);
            return (
              <FunilColumnShell
                key={coluna.id}
                title={coluna.titulo}
                count={cards.length}
                color={coluna.color}
                data-funnel-stage={coluna.id}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const id = event.dataTransfer.getData("text/plain");
                  if (id) void mover(id, coluna.id);
                }}
              >
                {cards.map((item) => (
                  <Card
                    key={item.id}
                    className="cursor-grab rounded-xl border-black/5 p-3 shadow-sm transition-[box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData("text/plain", item.id);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    onClick={() => void abrir(item.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="table-person-name min-w-0 flex-1 break-words text-sm leading-snug">{item.tenantNome}</p>
                      <span className={cn("mt-1 size-1.5 shrink-0 rounded-full", item.atrasado ? "bg-destructive" : item.progresso >= 100 ? "bg-[#12B886]" : "bg-warning")} />
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-semibold capitalize", PLANO_COR[item.tenantPlano] ?? "bg-muted text-muted-foreground")}>
                        {item.tenantPlano}
                      </span>
                      <span className={cn("text-sm font-semibold", PERCENTUAL_COR[coluna.id])}>
                        {coluna.id === "implantada" ? 100 : item.progresso}%
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="size-3.5 shrink-0" />
                      <span className="truncate">{item.tenantTelefone || item.tenantEmail || "Sem contato"}</span>
                    </div>
                    <div className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="mt-0.5 size-3.5 shrink-0" />
                      <span className="line-clamp-2">{item.tenantEndereco || "Sem endereço"}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t pt-2 text-[11px] text-muted-foreground">
                      <span className="truncate">{item.responsavelNome ?? "Sem responsável"}</span>
                      <span className="flex shrink-0 items-center gap-1">
                        <Clock className="size-3" />
                        {diasEmAndamento(item.inicio)}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="mt-2 flex h-7 w-full items-center justify-center rounded-md border border-border/70 bg-muted/30 px-1.5 text-[11px] font-medium hover:border-primary/30 hover:bg-muted/60"
                      onClick={(event) => {
                        event.stopPropagation();
                        void abrir(item.id);
                      }}
                    >
                      Ver fluxo
                    </button>
                  </Card>
                ))}
              </FunilColumnShell>
            );
          })}
        </div>
        {!loading && items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma implantação neste recorte.</p>
        ) : null}
        <p className="text-[12px] text-muted-foreground">{loading ? "Carregando..." : `${items.length} implantação(ões)${exemplo ? " · exemplos de visualização" : ""}`}</p>
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
      <FormDialogShell
        open={criando}
        onOpenChange={setCriando}
        icon={<ClipboardList className="size-5" />}
        title="Nova implantação"
        description="Escolha o cliente da plataforma, o plano e o prazo."
        footer={
          <FormDialogActions>
            <Button type="button" variant="outline" onClick={() => setCriando(false)}>Cancelar</Button>
            <Button type="button" disabled={!tenantId || !inicio || !prazo} onClick={() => void criar()}>
              Abrir implantação
            </Button>
          </FormDialogActions>
        }
      >
        <FormDialogBody>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <CentralLabel>Cliente</CentralLabel>
              <Select
                value={tenantId}
                onValueChange={(value) => {
                  setTenantId(value);
                  const cliente = tenants.find((item) => item.id === value);
                  if (cliente) setPlano(cliente.plano);
                }}
              >
                <SelectTrigger className={CENTRAL_FIELD}><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {tenants.filter((item) => !item.isTest).map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <CentralLabel>Plano</CentralLabel>
              <Select value={plano} onValueChange={(value) => setPlano(value as TenantPlano)}>
                <SelectTrigger className={CENTRAL_FIELD}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PLANO_LABELS) as TenantPlano[]).map((id) => (
                    <SelectItem key={id} value={id}>{PLANO_LABELS[id]}</SelectItem>
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
              <Textarea className={CENTRAL_AREA} rows={2} value={justificativa} onChange={(e) => setJustificativa(e.target.value)} placeholder="Opcional, se este cliente já teve uma implantação" />
            </div>
          </div>
        </FormDialogBody>
      </FormDialogShell>
    </div>
  );
}
