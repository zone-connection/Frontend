import { useEffect, useState } from "react";
import {
  CalendarClock,
  ClipboardList,
  Eye,
  Loader2,
  Plus,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TimePicker } from "@/components/time-picker";
import {
  DetailField,
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
  FormSection,
} from "@/components/form-dialog";
import {
  HistoryTimeline,
  MAX_TRIAGEM_TEXTO,
  formatTriagemWhen,
  useTriagemHistory,
} from "@/components/triagem-history-timeline";
import { ApiError } from "@/lib/api";
import { createAgendamento, type AgendamentoTipo } from "@/lib/agenda-api";
import { AgendamentoTipoOption } from "@/components/agenda-tipo-option";
import { getSession } from "@/lib/auth";
import { brl, prioridadeBadgeClass, type Lead } from "@/lib/crm-types";
import { displayEmail } from "@/lib/email";
import { createTriagemEvent } from "@/lib/triagem-api";
import { prependTriagemHistoryCached } from "@/lib/triagem-history-cache";
import { useTenantTheme } from "@/lib/tenant-theme";

const ACTIVITY_TIPOS = [
  "ligacao",
  "visita",
  "reuniao",
  "tarefa",
  "outro",
] as const satisfies readonly AgendamentoTipo[];

type ActivityTipo = (typeof ACTIVITY_TIPOS)[number];
type ComposeTab = "relato" | "atividade";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function roundNextHalfHour(from = new Date()) {
  const d = new Date(from);
  d.setSeconds(0, 0);
  const minutes = d.getMinutes();
  const add =
    minutes === 0 || minutes === 30
      ? 30
      : minutes < 30
        ? 30 - minutes
        : 60 - minutes;
  d.setMinutes(d.getMinutes() + add);
  return d;
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function hm(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toLocalIso(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, 0, 0).toISOString();
}

function activityTitle(tipo: ActivityTipo, nome: string) {
  if (tipo === "ligacao") return `Ligação ${nome}`;
  if (tipo === "visita") return `Visita ${nome}`;
  if (tipo === "reuniao") return `Reunião ${nome}`;
  if (tipo === "tarefa") return `Follow-up ${nome}`;
  return `Atividade ${nome}`;
}

function defaultActivitySchedule() {
  const start = roundNextHalfHour();
  const end = new Date(start.getTime() + 30 * 60_000);
  return { data: ymd(start), inicio: hm(start), fim: hm(end) };
}

export function TriagemFunilDialog({
  lead,
  open,
  onOpenChange,
  stageName,
  canWrite,
  onOpenDetails,
  onLeadTouched,
}: {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stageName: (slug: string | null) => string;
  canWrite: boolean;
  onOpenDetails: () => void;
  onLeadTouched?: () => void;
}) {
  const { isModuleEnabled } = useTenantTheme();
  const canAgenda = isModuleEnabled("agenda");
  const { events, setEvents, loading } = useTriagemHistory(
    open && lead ? lead.id : null,
  );
  const [composeTab, setComposeTab] = useState<ComposeTab>("relato");
  const [quickTexto, setQuickTexto] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);
  const [atividadeTipo, setAtividadeTipo] = useState<ActivityTipo>("ligacao");
  const [atividadeTitulo, setAtividadeTitulo] = useState("");
  const [atividadeData, setAtividadeData] = useState("");
  const [atividadeInicio, setAtividadeInicio] = useState("09:00");
  const [atividadeFim, setAtividadeFim] = useState("09:30");
  const [atividadeSaving, setAtividadeSaving] = useState(false);

  const latest = events[0] ?? null;
  const lastTriagemAt =
    lead?.monitoramento?.lastTriagemAt ?? latest?.createdAt ?? null;

  useEffect(() => {
    if (!open || !lead) return;
    const schedule = defaultActivitySchedule();
    setComposeTab("relato");
    setQuickTexto("");
    setAtividadeTipo("ligacao");
    setAtividadeTitulo(activityTitle("ligacao", lead.nome));
    setAtividadeData(schedule.data);
    setAtividadeInicio(schedule.inicio);
    setAtividadeFim(schedule.fim);
    setAtividadeSaving(false);
    setQuickSaving(false);
  }, [open, lead?.id]);

  function changeAtividadeTipo(tipo: ActivityTipo) {
    setAtividadeTipo(tipo);
    if (!lead) return;
    const defaults = ACTIVITY_TIPOS.map((t) => activityTitle(t, lead.nome));
    if (!atividadeTitulo.trim() || defaults.includes(atividadeTitulo)) {
      setAtividadeTitulo(activityTitle(tipo, lead.nome));
    }
  }

  async function submitQuickRelato() {
    if (!lead || !canWrite) return;
    const texto = quickTexto.trim();
    if (!texto) {
      toast.error("Escreva o relato da triagem.");
      return;
    }
    if (texto.length > MAX_TRIAGEM_TEXTO) {
      toast.error(
        `O relato deve ter no máximo ${MAX_TRIAGEM_TEXTO} caracteres.`,
      );
      return;
    }

    setQuickSaving(true);
    try {
      const created = await createTriagemEvent({
        leadId: lead.id,
        texto,
        origem: "manual",
      });
      prependTriagemHistoryCached(lead.id, created);
      setEvents((prev) => {
        const ids = new Set(created.map((e) => e.id));
        return [...created, ...prev.filter((e) => !ids.has(e.id))];
      });
      setQuickTexto("");
      toast.success("Relato registrado. A etapa do funil foi mantida.");
      onLeadTouched?.();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar o relato.",
      );
    } finally {
      setQuickSaving(false);
    }
  }

  async function submitAtividade() {
    if (!lead || !canWrite || !canAgenda) return;
    const nome = atividadeTitulo.trim();
    if (nome.length < 2) {
      toast.error("Informe o título da atividade.");
      return;
    }
    if (!atividadeData) {
      toast.error("Informe a data.");
      return;
    }
    const startsAt = toLocalIso(atividadeData, atividadeInicio);
    const endsAt = toLocalIso(atividadeData, atividadeFim);
    if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      toast.error("O horário de término deve ser depois do início.");
      return;
    }

    setAtividadeSaving(true);
    try {
      await createAgendamento({
        leadId: lead.id,
        titulo: nome,
        tipo: atividadeTipo,
        escopo: "pessoal",
        startsAt,
        endsAt,
        funilStage: lead.stage,
        observacoes: `Triagem · etapa ${stageName(lead.stage)}.`,
      });
      toast.success(
        atividadeTipo === "tarefa"
          ? "Tarefa criada na agenda."
          : "Atividade agendada.",
      );
      const schedule = defaultActivitySchedule();
      setAtividadeTitulo(activityTitle(atividadeTipo, lead.nome));
      setAtividadeData(schedule.data);
      setAtividadeInicio(schedule.inicio);
      setAtividadeFim(schedule.fim);
      onLeadTouched?.();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível agendar a atividade.",
      );
    } finally {
      setAtividadeSaving(false);
    }
  }

  const saving = quickSaving || atividadeSaving;

  return (
    <FormDialogShell
      open={open}
      onOpenChange={(next) => {
        if (!next) setQuickTexto("");
        onOpenChange(next);
      }}
      icon={<ClipboardList className="w-5 h-5" />}
      title={lead ? `Triagem · ${lead.nome}` : "Triagem"}
      description={
        lead
          ? `${lead.tipo === "cliente" ? "Cliente" : "Lead"} · ${stageName(lead.stage)} · consulte os relatos sem sair do funil.`
          : undefined
      }
      className="max-w-2xl"
      footer={
        <FormDialogActions
          hint={
            lastTriagemAt
              ? `Última triagem em ${formatTriagemWhen(lastTriagemAt)}`
              : "Ainda sem relatos neste contato"
          }
        >
          <Button type="button" variant="outline" onClick={onOpenDetails}>
            <Eye className="w-4 h-4 mr-1" />
            Ver detalhes
          </Button>
        </FormDialogActions>
      }
    >
      {lead && (
        <FormDialogBody>
          <FormSection
            icon={<User className="w-3.5 h-3.5 text-primary" />}
            title="Dados do contato"
            description="Resumo para consultar a triagem sem abrir a ficha completa."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailField label="Telefone" value={lead.telefone} />
              <DetailField
                label="E-mail"
                value={displayEmail(lead.email) || "—"}
              />
              {getSession()?.role === "super_admin" ? null : (
                <DetailField label="Corretor" value={lead.corretor} />
              )}
              <DetailField
                label="Prioridade"
                value={
                  <Badge className={prioridadeBadgeClass(lead.prioridade)}>
                    {lead.prioridade}
                  </Badge>
                }
              />
              <DetailField label="Interesse" value={lead.interesse} />
              <DetailField
                label="Renda mensal"
                value={lead.renda != null ? brl(lead.renda) : "—"}
              />
              <DetailField label="Cidade" value={lead.cidade} />
              <DetailField label="Bairro" value={lead.bairro} />
            </div>
          </FormSection>

          {latest && (
            <FormSection
              icon={<ClipboardList className="w-3.5 h-3.5 text-primary" />}
              title="Último relato"
              description={`${latest.autor.name} · ${formatTriagemWhen(latest.createdAt)}`}
            >
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {latest.texto}
              </p>
            </FormSection>
          )}

          {canWrite && (
            <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
              {canAgenda ? (
                <Tabs
                  value={composeTab}
                  onValueChange={(v) => setComposeTab(v as ComposeTab)}
                >
                  <TabsList className="grid h-auto w-full grid-cols-2">
                    <TabsTrigger value="relato" className="gap-1.5">
                      <ClipboardList className="h-3.5 w-3.5" />
                      Relato
                    </TabsTrigger>
                    <TabsTrigger value="atividade" className="gap-1.5">
                      <CalendarClock className="h-3.5 w-3.5" />
                      Atividade
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="relato" className="mt-3 space-y-2">
                    <RelatoComposer
                      lead={lead}
                      stageName={stageName}
                      texto={quickTexto}
                      setTexto={setQuickTexto}
                      saving={saving}
                      onSubmit={() => void submitQuickRelato()}
                    />
                  </TabsContent>
                  <TabsContent value="atividade" className="mt-3 space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="funil-triagem-atividade-tipo">
                          Tipo
                        </Label>
                        <Select
                          value={atividadeTipo}
                          onValueChange={(v) =>
                            changeAtividadeTipo(v as ActivityTipo)
                          }
                          disabled={saving}
                        >
                          <SelectTrigger id="funil-triagem-atividade-tipo">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ACTIVITY_TIPOS.map((tipo) => (
                              <SelectItem key={tipo} value={tipo}>
                                <AgendamentoTipoOption tipo={tipo} />
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="funil-triagem-atividade-data">
                          Data
                        </Label>
                        <Input
                          id="funil-triagem-atividade-data"
                          type="date"
                          value={atividadeData}
                          onChange={(e) => setAtividadeData(e.target.value)}
                          disabled={saving}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="funil-triagem-atividade-titulo">
                        Título
                      </Label>
                      <Input
                        id="funil-triagem-atividade-titulo"
                        value={atividadeTitulo}
                        maxLength={160}
                        onChange={(e) => setAtividadeTitulo(e.target.value)}
                        disabled={saving}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="funil-triagem-atividade-inicio">
                          Início
                        </Label>
                        <TimePicker
                          id="funil-triagem-atividade-inicio"
                          value={atividadeInicio}
                          onChange={setAtividadeInicio}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="funil-triagem-atividade-fim">
                          Término
                        </Label>
                        <TimePicker
                          id="funil-triagem-atividade-fim"
                          value={atividadeFim}
                          onChange={setAtividadeFim}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-muted-foreground">
                        Vai para a agenda, vinculada a este contato.
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        disabled={saving || atividadeTitulo.trim().length < 2}
                        onClick={() => void submitAtividade()}
                      >
                        {atividadeSaving ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <CalendarClock className="mr-1 h-4 w-4" />
                        )}
                        Agendar
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              ) : (
                <RelatoComposer
                  lead={lead}
                  stageName={stageName}
                  texto={quickTexto}
                  setTexto={setQuickTexto}
                  saving={saving}
                  onSubmit={() => void submitQuickRelato()}
                />
              )}
            </div>
          )}

          <HistoryTimeline
            events={events}
            contactName={lead.nome}
            stageLabel={stageName}
            fallbackStage={lead.stage}
            loading={loading}
            leadId={lead.id}
            onEventUpdated={(updated) => {
              setEvents((prev) =>
                prev.map((e) => (e.id === updated.id ? updated : e)),
              );
              onLeadTouched?.();
            }}
          />
        </FormDialogBody>
      )}
    </FormDialogShell>
  );
}

function RelatoComposer({
  lead,
  stageName,
  texto,
  setTexto,
  saving,
  onSubmit,
}: {
  lead: Lead;
  stageName: (slug: string | null) => string;
  texto: string;
  setTexto: (value: string) => void;
  saving: boolean;
  onSubmit: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="funil-triagem-preview-texto" className="text-sm">
          Adicionar relato
        </Label>
        <span className="text-xs text-muted-foreground">
          {texto.length}/{MAX_TRIAGEM_TEXTO}
        </span>
      </div>
      <Textarea
        id="funil-triagem-preview-texto"
        value={texto}
        maxLength={MAX_TRIAGEM_TEXTO}
        rows={3}
        placeholder="Ex.: Cliente pediu retorno amanhã… (não altera a etapa)"
        disabled={saving}
        onChange={(e) => setTexto(e.target.value)}
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">
          Mantém a etapa atual ({stageName(lead.stage)}).
        </p>
        <Button
          type="button"
          size="sm"
          disabled={saving || !texto.trim()}
          onClick={onSubmit}
        >
          {saving ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-1 h-4 w-4" />
          )}
          Registrar
        </Button>
      </div>
    </>
  );
}
