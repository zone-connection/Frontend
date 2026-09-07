import { createFileRoute } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { PageHeader } from "@/components/app-shell";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import {
  DetailField,
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
  FormSection,
} from "@/components/form-dialog";
import { Badge } from "@/components/ui/badge";
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
import { TablePager } from "@/components/table-pager";
import { useTablePager } from "@/lib/use-table-pager";
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getSession } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { brl, type Lead } from "@/lib/crm-types";
import { canViewTeamData, isCorretorLike } from "@/lib/permissions";
import { TableSortSelect } from "@/components/table-sort-select";
import {
  DEFAULT_TABLE_SORT,
  sortByTableOrder,
  type TableSort,
} from "@/lib/table-sort";
import { useLeads } from "@/lib/leads-store";
import { CorPicker } from "@/components/cor-picker";
import {
  CONSTRUTORA_CORES_PRESET,
  construtoraBadgeStyle,
  createConstrutora,
  fetchConstrutoras,
  type Construtora,
} from "@/lib/construtoras-api";
import {
  createEmpreendimento,
  fetchEmpreendimentos,
  type Empreendimento,
} from "@/lib/empreendimentos-api";
import { fetchEquipes, type Equipe } from "@/lib/equipes-api";
import { fetchDocumentacoes } from "@/lib/documentacao-api";
import { isStatusAprovadoDoc } from "@/lib/documentacao-status";
import {
  createProposta,
  deleteProposta,
  fetchEnderecoPorCep,
  fetchPropostas,
  formatPropostaDate,
  PROPOSTA_COMPOSICAO_LABEL,
  PROPOSTA_INFORMATIVA_KEYS,
  PROPOSTA_LISTA_KEYS,
  PROPOSTA_SIMPLES_KEYS,
  PROPOSTA_STATUS_LABEL,
  propostaComposicaoTotal,
  propostaDiferenca,
  propostaStatusClass,
  updateProposta,
  type CreatePropostaInput,
  type Proposta,
  type PropostaSimplesKey,
  type PropostaStatus,
} from "@/lib/propostas-api";
import {
  downloadPropostaPdfCliente,
  downloadPropostaPdfCorretor,
  getPropostaMailtoUrl,
  getPropostaWhatsAppUrl,
  propostaWhatsAppDigits,
  sharePropostaPdfWhatsApp,
  type PropostaPdfBrand,
} from "@/lib/proposta-pdf";
import { useTenantTheme } from "@/lib/tenant-theme";
import {
  formatPhone,
  isValidPhone,
  phoneDigits,
  PHONE_INVALID_MESSAGE,
  PHONE_PLACEHOLDER,
} from "@/lib/phone";
import {
  formatMoneyInput,
  maskMoneyInput,
  parseOptionalMoneyInput,
} from "@/lib/money-input";
import { cn, digitsOnly, formatCpfCnpj } from "@/lib/utils";
import {
  FILTER_BAR_SHELL,
  FILTER_CLEAR_BTN,
  FILTER_CONTROL,
  FILTER_SEARCH_ICON,
} from "@/lib/filter-bar";
import {
  Building,
  Building2,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  Clock3,
  Download,
  Eye,
  FileText,
  Handshake,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Send,
  Share2,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/propostas")({
  head: () => ({ meta: [{ title: "Propostas — Zone Connection" }] }),
  component: Page,
});

const STATUS_OPTIONS: { value: PropostaStatus | "todos"; label: string }[] = [
  { value: "todos", label: "Todos os status" },
  { value: "rascunho", label: "Rascunho" },
  { value: "enviada", label: "Enviada" },
  { value: "negociacao", label: "Em negociação" },
  { value: "aceita", label: "Aceita" },
  { value: "recusada", label: "Recusada" },
  { value: "expirada", label: "Expirada" },
];

type ParcelasForm = {
  quantidade: string;
  valor: string;
};

type PropostaFormSection =
  "usuario" | "endereco" | "profissional" | "imovel" | "valores";

type FormState = {
  leadId: string;
  clienteNome: string;
  clienteTelefone: string;
  clienteCpf: string;
  clienteRg: string;
  clienteRgOrgaoEmissor: string;
  clienteDataNascimento: string;
  clienteNacionalidade: string;
  clienteEstadoCivil: string;
  clienteRegimeBens: string;
  clienteDataCasamento: string;
  clienteNomePai: string;
  clienteNomeMae: string;
  clienteRenda: string;
  clienteTelefoneFixo: string;
  clienteEmail: string;
  clienteEnderecoResidencial: string;
  clienteBairroResidencial: string;
  clienteCidadeResidencial: string;
  clienteUfResidencial: string;
  clienteCepResidencial: string;
  clienteCobrancaResidencial: boolean | null;
  clienteEmpregador: string;
  clienteProfissao: string;
  clienteEnderecoComercial: string;
  clienteBairroComercial: string;
  clienteCidadeComercial: string;
  clienteUfComercial: string;
  clienteCepComercial: string;
  clienteCobrancaComercial: boolean | null;
  clienteSite: string;
  clienteTelefoneComercial1: string;
  clienteTelefoneComercial2: string;
  construtoraId: string;
  empreendimentoId: string;
  unidade: string;
  corretorId: string;
  valor: string;
  entrada: string;
  apartado: string;
  preChaves: ParcelasForm;
  posChaves: ParcelasForm;
  intercaladas: ParcelasForm;
  fgts: string;
  moraBem: string;
  mcmv: string;
  parcelaCaixa: string;
  financiamento: string;
  desconto: string;
  status: PropostaStatus;
  validade: string;
  observacao: string;
};

const emptyParcelas = (): ParcelasForm => ({
  quantidade: "",
  valor: "",
});

const emptyForm = (): FormState => ({
  leadId: "",
  clienteNome: "",
  clienteTelefone: "",
  clienteCpf: "",
  clienteRg: "",
  clienteRgOrgaoEmissor: "",
  clienteDataNascimento: "",
  clienteNacionalidade: "",
  clienteEstadoCivil: "",
  clienteRegimeBens: "",
  clienteDataCasamento: "",
  clienteNomePai: "",
  clienteNomeMae: "",
  clienteRenda: "",
  clienteTelefoneFixo: "",
  clienteEmail: "",
  clienteEnderecoResidencial: "",
  clienteBairroResidencial: "",
  clienteCidadeResidencial: "",
  clienteUfResidencial: "",
  clienteCepResidencial: "",
  clienteCobrancaResidencial: null,
  clienteEmpregador: "",
  clienteProfissao: "",
  clienteEnderecoComercial: "",
  clienteBairroComercial: "",
  clienteCidadeComercial: "",
  clienteUfComercial: "",
  clienteCepComercial: "",
  clienteCobrancaComercial: null,
  clienteSite: "",
  clienteTelefoneComercial1: "",
  clienteTelefoneComercial2: "",
  construtoraId: "",
  empreendimentoId: "",
  unidade: "",
  corretorId: "",
  valor: "",
  entrada: "",
  apartado: "",
  preChaves: emptyParcelas(),
  posChaves: emptyParcelas(),
  intercaladas: emptyParcelas(),
  fgts: "",
  moraBem: "",
  mcmv: "",
  parcelaCaixa: "",
  financiamento: "",
  desconto: "",
  status: "rascunho",
  validade: "",
  observacao: "",
});

function OptionalField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  onBlur,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "date" | "email";
  placeholder?: string;
  onBlur?: () => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
      />
    </div>
  );
}

function PropostaFormPreview({
  form,
  total,
}: {
  form: FormState;
  total: number;
}) {
  const line = (label: string, value: string) => (
    <div className="border-b px-4 py-2 last:border-b-0">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="truncate text-sm font-medium">
        {value.trim() || "----"}
      </div>
    </div>
  );

  return (
    <aside className="sticky top-0 space-y-3 rounded-xl border bg-background p-4 shadow-sm">
      <div className="flex items-center justify-between border-b pb-2">
        <div>
          <div className="text-sm font-semibold">Prévia do relatório</div>
          <div className="text-xs text-muted-foreground">
            Atualizada enquanto você preenche
          </div>
        </div>
        <FileText className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="aspect-210/297 min-h-112.5 overflow-hidden rounded border bg-card text-foreground">
        <div className="border-b px-4 py-3">
          <div className="text-sm font-bold">PROPOSTA DE COMPRA</div>
          <div className="text-xs text-muted-foreground">
            {form.clienteNome || "Cliente não informado"}
          </div>
        </div>
        <div className="border-b px-4 py-1.5 text-xs font-bold">
          IDENTIFICAÇÃO DO IMÓVEL
        </div>
        <div className="grid grid-cols-2">
          {line("Unidade", form.unidade)}
          {line("Valor contratual", form.valor ? `R$ ${form.valor}` : "")}
        </div>
        <div className="border-y px-4 py-1.5 text-xs font-bold">
          PROPONENTE 01
        </div>
        <div className="grid grid-cols-2">
          {line("Nome completo", form.clienteNome)}
          {line("CPF", form.clienteCpf ? formatCpfCnpj(form.clienteCpf) : "")}
          {line("Celular", form.clienteTelefone)}
          {line("E-mail", form.clienteEmail)}
        </div>
        <div className="border-y px-4 py-1.5 text-xs font-bold">ENDEREÇO</div>
        <div className="grid grid-cols-2">
          {line("Endereço", form.clienteEnderecoResidencial)}
          {line(
            "Cidade / UF",
            [form.clienteCidadeResidencial, form.clienteUfResidencial]
              .filter(Boolean)
              .join(" / "),
          )}
        </div>
        <div className="border-y px-4 py-1.5 text-xs font-bold">
          PLANO DE PAGAMENTO
        </div>
        <div className="px-4 py-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total da composição</span>
            <strong>{brl(total)}</strong>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-muted-foreground">Valor negociado</span>
            <strong>{form.valor ? `R$ ${form.valor}` : "----"}</strong>
          </div>
          {form.parcelaCaixa ? (
            <div className="mt-2 flex justify-between border-t pt-2 text-xs">
              <span className="text-muted-foreground">
                Parcela Caixa (informativo)
              </span>
              <strong>R$ {form.parcelaCaixa}</strong>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function parseMoney(raw: string): number | null {
  return parseOptionalMoneyInput(raw);
}

function moneyOrZero(raw: string): number {
  return parseMoney(raw) ?? 0;
}

function parseQuantidade(raw: string): number {
  const n = Number.parseInt(raw.replace(/\D/g, ""), 10);
  if (!Number.isFinite(n) || n < 1) return 0;
  return Math.min(n, 360);
}

function parcelasSubtotal(p: ParcelasForm): number {
  return parseQuantidade(p.quantidade) * moneyOrZero(p.valor);
}

function expandParcelas(p: ParcelasForm): number[] {
  const q = parseQuantidade(p.quantidade);
  const v = parseMoney(p.valor);
  if (!q || v == null || v <= 0) return [];
  return Array.from({ length: q }, () => v);
}

function formComposicaoTotal(form: FormState): number {
  const simples = PROPOSTA_SIMPLES_KEYS.reduce(
    (sum, key) =>
      PROPOSTA_INFORMATIVA_KEYS.includes(
        key as (typeof PROPOSTA_INFORMATIVA_KEYS)[number],
      )
        ? sum
        : sum + moneyOrZero(form[key]),
    0,
  );
  const listas = PROPOSTA_LISTA_KEYS.reduce(
    (sum, key) => sum + parcelasSubtotal(form[key]),
    0,
  );
  return simples + listas;
}

function toParcelasForm(values: number[] | null | undefined): ParcelasForm {
  if (!values?.length) return emptyParcelas();
  return {
    quantidade: String(values.length),
    valor: formatMoneyInput(values[0] ?? 0),
  };
}

function parcelasResumo(values: number[]) {
  const subtotal = values.reduce((sum, n) => sum + n, 0);
  const equal = values.every((n) => n === values[0]);
  return {
    quantidade: values.length,
    valorUnitario: values[0] ?? 0,
    equal,
    subtotal,
  };
}

function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

function equipeName(p: Proposta): string {
  return p.lead?.equipe?.name ?? "—";
}

function isLeadAprovado(lead: Lead, aprovadosPorDoc: Set<string>): boolean {
  if (lead.analise?.status === "aprovado") return true;
  return aprovadosPorDoc.has(lead.id);
}

function leadPickerLabel(lead: Lead): string {
  const phone = lead.telefone ? formatPhone(lead.telefone) : "";
  return phone ? `${lead.nome} · ${phone}` : lead.nome;
}

function shareToast() {
  toast.message("PDF do cliente baixado", {
    description:
      "Anexe o arquivo na conversa ou no e-mail que acabou de abrir.",
  });
}

function PropostaActionMenus({
  proposta,
  onView,
  onEdit,
  onDelete,
  onRequestWhatsAppPhone,
  onOpenQr,
  brand,
  compact = false,
}: {
  proposta: Proposta;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onRequestWhatsAppPhone: (proposta: Proposta) => void;
  onOpenQr: (proposta: Proposta) => void;
  brand: PropostaPdfBrand;
  compact?: boolean;
}) {
  const handlePdfCliente = () => {
    void downloadPropostaPdfCliente(proposta, brand).then(() => {
      toast.success("PDF para cliente baixado");
    });
  };

  const handlePdfCorretor = () => {
    void downloadPropostaPdfCorretor(proposta, brand).then(() => {
      toast.success("PDF para corretor baixado");
    });
  };

  const handleWhatsApp = () => {
    if (!propostaWhatsAppDigits(proposta.clienteTelefone)) {
      onRequestWhatsAppPhone(proposta);
      return;
    }
    void sharePropostaPdfWhatsApp(proposta, brand)
      .then((mode) => {
        if (mode === "fallback") shareToast();
      })
      .catch(() => toast.error("Não foi possível compartilhar o PDF."));
  };

  const handleEmail = () => {
    void downloadPropostaPdfCliente(proposta, brand).then(() => {
      window.location.href = getPropostaMailtoUrl(proposta);
      shareToast();
    });
  };

  const pdfItems = (
    <>
      <DropdownMenuItem onClick={handlePdfCliente}>
        PDF para cliente
      </DropdownMenuItem>
      <DropdownMenuItem onClick={handlePdfCorretor}>
        PDF para corretor
      </DropdownMenuItem>
    </>
  );

  const shareItems = (
    <>
      <DropdownMenuItem onClick={handleWhatsApp}>WhatsApp</DropdownMenuItem>
      <DropdownMenuItem onClick={() => onOpenQr(proposta)}>
        QR Code do WhatsApp
      </DropdownMenuItem>
      <DropdownMenuItem onClick={handleEmail}>E-mail</DropdownMenuItem>
    </>
  );

  if (compact) {
    return (
      <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="Ações"
              title="Ações"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {onView && (
              <DropdownMenuItem onClick={onView}>
                <Eye className="h-4 w-4" />
                Visualizar
              </DropdownMenuItem>
            )}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Download className="h-4 w-4" />
                Baixar PDF
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>{pdfItems}</DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Share2 className="h-4 w-4" />
                Compartilhar
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>{shareItems}</DropdownMenuSubContent>
            </DropdownMenuSub>
            {onEdit && (
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="h-4 w-4" />
                Editar
              </DropdownMenuItem>
            )}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" size="sm" variant="outline">
            <Download className="h-4 w-4 mr-1" />
            Baixar PDF
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">{pdfItems}</DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" size="sm" variant="outline">
            <Share2 className="h-4 w-4 mr-1" />
            Compartilhar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">{shareItems}</DropdownMenuContent>
      </DropdownMenu>

      {onEdit && (
        <Button type="button" size="sm" variant="outline" onClick={onEdit}>
          <Pencil className="h-4 w-4 mr-1" />
          Editar
        </Button>
      )}

      {onDelete && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Excluir
        </Button>
      )}
    </div>
  );
}

function Page() {
  const user = getSession();
  const isManager = user ? canViewTeamData(user.role) : false;
  const isGerente = user?.role === "gerente";
  const canQuickCreateEmpreendimento =
    user?.role === "admin" ||
    user?.role === "gerente" ||
    user?.role === "analista" ||
    user?.role === "treinee";
  const { logoUrl, tenant } = useTenantTheme();
  const pdfBrand = useMemo<PropostaPdfBrand>(
    () => ({
      logoUrl,
      primaryColor: tenant?.primaryColor ?? null,
      company: tenant
        ? {
            name: tenant.name,
            documento: tenant.documento,
            creci: tenant.creci,
            email: tenant.email,
            telefone: tenant.telefone,
            endereco: tenant.endereco,
            cidade: tenant.cidade,
          }
        : null,
    }),
    [logoUrl, tenant],
  );
  const { leads, assignees } = useLeads();

  const [items, setItems] = useState<Proposta[]>([]);
  const [construtoras, setConstrutoras] = useState<Construtora[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [aprovadosPorDoc, setAprovadosPorDoc] = useState<Set<string>>(
    () => new Set(),
  );
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<TableSort>(DEFAULT_TABLE_SORT);
  const [status, setStatus] = useState<PropostaStatus | "todos">("todos");
  const [corretorId, setCorretorId] = useState("todos");
  const [equipeId, setEquipeId] = useState("todos");

  const [selected, setSelected] = useState<Proposta | null>(null);
  const [open, setOpen] = useState(false);
  const [leadPickerOpen, setLeadPickerOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formSection, setFormSection] =
    useState<PropostaFormSection>("usuario");
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [whatsAppTarget, setWhatsAppTarget] = useState<Proposta | null>(null);
  const [whatsAppPhone, setWhatsAppPhone] = useState("");
  const [qrTarget, setQrTarget] = useState<Proposta | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickNome, setQuickNome] = useState("");
  const [quickContato, setQuickContato] = useState("");
  const [quickCor, setQuickCor] = useState("");
  const [empOpen, setEmpOpen] = useState(false);
  const [empSaving, setEmpSaving] = useState(false);
  const [empNome, setEmpNome] = useState("");
  const [empCidade, setEmpCidade] = useState("");
  const [empCor, setEmpCor] = useState("");

  const corretorOptions = useMemo(() => {
    let list = assignees.filter((a) => !a.role || isCorretorLike(a.role));
    if (isGerente && user) {
      list = list.filter((a) => a.gerenteId === user.id);
    }
    return list;
  }, [assignees, isGerente, user]);

  useEffect(() => {
    if (!qrTarget) {
      setQrCodeUrl("");
      return;
    }
    const url = getPropostaWhatsAppUrl(qrTarget);
    if (!url) {
      setQrCodeUrl("");
      return;
    }
    void import("qrcode")
      .then((QRCode) =>
        QRCode.toDataURL(url, {
          width: 320,
          margin: 2,
          errorCorrectionLevel: "M",
        }),
      )
      .then(setQrCodeUrl)
      .catch(() => setQrCodeUrl(""));
  }, [qrTarget]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [propostas, cons, emps, eqs, docs] = await Promise.all([
        fetchPropostas(),
        fetchConstrutoras().catch(() => [] as Construtora[]),
        fetchEmpreendimentos().catch(() => [] as Empreendimento[]),
        isManager && !isGerente
          ? fetchEquipes().catch(() => [] as Equipe[])
          : Promise.resolve([] as Equipe[]),
        fetchDocumentacoes().catch(() => []),
      ]);
      setItems(propostas);
      setAprovadosPorDoc(
        new Set(
          docs
            .filter((d) => isStatusAprovadoDoc(d.status1))
            .map((d) => d.leadId),
        ),
      );
      setConstrutoras(cons);
      setEmpreendimentos(emps);
      setEquipes(eqs);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Falha ao carregar propostas.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [isManager]);

  const loadLookups = useCallback(async () => {
    const [cons, emps] = await Promise.all([
      fetchConstrutoras().catch(() => [] as Construtora[]),
      fetchEmpreendimentos().catch(() => [] as Empreendimento[]),
    ]);
    setConstrutoras(cons);
    setEmpreendimentos(emps);
  }, []);

  async function handleQuickCreate(e: FormEvent) {
    e.preventDefault();
    if (!canQuickCreateEmpreendimento) return;
    if (quickNome.trim().length < 2) {
      toast.error("Informe o nome da construtora.");
      return;
    }
    if (quickContato.trim() && !isValidPhone(quickContato)) {
      toast.error(PHONE_INVALID_MESSAGE);
      return;
    }
    setQuickSaving(true);
    try {
      const created = await createConstrutora({
        nome: quickNome.trim(),
        contato: quickContato.trim() || undefined,
        cor: quickCor.trim() || undefined,
      });
      await loadLookups();
      setForm((f) => ({
        ...f,
        construtoraId: created.id,
        empreendimentoId: "",
      }));
      setQuickOpen(false);
      setQuickNome("");
      setQuickContato("");
      setQuickCor("");
      toast.success("Construtora criada.");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível criar.",
      );
    } finally {
      setQuickSaving(false);
    }
  }

  function openQuickEmpreendimento() {
    if (!form.construtoraId) {
      toast.error(
        "Selecione a construtora antes de cadastrar um empreendimento.",
      );
      return;
    }
    setEmpNome("");
    setEmpCidade("");
    setEmpCor("");
    setEmpOpen(true);
  }

  async function handleQuickCreateEmpreendimento(e: FormEvent) {
    e.preventDefault();
    if (!form.construtoraId) return;
    if (empNome.trim().length < 2) {
      toast.error("Informe o nome do empreendimento.");
      return;
    }
    setEmpSaving(true);
    try {
      const created = await createEmpreendimento({
        nome: empNome.trim(),
        construtoraId: form.construtoraId,
        cidade: empCidade.trim() || undefined,
        cor: empCor.trim() || undefined,
      });
      await loadLookups();
      setForm((f) => ({ ...f, empreendimentoId: created.id }));
      setEmpOpen(false);
      toast.success("Empreendimento cadastrado e selecionado.");
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível cadastrar o empreendimento.",
      );
    } finally {
      setEmpSaving(false);
    }
  }

  useEffect(() => {
    void load();
  }, [load]);

  const filteredEmpreendimentos = useMemo(() => {
    if (!form.construtoraId) return empreendimentos;
    return empreendimentos.filter(
      (e) => !e.construtoraId || e.construtoraId === form.construtoraId,
    );
  }, [empreendimentos, form.construtoraId]);

  const visibleLeads = useMemo(() => {
    if (!user) return [];
    const scoped = !isManager
      ? leads.filter(
          (l) => l.corretorId === user.id || l.corretor === user.name,
        )
      : leads;
    return scoped
      .filter((l) => isLeadAprovado(l, aprovadosPorDoc))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [leads, user, isManager, aprovadosPorDoc]);

  const selectedLead = useMemo(() => {
    if (!form.leadId) return null;
    return (
      visibleLeads.find((l) => l.id === form.leadId) ??
      leads.find((l) => l.id === form.leadId) ??
      null
    );
  }, [form.leadId, visibleLeads, leads]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((p) => {
      if (status !== "todos" && p.status !== status) return false;
      if (corretorId !== "todos" && p.corretorId !== corretorId) return false;
      if (equipeId !== "todos") {
        const eq = p.lead?.equipe?.id;
        if (eq !== equipeId) return false;
      }
      if (!q) return true;
      const hay = [
        p.codigo,
        p.clienteNome,
        p.clienteTelefone,
        p.empreendimento?.nome,
        p.construtora?.nome,
        p.unidade,
        p.corretor?.name,
        p.lead?.equipe?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, search, status, corretorId, equipeId]);

  const sortedRows = useMemo(
    () =>
      sortByTableOrder(
        rows,
        sort,
        (p) => p.clienteNome,
        (p) => p.createdAt,
      ),
    [rows, sort],
  );
  const pager = useTablePager(
    sortedRows,
    `${search}|${status}|${corretorId}|${equipeId}|${sort}`,
  );

  const kpis = useMemo(() => {
    const total = rows.length;
    const valor = rows.reduce((s, r) => s + r.valor, 0);
    const aceitas = rows.filter((r) => r.status === "aceita");
    const emAberto = rows.filter((r) =>
      ["enviada", "negociacao", "rascunho"].includes(r.status),
    );
    const decididas = rows.filter((r) =>
      ["aceita", "recusada", "expirada"].includes(r.status),
    ).length;
    const taxaAceite =
      total > 0 ? (aceitas.length / Math.max(decididas, 1)) * 100 : 0;
    return {
      total,
      valor,
      aceitas: aceitas.length,
      valorAceitas: aceitas.reduce((s, r) => s + r.valor, 0),
      emAberto: emAberto.length,
      taxaAceite,
    };
  }, [rows]);

  const hasActive = Boolean(
    search ||
    status !== "todos" ||
    corretorId !== "todos" ||
    (!isGerente && equipeId !== "todos"),
  );

  const formTotal = useMemo(() => formComposicaoTotal(form), [form]);
  const formValorLiquido = useMemo(
    () => Math.max(0, moneyOrZero(form.valor) - moneyOrZero(form.desconto)),
    [form.valor, form.desconto],
  );
  const formDiferenca = useMemo(
    () => formValorLiquido - formTotal,
    [formValorLiquido, formTotal],
  );
  const draftProposta = useMemo<Proposta>(() => {
    const construtora = construtoras.find(
      (item) => item.id === form.construtoraId,
    );
    const empreendimento = empreendimentos.find(
      (item) => item.id === form.empreendimentoId,
    );
    const corretor = corretorOptions.find(
      (item) => item.id === form.corretorId,
    );
    return {
      id: "preview",
      codigo: "PRÉVIA",
      leadId: form.leadId || null,
      clienteNome: form.clienteNome || "----",
      clienteTelefone: form.clienteTelefone
        ? phoneDigits(form.clienteTelefone)
        : null,
      clienteCpf: form.clienteCpf || null,
      clienteRg: form.clienteRg || null,
      clienteRgOrgaoEmissor: form.clienteRgOrgaoEmissor || null,
      clienteDataNascimento: form.clienteDataNascimento || null,
      clienteNacionalidade: form.clienteNacionalidade || null,
      clienteEstadoCivil: form.clienteEstadoCivil || null,
      clienteRegimeBens: form.clienteRegimeBens || null,
      clienteDataCasamento: form.clienteDataCasamento || null,
      clienteNomePai: form.clienteNomePai || null,
      clienteNomeMae: form.clienteNomeMae || null,
      clienteRenda: parseMoney(form.clienteRenda),
      clienteTelefoneFixo: form.clienteTelefoneFixo || null,
      clienteEmail: form.clienteEmail || null,
      clienteEnderecoResidencial: form.clienteEnderecoResidencial || null,
      clienteBairroResidencial: form.clienteBairroResidencial || null,
      clienteCidadeResidencial: form.clienteCidadeResidencial || null,
      clienteUfResidencial: form.clienteUfResidencial || null,
      clienteCepResidencial: form.clienteCepResidencial || null,
      clienteCobrancaResidencial: form.clienteCobrancaResidencial,
      clienteEmpregador: form.clienteEmpregador || null,
      clienteProfissao: form.clienteProfissao || null,
      clienteEnderecoComercial: form.clienteEnderecoComercial || null,
      clienteBairroComercial: form.clienteBairroComercial || null,
      clienteCidadeComercial: form.clienteCidadeComercial || null,
      clienteUfComercial: form.clienteUfComercial || null,
      clienteCepComercial: form.clienteCepComercial || null,
      clienteCobrancaComercial: form.clienteCobrancaComercial,
      clienteSite: form.clienteSite || null,
      clienteTelefoneComercial1: form.clienteTelefoneComercial1 || null,
      clienteTelefoneComercial2: form.clienteTelefoneComercial2 || null,
      construtoraId: form.construtoraId || null,
      empreendimentoId: form.empreendimentoId || null,
      unidade: form.unidade || null,
      corretorId: form.corretorId || null,
      autorId: user?.id ?? "preview",
      valor: moneyOrZero(form.valor),
      entrada: parseMoney(form.entrada),
      apartado: parseMoney(form.apartado),
      preChaves: expandParcelas(form.preChaves),
      posChaves: expandParcelas(form.posChaves),
      intercaladas: expandParcelas(form.intercaladas),
      fgts: parseMoney(form.fgts),
      moraBem: parseMoney(form.moraBem),
      mcmv: parseMoney(form.mcmv),
      parcelaCaixa: parseMoney(form.parcelaCaixa),
      financiamento: parseMoney(form.financiamento),
      desconto: parseMoney(form.desconto),
      status: form.status,
      validade: form.validade || null,
      enviadaEm: null,
      observacao: form.observacao || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      autor: { id: user?.id ?? "preview", name: user?.name ?? "----" },
      corretor: corretor ? { id: corretor.id, name: corretor.name } : null,
      construtora: construtora
        ? { id: construtora.id, nome: construtora.nome, cor: construtora.cor }
        : null,
      empreendimento: empreendimento
        ? {
            id: empreendimento.id,
            nome: empreendimento.nome,
            cidade: empreendimento.cidade,
          }
        : null,
      lead: null,
    };
  }, [construtoras, corretorOptions, empreendimentos, form, user]);

  function openCreate() {
    setFormMode("create");
    setEditingId(null);
    setForm(emptyForm());
    setFormSection("usuario");
    setOpen(true);
  }

  function openEdit(p: Proposta) {
    setFormMode("edit");
    setEditingId(p.id);
    setFormSection("usuario");
    setForm({
      leadId: p.leadId ?? "",
      clienteNome: p.clienteNome,
      clienteTelefone: p.clienteTelefone ? formatPhone(p.clienteTelefone) : "",
      clienteCpf: p.clienteCpf ?? "",
      clienteRg: p.clienteRg ?? "",
      clienteRgOrgaoEmissor: p.clienteRgOrgaoEmissor ?? "",
      clienteDataNascimento: toDateInput(p.clienteDataNascimento),
      clienteNacionalidade: p.clienteNacionalidade ?? "",
      clienteEstadoCivil: p.clienteEstadoCivil ?? "",
      clienteRegimeBens: p.clienteRegimeBens ?? "",
      clienteDataCasamento: toDateInput(p.clienteDataCasamento),
      clienteNomePai: p.clienteNomePai ?? "",
      clienteNomeMae: p.clienteNomeMae ?? "",
      clienteRenda:
        p.clienteRenda != null ? formatMoneyInput(p.clienteRenda) : "",
      clienteTelefoneFixo: p.clienteTelefoneFixo ?? "",
      clienteEmail: p.clienteEmail ?? "",
      clienteEnderecoResidencial: p.clienteEnderecoResidencial ?? "",
      clienteBairroResidencial: p.clienteBairroResidencial ?? "",
      clienteCidadeResidencial: p.clienteCidadeResidencial ?? "",
      clienteUfResidencial: p.clienteUfResidencial ?? "",
      clienteCepResidencial: p.clienteCepResidencial ?? "",
      clienteCobrancaResidencial: p.clienteCobrancaResidencial,
      clienteEmpregador: p.clienteEmpregador ?? "",
      clienteProfissao: p.clienteProfissao ?? "",
      clienteEnderecoComercial: p.clienteEnderecoComercial ?? "",
      clienteBairroComercial: p.clienteBairroComercial ?? "",
      clienteCidadeComercial: p.clienteCidadeComercial ?? "",
      clienteUfComercial: p.clienteUfComercial ?? "",
      clienteCepComercial: p.clienteCepComercial ?? "",
      clienteCobrancaComercial: p.clienteCobrancaComercial,
      clienteSite: p.clienteSite ?? "",
      clienteTelefoneComercial1: p.clienteTelefoneComercial1 ?? "",
      clienteTelefoneComercial2: p.clienteTelefoneComercial2 ?? "",
      construtoraId: p.construtoraId ?? "",
      empreendimentoId: p.empreendimentoId ?? "",
      unidade: p.unidade ?? "",
      corretorId: p.corretorId ?? "",
      valor: formatMoneyInput(p.valor),
      entrada: p.entrada != null ? formatMoneyInput(p.entrada) : "",
      apartado: p.apartado != null ? formatMoneyInput(p.apartado) : "",
      preChaves: toParcelasForm(p.preChaves),
      posChaves: toParcelasForm(p.posChaves),
      intercaladas: toParcelasForm(p.intercaladas),
      fgts: p.fgts != null ? formatMoneyInput(p.fgts) : "",
      moraBem: p.moraBem != null ? formatMoneyInput(p.moraBem) : "",
      mcmv: p.mcmv != null ? formatMoneyInput(p.mcmv) : "",
      parcelaCaixa:
        p.parcelaCaixa != null ? formatMoneyInput(p.parcelaCaixa) : "",
      financiamento:
        p.financiamento != null ? formatMoneyInput(p.financiamento) : "",
      desconto: p.desconto != null ? formatMoneyInput(p.desconto) : "",
      status: p.status,
      validade: toDateInput(p.validade),
      observacao: p.observacao ?? "",
    });
    setSelected(null);
    setOpen(true);
  }

  function onLeadSelect(leadId: string) {
    const lead = visibleLeads.find((l) => l.id === leadId);
    setForm((f) => ({
      ...f,
      leadId,
      clienteNome: lead?.nome ?? f.clienteNome,
      clienteTelefone: lead?.telefone
        ? formatPhone(lead.telefone)
        : f.clienteTelefone,
      corretorId: lead?.corretorId || f.corretorId,
      construtoraId: lead?.construtoraId || f.construtoraId,
      empreendimentoId: lead?.empreendimentoId || f.empreendimentoId,
    }));
  }

  async function buscarCepResidencial() {
    const digits = form.clienteCepResidencial.replace(/\D/g, "");
    if (digits.length !== 8 || cepLoading) return;

    setCepLoading(true);
    try {
      const endereco = await fetchEnderecoPorCep(digits);
      setForm((current) => ({
        ...current,
        clienteCepResidencial: endereco.cep || current.clienteCepResidencial,
        clienteEnderecoResidencial:
          endereco.endereco || current.clienteEnderecoResidencial,
        clienteBairroResidencial:
          endereco.bairro || current.clienteBairroResidencial,
        clienteCidadeResidencial:
          endereco.cidade || current.clienteCidadeResidencial,
        clienteUfResidencial: endereco.uf || current.clienteUfResidencial,
      }));
      toast.success("Endereço preenchido a partir do CEP.");
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Não foi possível consultar o CEP.",
      );
    } finally {
      setCepLoading(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const valor = parseMoney(form.valor);
    if (!form.clienteNome.trim() || valor == null) {
      toast.error("Informe o cliente e o valor de venda.");
      return;
    }

    const payload: CreatePropostaInput = {
      leadId: form.leadId || null,
      clienteNome: form.clienteNome.trim(),
      clienteTelefone: form.clienteTelefone
        ? phoneDigits(form.clienteTelefone)
        : null,
      clienteCpf: form.clienteCpf.trim() || null,
      clienteRg: form.clienteRg.trim() || null,
      clienteRgOrgaoEmissor: form.clienteRgOrgaoEmissor.trim() || null,
      clienteDataNascimento: form.clienteDataNascimento || null,
      clienteNacionalidade: form.clienteNacionalidade.trim() || null,
      clienteEstadoCivil: form.clienteEstadoCivil.trim() || null,
      clienteRegimeBens: form.clienteRegimeBens.trim() || null,
      clienteDataCasamento: form.clienteDataCasamento || null,
      clienteNomePai: form.clienteNomePai.trim() || null,
      clienteNomeMae: form.clienteNomeMae.trim() || null,
      clienteRenda: parseMoney(form.clienteRenda),
      clienteTelefoneFixo: form.clienteTelefoneFixo.trim() || null,
      clienteEmail: form.clienteEmail.trim() || null,
      clienteEnderecoResidencial:
        form.clienteEnderecoResidencial.trim() || null,
      clienteBairroResidencial: form.clienteBairroResidencial.trim() || null,
      clienteCidadeResidencial: form.clienteCidadeResidencial.trim() || null,
      clienteUfResidencial: form.clienteUfResidencial.trim() || null,
      clienteCepResidencial: form.clienteCepResidencial.trim() || null,
      clienteCobrancaResidencial: form.clienteCobrancaResidencial,
      clienteEmpregador: form.clienteEmpregador.trim() || null,
      clienteProfissao: form.clienteProfissao.trim() || null,
      clienteEnderecoComercial: form.clienteEnderecoComercial.trim() || null,
      clienteBairroComercial: form.clienteBairroComercial.trim() || null,
      clienteCidadeComercial: form.clienteCidadeComercial.trim() || null,
      clienteUfComercial: form.clienteUfComercial.trim() || null,
      clienteCepComercial: form.clienteCepComercial.trim() || null,
      clienteCobrancaComercial: form.clienteCobrancaComercial,
      clienteSite: form.clienteSite.trim() || null,
      clienteTelefoneComercial1: form.clienteTelefoneComercial1.trim() || null,
      clienteTelefoneComercial2: form.clienteTelefoneComercial2.trim() || null,
      construtoraId: form.construtoraId || null,
      empreendimentoId: form.empreendimentoId || null,
      unidade: form.unidade.trim() || null,
      corretorId: form.corretorId || null,
      valor,
      entrada: parseMoney(form.entrada),
      apartado: parseMoney(form.apartado),
      preChaves: expandParcelas(form.preChaves),
      posChaves: expandParcelas(form.posChaves),
      intercaladas: expandParcelas(form.intercaladas),
      fgts: parseMoney(form.fgts),
      moraBem: parseMoney(form.moraBem),
      mcmv: parseMoney(form.mcmv),
      parcelaCaixa: parseMoney(form.parcelaCaixa),
      financiamento: parseMoney(form.financiamento),
      desconto: parseMoney(form.desconto),
      status: form.status,
      validade: form.validade || null,
      observacao: form.observacao.trim() || null,
    };

    setSaving(true);
    try {
      if (formMode === "create") {
        await createProposta(payload);
        toast.success("Proposta criada.");
      } else if (editingId) {
        await updateProposta(editingId, payload);
        toast.success("Proposta atualizada.");
      }
      setOpen(false);
      await load();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Não foi possível salvar.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function patchStatus(id: string, next: PropostaStatus) {
    setActionLoading(true);
    try {
      const updated = await updateProposta(id, { status: next });
      setItems((prev) => prev.map((p) => (p.id === id ? updated : p)));
      setSelected(updated);
      toast.success(`Status: ${PROPOSTA_STATUS_LABEL[next]}`);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Falha ao atualizar status.";
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      await deleteProposta(deleteId);
      toast.success("Proposta excluída.");
      setDeleteId(null);
      setSelected(null);
      await load();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Falha ao excluir.";
      toast.error(msg);
    }
  }

  return (
    <div>
      <PageHeader
        title="Propostas"
        description="Propostas comerciais enviadas aos clientes"
        actions={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" />
            Nova proposta
          </Button>
        }
      />

      <section className="grid gap-3 grid-cols-2 xl:grid-cols-4 mb-4">
        <FinanceKpiCard
          label="Propostas (filtro)"
          value={kpis.total}
          icon={FileText}
          tone="blue-1"
          format="number"
        />
        <FinanceKpiCard
          label="VGV das propostas"
          value={kpis.valor}
          icon={Handshake}
          tone="blue-2"
        />
        <FinanceKpiCard
          label="Aceitas"
          value={kpis.aceitas}
          icon={CheckCircle2}
          tone="blue-3"
          format="number"
          suffix={kpis.valorAceitas ? `· ${brl(kpis.valorAceitas)}` : undefined}
        />
        <FinanceKpiCard
          label="Em aberto"
          value={kpis.emAberto}
          icon={Clock3}
          tone="blue-4"
          format="number"
          suffix={`· ${kpis.taxaAceite.toFixed(0)}% aceite`}
        />
      </section>

      <div className={FILTER_BAR_SHELL}>
        <div className="relative min-w-50 max-w-sm flex-1">
          <Search className={FILTER_SEARCH_ICON} />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar código, cliente, empreendimento…"
            className={cn("pl-9", FILTER_CONTROL)}
          />
        </div>
        <TableSortSelect
          value={sort}
          onChange={setSort}
          className={FILTER_CONTROL}
        />
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as PropostaStatus | "todos")}
        >
          <SelectTrigger className={cn("w-full sm:w-42.5", FILTER_CONTROL)}>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isManager && (
          <Select value={corretorId} onValueChange={setCorretorId}>
            <SelectTrigger className={cn("w-full sm:w-45", FILTER_CONTROL)}>
              <SelectValue placeholder="Corretor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os corretores</SelectItem>
              {corretorOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {isManager && !isGerente && (
          <Select value={equipeId} onValueChange={setEquipeId}>
            <SelectTrigger className={cn("w-full sm:w-42.5", FILTER_CONTROL)}>
              <SelectValue placeholder="Equipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as equipes</SelectItem>
              {equipes.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {hasActive && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={FILTER_CLEAR_BTN}
            onClick={() => {
              setSearch("");
              setStatus("todos");
              setCorretorId("todos");
              setEquipeId("todos");
            }}
          >
            <X className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/5 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_20px_rgba(15,23,42,0.05)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Empreendimento</TableHead>
              <TableHead>Corretor</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead className="w-12 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center text-muted-foreground py-10"
                >
                  <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                  Carregando…
                </TableCell>
              </TableRow>
            ) : sortedRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center text-muted-foreground py-10"
                >
                  Nenhuma proposta para os filtros selecionados.
                </TableCell>
              </TableRow>
            ) : (
              pager.pageItems.map((p) => (
                <TableRow
                  key={p.id}
                  className="cursor-pointer"
                  onClick={() => setSelected(p)}
                >
                  <TableCell className="font-mono text-xs font-medium">
                    {p.codigo}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{p.clienteNome}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.clienteTelefone ? formatPhone(p.clienteTelefone) : "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>{p.empreendimento?.nome ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.unidade ? `Un. ${p.unidade}` : "Sem unidade"}
                      {p.construtora ? ` · ${p.construtora.nome}` : ""}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>{p.corretor?.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {equipeName(p)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {brl(p.valor)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={propostaStatusClass(p.status)}
                      title={PROPOSTA_STATUS_LABEL[p.status]}
                    >
                      {PROPOSTA_STATUS_LABEL[p.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="tabular-nums whitespace-nowrap">
                    {formatPropostaDate(p.validade)}
                  </TableCell>
                  <TableCell className="text-right">
                    <PropostaActionMenus
                      proposta={p}
                      brand={pdfBrand}
                      compact
                      onView={() => setSelected(p)}
                      onEdit={() => openEdit(p)}
                      onDelete={() => setDeleteId(p.id)}
                      onRequestWhatsAppPhone={(item) => {
                        setWhatsAppTarget(item);
                        setWhatsAppPhone(
                          item.clienteTelefone
                            ? formatPhone(item.clienteTelefone)
                            : "",
                        );
                      }}
                      onOpenQr={(item) => {
                        if (!propostaWhatsAppDigits(item.clienteTelefone)) {
                          toast.error(
                            "Informe um telefone válido para gerar o QR Code.",
                          );
                          return;
                        }
                        setQrTarget(item);
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePager
          page={pager.page}
          totalPages={pager.totalPages}
          total={pager.total}
          onPageChange={pager.setPage}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {rows.length} de {items.length} propostas
      </p>

      <FormDialogShell
        open={Boolean(selected)}
        onOpenChange={(openDialog) => !openDialog && setSelected(null)}
        icon={<FileText className="size-5" />}
        title={selected?.codigo ?? "Proposta"}
        description={
          selected ? (
            <span className="inline-flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={propostaStatusClass(selected.status)}
                title={PROPOSTA_STATUS_LABEL[selected.status]}
              >
                {PROPOSTA_STATUS_LABEL[selected.status]}
              </Badge>
              <span>Detalhes da proposta comercial</span>
            </span>
          ) : undefined
        }
        className="max-w-2xl"
        footer={
          selected ? (
            <FormDialogActions>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelected(null)}
              >
                Fechar
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteId(selected.id)}
              >
                <Trash2 className="mr-1 size-4" />
                Excluir
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => openEdit(selected)}
              >
                <Pencil className="mr-1 size-4" />
                Editar
              </Button>
              {selected.status === "rascunho" && (
                <Button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => void patchStatus(selected.id, "enviada")}
                >
                  <Send className="mr-1 size-4" />
                  Enviar
                </Button>
              )}
              {(selected.status === "enviada" ||
                selected.status === "negociacao") && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={actionLoading}
                    onClick={() => void patchStatus(selected.id, "recusada")}
                  >
                    <XCircle className="mr-1 size-4" />
                    Recusar
                  </Button>
                  <Button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => void patchStatus(selected.id, "aceita")}
                  >
                    <CheckCircle2 className="mr-1 size-4" />
                    Aceitar
                  </Button>
                </>
              )}
            </FormDialogActions>
          ) : undefined
        }
      >
        {selected && (
          <FormDialogBody>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-muted/20 px-3 py-2.5">
              <span className="text-xs text-muted-foreground">
                Exportar ou enviar ao cliente
              </span>
              <PropostaActionMenus
                proposta={selected}
                brand={pdfBrand}
                onRequestWhatsAppPhone={(item) => {
                  setWhatsAppTarget(item);
                  setWhatsAppPhone(
                    item.clienteTelefone
                      ? formatPhone(item.clienteTelefone)
                      : "",
                  );
                }}
                onOpenQr={(item) => {
                  if (!propostaWhatsAppDigits(item.clienteTelefone)) {
                    toast.error(
                      "Informe um telefone válido para gerar o QR Code.",
                    );
                    return;
                  }
                  setQrTarget(item);
                }}
              />
            </div>

            <FormSection title="Cliente e imóvel">
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailField label="Cliente" value={selected.clienteNome} />
                <DetailField
                  label="Telefone"
                  value={
                    selected.clienteTelefone
                      ? formatPhone(selected.clienteTelefone)
                      : "—"
                  }
                />
                <DetailField
                  label="Empreendimento"
                  value={selected.empreendimento?.nome ?? "—"}
                />
                <DetailField
                  label="Unidade"
                  value={selected.unidade ? `Un. ${selected.unidade}` : "—"}
                />
                <DetailField
                  label="Construtora"
                  value={selected.construtora?.nome ?? "—"}
                />
                <DetailField
                  label="Corretor"
                  value={selected.corretor?.name ?? "—"}
                />
                <DetailField
                  label="Equipe"
                  value={equipeName(selected)}
                  className="sm:col-span-2"
                />
              </div>
            </FormSection>

            <FormSection title="Valores">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border/60 bg-muted/25 px-4 py-3">
                  <div className="text-xs text-muted-foreground">
                    Valor de venda
                  </div>
                  <div className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
                    {brl(selected.valor)}
                  </div>
                </div>
                {selected.desconto != null && selected.desconto > 0 ? (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                    <div className="text-xs font-medium text-amber-800 dark:text-amber-300">
                      Desconto do empreendimento
                    </div>
                    <div className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-amber-900 dark:text-amber-200">
                      {brl(selected.desconto)}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Valor com desconto:{" "}
                      <span className="font-medium tabular-nums text-foreground">
                        {brl(Math.max(0, selected.valor - selected.desconto))}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">
                  Composição do pagamento
                </div>
                <div className="divide-y divide-border/60 rounded-lg border border-border/60">
                  {PROPOSTA_SIMPLES_KEYS.map((key) => {
                    if (
                      PROPOSTA_INFORMATIVA_KEYS.includes(
                        key as (typeof PROPOSTA_INFORMATIVA_KEYS)[number],
                      )
                    ) {
                      return null;
                    }
                    const value = selected[key];
                    if (value == null) return null;
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between gap-3 px-3 py-2.5"
                      >
                        <span className="text-sm text-muted-foreground">
                          {PROPOSTA_COMPOSICAO_LABEL[key]}
                        </span>
                        <span className="text-sm font-medium tabular-nums">
                          {brl(value)}
                        </span>
                      </div>
                    );
                  })}
                  {PROPOSTA_LISTA_KEYS.map((key) => {
                    const values = selected[key] ?? [];
                    if (!values.length) return null;
                    const resumo = parcelasResumo(values);
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between gap-3 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <div className="text-sm text-muted-foreground">
                            {PROPOSTA_COMPOSICAO_LABEL[key]}
                          </div>
                          <div className="text-xs text-muted-foreground tabular-nums">
                            {resumo.equal
                              ? `${resumo.quantidade} × ${brl(resumo.valorUnitario)}`
                              : `${resumo.quantidade} parcelas (valores variados)`}
                          </div>
                        </div>
                        <span className="text-sm font-medium tabular-nums shrink-0">
                          {brl(resumo.subtotal)}
                        </span>
                      </div>
                    );
                  })}
                  {selected.parcelaCaixa != null ? (
                    <div className="flex items-center justify-between gap-3 bg-muted/30 px-3 py-2.5">
                      <span className="text-sm text-muted-foreground">
                        Parcela Caixa (informativo)
                      </span>
                      <span className="text-sm font-medium tabular-nums">
                        {brl(selected.parcelaCaixa)}
                      </span>
                    </div>
                  ) : null}
                  {!PROPOSTA_SIMPLES_KEYS.some(
                    (key) =>
                      !PROPOSTA_INFORMATIVA_KEYS.includes(
                        key as (typeof PROPOSTA_INFORMATIVA_KEYS)[number],
                      ) && selected[key] != null,
                  ) &&
                  !PROPOSTA_LISTA_KEYS.some(
                    (key) => (selected[key] ?? []).length > 0,
                  ) ? (
                    <div className="px-3 py-3 text-sm text-muted-foreground">
                      Nenhuma composição informada.
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border/60 px-3 py-2.5">
                  <div className="text-xs text-muted-foreground">
                    Total da composição
                  </div>
                  <div className="mt-1 text-sm font-semibold tabular-nums">
                    {brl(propostaComposicaoTotal(selected))}
                  </div>
                </div>
                <div className="rounded-lg border border-border/60 px-3 py-2.5">
                  <div className="text-xs text-muted-foreground">Diferença</div>
                  <div
                    className={cn(
                      "mt-1 text-sm font-semibold tabular-nums",
                      propostaDiferenca(selected) === 0
                        ? "text-emerald-700 dark:text-emerald-300"
                        : propostaDiferenca(selected) < 0
                          ? "text-destructive"
                          : "text-amber-800 dark:text-amber-300",
                    )}
                  >
                    {brl(propostaDiferenca(selected))}
                  </div>
                </div>
              </div>
            </FormSection>

            <FormSection title="Datas">
              <div className="grid gap-4 sm:grid-cols-3">
                <DetailField
                  label="Criada em"
                  value={formatPropostaDate(selected.createdAt)}
                />
                <DetailField
                  label="Enviada em"
                  value={
                    selected.enviadaEm
                      ? formatPropostaDate(selected.enviadaEm)
                      : "Ainda não enviada"
                  }
                />
                <DetailField
                  label="Validade"
                  value={formatPropostaDate(selected.validade)}
                />
              </div>
            </FormSection>

            {selected.observacao ? (
              <FormSection title="Observação">
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                  {selected.observacao}
                </p>
              </FormSection>
            ) : null}
          </FormDialogBody>
        )}
      </FormDialogShell>

      <Dialog
        open={Boolean(whatsAppTarget)}
        onOpenChange={(openDialog) => {
          if (!openDialog) {
            setWhatsAppTarget(null);
            setWhatsAppPhone("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Compartilhar no WhatsApp</DialogTitle>
            <DialogDescription>
              Informe o telefone do cliente com DDD. O compartilhamento tentará
              anexar o PDF e já incluirá a mensagem pronta.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="whatsapp-phone">Telefone</Label>
            <Input
              id="whatsapp-phone"
              placeholder={PHONE_PLACEHOLDER}
              value={whatsAppPhone}
              onChange={(e) => setWhatsAppPhone(formatPhone(e.target.value))}
            />
            {whatsAppPhone && !isValidPhone(whatsAppPhone) ? (
              <p className="text-xs text-destructive">
                {PHONE_INVALID_MESSAGE}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setWhatsAppTarget(null);
                setWhatsAppPhone("");
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!whatsAppTarget || !isValidPhone(whatsAppPhone)}
              onClick={() => {
                if (!whatsAppTarget || !isValidPhone(whatsAppPhone)) return;
                void sharePropostaPdfWhatsApp(
                  whatsAppTarget,
                  pdfBrand,
                  phoneDigits(whatsAppPhone),
                )
                  .then((mode) => {
                    if (mode === "fallback") shareToast();
                    setWhatsAppTarget(null);
                    setWhatsAppPhone("");
                  })
                  .catch(() =>
                    toast.error("Não foi possível compartilhar o PDF."),
                  );
              }}
            >
              Enviar proposta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(qrTarget)}
        onOpenChange={(openDialog) => !openDialog && setQrTarget(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>QR Code do WhatsApp</DialogTitle>
            <DialogDescription>
              Escaneie para abrir uma conversa com a mensagem da proposta
              pronta.
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-72 items-center justify-center rounded-lg border bg-white p-4">
            {qrCodeUrl ? (
              <img
                src={qrCodeUrl}
                alt="QR Code para compartilhar proposta pelo WhatsApp"
                className="h-64 w-64"
              />
            ) : (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <FormDialogShell
        open={open}
        onOpenChange={setOpen}
        className="max-w-7xl"
        icon={<FileText className="w-5 h-5" />}
        title={formMode === "create" ? "Nova proposta" : "Editar proposta"}
        description="Preencha os dados comerciais da proposta."
        footer={
          <FormDialogActions>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void downloadPropostaPdfCliente(draftProposta, pdfBrand)
              }
              disabled={saving}
            >
              <Download className="mr-1 h-4 w-4" />
              Baixar prévia
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="submit" form="proposta-form" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Salvar
            </Button>
          </FormDialogActions>
        }
      >
        <FormDialogBody className="lg:grid lg:grid-cols-[minmax(28rem,1fr)_minmax(28rem,1.25fr)] lg:items-start lg:gap-5 lg:space-y-0">
          <form
            id="proposta-form"
            className="min-w-0 space-y-5"
            onSubmit={onSubmit}
          >
            <div className="grid grid-cols-2 gap-2 rounded-xl border bg-muted/30 p-2 sm:grid-cols-5">
              {(
                [
                  ["usuario", "Usuário"],
                  ["endereco", "Endereço"],
                  ["profissional", "Profissional"],
                  ["imovel", "Imóvel"],
                  ["valores", "Valores"],
                ] as const
              ).map(([id, label]) => (
                <Button
                  key={id}
                  type="button"
                  size="sm"
                  variant={formSection === id ? "default" : "ghost"}
                  className="justify-center"
                  onClick={() => setFormSection(id)}
                >
                  {label}
                </Button>
              ))}
            </div>

            {formSection === "usuario" ? (
              <>
                <FormSection title="Cliente">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label>Lead / cliente aprovado (opcional)</Label>
                      <Popover
                        modal
                        open={leadPickerOpen}
                        onOpenChange={setLeadPickerOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            aria-expanded={leadPickerOpen}
                            className="h-10 w-full justify-between font-normal"
                          >
                            <span className="truncate">
                              {selectedLead
                                ? leadPickerLabel(selectedLead)
                                : "Buscar por nome ou telefone..."}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-(--radix-popover-trigger-width) p-0"
                          align="start"
                          onWheel={(e) => e.stopPropagation()}
                        >
                          <Command>
                            <CommandInput placeholder="Nome ou telefone..." />
                            <CommandList>
                              <CommandEmpty>
                                Nenhum lead/cliente aprovado encontrado.
                              </CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  value="sem vinculo"
                                  onSelect={() => {
                                    onLeadSelect("");
                                    setLeadPickerOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      !form.leadId
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                  Sem vínculo
                                </CommandItem>
                                {visibleLeads.map((l) => {
                                  const label = leadPickerLabel(l);
                                  const searchValue = [
                                    l.nome,
                                    l.telefone,
                                    phoneDigits(l.telefone),
                                    l.tipo,
                                  ]
                                    .filter(Boolean)
                                    .join(" ");
                                  return (
                                    <CommandItem
                                      key={l.id}
                                      value={searchValue}
                                      onSelect={() => {
                                        onLeadSelect(l.id);
                                        setLeadPickerOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          form.leadId === l.id
                                            ? "opacity-100"
                                            : "opacity-0",
                                        )}
                                      />
                                      <span className="truncate">{label}</span>
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <p className="text-[11px] text-muted-foreground">
                        Lista apenas leads e clientes com análise ou
                        documentação aprovada.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="clienteNome">Nome *</Label>
                      <Input
                        id="clienteNome"
                        value={form.clienteNome}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            clienteNome: e.target.value,
                          }))
                        }
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="clienteTelefone">Telefone</Label>
                      <Input
                        id="clienteTelefone"
                        value={form.clienteTelefone}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            clienteTelefone: formatPhone(e.target.value),
                          }))
                        }
                        placeholder={PHONE_PLACEHOLDER}
                      />
                    </div>
                  </div>
                </FormSection>

                <FormSection title="Dados pessoais (opcional)">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <OptionalField
                      label="CPF"
                      value={form.clienteCpf}
                      onChange={(clienteCpf) =>
                        setForm((f) => ({
                          ...f,
                          clienteCpf: formatCpfCnpj(digitsOnly(clienteCpf, 11)),
                        }))
                      }
                      placeholder="000.000.000-00"
                    />
                    <OptionalField
                      label="Identidade (RG)"
                      value={form.clienteRg}
                      onChange={(clienteRg) =>
                        setForm((f) => ({ ...f, clienteRg }))
                      }
                    />
                    <OptionalField
                      label="Órgão emissor"
                      value={form.clienteRgOrgaoEmissor}
                      onChange={(clienteRgOrgaoEmissor) =>
                        setForm((f) => ({ ...f, clienteRgOrgaoEmissor }))
                      }
                    />
                    <OptionalField
                      label="Nascimento"
                      type="date"
                      value={form.clienteDataNascimento}
                      onChange={(clienteDataNascimento) =>
                        setForm((f) => ({ ...f, clienteDataNascimento }))
                      }
                    />
                    <OptionalField
                      label="Nacionalidade"
                      value={form.clienteNacionalidade}
                      onChange={(clienteNacionalidade) =>
                        setForm((f) => ({ ...f, clienteNacionalidade }))
                      }
                    />
                    <OptionalField
                      label="Estado civil"
                      value={form.clienteEstadoCivil}
                      onChange={(clienteEstadoCivil) =>
                        setForm((f) => ({ ...f, clienteEstadoCivil }))
                      }
                    />
                    <OptionalField
                      label="Regime de bens"
                      value={form.clienteRegimeBens}
                      onChange={(clienteRegimeBens) =>
                        setForm((f) => ({ ...f, clienteRegimeBens }))
                      }
                    />
                    <OptionalField
                      label="Data do casamento"
                      type="date"
                      value={form.clienteDataCasamento}
                      onChange={(clienteDataCasamento) =>
                        setForm((f) => ({ ...f, clienteDataCasamento }))
                      }
                    />
                    <OptionalField
                      label="Renda mensal"
                      value={form.clienteRenda}
                      onChange={(clienteRenda) =>
                        setForm((f) => ({
                          ...f,
                          clienteRenda: maskMoneyInput(clienteRenda),
                        }))
                      }
                      placeholder="0,00"
                    />
                    <OptionalField
                      label="Filiação — pai"
                      value={form.clienteNomePai}
                      onChange={(clienteNomePai) =>
                        setForm((f) => ({ ...f, clienteNomePai }))
                      }
                    />
                    <OptionalField
                      label="Filiação — mãe"
                      value={form.clienteNomeMae}
                      onChange={(clienteNomeMae) =>
                        setForm((f) => ({ ...f, clienteNomeMae }))
                      }
                    />
                    <OptionalField
                      label="Telefone fixo"
                      value={form.clienteTelefoneFixo}
                      onChange={(clienteTelefoneFixo) =>
                        setForm((f) => ({
                          ...f,
                          clienteTelefoneFixo: formatPhone(clienteTelefoneFixo),
                        }))
                      }
                    />
                    <OptionalField
                      label="E-mail"
                      type="email"
                      value={form.clienteEmail}
                      onChange={(clienteEmail) =>
                        setForm((f) => ({ ...f, clienteEmail }))
                      }
                    />
                  </div>
                </FormSection>
              </>
            ) : null}

            {formSection === "endereco" ? (
              <FormSection title="Endereço residencial (opcional)">
                <div className="grid gap-3 sm:grid-cols-2">
                  <OptionalField
                    label="Endereço residencial"
                    value={form.clienteEnderecoResidencial}
                    onChange={(clienteEnderecoResidencial) =>
                      setForm((f) => ({ ...f, clienteEnderecoResidencial }))
                    }
                  />
                  <OptionalField
                    label="Bairro"
                    value={form.clienteBairroResidencial}
                    onChange={(clienteBairroResidencial) =>
                      setForm((f) => ({ ...f, clienteBairroResidencial }))
                    }
                  />
                  <OptionalField
                    label="Cidade"
                    value={form.clienteCidadeResidencial}
                    onChange={(clienteCidadeResidencial) =>
                      setForm((f) => ({ ...f, clienteCidadeResidencial }))
                    }
                  />
                  <OptionalField
                    label="UF"
                    value={form.clienteUfResidencial}
                    onChange={(clienteUfResidencial) =>
                      setForm((f) => ({
                        ...f,
                        clienteUfResidencial: clienteUfResidencial
                          .toUpperCase()
                          .slice(0, 2),
                      }))
                    }
                  />
                  <OptionalField
                    label={cepLoading ? "CEP — consultando..." : "CEP"}
                    value={form.clienteCepResidencial}
                    onChange={(clienteCepResidencial) =>
                      setForm((f) => ({
                        ...f,
                        clienteCepResidencial: digitsOnly(
                          clienteCepResidencial,
                          8,
                        ).replace(/^(\d{5})(\d)/, "$1-$2"),
                      }))
                    }
                    onBlur={() => void buscarCepResidencial()}
                    placeholder="00000-000"
                  />
                  <div className="space-y-1.5">
                    <Label>Cobrança neste endereço?</Label>
                    <Select
                      value={
                        form.clienteCobrancaResidencial === null
                          ? "__none__"
                          : form.clienteCobrancaResidencial
                            ? "sim"
                            : "nao"
                      }
                      onValueChange={(value) =>
                        setForm((f) => ({
                          ...f,
                          clienteCobrancaResidencial:
                            value === "__none__" ? null : value === "sim",
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Não informado</SelectItem>
                        <SelectItem value="sim">Sim</SelectItem>
                        <SelectItem value="nao">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </FormSection>
            ) : null}

            {formSection === "profissional" ? (
              <FormSection title="Dados profissionais (opcional)">
                <div className="grid gap-3 sm:grid-cols-2">
                  <OptionalField
                    label="Empresa onde trabalha"
                    value={form.clienteEmpregador}
                    onChange={(clienteEmpregador) =>
                      setForm((f) => ({ ...f, clienteEmpregador }))
                    }
                  />
                  <OptionalField
                    label="Profissão"
                    value={form.clienteProfissao}
                    onChange={(clienteProfissao) =>
                      setForm((f) => ({ ...f, clienteProfissao }))
                    }
                  />
                  <OptionalField
                    label="Endereço comercial"
                    value={form.clienteEnderecoComercial}
                    onChange={(clienteEnderecoComercial) =>
                      setForm((f) => ({ ...f, clienteEnderecoComercial }))
                    }
                  />
                  <OptionalField
                    label="Bairro comercial"
                    value={form.clienteBairroComercial}
                    onChange={(clienteBairroComercial) =>
                      setForm((f) => ({ ...f, clienteBairroComercial }))
                    }
                  />
                  <OptionalField
                    label="Cidade comercial"
                    value={form.clienteCidadeComercial}
                    onChange={(clienteCidadeComercial) =>
                      setForm((f) => ({ ...f, clienteCidadeComercial }))
                    }
                  />
                  <OptionalField
                    label="UF comercial"
                    value={form.clienteUfComercial}
                    onChange={(clienteUfComercial) =>
                      setForm((f) => ({
                        ...f,
                        clienteUfComercial: clienteUfComercial
                          .toUpperCase()
                          .slice(0, 2),
                      }))
                    }
                  />
                  <OptionalField
                    label="CEP comercial"
                    value={form.clienteCepComercial}
                    onChange={(clienteCepComercial) =>
                      setForm((f) => ({ ...f, clienteCepComercial }))
                    }
                  />
                  <OptionalField
                    label="Site"
                    value={form.clienteSite}
                    onChange={(clienteSite) =>
                      setForm((f) => ({ ...f, clienteSite }))
                    }
                  />
                  <OptionalField
                    label="Telefone comercial 1"
                    value={form.clienteTelefoneComercial1}
                    onChange={(clienteTelefoneComercial1) =>
                      setForm((f) => ({
                        ...f,
                        clienteTelefoneComercial1: formatPhone(
                          clienteTelefoneComercial1,
                        ),
                      }))
                    }
                  />
                  <OptionalField
                    label="Telefone comercial 2"
                    value={form.clienteTelefoneComercial2}
                    onChange={(clienteTelefoneComercial2) =>
                      setForm((f) => ({
                        ...f,
                        clienteTelefoneComercial2: formatPhone(
                          clienteTelefoneComercial2,
                        ),
                      }))
                    }
                  />
                  <div className="space-y-1.5">
                    <Label>Cobrança neste endereço?</Label>
                    <Select
                      value={
                        form.clienteCobrancaComercial === null
                          ? "__none__"
                          : form.clienteCobrancaComercial
                            ? "sim"
                            : "nao"
                      }
                      onValueChange={(value) =>
                        setForm((f) => ({
                          ...f,
                          clienteCobrancaComercial:
                            value === "__none__" ? null : value === "sim",
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Não informado</SelectItem>
                        <SelectItem value="sim">Sim</SelectItem>
                        <SelectItem value="nao">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </FormSection>
            ) : null}

            {formSection === "imovel" ? (
              <FormSection title="Imóvel">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Label>Construtora</Label>
                      {canQuickCreateEmpreendimento && (
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto p-0 text-xs"
                          onClick={() => setQuickOpen(true)}
                        >
                          + Nova construtora
                        </Button>
                      )}
                    </div>
                    <Select
                      value={form.construtoraId || "__none__"}
                      onValueChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          construtoraId: v === "__none__" ? "" : v,
                          empreendimentoId: "",
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Construtora" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Nenhuma</SelectItem>
                        {construtoras.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Label>Empreendimento</Label>
                      {canQuickCreateEmpreendimento && (
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto p-0 text-xs"
                          onClick={openQuickEmpreendimento}
                        >
                          + Novo empreendimento
                        </Button>
                      )}
                    </div>
                    <Select
                      value={form.empreendimentoId || "__none__"}
                      onValueChange={(v) =>
                        setForm((f) => ({
                          ...f,
                          empreendimentoId: v === "__none__" ? "" : v,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Empreendimento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Nenhum</SelectItem>
                        {filteredEmpreendimentos.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="unidade">Unidade</Label>
                    <Input
                      id="unidade"
                      value={form.unidade}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, unidade: e.target.value }))
                      }
                      placeholder="Ex.: 802"
                    />
                  </div>
                  {isManager && (
                    <div className="space-y-1.5">
                      <Label>Corretor</Label>
                      <Select
                        value={form.corretorId || "__none__"}
                        onValueChange={(v) =>
                          setForm((f) => ({
                            ...f,
                            corretorId: v === "__none__" ? "" : v,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Corretor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Não definido</SelectItem>
                          {corretorOptions.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </FormSection>
            ) : null}

            {formSection === "valores" ? (
              <FormSection title="Composição financeira">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="valor">Valor de venda (R$) *</Label>
                    <Input
                      id="valor"
                      inputMode="numeric"
                      value={form.valor}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          valor: maskMoneyInput(e.target.value),
                        }))
                      }
                      placeholder="0,00"
                      required
                    />
                  </div>

                  <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 p-3 space-y-2">
                    <div>
                      <Label
                        htmlFor="desconto"
                        className="text-amber-900 dark:text-amber-200"
                      >
                        Desconto do empreendimento (R$)
                      </Label>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Valor de destaque no relatório. A composição deve fechar
                        no valor com desconto.
                      </p>
                    </div>
                    <Input
                      id="desconto"
                      inputMode="numeric"
                      value={form.desconto}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          desconto: maskMoneyInput(e.target.value),
                        }))
                      }
                      placeholder="0,00"
                      className="border-amber-500/40 bg-background"
                    />
                    {moneyOrZero(form.desconto) > 0 ? (
                      <p className="text-xs text-amber-900/80 dark:text-amber-200/80 tabular-nums">
                        Valor com desconto: {brl(formValorLiquido)}
                      </p>
                    ) : null}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {PROPOSTA_SIMPLES_KEYS.map((key) => (
                      <MoneyField
                        key={key}
                        id={key}
                        label={`${PROPOSTA_COMPOSICAO_LABEL[key]} (R$)`}
                        value={form[key]}
                        onChange={(value) =>
                          setForm((f) => ({ ...f, [key]: value }))
                        }
                      />
                    ))}
                  </div>

                  <div className="grid gap-3 lg:grid-cols-3">
                    {PROPOSTA_LISTA_KEYS.map((key) => (
                      <ParcelasQtyValueEditor
                        key={key}
                        id={key}
                        title={PROPOSTA_COMPOSICAO_LABEL[key]}
                        value={form[key]}
                        onChange={(next) =>
                          setForm((f) => ({ ...f, [key]: next }))
                        }
                      />
                    ))}
                  </div>

                  <div className="grid gap-2 rounded-lg border border-border/60 bg-muted/30 p-3 sm:grid-cols-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-muted-foreground">
                        Total
                      </span>
                      <span className="font-semibold tabular-nums">
                        {brl(formTotal)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-muted-foreground">
                        Diferença
                      </span>
                      <span
                        className={cn(
                          "font-semibold tabular-nums",
                          formDiferenca === 0
                            ? "text-emerald-700 dark:text-emerald-300"
                            : formDiferenca < 0
                              ? "text-destructive"
                              : "text-amber-800 dark:text-amber-300",
                        )}
                      >
                        {brl(formDiferenca)}
                      </span>
                    </div>
                    <p className="sm:col-span-2 text-[11px] text-muted-foreground">
                      Total = soma dos campos + (quantidade × valor) das
                      parcelas. Diferença = (valor de venda − desconto) − total.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Status</Label>
                      <Select
                        value={form.status}
                        onValueChange={(v) =>
                          setForm((f) => ({
                            ...f,
                            status: v as PropostaStatus,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.filter(
                            (o) => o.value !== "todos",
                          ).map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="validade">Validade</Label>
                      <Input
                        id="validade"
                        type="date"
                        value={form.validade}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, validade: e.target.value }))
                        }
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label htmlFor="observacao">Observação</Label>
                      <Textarea
                        id="observacao"
                        value={form.observacao}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, observacao: e.target.value }))
                        }
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              </FormSection>
            ) : null}
          </form>
          <div className="hidden lg:block lg:self-start">
            <PropostaFormPreview form={form} total={formTotal} />
          </div>
        </FormDialogBody>
      </FormDialogShell>

      <FormDialogShell
        open={quickOpen}
        onOpenChange={setQuickOpen}
        icon={<Building className="w-5 h-5" />}
        title="Nova construtora"
      >
        <form
          onSubmit={handleQuickCreate}
          className="flex flex-col flex-1 min-h-0"
        >
          <FormDialogBody>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="propostaQuickNome">Nome *</Label>
                <Input
                  id="propostaQuickNome"
                  value={quickNome}
                  onChange={(e) => setQuickNome(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="propostaQuickContato">Contato</Label>
                <Input
                  id="propostaQuickContato"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder={PHONE_PLACEHOLDER}
                  value={quickContato}
                  onChange={(e) => setQuickContato(formatPhone(e.target.value))}
                  maxLength={15}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="propostaQuickCor">Cor do nome</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    id="propostaQuickCor"
                    type="color"
                    value={quickCor || "#3b82f6"}
                    onChange={(e) => setQuickCor(e.target.value)}
                    className="h-10 w-14 cursor-pointer p-1"
                  />
                  <Input
                    value={quickCor}
                    onChange={(e) => setQuickCor(e.target.value)}
                    placeholder="#3b82f6"
                    maxLength={7}
                    className="max-w-35 font-mono text-sm"
                  />
                  {quickNome.trim() && quickCor ? (
                    <Badge
                      variant="secondary"
                      className="border-transparent"
                      style={construtoraBadgeStyle(quickCor)}
                    >
                      {quickNome.trim()}
                    </Badge>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {CONSTRUTORA_CORES_PRESET.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      title={hex}
                      className="h-6 w-6 rounded-md border border-border"
                      style={{ backgroundColor: hex }}
                      onClick={() => setQuickCor(hex)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </FormDialogBody>
          <FormDialogActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => setQuickOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={quickSaving}>
              {quickSaving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Criar
            </Button>
          </FormDialogActions>
        </form>
      </FormDialogShell>

      <FormDialogShell
        open={empOpen}
        onOpenChange={setEmpOpen}
        icon={<Building2 className="w-5 h-5" />}
        title="Novo empreendimento"
      >
        <form
          onSubmit={handleQuickCreateEmpreendimento}
          className="flex flex-col flex-1 min-h-0"
        >
          <FormDialogBody>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="propostaEmpNome">Nome *</Label>
                <Input
                  id="propostaEmpNome"
                  value={empNome}
                  onChange={(e) => setEmpNome(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="propostaEmpCidade">Cidade</Label>
                <Input
                  id="propostaEmpCidade"
                  value={empCidade}
                  onChange={(e) => setEmpCidade(e.target.value)}
                />
              </div>
              <CorPicker
                id="propostaEmpCor"
                value={empCor}
                onChange={setEmpCor}
                previewLabel={empNome}
              />
            </div>
          </FormDialogBody>
          <FormDialogActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEmpOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={empSaving}>
              {empSaving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Criar
            </Button>
          </FormDialogActions>
        </form>
      </FormDialogShell>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir proposta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MoneyField({
  id,
  label,
  value,
  onChange,
}: {
  id: PropostaSimplesKey;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(maskMoneyInput(e.target.value))}
        placeholder="0,00"
      />
    </div>
  );
}

function ParcelasQtyValueEditor({
  id,
  title,
  value,
  onChange,
}: {
  id: string;
  title: string;
  value: ParcelasForm;
  onChange: (next: ParcelasForm) => void;
}) {
  const q = parseQuantidade(value.quantidade);
  const unit = moneyOrZero(value.valor);
  const subtotal = q * unit;

  return (
    <div className="flex h-full flex-col space-y-3 rounded-2xl border border-black/5 bg-card p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_20px_rgba(15,23,42,0.05)]">
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-[11px] text-muted-foreground tabular-nums">
          Subtotal {brl(subtotal)}
          {q > 0 && unit > 0 ? ` · ${q} × ${brl(unit)}` : ""}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-qtd`}>Quantidade</Label>
          <Input
            id={`${id}-qtd`}
            inputMode="numeric"
            placeholder="0"
            value={value.quantidade}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 3);
              onChange({ ...value, quantidade: digits });
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${id}-valor`}>Valor (R$)</Label>
          <Input
            id={`${id}-valor`}
            inputMode="numeric"
            placeholder="0,00"
            value={value.valor}
            onChange={(e) =>
              onChange({
                ...value,
                valor: maskMoneyInput(e.target.value),
              })
            }
          />
        </div>
      </div>
    </div>
  );
}
