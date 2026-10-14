import { createFileRoute } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { PageHeader } from "@/components/app-shell";
import { PagePanel } from "@/components/page-panel";
import {
  ProcessoArquivoAcoes,
  ProcessoDossie,
} from "@/components/processo-dossie";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import { OperationFunnelBoard } from "@/components/operation-funnel-board";
import {
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
  FormSection,
} from "@/components/form-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { uploadArquivo } from "@/lib/arquivos-api";
import { fetchEmpreendimentos } from "@/lib/empreendimentos-api";
import {
  fetchLeadAssignees,
  fetchLeads,
  type ApiLead,
  type LeadAssignee,
} from "@/lib/leads-api";
import { formatPhone } from "@/lib/phone";
import {
  PROCESSOS_ETAPAS,
  PROCESSO_ETAPA_LABEL,
  createProcesso,
  criarCorrecaoPendencia,
  criarPendenciaProcesso,
  deleteProcesso,
  enviarProcesso,
  fetchProcessos,
  moverProcessoEtapa,
  reenviarProcesso,
  retornarProcesso,
  updateProcesso,
  type Processo,
  type ProcessoEtapa,
  type ProcessoStatus,
} from "@/lib/processos-api";
import { SOFT_BTN, SOFT_BTN_ACTIVE } from "@/lib/soft-btn";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Briefcase,
  Building2,
  CheckCircle2,
  ClipboardList,
  Columns3,
  FileText,
  FolderOpen,
  History,
  Inbox,
  LayoutList,
  Loader2,
  Mail,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  Send,
  Trash2,
  Upload,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";

export const Route = createFileRoute("/_app/processos")({
  component: ProcessosPage,
});

const STATUS_LABEL: Record<ProcessoStatus, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
};

const STATUS_PILL: Record<ProcessoStatus, string> = {
  rascunho:
    "border-[#B7D7E6] bg-[#F3FAFD] text-[#0B3148] dark:border-[#079ED4]/40 dark:bg-[#079ED4]/10 dark:text-[#E7F4FA]",
  enviado:
    "border-[#079ED4]/40 bg-[#079ED4]/15 text-[#0B3148] dark:text-[#7DD3FC]",
  aprovado:
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-300",
  reprovado:
    "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-300",
};

function isGestor() {
  const role = getSession()?.role;
  return role === "admin" || role === "gerente" || role === "super_admin";
}

function canAnalisar() {
  const role = getSession()?.role;
  return isGestor() || role === "analista";
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function StatusPill({ status }: { status: ProcessoStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide",
        STATUS_PILL[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

const SECTION_WASH =
  "border-[#D3EBF5] bg-gradient-to-br from-white via-[#F3FAFD] to-[#E7F4FA] shadow-[0_12px_32px_-20px_rgba(7,158,212,0.65)] dark:border-[#079ED4]/25 dark:from-[#141a22] dark:via-[#102838] dark:to-[#0f1c24] dark:shadow-none";

const ICON_CYAN =
  "border-transparent bg-[#079ED4] text-white shadow-sm dark:border-transparent dark:bg-[#079ED4] dark:text-white";
const ICON_DEEP =
  "border-transparent bg-[#05749E] text-white shadow-sm dark:border-transparent dark:bg-[#0689b8] dark:text-white";
const ICON_INK =
  "border-transparent bg-[#0B3148] text-white shadow-sm dark:border-white/10 dark:bg-[#1c2430] dark:text-[#7DD3FC]";

const STATUS_BAND: Record<ProcessoStatus, string> = {
  rascunho:
    "border-[#D3EBF5] bg-gradient-to-r from-[#E7F4FA] to-white dark:border-[#079ED4]/30 dark:from-[#102838] dark:to-[#141a22]",
  enviado:
    "border-[#B7D7E6] bg-gradient-to-r from-[#079ED4]/15 to-white dark:border-[#079ED4]/40 dark:from-[#079ED4]/20 dark:to-[#141a22]",
  aprovado:
    "border-emerald-200 bg-gradient-to-r from-emerald-50 to-white dark:border-emerald-500/30 dark:from-emerald-950/50 dark:to-[#141a22]",
  reprovado:
    "border-rose-200 bg-gradient-to-r from-rose-50 to-white dark:border-rose-500/30 dark:from-rose-950/40 dark:to-[#141a22]",
};

const STATUS_HINT: Record<ProcessoStatus, string> = {
  rascunho: "Ficha em preparação, ainda não enviada.",
  enviado: "Aguardando a análise do gerente.",
  aprovado: "O gerente aprovou este processo.",
  reprovado: "O gerente devolveu este processo.",
};

function ReadValue({ value }: { value: string }) {
  const text = value.trim();
  return (
    <div
      className={cn(
        "flex min-h-9 items-center rounded-xl border px-3 py-2 text-sm",
        text
          ? "border-[#D3EBF5] bg-white font-medium text-[#0B3148] shadow-[inset_3px_0_0_#079ED4] dark:border-[#079ED4]/25 dark:bg-[#141a22] dark:text-[#f8fafc] dark:shadow-[inset_3px_0_0_#079ED4]"
          : "border-dashed border-[#D3EBF5] bg-white/40 text-[#8B98A3] dark:border-white/10 dark:bg-transparent dark:text-[#94a3b8]",
      )}
    >
      {text || "Não informado"}
    </div>
  );
}

function ChoiceValue({ yes }: { yes: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-9 items-center rounded-full px-3 text-sm font-semibold",
        yes
          ? "bg-[#079ED4] text-white"
          : "bg-white text-[#5C6B76] ring-1 ring-[#D3EBF5] dark:bg-[#1c2430] dark:text-[#94a3b8] dark:ring-white/10",
      )}
    >
      {yes ? "Sim" : "Não"}
    </span>
  );
}

function ProcessosPage() {
  const analista = canAnalisar();
  const [rows, setRows] = useState<Processo[]>([]);
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState<"funil" | "lista">("funil");
  const [filtro, setFiltro] = useState<ProcessoStatus | "todos">("todos");
  const [selected, setSelected] = useState<Processo | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [fichaMode, setFichaMode] = useState<"view" | "edit">("view");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploadNonce, setUploadNonce] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [pendenciaOpen, setPendenciaOpen] = useState(false);
  const [pendenciaProcesso, setPendenciaProcesso] = useState<Processo | null>(
    null,
  );
  const [pendenciaForm, setPendenciaForm] = useState({
    titulo: "",
    descricao: "",
    textoComplementar: "",
  });
  const [pendenciaFiles, setPendenciaFiles] = useState<File[]>([]);
  const [correcaoTexto, setCorrecaoTexto] = useState("");
  const [correcaoFiles, setCorrecaoFiles] = useState<File[]>([]);
  const [correcaoPendenciaId, setCorrecaoPendenciaId] = useState("");
  const [leads, setLeads] = useState<ApiLead[]>([]);
  const [assignees, setAssignees] = useState<LeadAssignee[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<
    { id: string; nome: string }[]
  >([]);
  const [leadId, setLeadId] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    fonte: "",
    telefone: "",
    email: "",
    estadoCivil: "",
    tipoRenda: "",
    cotista: false,
    dependente: false,
    empreendimentoId: "",
    corretorId: "",
    gerenteId: "",
  });
  const [retornoTexto, setRetornoTexto] = useState("");
  const [retornoPdf, setRetornoPdf] = useState<File | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchProcessos();
      setRows(list);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível carregar.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void Promise.all([
      fetchLeads({ tipo: "lead", limit: 100 }),
      fetchLeads({ tipo: "cliente", limit: 100 }),
      fetchLeadAssignees(),
      fetchEmpreendimentos({ ativo: true }),
    ])
      .then(([a, b, users, emps]) => {
        setLeads([...a.data, ...b.data]);
        setAssignees(users);
        setEmpreendimentos(emps.map((e) => ({ id: e.id, nome: e.nome })));
      })
      .catch(() => undefined);
  }, []);

  const gerentes = useMemo(
    () => assignees.filter((u) => u.role === "gerente" || u.role === "admin"),
    [assignees],
  );

  const counts = useMemo(() => {
    return {
      rascunho: rows.filter((r) => r.status === "rascunho").length,
      enviado: rows.filter((r) => r.status === "enviado").length,
      aprovado: rows.filter((r) => r.status === "aprovado").length,
      reprovado: rows.filter((r) => r.status === "reprovado").length,
    };
  }, [rows]);

  const filtered = useMemo(
    () => (filtro === "todos" ? rows : rows.filter((r) => r.status === filtro)),
    [rows, filtro],
  );

  function fillFromLead(id: string) {
    setLeadId(id);
    const lead = leads.find((l) => l.id === id);
    if (!lead) return;
    setForm({
      nome: lead.nome ?? "",
      fonte: lead.origem ?? "",
      telefone: lead.telefone ?? "",
      email: lead.email ?? "",
      estadoCivil: lead.estadoCivil ?? "",
      tipoRenda: lead.tipoRenda ?? "",
      cotista: false,
      dependente: false,
      empreendimentoId: lead.empreendimentoId ?? "",
      corretorId: lead.corretorId ?? getSession()?.id ?? "",
      gerenteId: lead.corretorId
        ? (assignees.find((u) => u.id === lead.corretorId)?.gerenteId ?? "")
        : "",
    });
  }

  function applySelected(p: Processo, mode: "view" | "edit" = "view") {
    setSelected(p);
    setFichaMode(mode);
    setDetailOpen(true);
    setForm({
      nome: p.nome,
      fonte: p.fonte,
      telefone: p.telefone,
      email: p.email,
      estadoCivil: p.estadoCivil,
      tipoRenda: p.tipoRenda,
      cotista: p.cotista,
      dependente: p.dependente,
      empreendimentoId: p.empreendimentoId ?? "",
      corretorId: p.corretorId ?? "",
      gerenteId: p.gerenteId ?? "",
    });
    setRetornoTexto("");
    setRetornoPdf(null);
    setCorrecaoTexto("");
    setCorrecaoFiles([]);
    const aberta = p.pendencias?.find((x) => x.status === "aberta");
    setCorrecaoPendenciaId(aberta?.id ?? p.pendencias?.[0]?.id ?? "");
  }

  function canMutate(row: Processo) {
    return (
      row.etapa === "nova_avaliacao" ||
      row.etapa === "retrabalho" ||
      row.status === "rascunho" ||
      row.status === "reprovado"
    );
  }

  const canEdit = Boolean(selected && fichaMode === "edit" && canMutate(selected));
  const canUpload = Boolean(selected && canMutate(selected));

  async function onDelete() {
    if (!deleteId) return;
    setSaving(true);
    try {
      await deleteProcesso(deleteId);
      toast.success("Processo excluído.");
      if (selected?.id === deleteId) {
        setSelected(null);
        setDetailOpen(false);
      }
      setDeleteId(null);
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível excluir.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onCreate() {
    if (!leadId) {
      toast.error("Selecione um lead ou cliente.");
      return;
    }
    setSaving(true);
    try {
      const created = await createProcesso({
        leadId,
        ...form,
        empreendimentoId: form.empreendimentoId || null,
        corretorId: form.corretorId || null,
        gerenteId: form.gerenteId || null,
      });
      toast.success("Processo cadastrado.");
      setCreateOpen(false);
      await load();
      applySelected(created, "edit");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível cadastrar.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onSave() {
    if (!selected || !canEdit) return;
    setSaving(true);
    try {
      const updated = await updateProcesso(selected.id, {
        ...form,
        empreendimentoId: form.empreendimentoId || null,
        corretorId: form.corretorId || null,
        gerenteId: form.gerenteId || null,
      });
      toast.success("Ficha atualizada.");
      applySelected(updated, "edit");
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível salvar.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function enviarFicha(id: string, salvarAntes = false) {
    setSaving(true);
    try {
      if (salvarAntes && selected?.id === id && canEdit) {
        await updateProcesso(id, {
          ...form,
          empreendimentoId: form.empreendimentoId || null,
          corretorId: form.corretorId || null,
          gerenteId: form.gerenteId || null,
        });
      }
      const updated = await enviarProcesso(id);
      toast.success("Processo enviado para análise.");
      applySelected(updated, "view");
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível enviar.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onEnviar() {
    if (!selected) return;
    await enviarFicha(selected.id, true);
  }

  async function onRetorno(resultado: "aprovado" | "reprovado") {
    if (!selected) return;
    setSaving(true);
    try {
      let arquivoId: string | null = null;
      if (retornoPdf) {
        const uploaded = await uploadArquivo({
          file: retornoPdf,
          entityType: "processo",
          entityId: selected.id,
          nome: `Retorno ${resultado}`,
          categoria: "outro",
          tagIds: [],
        });
        arquivoId = uploaded.id;
      }
      const updated = await retornarProcesso(selected.id, {
        resultado,
        texto: retornoTexto,
        arquivoId,
      });
      toast.success(
        resultado === "aprovado" ? "Processo aprovado." : "Processo reprovado.",
      );
      applySelected(updated);
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível retornar.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onMoverEtapa(cardId: string, etapaId: string) {
    const etapa = etapaId as ProcessoEtapa;
    const row = rows.find((r) => r.id === cardId);
    if (!row || !analista) return;
    if (etapa === "pendencia_documentacional") {
      setPendenciaProcesso(row);
      setPendenciaForm({ titulo: "", descricao: "", textoComplementar: "" });
      setPendenciaFiles([]);
      setPendenciaOpen(true);
      return;
    }
    setMovingId(cardId);
    try {
      const updated = await moverProcessoEtapa(cardId, { etapa });
      setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      if (selected?.id === updated.id) applySelected(updated, fichaMode);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível mover.",
      );
    } finally {
      setMovingId(null);
    }
  }

  async function uploadMany(processoId: string, files: File[], nome: string) {
    const ids: string[] = [];
    for (const file of files) {
      const uploaded = await uploadArquivo({
        file,
        entityType: "processo",
        entityId: processoId,
        nome,
        categoria: "outro",
        tagIds: [],
      });
      ids.push(uploaded.id);
    }
    return ids;
  }

  async function onSalvarPendencia() {
    if (!pendenciaProcesso) return;
    if (!pendenciaForm.titulo.trim()) {
      toast.error("Informe o título da pendência.");
      return;
    }
    if (!pendenciaForm.descricao.trim() && pendenciaFiles.length === 0) {
      toast.error("Informe a descrição ou anexe arquivos.");
      return;
    }
    setSaving(true);
    try {
      const arquivoIds = await uploadMany(
        pendenciaProcesso.id,
        pendenciaFiles,
        `Pendência ${pendenciaForm.titulo}`,
      );
      const updated = await criarPendenciaProcesso(pendenciaProcesso.id, {
        titulo: pendenciaForm.titulo,
        descricao: pendenciaForm.descricao,
        textoComplementar: pendenciaForm.textoComplementar,
        arquivoIds,
      });
      toast.success("Pendência registrada. O processo voltou para Retrabalho.");
      setPendenciaOpen(false);
      applySelected(updated);
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível registrar.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onCorrecao() {
    if (!selected || !correcaoPendenciaId) {
      toast.error("Selecione a pendência que está corrigindo.");
      return;
    }
    if (!correcaoTexto.trim() && correcaoFiles.length === 0) {
      toast.error("Envie um comentário ou os documentos corrigidos.");
      return;
    }
    setSaving(true);
    try {
      const arquivoIds = await uploadMany(
        selected.id,
        correcaoFiles,
        "Correção de retrabalho",
      );
      const updated = await criarCorrecaoPendencia(
        selected.id,
        correcaoPendenciaId,
        { comentario: correcaoTexto, arquivoIds },
      );
      toast.success("Correção registrada.");
      setCorrecaoTexto("");
      setCorrecaoFiles([]);
      applySelected(updated, "edit");
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível salvar.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onReenviar() {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await reenviarProcesso(selected.id);
      toast.success("Processo reenviado para análise.");
      applySelected(updated, "view");
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível reenviar.",
      );
    } finally {
      setSaving(false);
    }
  }

  const filtros = [
    { id: "todos" as const, label: "Todos", count: rows.length },
    { id: "rascunho" as const, label: "Rascunho", count: counts.rascunho },
    { id: "enviado" as const, label: "Enviado", count: counts.enviado },
    { id: "aprovado" as const, label: "Aprovado", count: counts.aprovado },
    { id: "reprovado" as const, label: "Reprovado", count: counts.reprovado },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Fechamento"
        title="Processos"
        description="Acompanhe a análise no funil, solicite pendências e registre o retrabalho no mesmo lugar."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-8 overflow-hidden rounded-full border bg-background">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className={cn(
                  "h-8 rounded-none px-3",
                  vista === "funil" && "bg-primary/10 text-primary",
                )}
                onClick={() => setVista("funil")}
              >
                <Columns3 className="mr-1 h-3.5 w-3.5" />
                Funil
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className={cn(
                  "h-8 rounded-none px-3",
                  vista === "lista" && "bg-primary/10 text-primary",
                )}
                onClick={() => setVista("lista")}
              >
                <LayoutList className="mr-1 h-3.5 w-3.5" />
                Lista
              </Button>
            </div>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              Cadastrar processos
            </Button>
          </div>
        }
      />

      <div className="grid min-w-0 grid-cols-2 gap-3 xl:grid-cols-4">
        <FinanceKpiCard
          variant="dash"
          label="Rascunho"
          value={counts.rascunho}
          icon={Pencil}
          tone="blue"
          format="number"
          onClick={() => {
            setVista("lista");
            setFiltro("rascunho");
          }}
        />
        <FinanceKpiCard
          variant="dash"
          label="Enviado"
          value={counts.enviado}
          icon={Inbox}
          tone="violet"
          format="number"
          onClick={() => {
            setVista("lista");
            setFiltro("enviado");
          }}
        />
        <FinanceKpiCard
          variant="dash"
          label="Aprovado"
          value={counts.aprovado}
          icon={CheckCircle2}
          tone="emerald"
          format="number"
          onClick={() => {
            setVista("lista");
            setFiltro("aprovado");
          }}
        />
        <FinanceKpiCard
          variant="dash"
          label="Reprovado"
          value={counts.reprovado}
          icon={XCircle}
          tone="rose"
          format="number"
          onClick={() => {
            setVista("lista");
            setFiltro("reprovado");
          }}
        />
      </div>

      {vista === "funil" ? (
        <PagePanel
          title="Funil de processos"
          description={
            analista
              ? "Arraste o card entre as etapas. Ao soltar em Pendência Documentacional, registre o que precisa ser corrigido."
              : "Acompanhe a etapa da análise. No Retrabalho, abra o card para enviar as correções."
          }
        >
          {loading ? (
            <p className="flex items-center gap-2 px-1 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />{" "}
              Carregando processos...
            </p>
          ) : (
            <OperationFunnelBoard
              stages={PROCESSOS_ETAPAS}
              movingId={movingId}
              onMove={onMoverEtapa}
              onCardClick={(id) => {
                const row = rows.find((r) => r.id === id);
                if (row) applySelected(row, "view");
              }}
              cards={rows.map((row) => ({
                id: row.id,
                etapaId: row.etapa,
                title: row.nome,
                subtitle: row.empreendimento?.nome ?? row.fonte,
                meta: row.corretor?.name ?? row.autor?.name,
                href: "/processos",
                phone: row.telefone,
                footer: PROCESSO_ETAPA_LABEL[row.etapa],
                tag:
                  row.pendencias?.some((p) => p.status === "aberta")
                    ? {
                        label: "Pendência",
                        className: "bg-orange-500/15 text-orange-800",
                      }
                    : undefined,
              }))}
            />
          )}
        </PagePanel>
      ) : null}

      {vista === "lista" ? (
      <PagePanel
        title="Lista de processos"
        description="Clique em um registro para abrir a ficha, os documentos e o retorno do gerente."
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {filtros.map((item) => (
            <Button
              key={item.id}
              type="button"
              variant="outline"
              size="sm"
              className={filtro === item.id ? SOFT_BTN_ACTIVE : SOFT_BTN}
              onClick={() => setFiltro(item.id)}
            >
              {item.label}
              <span className="ml-1.5 text-[11px] opacity-70">{item.count}</span>
            </Button>
          ))}
        </div>
        {loading ? (
          <p className="flex items-center gap-2 px-1 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />{" "}
            Carregando processos...
          </p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/20 bg-primary/[0.03] px-4 py-12 text-center">
            <FolderOpen className="h-8 w-8 text-primary/70" />
            <p className="text-sm font-medium text-foreground">
              Nenhum processo neste filtro
            </p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Cadastre um processo a partir de um lead ou cliente da sua
              carteira.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-black/5">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden sm:table-cell">Contato</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Empreendimento
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Corretor
                  </TableHead>
                    <TableHead>Etapa</TableHead>
                  <TableHead className="w-[1%] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow
                    key={row.id}
                    className={cn(
                      "cursor-pointer",
                      selected?.id === row.id &&
                        detailOpen &&
                        "bg-primary/[0.06]",
                    )}
                    onClick={() => applySelected(row, "view")}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-primary/15">
                          <AvatarFallback className="bg-[#E7F4FA] text-[11px] font-semibold text-[#0B3148] dark:bg-[#079ED4]/20 dark:text-[#E7F4FA]">
                            {initials(row.nome)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{row.nome}</p>
                          <p className="truncate text-xs text-muted-foreground sm:hidden">
                            {formatPhone(row.telefone) || row.telefone || "—"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                      {formatPhone(row.telefone) || row.telefone || "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {row.empreendimento?.nome ?? "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {row.corretor?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold">
                          {PROCESSO_ETAPA_LABEL[row.etapa]}
                        </span>
                        <StatusPill status={row.status} />
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {canMutate(row) ? (
                          <Button
                            type="button"
                            size="sm"
                            className="h-8"
                            disabled={saving}
                            title="Enviar ao gerente"
                            onClick={() => void enviarFicha(row.id)}
                          >
                            <Send className="mr-1 h-3.5 w-3.5" />
                            Enviar
                          </Button>
                        ) : null}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Ações"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {canMutate(row) ? (
                              <>
                                <DropdownMenuItem
                                  onClick={() => applySelected(row, "edit")}
                                >
                                  <Pencil className="mr-2 h-3.5 w-3.5" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={saving}
                                  onClick={() => void enviarFicha(row.id)}
                                >
                                  <Send className="mr-2 h-3.5 w-3.5" />
                                  Enviar ao gerente
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    applySelected(row, "view");
                                    setUploadNonce((n) => n + 1);
                                  }}
                                >
                                  <Upload className="mr-2 h-3.5 w-3.5" />
                                  Enviar PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDeleteId(row.id)}
                                >
                                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                                  Excluir
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => applySelected(row, "view")}
                              >
                                <ClipboardList className="mr-2 h-3.5 w-3.5" />
                                Ver detalhes
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PagePanel>
      ) : null}

      {selected ? (
        <FormDialogShell
          open={detailOpen}
          onOpenChange={(open) => {
            setDetailOpen(open);
            if (!open) setFichaMode("view");
          }}
          icon={<ClipboardList className="h-5 w-5" />}
          title={selected.nome}
          description={
            <span className="flex flex-wrap items-center gap-2">
              <span>
                {selected.lead?.tipo === "cliente" ? "Cliente" : "Lead"}
                {selected.fonte ? ` · Fonte ${selected.fonte}` : ""}
                {selected.corretor?.name ? ` · ${selected.corretor.name}` : ""}
              </span>
              <StatusPill status={selected.status} />
              <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold">
                {PROCESSO_ETAPA_LABEL[selected.etapa]}
              </span>
            </span>
          }
          footer={
            <FormDialogActions
              hint={
                canEdit
                  ? "Salve a ficha ou envie para o gerente analisar."
                  : "Clique em Editar no menu da lista para alterar a ficha."
              }
            >
              {canEdit ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className={SOFT_BTN}
                    onClick={() => void onSave()}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Pencil className="mr-1 h-4 w-4" />
                    )}
                    Salvar ficha
                  </Button>
                  {selected.etapa === "retrabalho" ? (
                    <Button
                      type="button"
                      onClick={() => void onReenviar()}
                      disabled={saving}
                    >
                      <RotateCcw className="mr-1 h-4 w-4" />
                      Reenviar para análise
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => void onEnviar()}
                      disabled={saving}
                    >
                      <Send className="mr-1 h-4 w-4" />
                      Enviar
                    </Button>
                  )}
                </>
              ) : canMutate(selected) ? (
                <Button
                  type="button"
                  onClick={() => setFichaMode("edit")}
                >
                  <Pencil className="mr-1 h-4 w-4" />
                  Editar
                </Button>
              ) : analista ? (
                <Button
                  type="button"
                  variant="outline"
                  className={SOFT_BTN}
                  onClick={() => {
                    setPendenciaProcesso(selected);
                    setPendenciaForm({
                      titulo: "",
                      descricao: "",
                      textoComplementar: "",
                    });
                    setPendenciaFiles([]);
                    setPendenciaOpen(true);
                  }}
                >
                  <Paperclip className="mr-1 h-4 w-4" />
                  Solicitar pendência
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className={SOFT_BTN}
                  onClick={() => setDetailOpen(false)}
                >
                  Fechar
                </Button>
              )}
            </FormDialogActions>
          }
        >
          <FormDialogBody>
            <div
              className={cn(
                "flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3",
                STATUS_BAND[selected.status],
              )}
            >
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#05749E] dark:text-[#7DD3FC]">
                  Situação da ficha
                </p>
                <p className="mt-0.5 text-sm font-medium text-[#0B3148] dark:text-[#f8fafc]">
                  {PROCESSO_ETAPA_LABEL[selected.etapa]} ·{" "}
                  {STATUS_HINT[selected.status]}
                </p>
              </div>
              <StatusPill status={selected.status} />
            </div>
            <FormSection
              className={SECTION_WASH}
              iconClassName={ICON_CYAN}
              icon={<UserRound className="h-4 w-4" />}
              title="Dados do contato"
              description="Informações preenchidas a partir do lead ou cliente."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nome" icon={false}>
                  {canEdit ? (
                    <Input
                      value={form.nome}
                      onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    />
                  ) : (
                    <ReadValue value={form.nome} />
                  )}
                </Field>
                <Field label="Fonte">
                  {canEdit ? (
                    <Input
                      value={form.fonte}
                      onChange={(e) =>
                        setForm({ ...form, fonte: e.target.value })
                      }
                    />
                  ) : (
                    <ReadValue value={form.fonte} />
                  )}
                </Field>
                <Field
                  label="Contato"
                  icon={<Phone className="h-3.5 w-3.5 text-primary" />}
                >
                  {canEdit ? (
                    <Input
                      value={form.telefone}
                      onChange={(e) =>
                        setForm({ ...form, telefone: e.target.value })
                      }
                    />
                  ) : (
                    <ReadValue
                      value={formatPhone(form.telefone) || form.telefone}
                    />
                  )}
                </Field>
                <Field
                  label="E-mail"
                  icon={<Mail className="h-3.5 w-3.5 text-primary" />}
                >
                  {canEdit ? (
                    <Input
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                    />
                  ) : (
                    <ReadValue value={form.email} />
                  )}
                </Field>
                <Field label="Estado civil">
                  {canEdit ? (
                    <Input
                      value={form.estadoCivil}
                      onChange={(e) =>
                        setForm({ ...form, estadoCivil: e.target.value })
                      }
                    />
                  ) : (
                    <ReadValue value={form.estadoCivil} />
                  )}
                </Field>
                <Field label="Carteira assinada / tipo de renda">
                  {canEdit ? (
                    <Input
                      value={form.tipoRenda}
                      onChange={(e) =>
                        setForm({ ...form, tipoRenda: e.target.value })
                      }
                    />
                  ) : (
                    <ReadValue value={form.tipoRenda} />
                  )}
                </Field>
                <Field label="Cotista">
                  {canEdit ? (
                    <Select
                      value={form.cotista ? "sim" : "nao"}
                      onValueChange={(v) =>
                        setForm({ ...form, cotista: v === "sim" })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sim">Sim</SelectItem>
                        <SelectItem value="nao">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <ChoiceValue yes={form.cotista} />
                  )}
                </Field>
                <Field label="Dependente">
                  {canEdit ? (
                    <Select
                      value={form.dependente ? "sim" : "nao"}
                      onValueChange={(v) =>
                        setForm({ ...form, dependente: v === "sim" })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sim">Sim</SelectItem>
                        <SelectItem value="nao">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <ChoiceValue yes={form.dependente} />
                  )}
                </Field>
              </div>
            </FormSection>

            <FormSection
              className={SECTION_WASH}
              iconClassName={ICON_DEEP}
              icon={<Building2 className="h-4 w-4" />}
              title="Comercial"
              description="Empreendimento, corretor responsável e gerente que recebe o envio."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Empreendimento" icon={false}>
                  {canEdit ? (
                    <Select
                      value={form.empreendimentoId || undefined}
                      onValueChange={(v) =>
                        setForm({ ...form, empreendimentoId: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {empreendimentos.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <ReadValue
                      value={
                        empreendimentos.find((e) => e.id === form.empreendimentoId)
                          ?.nome ??
                        selected.empreendimento?.nome ??
                        ""
                      }
                    />
                  )}
                </Field>
                <Field
                  label="Corretor"
                  icon={<Briefcase className="h-3.5 w-3.5 text-primary" />}
                >
                  {canEdit ? (
                    <Select
                      value={form.corretorId || undefined}
                      onValueChange={(v) =>
                        setForm({ ...form, corretorId: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {assignees.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <ReadValue
                      value={
                        assignees.find((u) => u.id === form.corretorId)?.name ??
                        selected.corretor?.name ??
                        ""
                      }
                    />
                  )}
                </Field>
                <Field
                  label="Gerente"
                  icon={<Users className="h-3.5 w-3.5 text-primary" />}
                >
                  {canEdit ? (
                    <Select
                      value={form.gerenteId || undefined}
                      onValueChange={(v) => setForm({ ...form, gerenteId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {gerentes.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <ReadValue
                      value={
                        gerentes.find((u) => u.id === form.gerenteId)?.name ??
                        selected.gerente?.name ??
                        ""
                      }
                    />
                  )}
                </Field>
              </div>
            </FormSection>

            <FormSection
              className={SECTION_WASH}
              iconClassName={ICON_INK}
              icon={<FileText className="h-4 w-4" />}
              title="Dossiê do processo"
              description="Cabeçalho enviado, documentos originais, complementares, pendências e histórico documental no mesmo lugar."
            >
              <ProcessoDossie
                processo={selected}
                allowUpload={canUpload}
                uploadNonce={uploadNonce}
              />
            </FormSection>

            {canMutate(selected) &&
            selected.etapa === "retrabalho" &&
            (selected.pendencias?.length ?? 0) > 0 ? (
              <FormSection
                className={SECTION_WASH}
                iconClassName={ICON_CYAN}
                icon={<RotateCcw className="h-4 w-4" />}
                title="Enviar correção"
                description="Anexe os documentos corrigidos e reenvie para a análise."
              >
                <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-500/30 dark:bg-amber-950/20">
                  <p className="text-sm font-medium">
                    Enviar correção desta pendência
                  </p>
                  <Select
                    value={correcaoPendenciaId || undefined}
                    onValueChange={setCorrecaoPendenciaId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pendência" />
                    </SelectTrigger>
                    <SelectContent>
                      {selected.pendencias!.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.titulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea
                    rows={3}
                    placeholder="Comente o que foi ajustado..."
                    value={correcaoTexto}
                    onChange={(e) => setCorrecaoTexto(e.target.value)}
                  />
                  <Input
                    type="file"
                    multiple
                    accept=".pdf,image/jpeg,image/png,image/webp,image/gif"
                    onChange={(e) =>
                      setCorrecaoFiles(Array.from(e.target.files ?? []))
                    }
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className={SOFT_BTN}
                      disabled={saving}
                      onClick={() => void onCorrecao()}
                    >
                      <Upload className="mr-1 h-4 w-4" />
                      Registrar correção
                    </Button>
                    <Button
                      type="button"
                      disabled={saving}
                      onClick={() => void onReenviar()}
                    >
                      <Send className="mr-1 h-4 w-4" />
                      Reenviar para análise
                    </Button>
                  </div>
                </div>
              </FormSection>
            ) : null}

            {(selected.movimentos?.length ?? 0) > 0 ? (
              <FormSection
                className={SECTION_WASH}
                iconClassName={ICON_INK}
                icon={<History className="h-4 w-4" />}
                title="Histórico do funil"
                description="Etapas, responsáveis e observações de cada movimentação."
              >
                <div className="space-y-2">
                  {selected.movimentos!.map((m) => (
                    <div
                      key={m.id}
                      className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-black/5 px-3 py-2 text-sm"
                    >
                      <p>
                        <span className="font-medium">
                          {m.deEtapa
                            ? PROCESSO_ETAPA_LABEL[m.deEtapa]
                            : "Início"}
                        </span>
                        {" → "}
                        <span className="font-medium">
                          {PROCESSO_ETAPA_LABEL[m.paraEtapa]}
                        </span>
                        {m.observacao ? (
                          <span className="text-muted-foreground">
                            {" "}
                            · {m.observacao}
                          </span>
                        ) : null}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {m.autor.name} ·{" "}
                        {new Date(m.createdAt).toLocaleString("pt-BR")}
                      </span>
                    </div>
                  ))}
                </div>
              </FormSection>
            ) : null}

            {(selected.retornos?.length ?? 0) > 0 ? (
              <FormSection
                className={SECTION_WASH}
                iconClassName={ICON_INK}
                icon={<Inbox className="h-4 w-4" />}
                title="Histórico de retornos"
                description="Parecer do gerente ou administrador sobre esta ficha."
              >
                <div className="space-y-3">
                  {selected.retornos!.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-xl border border-primary/10 bg-background/70 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <StatusPill
                          status={
                            r.resultado === "aprovado"
                              ? "aprovado"
                              : "reprovado"
                          }
                        />
                        <span className="text-xs text-muted-foreground">
                          {r.autor.name} ·{" "}
                          {new Date(r.createdAt).toLocaleString("pt-BR")}
                        </span>
                      </div>
                      {r.texto ? (
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
                          {r.texto}
                        </p>
                      ) : null}
                      {r.arquivoId ? (
                        <div className="mt-3">
                          <ProcessoArquivoAcoes arquivoId={r.arquivoId} />
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </FormSection>
            ) : null}

            {analista &&
            selected.etapa !== "nova_avaliacao" &&
            selected.etapa !== "retrabalho" ? (
              <FormSection
                className={SECTION_WASH}
                iconClassName={ICON_CYAN}
                icon={<Send className="h-4 w-4" />}
                title="Retorno ao corretor"
                description="Aprove ou reprove com um texto e, se quiser, um PDF de pendências."
              >
                <div className="space-y-3">
                  <Textarea
                    rows={4}
                    placeholder="Pendências, documentos faltando ou parecer..."
                    value={retornoTexto}
                    onChange={(e) => setRetornoTexto(e.target.value)}
                  />
                  <div className="space-y-1.5">
                    <Label>Arquivo opcional (PDF ou imagem)</Label>
                    <Input
                      type="file"
                      accept=".pdf,image/jpeg,image/png,image/webp,image/gif"
                      onChange={(e) =>
                        setRetornoPdf(e.target.files?.[0] ?? null)
                      }
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      onClick={() => void onRetorno("aprovado")}
                      disabled={saving}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                      Aprovar
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => void onRetorno("reprovado")}
                      disabled={saving}
                    >
                      <XCircle className="mr-1 h-4 w-4" />
                      Reprovar
                    </Button>
                  </div>
                </div>
              </FormSection>
            ) : null}
          </FormDialogBody>
        </FormDialogShell>
      ) : null}

      <AlertDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir processo?</AlertDialogTitle>
            <AlertDialogDescription>
              A ficha será removida. Os documentos já enviados continuam na
              ficha do lead, se estiverem vinculados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void onDelete()}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FormDialogShell
        open={pendenciaOpen}
        onOpenChange={setPendenciaOpen}
        icon={<Paperclip className="h-5 w-5" />}
        title="Pendência documentacional"
        description={
          pendenciaProcesso
            ? `Registre o que precisa ser corrigido em ${pendenciaProcesso.nome}. Depois o processo vai para Retrabalho.`
            : "Registre a correção necessária."
        }
        footer={
          <FormDialogActions hint="Use texto, anexos ou ambos.">
            <Button
              type="button"
              variant="outline"
              className={SOFT_BTN}
              onClick={() => setPendenciaOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void onSalvarPendencia()}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-1 h-4 w-4" />
              )}
              Solicitar correção
            </Button>
          </FormDialogActions>
        }
      >
        <FormDialogBody>
          <FormSection
            icon={<ClipboardList className="h-4 w-4" />}
            title="O que precisa ser corrigido"
            description="Título, descrição detalhada, anexos e orientações extras."
          >
            <div className="space-y-3">
              <Field label="Título" icon={false}>
                <Input
                  value={pendenciaForm.titulo}
                  onChange={(e) =>
                    setPendenciaForm({
                      ...pendenciaForm,
                      titulo: e.target.value,
                    })
                  }
                  placeholder="Ex.: RG ilegível"
                />
              </Field>
              <Field label="Descrição" icon={false}>
                <Textarea
                  rows={4}
                  value={pendenciaForm.descricao}
                  onChange={(e) =>
                    setPendenciaForm({
                      ...pendenciaForm,
                      descricao: e.target.value,
                    })
                  }
                  placeholder="Documento ausente, incorreto, desatualizado ou atrasado..."
                />
              </Field>
              <Field label="Anexos" icon={false}>
                <Input
                  type="file"
                  multiple
                  accept=".pdf,image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) =>
                    setPendenciaFiles(Array.from(e.target.files ?? []))
                  }
                />
              </Field>
              <Field label="Texto complementar" icon={false}>
                <Textarea
                  rows={3}
                  value={pendenciaForm.textoComplementar}
                  onChange={(e) =>
                    setPendenciaForm({
                      ...pendenciaForm,
                      textoComplementar: e.target.value,
                    })
                  }
                  placeholder="Orientações adicionais para a correção"
                />
              </Field>
            </div>
          </FormSection>
        </FormDialogBody>
      </FormDialogShell>

      <FormDialogShell
        open={createOpen}
        onOpenChange={setCreateOpen}
        icon={<ClipboardList className="h-5 w-5" />}
        title="Cadastrar processo"
        description="Escolha o lead ou cliente da carteira. A ficha já nasce com os dados do contato."
        footer={
          <FormDialogActions hint="Depois você sobe as documentações e envia ao gerente.">
            <Button
              type="button"
              variant="outline"
              className={SOFT_BTN}
              onClick={() => setCreateOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => void onCreate()}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-1 h-4 w-4" />
              )}
              Criar processo
            </Button>
          </FormDialogActions>
        }
      >
        <FormDialogBody>
          <FormSection
            icon={<Users className="h-4 w-4" />}
            title="Lead ou cliente"
            description="Somente contatos da sua carteira aparecem nesta lista."
          >
            <Select value={leadId || undefined} onValueChange={fillFromLead}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione da sua carteira" />
              </SelectTrigger>
              <SelectContent>
                {leads.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.nome} ({l.tipo === "cliente" ? "cliente" : "lead"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormSection>
        </FormDialogBody>
      </FormDialogShell>
    </div>
  );
}

function Field({
  label,
  children,
  icon,
}: {
  label: string;
  children: ReactNode;
  icon?: ReactNode | false;
}) {
  return (
    <div className="space-y-1.5">
      <Label
        data-no-icon={icon === false ? "" : undefined}
        className="flex items-center gap-1.5 text-xs font-medium text-[#0B3148] dark:text-[#E7F4FA]"
      >
        {icon || null}
        {label}
      </Label>
      {children}
    </div>
  );
}
