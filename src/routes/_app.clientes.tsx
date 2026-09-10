import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { TablePager } from "@/components/table-pager";
import { useTablePager } from "@/lib/use-table-pager";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
  FormSection,
  DetailField,
} from "@/components/form-dialog";
import { getSession } from "@/lib/auth";
import { getAdminVerClientesCorretor } from "@/lib/clientes-nav-prefs";
import {
  canAccessRoute,
  canViewTeamData,
  isCorretorLike,
} from "@/lib/permissions";
import { contratoTemplatesForRole } from "@/lib/contratos-templates";
import { TableSortSelect } from "@/components/table-sort-select";
import {
  DEFAULT_TABLE_SORT,
  sortByTableOrder,
  type TableSort,
} from "@/lib/table-sort";
import { useLeads } from "@/lib/leads-store";
import { useCatalog } from "@/lib/catalog-store";
import { LostMotivoFields } from "@/components/lost-motivo-fields";
import { brl, type Lead } from "@/lib/crm-types";
import { ApiError } from "@/lib/api";
import { importLeads, checkImportDuplicates } from "@/lib/leads-api";
import {
  downloadImportTemplate,
  exportLeadsToExcel,
  exportLeadsToPdf,
  parseLeadsFromFile,
  applyImportConflictErrors,
  type ImportExistingIndex,
  type ParsedImportLead,
} from "@/lib/leads-io";
import {
  formatMoneyInput,
  maskMoneyInput,
  parseOptionalMoneyInput,
} from "@/lib/money-input";
import {
  formatPhone,
  isValidPhone,
  phoneDigits,
  PHONE_INVALID_MESSAGE,
  PHONE_PLACEHOLDER,
} from "@/lib/phone";
import { displayEmail, isPlaceholderEmail } from "@/lib/email";
import {
  Plus,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  UserPlus,
  MapPin,
  Sparkles,
  Wallet,
  Upload,
  Download,
  Loader2,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { cn, userFacingError } from "@/lib/utils";
import {
  FILTER_BAR_SHELL,
  FILTER_CONTROL,
} from "@/lib/filter-bar";
import {
  catalogColorBadgeClass,
  catalogColorBadgeStyle,
  STATUS_CHIP_CLASS,
} from "@/lib/catalog-colors";
import { toast } from "sonner";
import { ContatoContratoFields } from "@/components/contato-contrato-fields";
import { SOFT_BTN } from "@/lib/soft-btn";
import { BRAND_GRADIENT_STYLE } from "@/lib/brand-gradient";

export const Route = createFileRoute("/_app/clientes")({
  head: () => ({ meta: [{ title: "Clientes — Zone Connection" }] }),
  component: Clientes,
});

const CLIENTES_GRADIENT_BTN =
  "border-0 bg-transparent text-white shadow-sm hover:bg-transparent hover:brightness-110 disabled:opacity-50";
const CLIENTES_GRADIENT_STYLE = BRAND_GRADIENT_STYLE;

type FormState = {
  nome: string;
  telefone: string;
  email: string;
  origem: string;
  interesse: Lead["interesse"];
  /** Renda mensal do cliente (opcional); só dígitos no input. */
  renda: string;
  orcamentoMax: string;
  quartosMin: string;
  vagasMin: string;
  cidade: string;
  bairro: string;
  corretor: string;
  tags: string[];
  /** YYYY-MM-DD — cadastro retroativo. */
  createdAt: string;
  cpf: string;
  rg: string;
  endereco: string;
  cep: string;
};

type FormMode = "create" | "edit";

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(corretorDefault: string, origemDefault = ""): FormState {
  return {
    nome: "",
    telefone: "",
    email: "",
    origem: origemDefault,
    interesse: "Comprar",
    renda: "",
    orcamentoMax: "",
    quartosMin: "",
    vagasMin: "",
    cidade: "Recife",
    bairro: "",
    corretor: corretorDefault,
    tags: [],
    createdAt: todayInput(),
    cpf: "",
    rg: "",
    endereco: "",
    cep: "",
  };
}

function leadToForm(lead: Lead): FormState {
  return {
    nome: lead.nome,
    telefone: formatPhone(lead.telefone),
    email: isPlaceholderEmail(lead.email) ? "" : lead.email,
    origem: lead.origem,
    interesse: lead.interesse,
    renda: lead.renda != null ? formatMoneyInput(lead.renda) : "",
    orcamentoMax:
      lead.orcamentoMax != null ? formatMoneyInput(lead.orcamentoMax) : "",
    quartosMin: lead.quartosMin != null ? String(lead.quartosMin) : "",
    vagasMin: lead.vagasMin != null ? String(lead.vagasMin) : "",
    cidade: lead.cidade,
    bairro: lead.bairro,
    corretor: lead.corretor,
    tags: [...lead.tags],
    createdAt: lead.createdAt?.slice(0, 10) || todayInput(),
    cpf: lead.cpf ?? "",
    rg: lead.rg ?? "",
    endereco: lead.endereco ?? "",
    cep: lead.cep ?? "",
  };
}

function initials(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Clientes() {
  const navigate = useNavigate();
  const user = getSession();
  const canSeeTeam = user ? canViewTeamData(user.role) : false;
  const canContratos = Boolean(
    user &&
      canAccessRoute(
        user.role,
        "/contratos",
        user.tenant?.modules ?? null,
        user.tenant?.plano,
        user.permissions,
      ),
  );
  const contratoModelos = useMemo(
    () => contratoTemplatesForRole(user?.role),
    [user?.role],
  );
  const [contratoCliente, setContratoCliente] = useState<Lead | null>(null);
  const isCorretor = !canSeeTeam;
  const isAdmin = user?.role === "admin";
  const isGerente = user?.role === "gerente";
  const canOwnCarteira = isAdmin || isGerente;
  const adminVeClientesCorretor = getAdminVerClientesCorretor();

  const {
    leads: allLeads,
    addLead,
    updateLead,
    markLeadLost,
    markLeadsLost,
    resolveCorretorId,
    assignees,
    loading,
    refresh,
  } = useLeads();
  const {
    funnelStages,
    origens: origemOptions,
    tags: tagOptions,
    colorByLabel,
    refresh: refreshCatalog,
  } = useCatalog();

  const stageName = (stage: Lead["stage"]) =>
    funnelStages.find((s) => s.id === stage)?.name ?? stage;

  const clientes = useMemo(() => {
    const byTipo = allLeads.filter((l) => l.tipo === "cliente");
    if (adminVeClientesCorretor) return byTipo;
    // Carteira pessoal: corretor, admin e gerente só veem os próprios clientes.
    if (!user) return [];
    return byTipo.filter(
      (l) => l.corretorId === user.id || l.corretor === user.name,
    );
  }, [adminVeClientesCorretor, allLeads, user]);

  const [sort, setSort] = useState<TableSort>(DEFAULT_TABLE_SORT);
  const sortedClientes = useMemo(
    () =>
      sortByTableOrder(
        clientes,
        sort,
        (c) => c.nome,
        (c) => c.createdAt,
      ),
    [clientes, sort],
  );
  const clientesPager = useTablePager(sortedClientes, sort);

  const corretorOptions = useMemo(
    () =>
      assignees
        .filter(
          (a) =>
            !a.role ||
            isCorretorLike(a.role) ||
            (canOwnCarteira &&
              (a.role === "admin" || a.role === "gerente") &&
              a.id === user?.id),
        )
        .map((a) => a.name),
    [assignees, canOwnCarteira, user?.id],
  );

  const defaultCorretor =
    (isCorretor || canOwnCarteira) && user
      ? user.name
      : (corretorOptions[0] ?? "");

  const importInputRef = useRef<HTMLInputElement>(null);
  const [importHelpOpen, setImportHelpOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<ParsedImportLead[]>([]);
  const [importParsing, setImportParsing] = useState(false);
  const [importSaving, setImportSaving] = useState(false);
  const [importFileName, setImportFileName] = useState("");
  const [importEditingInvalids, setImportEditingInvalids] = useState(false);
  const [importExisting, setImportExisting] = useState<ImportExistingIndex>({
    phones: {},
    emails: {},
  });

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm(""));

  const [detail, setDetail] = useState<Lead | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkMotivo, setBulkMotivo] = useState("");
  const [bulkMotivoOutro, setBulkMotivoOutro] = useState("");
  const [deleteMotivo, setDeleteMotivo] = useState("");
  const [deleteMotivoOutro, setDeleteMotivoOutro] = useState("");

  function openCreate() {
    setFormMode("create");
    setEditingId(null);
    setForm(
      emptyForm(
        isCorretor || canOwnCarteira
          ? defaultCorretor
          : (corretorOptions[0] ?? defaultCorretor),
      ),
    );
    setFormOpen(true);
  }

  function openEdit(l: Lead) {
    setFormMode("edit");
    setEditingId(l.id);
    setForm(leadToForm(l));
    setFormOpen(true);
    setDetail(null);
  }

  function toggleTag(tag: string) {
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(tag)
        ? f.tags.filter((t) => t !== tag)
        : [...f.tags, tag],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nome = form.nome.trim();
    const telefone = form.telefone.trim();
    const email = form.email.trim();
    const cidade = form.cidade.trim() || "Recife";
    const bairro = form.bairro.trim() || "—";
    const corretorNome = isCorretor ? defaultCorretor : form.corretor;

    if (!nome || !telefone) {
      toast.error("Preencha nome e telefone.");
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Informe um e-mail válido ou deixe em branco.");
      return;
    }
    if (!isValidPhone(telefone)) {
      toast.error(PHONE_INVALID_MESSAGE);
      return;
    }
    if (form.origem && !origemOptions.includes(form.origem)) {
      toast.error("Selecione uma origem válida ou deixe em branco.");
      return;
    }
    if (!corretorNome) {
      toast.error("Selecione o responsável pelo cliente.");
      return;
    }

    const corretorId = isCorretor
      ? undefined
      : resolveCorretorId(corretorNome) ??
        (canOwnCarteira && user && corretorNome === user.name
          ? user.id
          : undefined);
    const rendaParsed = parseOptionalMoneyInput(String(form.renda));
    const rendaNum =
      rendaParsed != null ? Math.round(rendaParsed) : null;
    const orcamentoParsed = parseOptionalMoneyInput(String(form.orcamentoMax));
    const orcamentoMax =
      orcamentoParsed != null ? Math.round(orcamentoParsed) : null;
    const quartosMin = form.quartosMin.trim()
      ? Number.parseInt(form.quartosMin, 10)
      : null;
    const vagasMin = form.vagasMin.trim()
      ? Number.parseInt(form.vagasMin, 10)
      : null;
    const emailFinal =
      email || `contato.${phoneDigits(telefone)}@sem-email.local`;
    const origemFinal = form.origem.trim() || "Não informado";

    try {
      if (formMode === "create") {
        await addLead({
          tipo: "cliente",
          nome,
          telefone,
          email: emailFinal,
          origem: origemFinal,
          interesse: form.interesse,
          cidade,
          bairro,
          prioridade: "Média",
          ...(rendaNum != null ? { renda: rendaNum } : {}),
          ...(orcamentoMax != null ? { orcamentoMax } : {}),
          ...(Number.isFinite(quartosMin) && quartosMin != null
            ? { quartosMin }
            : {}),
          ...(Number.isFinite(vagasMin) && vagasMin != null ? { vagasMin } : {}),
          tags: form.tags,
          ...(corretorId ? { corretorId } : {}),
          ...(form.createdAt ? { createdAt: form.createdAt } : {}),
          ...(form.cpf.trim() ? { cpf: form.cpf.trim() } : {}),
          ...(form.rg.trim() ? { rg: form.rg.trim() } : {}),
          ...(form.endereco.trim() ? { endereco: form.endereco.trim() } : {}),
          ...(form.cep.trim() ? { cep: form.cep.trim() } : {}),
        });
        setFormOpen(false);
        toast.success(`Cliente "${nome}" cadastrado.`);
      } else if (editingId) {
        await updateLead(editingId, {
          nome,
          telefone,
          email: emailFinal,
          origem: origemFinal,
          interesse: form.interesse,
          cidade,
          bairro,
          renda: rendaNum,
          orcamentoMax,
          quartosMin: Number.isFinite(quartosMin) ? quartosMin : null,
          vagasMin: Number.isFinite(vagasMin) ? vagasMin : null,
          tags: form.tags,
          ...(corretorId ? { corretorId } : {}),
          ...(form.createdAt ? { createdAt: form.createdAt } : {}),
          cpf: form.cpf.trim() || null,
          rg: form.rg.trim() || null,
          endereco: form.endereco.trim() || null,
          cep: form.cep.trim() || null,
        });
        setFormOpen(false);
        toast.success("Cliente atualizado.");
      }
    } catch (err) {
      toast.error(
        userFacingError(err, "Não foi possível salvar o cliente."),
      );
    }
  }

  const allVisibleIds = useMemo(() => clientes.map((c) => c.id), [clientes]);
  const allSelected =
    allVisibleIds.length > 0 &&
    allVisibleIds.every((id) => selectedIds.has(id));
  const someSelected = allVisibleIds.some((id) => selectedIds.has(id));
  const selectedCount = selectedIds.size;

  function toggleSelectAll(checked: boolean) {
    setSelectedIds(checked ? new Set(allVisibleIds) : new Set());
  }

  function toggleSelectOne(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const motivo =
      deleteMotivo === "__outro__"
        ? deleteMotivoOutro.trim()
        : deleteMotivo.trim();
    if (!motivo) {
      toast.error("Selecione ou informe o motivo da exclusão.");
      return;
    }
    try {
      const id = deleteTarget.id;
      const nome = deleteTarget.nome;
      if (detail?.id === id) setDetail(null);
      setDeleteTarget(null);
      setDeleteMotivo("");
      setDeleteMotivoOutro("");
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.success(`Cliente "${nome}" movido para Perda de cliente.`);
      await markLeadLost(id, motivo);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Não foi possível excluir o cliente.",
      );
    }
  }

  async function confirmBulkDelete() {
    const motivo =
      bulkMotivo === "__outro__" ? bulkMotivoOutro.trim() : bulkMotivo.trim();
    if (!motivo) {
      toast.error("Selecione ou informe o motivo da exclusão.");
      return;
    }
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setBulkDeleteOpen(false);
    setBulkMotivo("");
    setBulkMotivoOutro("");
    setBulkDeleting(true);
    try {
      const result = await markLeadsLost(ids, motivo);
      setSelectedIds(new Set());
      if (detail && ids.includes(detail.id)) setDetail(null);
      if (result.skipped === 0) {
        toast.success(
          result.updated === 1
            ? "1 cliente movido para Perda de cliente."
            : `${result.updated} clientes movidos para Perda de cliente.`,
        );
      } else {
        toast.error(
          `${result.updated} excluído(s), ${result.skipped} com erro.`,
        );
      }
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Não foi possível excluir os clientes.",
      );
    } finally {
      setBulkDeleting(false);
    }
  }

  async function handleImportFile(file: File) {
    setImportParsing(true);
    setImportFileName(file.name);
    try {
      const rows = await parseLeadsFromFile(file, {
        origem: origemOptions[0] ?? "Importação",
      });
      if (rows.length === 0) {
        toast.error("Nenhum cliente encontrado no arquivo.");
        return;
      }
      let existing: ImportExistingIndex = { phones: {}, emails: {} };
      try {
        existing = await checkImportDuplicates({
          telefones: rows
            .map((r) => r.telefone)
            .filter((t) => t.trim())
            .slice(0, 600),
          emails: rows
            .map((r) => r.email)
            .filter((e) => e.trim())
            .slice(0, 600),
          tipo: "cliente",
        });
      } catch {
        toast.message(
          "Não foi possível conferir duplicados agora. Os válidos ainda podem ser importados; a base bloqueia telefone/e-mail já cadastrado.",
        );
      }
      setImportExisting(existing);
      setImportRows(applyImportConflictErrors(rows, existing, "cliente"));
      setImportEditingInvalids(false);
      setImportOpen(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Não foi possível ler o arquivo.",
      );
    } finally {
      setImportParsing(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  }

  function patchImportRow(
    index: number,
    patch: Partial<Pick<ParsedImportLead, "nome" | "telefone" | "email" | "cidade" | "origem">>,
  ) {
    setImportRows((prev) =>
      applyImportConflictErrors(
        prev.map((row, i) =>
          i === index ? { ...row, ...patch } : row,
        ),
        importExisting,
        "cliente",
      ),
    );
  }

  async function confirmImport() {
    const valid = importRows.filter((r) => !r.error);
    if (valid.length === 0) {
      toast.error("Nenhum cliente válido para importar.");
      return;
    }
    const MAX_IMPORT = 600;
    const batch = valid.slice(0, MAX_IMPORT);
    if (valid.length > MAX_IMPORT) {
      toast.message(
        `A importação aceita no máximo ${MAX_IMPORT} registros por vez. Os demais não foram enviados.`,
      );
    }
    setImportSaving(true);
    try {
      const result = await importLeads(
        batch.map((r) => ({
          nome: r.nome,
          telefone: r.telefone,
          email: r.email || undefined,
          origem: r.origem || origemOptions[0] || "Importação",
          interesse: r.interesse,
          cidade: r.cidade || undefined,
          bairro: r.bairro || undefined,
          prioridade: r.prioridade,
          renda: r.renda,
        })),
        { tipo: "cliente" },
      );
      setImportOpen(false);
      setImportRows([]);
      setImportEditingInvalids(false);
      await refresh({ silent: true });
      await refreshCatalog({ silent: true });
      if (result.failed > 0) {
        const sample = result.errors
          .slice(0, 3)
          .map((e) => `${e.nome}: ${e.message}`)
          .join(" · ");
        toast.error(
          `${result.created} importado(s), ${result.failed} com erro.${
            sample ? ` ${sample}` : ""
          }`,
        );
      } else {
        toast.success(`${result.created} cliente(s) importado(s).`);
      }
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível importar os clientes.",
      );
    } finally {
      setImportSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={adminVeClientesCorretor ? "Clientes" : "Meus clientes"}
        description={
          loading
            ? "Carregando clientes..."
            : adminVeClientesCorretor
              ? "Sua carteira e a dos corretores — também aparece no funil de clientes."
              : "Sua carteira pessoal de clientes — também aparece no funil. A carteira do corretor é privada."
        }
        actions={
          <>
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setImportHelpOpen(false);
                  void handleImportFile(file);
                }
              }}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={importParsing}
              onClick={() => setImportHelpOpen(true)}
              className={SOFT_BTN}
            >
              {importParsing ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-1" />
              )}
              Importar
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={clientes.length === 0}
                  className={SOFT_BTN}
                >
                  <Download className="w-4 h-4 mr-1" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    exportLeadsToExcel(
                      clientes,
                      `clientes-${new Date().toISOString().slice(0, 10)}.xlsx`,
                      "Clientes",
                    )
                  }
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    exportLeadsToPdf(
                      clientes,
                      `clientes-${new Date().toISOString().slice(0, 10)}.pdf`,
                      user?.tenant?.name?.trim() || "Imobiliária",
                      "Clientes",
                    )
                  }
                >
                  <FileText className="w-4 h-4 mr-2" />
                  PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {selectedCount > 0 && (
              <Button
                variant="destructive"
                size="sm"
                disabled={bulkDeleting}
                onClick={() => setBulkDeleteOpen(true)}
              >
                {bulkDeleting ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-1" />
                )}
                Excluir ({selectedCount})
              </Button>
            )}
            <Button
              size="sm"
              onClick={openCreate}
              className={CLIENTES_GRADIENT_BTN}
              style={CLIENTES_GRADIENT_STYLE}
            >
              <Plus className="w-4 h-4 mr-1" />
              Novo cliente
            </Button>
          </>
        }
      />
      <div className={FILTER_BAR_SHELL}>
        <TableSortSelect
          value={sort}
          onChange={setSort}
          className={FILTER_CONTROL}
        />
      </div>
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={
                    allSelected
                      ? true
                      : someSelected
                        ? "indeterminate"
                        : false
                  }
                  onCheckedChange={(v) => toggleSelectAll(v === true)}
                  aria-label="Selecionar todos os clientes"
                  disabled={clientes.length === 0 || bulkDeleting}
                />
              </TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Interesse</TableHead>
              <TableHead>Cidade</TableHead>
              {!isCorretor && <TableHead>Corretor</TableHead>}
              <TableHead>Tags</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientesPager.pageItems.map((l) => (
              <TableRow
                key={l.id}
                className="hover:bg-muted/40 cursor-pointer"
                onClick={() => setDetail(l)}
                data-state={selectedIds.has(l.id) ? "selected" : undefined}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(l.id)}
                    onCheckedChange={(v) => toggleSelectOne(l.id, v === true)}
                    aria-label={`Selecionar ${l.nome}`}
                    disabled={bulkDeleting}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="avatar-fallback-brand text-xs">
                        {initials(l.nome)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="table-person-name text-sm">{l.nome}</div>
                      {displayEmail(l.email) ? (
                        <div className="text-xs text-muted-foreground">
                          {displayEmail(l.email)}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{l.telefone}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={STATUS_CHIP_CLASS} title={l.interesse}>
                    {l.interesse}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {l.bairro}
                  {l.cidade ? `, ${l.cidade}` : ""}
                </TableCell>
                {!isCorretor && (
                  <TableCell className="table-person-name text-sm">
                    {l.corretor}
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {l.tags.map((t) => (
                      <Badge
                        key={t}
                        className={cn(STATUS_CHIP_CLASS, colorByLabel("tag", t))}
                        title={t}
                      >
                        {t}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setDetail(l)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Visualizar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(l)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      {canContratos ? (
                        <DropdownMenuItem
                          onClick={() => setContratoCliente(l)}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Contrato
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteTarget(l)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {clientes.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={isCorretor ? 7 : 8}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  Nenhum cliente cadastrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <TablePager
          page={clientesPager.page}
          totalPages={clientesPager.totalPages}
          total={clientesPager.total}
          onPageChange={clientesPager.setPage}
        />
      </Card>

      {/* Criar / Editar */}
      <FormDialogShell
        open={formOpen}
        onOpenChange={setFormOpen}
        icon={
          formMode === "edit" ? (
            <Pencil className="w-5 h-5" />
          ) : (
            <UserPlus className="w-5 h-5" />
          )
        }
        title={formMode === "edit" ? "Editar cliente" : "Novo cliente"}
        description={
          formMode === "edit"
            ? "Atualize os dados do contato."
            : "Cadastre um novo cliente na base da equipe."
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <FormDialogBody>
            <FormSection
              icon={<Sparkles className="w-3.5 h-3.5 text-primary" />}
              title="Contato"
            >
              <div className="space-y-1.5">
                <Label
                  htmlFor="cli-nome"
                  className="text-xs text-muted-foreground"
                >
                  Nome completo
                </Label>
                <Input
                  id="cli-nome"
                  value={form.nome}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, nome: e.target.value }))
                  }
                  placeholder="Ex.: João Pereira"
                  className="h-10 bg-background"
                  autoFocus
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="cli-tel"
                    className="text-xs text-muted-foreground"
                  >
                    Telefone
                  </Label>
                  <Input
                    id="cli-tel"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel"
                    value={form.telefone}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        telefone: formatPhone(e.target.value),
                      }))
                    }
                    placeholder={PHONE_PLACEHOLDER}
                    className="h-10 bg-background"
                    maxLength={15}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="cli-email"
                    className="text-xs text-muted-foreground"
                  >
                    E-mail{" "}
                    <span className="font-normal">(opcional)</span>
                  </Label>
                  <Input
                    id="cli-email"
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    placeholder="email@exemplo.com"
                    className="h-10 bg-background"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Origem <span className="font-normal">(opcional)</span>
                  </Label>
                  <Select
                    value={form.origem || "__none__"}
                    onValueChange={(v) =>
                      setForm((f) => ({
                        ...f,
                        origem: v === "__none__" ? "" : v,
                      }))
                    }
                  >
                    <SelectTrigger className="h-10 bg-background">
                      <SelectValue placeholder="Selecione a origem" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Sem origem</SelectItem>
                      {origemOptions.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                      {formMode === "edit" &&
                        form.origem &&
                        !origemOptions.includes(form.origem) && (
                          <SelectItem value={form.origem}>
                            {form.origem}
                          </SelectItem>
                        )}
                    </SelectContent>
                  </Select>
                </div>
                {!isCorretor && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Responsável
                    </Label>
                    <Select
                      value={form.corretor}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, corretor: v }))
                      }
                    >
                      <SelectTrigger className="h-10 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {corretorOptions.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                        {form.corretor &&
                          !corretorOptions.includes(form.corretor) && (
                            <SelectItem value={form.corretor}>
                              {form.corretor}
                            </SelectItem>
                          )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Data de cadastro
                  </Label>
                  <Input
                    type="date"
                    value={form.createdAt}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, createdAt: e.target.value }))
                    }
                    className="h-10 bg-background"
                  />
                </div>
              </div>
            </FormSection>

            <FormSection
              icon={<FileText className="w-3.5 h-3.5 text-primary" />}
              title="Para contratos"
              description="Opcional. Se preencher, o contrato já sai com CPF, RG e endereço."
            >
              <ContatoContratoFields
                idPrefix="cli"
                values={{
                  cpf: form.cpf,
                  rg: form.rg,
                  endereco: form.endereco,
                  cep: form.cep,
                }}
                onChange={(patch) =>
                  setForm((f) => ({ ...f, ...patch }))
                }
              />
            </FormSection>

            <FormSection
              icon={<Wallet className="w-3.5 h-3.5 text-primary" />}
              title="Interesse"
            >
              <div className="space-y-1.5">
                <Label
                  htmlFor="cli-renda"
                  className="text-xs text-muted-foreground"
                >
                  Renda mensal <span className="font-normal">(opcional)</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                    R$
                  </span>
                  <Input
                    id="cli-renda"
                    inputMode="numeric"
                    value={form.renda}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        renda: maskMoneyInput(e.target.value),
                      }))
                    }
                    placeholder="0,00"
                    className="h-10 bg-background pl-9"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="cli-orcamento"
                  className="text-xs text-muted-foreground"
                >
                  Orçamento máx. <span className="font-normal">(opcional)</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                    R$
                  </span>
                  <Input
                    id="cli-orcamento"
                    inputMode="numeric"
                    value={form.orcamentoMax}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        orcamentoMax: maskMoneyInput(e.target.value),
                      }))
                    }
                    placeholder="0,00"
                    className="h-10 bg-background pl-9"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="cli-quartos-min"
                    className="text-xs text-muted-foreground"
                  >
                    Quartos mín.
                  </Label>
                  <Input
                    id="cli-quartos-min"
                    inputMode="numeric"
                    value={form.quartosMin}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        quartosMin: e.target.value.replace(/\D/g, ""),
                      }))
                    }
                    placeholder="Ex.: 3"
                    className="h-10 bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="cli-vagas-min"
                    className="text-xs text-muted-foreground"
                  >
                    Vagas mín.
                  </Label>
                  <Input
                    id="cli-vagas-min"
                    inputMode="numeric"
                    value={form.vagasMin}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        vagasMin: e.target.value.replace(/\D/g, ""),
                      }))
                    }
                    placeholder="Ex.: 2"
                    className="h-10 bg-background"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tags</Label>
                <div className="flex flex-wrap gap-1.5">
                  {tagOptions.map((tag) => {
                    const active = form.tags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-xs transition-colors",
                          active
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "bg-background text-muted-foreground hover:bg-accent",
                        )}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            </FormSection>

            <FormSection
              icon={<MapPin className="w-3.5 h-3.5 text-primary" />}
              title="Localização"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="cli-cidade"
                    className="text-xs text-muted-foreground"
                  >
                    Cidade
                  </Label>
                  <Input
                    id="cli-cidade"
                    value={form.cidade}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, cidade: e.target.value }))
                    }
                    placeholder="Recife"
                    className="h-10 bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="cli-bairro"
                    className="text-xs text-muted-foreground"
                  >
                    Bairro
                  </Label>
                  <Input
                    id="cli-bairro"
                    value={form.bairro}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, bairro: e.target.value }))
                    }
                    placeholder="Boa Viagem"
                    className="h-10 bg-background"
                  />
                </div>
              </div>
            </FormSection>
          </FormDialogBody>

          <FormDialogActions
            hint={
              formMode === "edit"
                ? "As alterações ficam só nesta sessão (demo)."
                : "O cliente entra na base e no funil."
            }
          >
            <Button
              type="button"
              variant="outline"
              className={`flex-1 sm:flex-none ${SOFT_BTN}`}
              onClick={() => setFormOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className={`flex-1 sm:flex-none ${CLIENTES_GRADIENT_BTN}`}
              style={CLIENTES_GRADIENT_STYLE}
            >
              {formMode === "edit" ? "Salvar alterações" : "Cadastrar cliente"}
            </Button>
          </FormDialogActions>
        </form>
      </FormDialogShell>

      {/* Visualizar */}
      <FormDialogShell
        open={!!detail}
        onOpenChange={(open) => !open && setDetail(null)}
        icon={<Eye className="w-5 h-5" />}
        title={detail?.nome ?? "Detalhes do cliente"}
        description={
          detail ? (
            <span className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={STATUS_CHIP_CLASS} title={detail.interesse}>
                {detail.interesse}
              </Badge>
              <span>{stageName(detail.stage)}</span>
            </span>
          ) : undefined
        }
      >
        {detail && (
          <>
            <FormDialogBody>
              <FormSection
                icon={<Sparkles className="w-3.5 h-3.5 text-primary" />}
                title="Contato"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailField label="Telefone" value={detail.telefone} />
                  <DetailField
                    label="E-mail"
                    value={displayEmail(detail.email) || "—"}
                  />
                  <DetailField
                    label="Origem"
                    value={
                      detail.origem ? (
                        <Badge
                          className={catalogColorBadgeClass(
                            colorByLabel("origem", detail.origem),
                          )}
                          style={catalogColorBadgeStyle(
                            colorByLabel("origem", detail.origem),
                          )}
                          title={detail.origem}
                        >
                          {detail.origem}
                        </Badge>
                      ) : (
                        "—"
                      )
                    }
                  />
                  {!isCorretor && (
                    <DetailField label="Corretor" value={detail.corretor} />
                  )}
                </div>
              </FormSection>
              <FormSection
                icon={<Wallet className="w-3.5 h-3.5 text-primary" />}
                title="Interesse e renda"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailField label="Interesse" value={detail.interesse} />
                  <DetailField
                    label="Renda mensal"
                    value={detail.renda != null ? brl(detail.renda) : "—"}
                  />
                  {detail.tags.length > 0 && (
                    <div className="sm:col-span-2 space-y-1.5">
                      <div className="text-xs text-muted-foreground">Tags</div>
                      <div className="flex flex-wrap gap-1.5">
                        {detail.tags.map((t) => (
                          <Badge
                            key={t}
                            className={cn(STATUS_CHIP_CLASS, colorByLabel("tag", t))}
                            title={t}
                          >
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </FormSection>
              <FormSection
                icon={<MapPin className="w-3.5 h-3.5 text-primary" />}
                title="Localização"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailField label="Cidade" value={detail.cidade} />
                  <DetailField label="Bairro" value={detail.bairro} />
                </div>
              </FormSection>
            </FormDialogBody>
            <FormDialogActions hint={`Atualizado em ${detail.updatedAt}`}>
              <Button
                variant="outline"
                className={`flex-1 sm:flex-none ${SOFT_BTN}`}
                onClick={() => openEdit(detail)}
              >
                <Pencil className="w-4 h-4" />
                Editar
              </Button>
              <Button
                variant="destructive"
                className="flex-1 sm:flex-none"
                onClick={() => setDeleteTarget(detail)}
              >
                <Trash2 className="w-4 h-4" />
                Excluir
              </Button>
            </FormDialogActions>
          </>
        )}
      </FormDialogShell>

      <Dialog
        open={Boolean(contratoCliente)}
        onOpenChange={(open) => {
          if (!open) setContratoCliente(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Contrato</DialogTitle>
            <DialogDescription>
              {contratoCliente
                ? `Escolha o modelo. Os dados de ${contratoCliente.nome} entram no formulário.`
                : "Escolha o modelo de contrato."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[60vh] gap-2 overflow-y-auto pr-1">
            {contratoModelos.map((template) => (
              <button
                key={template.id}
                type="button"
                className="rounded-xl border px-3 py-2.5 text-left hover:border-primary/40 hover:bg-primary/5"
                onClick={() => {
                  if (!contratoCliente) return;
                  const clienteId = contratoCliente.id;
                  setContratoCliente(null);
                  void navigate({
                    to: "/contratos",
                    search: { lead: clienteId, modelo: template.id },
                  });
                }}
              >
                <div className="text-sm font-semibold">{template.titulo}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {template.descricao}
                </div>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setContratoCliente(null)}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Excluir cliente da carteira → Perda de cliente (só corretor) */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteMotivo("");
            setDeleteMotivoOutro("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Por que está excluindo este cliente?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `"${deleteTarget.nome}" sairá da carteira e irá para Perda de cliente (visível só para o corretor).`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-1">
            <LostMotivoFields
              value={deleteMotivo}
              outroValue={deleteMotivoOutro}
              onChange={setDeleteMotivo}
              onOutroChange={setDeleteMotivoOutro}
              selectId="cli-lost-motivo"
              outroId="cli-motivo-outro"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              Confirmar exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => {
          if (!open) {
            setBulkDeleteOpen(false);
            setBulkMotivo("");
            setBulkMotivoOutro("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir {selectedCount} cliente(s) selecionado(s)?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Os clientes sairão da carteira e irão para Perda de cliente
              (visível só para o corretor). Informe o motivo da exclusão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-1">
            <LostMotivoFields
              value={bulkMotivo}
              outroValue={bulkMotivoOutro}
              onChange={setBulkMotivo}
              onOutroChange={setBulkMotivoOutro}
              selectId="cli-bulk-lost-motivo"
              outroId="cli-bulk-motivo-outro"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void confirmBulkDelete();
              }}
            >
              Excluir selecionados
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={importHelpOpen} onOpenChange={setImportHelpOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Importar clientes</DialogTitle>
            <DialogDescription>
              Use o padrão abaixo para o arquivo ser lido corretamente.
              Preferível Excel (.xlsx).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium mb-1.5">Colunas (nessa ordem)</p>
              <div className="rounded-md border overflow-x-auto overflow-y-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/60 text-left">
                      <th className="p-2 font-medium">Nome</th>
                      <th className="p-2 font-medium">Telefone</th>
                      <th className="p-2 font-medium">Email</th>
                      <th className="p-2 font-medium">Localidade de interesse</th>
                      <th className="p-2 font-medium">Origem</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t text-muted-foreground">
                      <td className="p-2">Maria Silva</td>
                      <td className="p-2 tabular-nums">(81) 98888-7777</td>
                      <td className="p-2">maria@email.com</td>
                      <td className="p-2">Recife</td>
                      <td className="p-2">WhatsApp</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <p className="font-medium mb-1.5">Regras</p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>
                  <span className="text-foreground">Nome</span> e{" "}
                  <span className="text-foreground">Telefone</span> são
                  obrigatórios
                </li>
                <li>
                  Telefone já com DDD, ex.: (81) 98888-7777 ou 81 98888-7777
                </li>
                <li>
                  Email, Localidade de interesse e Origem são opcionais
                </li>
                <li>Uma linha = um cliente</li>
                <li>
                  Os clientes entram na sua carteira (ou na de quem importa)
                </li>
              </ul>
            </div>

            <div>
              <p className="font-medium mb-1.5">Não incluir</p>
              <p className="text-muted-foreground">
                Hora da captura, DDD em coluna separada, mensagem de captura,
                etapa, corretor ou prioridade.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 flex-col sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className={SOFT_BTN}
              onClick={() =>
                downloadImportTemplate("modelo-importacao-clientes.xlsx")
              }
            >
              <FileSpreadsheet className="w-4 h-4 mr-1" />
              Baixar modelo Excel
            </Button>
            <Button
              type="button"
              disabled={importParsing}
              onClick={() => importInputRef.current?.click()}
              className={CLIENTES_GRADIENT_BTN}
              style={CLIENTES_GRADIENT_STYLE}
            >
              {importParsing ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-1" />
              )}
              Escolher arquivo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={importOpen}
        onOpenChange={(next) => {
          setImportOpen(next);
          if (!next) setImportEditingInvalids(false);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Confirmar importação</DialogTitle>
            <DialogDescription>
              {importFileName ? `Arquivo: ${importFileName}. ` : ""}
              Formato: Nome, Telefone, Email, Localidade de interesse e Origem.
            </DialogDescription>
          </DialogHeader>
          {(() => {
            const validCount = importRows.filter((r) => !r.error).length;
            const invalidRows = importRows
              .map((row, index) => ({ row, index }))
              .filter(({ row }) => Boolean(row.error));
            const shownRows = importEditingInvalids
              ? [
                  ...invalidRows,
                  ...importRows
                    .map((row, index) => ({ row, index }))
                    .filter(({ row }) => !row.error),
                ]
              : importRows.map((row, index) => ({ row, index }));
            return (
              <>
                {invalidRows.length > 0 ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
                    <p className="font-medium text-destructive">
                      {invalidRows.length} cliente
                      {invalidRows.length === 1 ? "" : "s"} inválido
                      {invalidRows.length === 1 ? "" : "s"} — não sobem até
                      serem corrigidos ou ignorados.
                    </p>
                    <ul className="mt-1.5 max-h-28 space-y-0.5 overflow-auto text-xs text-destructive/90">
                      {invalidRows.slice(0, 12).map(({ row, index }) => (
                        <li key={`inv-${index}`}>
                          Linha {index + 1}
                          {row.nome ? ` (${row.nome})` : ""}: {row.error}
                        </li>
                      ))}
                      {invalidRows.length > 12 ? (
                        <li>… e mais {invalidRows.length - 12}</li>
                      ) : null}
                    </ul>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {validCount} cliente{validCount === 1 ? "" : "s"} pronto
                    {validCount === 1 ? "" : "s"} para importar.
                  </p>
                )}
                <div className="min-h-0 flex-1 overflow-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="p-2 font-medium">#</th>
                        <th className="p-2 font-medium">Nome</th>
                        <th className="p-2 font-medium">Telefone</th>
                        <th className="p-2 font-medium">Email</th>
                        <th className="p-2 font-medium">Localidade</th>
                        <th className="p-2 font-medium">Origem</th>
                        <th className="p-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shownRows.map(({ row, index }) => (
                        <tr
                          key={`${row.telefone}-${index}`}
                          className={cn(
                            "border-b last:border-0",
                            row.error && "bg-destructive/5",
                          )}
                        >
                          <td className="p-2 tabular-nums text-muted-foreground">
                            {index + 1}
                          </td>
                          {(
                            [
                              ["nome", row.nome],
                              ["telefone", row.telefone],
                              ["email", row.email],
                              ["cidade", row.cidade],
                              ["origem", row.origem],
                            ] as const
                          ).map(([field, value]) => (
                            <td
                              key={field}
                              className={cn(
                                "p-2",
                                field === "telefone" && "tabular-nums",
                              )}
                            >
                              {importEditingInvalids ? (
                                <Input
                                  className="h-8"
                                  value={value}
                                  onChange={(e) =>
                                    patchImportRow(index, {
                                      [field]: e.target.value,
                                    })
                                  }
                                />
                              ) : (
                                value || "—"
                              )}
                            </td>
                          ))}
                          <td className="p-2">
                            {row.error ? (
                              <span className="text-xs text-destructive">
                                {row.error}
                              </span>
                            ) : (
                              <span className="text-xs text-emerald-600 dark:text-emerald-400">
                                OK
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground">
                  {validCount} válido{validCount === 1 ? "" : "s"} ·{" "}
                  {invalidRows.length} inválido
                  {invalidRows.length === 1 ? "" : "s"}
                  {invalidRows.length > 0 && !importEditingInvalids
                    ? " (não serão enviados se você ignorar)"
                    : ""}
                </p>
                <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={importSaving}
                    onClick={() => setImportOpen(false)}
                    className={SOFT_BTN}
                  >
                    Cancelar
                  </Button>
                  {invalidRows.length > 0 && !importEditingInvalids ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={importSaving}
                      onClick={() => setImportEditingInvalids(true)}
                      className={SOFT_BTN}
                    >
                      Editar inválidos
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    disabled={importSaving || validCount === 0}
                    onClick={() => void confirmImport()}
                    className={CLIENTES_GRADIENT_BTN}
                    style={CLIENTES_GRADIENT_STYLE}
                  >
                    {importSaving && (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    )}
                    {invalidRows.length > 0
                      ? `Ignorar inválidos e importar ${validCount}`
                      : `Importar ${validCount}`}
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
