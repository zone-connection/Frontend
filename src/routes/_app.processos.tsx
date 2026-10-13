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
import { DocumentosPanel } from "@/components/documentos-panel";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import {
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
  FormSection,
} from "@/components/form-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { previewArquivo, uploadArquivo } from "@/lib/arquivos-api";
import { fetchEmpreendimentos } from "@/lib/empreendimentos-api";
import {
  fetchLeadAssignees,
  fetchLeads,
  type ApiLead,
  type LeadAssignee,
} from "@/lib/leads-api";
import { formatPhone } from "@/lib/phone";
import {
  createProcesso,
  enviarProcesso,
  fetchProcessos,
  retornarProcesso,
  updateProcesso,
  type Processo,
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
  FileText,
  FolderOpen,
  Inbox,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Plus,
  Send,
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

function ProcessosPage() {
  const gestor = isGestor();
  const [rows, setRows] = useState<Processo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<ProcessoStatus | "todos">("todos");
  const [selected, setSelected] = useState<Processo | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
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

  function applySelected(p: Processo) {
    setSelected(p);
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
  }

  const canEdit =
    selected &&
    (selected.status === "rascunho" || selected.status === "reprovado");

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
      applySelected(created);
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
      applySelected(updated);
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível salvar.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onEnviar() {
    if (!selected) return;
    setSaving(true);
    try {
      if (canEdit) {
        await updateProcesso(selected.id, {
          ...form,
          empreendimentoId: form.empreendimentoId || null,
          corretorId: form.corretorId || null,
          gerenteId: form.gerenteId || null,
        });
      }
      const updated = await enviarProcesso(selected.id);
      toast.success("Processo enviado ao gerente.");
      applySelected(updated);
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível enviar.",
      );
    } finally {
      setSaving(false);
    }
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
        description="Cadastre a ficha e os documentos do lead ou cliente. O envio vai para o gerente analisar."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Cadastrar processos
          </Button>
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
          onClick={() => setFiltro("rascunho")}
        />
        <FinanceKpiCard
          variant="dash"
          label="Enviado"
          value={counts.enviado}
          icon={Inbox}
          tone="violet"
          format="number"
          onClick={() => setFiltro("enviado")}
        />
        <FinanceKpiCard
          variant="dash"
          label="Aprovado"
          value={counts.aprovado}
          icon={CheckCircle2}
          tone="emerald"
          format="number"
          onClick={() => setFiltro("aprovado")}
        />
        <FinanceKpiCard
          variant="dash"
          label="Reprovado"
          value={counts.reprovado}
          icon={XCircle}
          tone="rose"
          format="number"
          onClick={() => setFiltro("reprovado")}
        />
      </div>

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
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow
                    key={row.id}
                    className={cn(
                      "cursor-pointer",
                      selected?.id === row.id && "bg-primary/[0.06]",
                    )}
                    onClick={() => applySelected(row)}
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
                      <StatusPill status={row.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PagePanel>

      {selected ? (
        <div className="overflow-hidden rounded-2xl border border-black/5 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_20px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-primary/10 bg-gradient-to-r from-primary/10 via-sky-50/40 to-card px-4 py-4 dark:via-[#141a22] sm:px-6">
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-white text-primary shadow-sm dark:border-white/10 dark:bg-[#1c2430]">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Ficha do processo
                </p>
                <h2 className="text-lg font-semibold tracking-tight">
                  {selected.nome}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {selected.lead?.tipo === "cliente" ? "Cliente" : "Lead"}
                  {selected.fonte ? ` · Fonte ${selected.fonte}` : ""}
                  {selected.corretor?.name
                    ? ` · ${selected.corretor.name}`
                    : ""}
                </p>
              </div>
            </div>
            <StatusPill status={selected.status} />
          </div>

          <div className="space-y-5 p-4 sm:p-6">
            <FormSection
              icon={<UserRound className="h-4 w-4" />}
              title="Dados do contato"
              description="Informações preenchidas a partir do lead ou cliente."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nome">
                  <Input
                    value={form.nome}
                    disabled={!canEdit}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  />
                </Field>
                <Field label="Fonte">
                  <Input
                    value={form.fonte}
                    disabled={!canEdit}
                    onChange={(e) =>
                      setForm({ ...form, fonte: e.target.value })
                    }
                  />
                </Field>
                <Field
                  label="Contato"
                  icon={<Phone className="h-3.5 w-3.5 text-primary" />}
                >
                  <Input
                    value={form.telefone}
                    disabled={!canEdit}
                    onChange={(e) =>
                      setForm({ ...form, telefone: e.target.value })
                    }
                  />
                </Field>
                <Field
                  label="E-mail"
                  icon={<Mail className="h-3.5 w-3.5 text-primary" />}
                >
                  <Input
                    value={form.email}
                    disabled={!canEdit}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </Field>
                <Field label="Estado civil">
                  <Input
                    value={form.estadoCivil}
                    disabled={!canEdit}
                    onChange={(e) =>
                      setForm({ ...form, estadoCivil: e.target.value })
                    }
                  />
                </Field>
                <Field label="Carteira assinada / tipo de renda">
                  <Input
                    value={form.tipoRenda}
                    disabled={!canEdit}
                    onChange={(e) =>
                      setForm({ ...form, tipoRenda: e.target.value })
                    }
                  />
                </Field>
                <Field label="Cotista">
                  <Select
                    value={form.cotista ? "sim" : "nao"}
                    disabled={!canEdit}
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
                </Field>
                <Field label="Dependente">
                  <Select
                    value={form.dependente ? "sim" : "nao"}
                    disabled={!canEdit}
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
                </Field>
              </div>
            </FormSection>

            <FormSection
              icon={<Building2 className="h-4 w-4" />}
              title="Comercial"
              description="Empreendimento, corretor responsável e gerente que recebe o envio."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Empreendimento">
                  <Select
                    value={form.empreendimentoId || undefined}
                    disabled={!canEdit}
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
                </Field>
                <Field
                  label="Corretor"
                  icon={<Briefcase className="h-3.5 w-3.5 text-primary" />}
                >
                  <Select
                    value={form.corretorId || undefined}
                    disabled={!canEdit}
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
                </Field>
                <Field
                  label="Gerente"
                  icon={<Users className="h-3.5 w-3.5 text-primary" />}
                >
                  <Select
                    value={form.gerenteId || undefined}
                    disabled={!canEdit}
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
                </Field>
              </div>
            </FormSection>

            {canEdit ? (
              <div className="flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-primary/10 bg-gradient-to-r from-card to-primary/[0.04] px-4 py-3">
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
                <Button
                  type="button"
                  onClick={() => void onEnviar()}
                  disabled={saving}
                >
                  <Send className="mr-1 h-4 w-4" />
                  Enviar
                </Button>
              </div>
            ) : null}

            <FormSection
              icon={<FileText className="h-4 w-4" />}
              title="Documentações"
              description="Os arquivos sobem aqui e aparecem na ficha do lead ou cliente."
            >
              <DocumentosPanel
                entityType="processo"
                entityId={selected.id}
                categoria="ficha"
                extraVinculo={{
                  entityType: "lead",
                  entityId: selected.leadId,
                }}
                title="Arquivos do processo"
                allowUpload={Boolean(canEdit)}
              />
            </FormSection>

            {(selected.retornos?.length ?? 0) > 0 ? (
              <FormSection
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
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={cn("mt-3", SOFT_BTN)}
                          onClick={() => {
                            void previewArquivo(r.arquivoId!).then((res) =>
                              window.open(res.url, "_blank"),
                            );
                          }}
                        >
                          <FileText className="mr-1 h-4 w-4" />
                          Ver PDF do retorno
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </FormSection>
            ) : null}

            {gestor && selected.status === "enviado" ? (
              <FormSection
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
                    <Label>PDF opcional</Label>
                    <Input
                      type="file"
                      accept="application/pdf"
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
          </div>
        </div>
      ) : null}

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
  icon?: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-xs font-medium text-[#0B3148] dark:text-[#E7F4FA]">
        {icon}
        {label}
      </Label>
      {children}
    </div>
  );
}
