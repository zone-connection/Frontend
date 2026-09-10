import { createFileRoute } from "@tanstack/react-router";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { PageHeader } from "@/components/app-shell";
import {
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
  FormSection,
} from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { downloadContratoPdf, resolveContratoBrandHex } from "@/lib/contratos-pdf";
import {
  CONTRATO_TEMPLATES,
  applyLeadToContratoForm,
  contratoTemplatesForRole,
  emptyContratoForm,
  getContratoTemplate,
  isSaasContratoTemplate,
  type ContratoField,
  type ContratoTemplate,
  type ContratoTemplateId,
} from "@/lib/contratos-templates";
import { fetchLeadById, mapApiLead } from "@/lib/leads-api";
import { formatPhone } from "@/lib/phone";
import { maskMoneyInput, parseMoneyInput } from "@/lib/money-input";
import { reaisPorExtenso } from "@/lib/valor-extenso";
import { formatCpfCnpj, formatRg, cn } from "@/lib/utils";
import { useTenantTheme } from "@/lib/tenant-theme";
import { getSession, type TenantBranding } from "@/lib/auth";
import {
  ArrowRight,
  Ban,
  ClipboardList,
  Download,
  FileText,
  Handshake,
  Loader2,
  Receipt,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { SOFT_BTN } from "@/lib/soft-btn";

/** Modelos que o corretor não pode emitir. */
const TEMPLATES_BLOQUEADOS_CORRETOR: ReadonlySet<ContratoTemplateId> = new Set([
  "recibo-pagamento",
]);

function canUseContratoTemplate(templateId: ContratoTemplateId): boolean {
  const role = getSession()?.role;
  if (role === "super_admin") {
    return isSaasContratoTemplate(templateId);
  }
  if (isSaasContratoTemplate(templateId)) {
    return false;
  }
  if (role === "corretor" && TEMPLATES_BLOQUEADOS_CORRETOR.has(templateId)) {
    return false;
  }
  return true;
}

const TEMPLATE_META: Record<
  ContratoTemplateId,
  { icon: LucideIcon; accent: string; accentBg: string }
> = {
  "carta-cancelamento": {
    icon: Ban,
    accent: "text-rose-600 dark:text-rose-400",
    accentBg: "bg-rose-500/10",
  },
  "recibo-pagamento": {
    icon: Receipt,
    accent: "text-emerald-600 dark:text-emerald-400",
    accentBg: "bg-emerald-500/10",
  },
  "parentesco-sem-conjuge": {
    icon: Users,
    accent: "text-violet-600 dark:text-violet-400",
    accentBg: "bg-violet-500/10",
  },
  "parentesco-com-conjuge": {
    icon: Users,
    accent: "text-indigo-600 dark:text-indigo-400",
    accentBg: "bg-indigo-500/10",
  },
  intermediacao: {
    icon: Handshake,
    accent: "text-sky-600 dark:text-sky-400",
    accentBg: "bg-sky-500/10",
  },
  "checklist-renda-informal": {
    icon: ClipboardList,
    accent: "text-amber-600 dark:text-amber-400",
    accentBg: "bg-amber-500/10",
  },
  "saas-ouro": {
    icon: Sparkles,
    accent: "text-amber-600 dark:text-amber-400",
    accentBg: "bg-amber-500/10",
  },
  "saas-prata-admin": {
    icon: Sparkles,
    accent: "text-slate-600 dark:text-slate-300",
    accentBg: "bg-slate-500/10",
  },
  "saas-prata-financeiro": {
    icon: Sparkles,
    accent: "text-emerald-600 dark:text-emerald-400",
    accentBg: "bg-emerald-500/10",
  },
};

const CONTRATO_GROUPS: Array<{
  id: string;
  title: string;
  description: string;
  templateIds: ContratoTemplateId[];
}> = [
  {
    id: "habitacional",
    title: "Documentação habitacional",
    description: "Cancelamentos e checklists para análise em construtora.",
    templateIds: ["carta-cancelamento", "checklist-renda-informal"],
  },
  {
    id: "declaracoes",
    title: "Declarações de parentesco",
    description: "Comprovação de parentesco, residência e ausência de renda.",
    templateIds: ["parentesco-sem-conjuge", "parentesco-com-conjuge"],
  },
  {
    id: "comercial",
    title: "Contratos comerciais",
    description: "Intermediação de compra e venda de imóvel.",
    templateIds: ["intermediacao"],
  },
  {
    id: "financeiro",
    title: "Financeiro",
    description: "Comprovantes de pagamento e recebimento.",
    templateIds: ["recibo-pagamento"],
  },
  {
    id: "saas",
    title: "Licenças Zone Connection",
    description:
      "Contratos de licença SaaS (Ouro e Prata) para imobiliárias.",
    templateIds: ["saas-ouro", "saas-prata-admin", "saas-prata-financeiro"],
  },
];

const INTERMEDIACAO_SECTIONS = [
  {
    id: "contratante",
    label: "Contratante",
    keys: [
      "contratanteNome",
      "contratanteCpf",
      "contratanteRg",
      "contratanteTel",
      "contratanteEmail",
      "contratanteEndereco",
      "contratanteCep",
    ],
  },
  {
    id: "proprietario",
    label: "Proprietário",
    keys: [
      "proprietarioNome",
      "proprietarioCnpj",
      "proprietarioEndereco",
      "proprietarioTel",
    ],
  },
  {
    id: "imovel",
    label: "Imóvel",
    keys: [
      "construtora",
      "empreendimento",
      "unidade",
      "andar",
      "descricaoImovel",
      "precoImovel",
    ],
  },
  {
    id: "pagamento",
    label: "Pagamento",
    keys: [
      "valorIntermediacao",
      "valorIntermediacaoExtenso",
      "banco",
      "agencia",
      "conta",
      "pix",
      "representanteLegal",
    ],
  },
  {
    id: "imobiliaria",
    label: "Imobiliária",
    soloLabel: "Meus dados",
    keys: [
      "contratadaNome",
      "contratadaCnpj",
      "contratadaCreci",
      "contratadaEmail",
      "contratadaEndereco",
      "cidade",
      "data",
    ],
  },
  {
    id: "testemunhas",
    label: "Testemunhas",
    keys: [
      "testemunha1Nome",
      "testemunha1Cpf",
      "testemunha2Nome",
      "testemunha2Cpf",
    ],
  },
] as const;

type IntermediacaoSectionId = (typeof INTERMEDIACAO_SECTIONS)[number]["id"];

type ContratosSearch = { lead?: string; modelo?: string };

export const Route = createFileRoute("/_app/contratos")({
  head: () => ({ meta: [{ title: "Contratos — Zone Connection" }] }),
  validateSearch: (search: Record<string, unknown>): ContratosSearch => ({
    lead: typeof search.lead === "string" ? search.lead : undefined,
    modelo: typeof search.modelo === "string" ? search.modelo : undefined,
  }),
  component: ContratosPage,
});

function maskField(field: ContratoField, raw: string) {
  if (field.type === "cpf" || field.type === "cnpj") {
    return formatCpfCnpj(raw);
  }
  if (field.type === "rg") return formatRg(raw);
  if (field.type === "phone") return formatPhone(raw);
  if (field.type === "money") return maskMoneyInput(raw);
  return raw;
}

/** Prefill da CONTRATADA a partir do cadastro da imobiliária. */
function prefillFromTenant(
  template: ContratoTemplate,
  tenant: TenantBranding | null,
): Record<string, string> {
  const values = emptyContratoForm(template);
  if (!tenant) return values;
  if (isSaasContratoTemplate(template.id)) return values;

  if (template.id === "intermediacao") {
    if (tenant.name?.trim()) values.contratadaNome = tenant.name.trim();
    if (tenant.documento?.trim()) {
      values.contratadaCnpj = formatCpfCnpj(tenant.documento);
    }
    if (tenant.creci?.trim()) values.contratadaCreci = tenant.creci.trim();
    if (tenant.email?.trim()) values.contratadaEmail = tenant.email.trim();
    if (tenant.endereco?.trim()) {
      values.contratadaEndereco = tenant.endereco.trim();
    }
    if (tenant.cidade?.trim()) values.cidade = tenant.cidade.trim();
  }

  if (template.id === "checklist-renda-informal" && tenant.cidade?.trim()) {
    values.cidade = tenant.cidade.trim();
  }

  if (template.id === "recibo-pagamento") {
    if (tenant.name?.trim()) values.empresaNome = tenant.name.trim();
    if (tenant.telefone?.trim()) {
      values.empresaTelefone = formatPhone(tenant.telefone);
    }
    if (tenant.cidade?.trim()) values.cidade = tenant.cidade.trim();
  }

  return values;
}

function brandHex(color?: string | null) {
  return color && /^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#079ED4";
}

function PreviewSection({
  title,
  color,
}: {
  title: string;
  color: string;
}) {
  return (
    <div
      className="border-b pb-1 text-[10px] font-bold uppercase tracking-wide"
      style={{ color, borderColor: color }}
    >
      {title}
    </div>
  );
}

function PreviewMark({
  checked,
  label,
  color,
}: {
  checked: boolean;
  label: string;
  color: string;
}) {
  return (
    <div className="flex items-start gap-2 text-[11px] leading-snug">
      <span
        className="mt-0.5 inline-block size-3 shrink-0 rounded-[2px] border"
        style={{
          borderColor: color,
          backgroundColor: checked ? color : "transparent",
        }}
      />
      <span>{label}</span>
    </div>
  );
}

function Fill({ children }: { children: ReactNode }) {
  return (
    <strong className="font-bold" style={{ color: "#000" }}>
      {children}
    </strong>
  );
}

function formatLongDatePt(iso: string) {
  if (!iso) return "____ de ________ de ________";
  const [year, month, day] = iso.slice(0, 10).split("-");
  const monthIndex = Number(month) - 1;
  const months = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ];
  if (!year || !day || !Number.isInteger(monthIndex) || !months[monthIndex]) {
    return iso;
  }
  return `${Number(day)} de ${months[monthIndex]} de ${year}`;
}

function moneyPreview(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return "R$ 0,00";
  return trimmed.startsWith("R$") ? trimmed : `R$ ${trimmed}`;
}

function ReciboPreviewCard({
  viaLabel,
  values,
  value,
}: {
  viaLabel: string;
  values: Record<string, string>;
  value: (key: string) => string;
}) {
  return (
    <div className="relative rounded-2xl border border-foreground/80 px-4 pb-3 pt-2 text-left not-italic">
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">
        {viaLabel}
      </div>
      <div className="relative mb-6 mt-1 min-h-10">
        <h3 className="text-center text-[15px] font-bold leading-tight">
          Recibo de Pagamento
        </h3>
        <div className="absolute right-0 top-5 shrink-0 rounded-md border border-foreground/80 px-2.5 py-1 text-xs font-bold text-black">
          {moneyPreview(values.valor ?? "")}
        </div>
      </div>
      <p className="text-justify leading-relaxed">
        Recebi(emos) de <Fill>{value("pagadorNome")}</Fill> - CPF{" "}
        <Fill>{value("pagadorCpf")}</Fill>, a importância de{" "}
        <Fill>{value("valorExtenso")}</Fill>, referente à{" "}
        <Fill>{value("referente")}</Fill>.
      </p>
      <p className="mt-3 text-justify leading-relaxed">
        Para maior clareza, firmo(amos) o presente recibo, que comprova o
        recebimento integral do valor mencionado, concedendo{" "}
        <strong>quitação plena, geral e irrevogável</strong> pela quantia
        recebida.
      </p>
      <p className="mt-5 text-right">
        <Fill>
          {value("cidade")},{" "}
          {values.data?.trim()
            ? formatLongDatePt(values.data)
            : "____ de ________ de ________"}
        </Fill>
      </p>
      <div className="mt-8 space-y-0.5 text-center text-[10px]">
        <div className="mx-auto w-40 border-t border-foreground/70" />
        <div className="pt-1.5 font-bold uppercase text-black">
          {value("empresaNome")}
        </div>
        {values.empresaTelefone?.trim() ? (
          <div>{values.empresaTelefone.trim()}</div>
        ) : null}
      </div>
    </div>
  );
}

function ContratoPreview({
  template,
  values,
  logoUrl,
  primaryColor,
}: {
  template: ContratoTemplate;
  values: Record<string, string>;
  logoUrl: string;
  primaryColor?: string | null;
}) {
  const value = (key: string) => values[key]?.trim() || "----";
  const date = value("data") === "----" ? "____/____/________" : value("data");
  const accent = brandHex(primaryColor);
  const checked = (key: string) => values[key] === "true";
  const yes = (key: string) => values[key] === "sim";
  const no = (key: string) => values[key] === "nao";

  const content =
    template.id === "carta-cancelamento" ? (
      <>
        <p>
          Eu, <Fill>{value("nome")}</Fill>, portador do RG{" "}
          <Fill>{value("rg")}</Fill> e CPF <Fill>{value("cpf")}</Fill>, venho
          por meio desta informar que solicito o cancelamento da avaliação
          habitacional realizada em meu nome em uma construtora para dar
          continuidade em outra construtora.
        </p>
        <p>
          <Fill>
            {value("cidade")}, {date}
          </Fill>
        </p>
      </>
    ) : template.id === "parentesco-sem-conjuge" ? (
      <>
        <p>
          Eu, <Fill>{value("nomeParente")}</Fill>, CPF{" "}
          <Fill>{value("cpfParente")}</Fill>, estado civil{" "}
          <Fill>{value("estadoCivil")}</Fill>, declaro que sou{" "}
          <Fill>{value("grauParentesco")}</Fill> do proponente{" "}
          <Fill>{value("nomeProponente")}</Fill>, CPF{" "}
          <Fill>{value("cpfProponente")}</Fill>, com quem resido no mesmo
          endereço há pelo menos 6 (seis) meses.
        </p>
        <p>
          Declaro ainda que não possuo nenhum tipo de rendimento, seja renda
          formal ou informal, e que não participo como dependente de outro
          financiamento habitacional.
        </p>
        <p>
          Data: <Fill>{date}</Fill>
        </p>
      </>
    ) : template.id === "parentesco-com-conjuge" ? (
      <>
        <p>
          Eu, <Fill>{value("nomeParente")}</Fill>, CPF{" "}
          <Fill>{value("cpfParente")}</Fill>, declaro que sou{" "}
          <Fill>{value("grauParentesco")}</Fill> do proponente{" "}
          <Fill>{value("nomeProponente")}</Fill>, CPF{" "}
          <Fill>{value("cpfProponente")}</Fill>, com quem resido no endereço{" "}
          <Fill>{value("endereco")}</Fill>.
        </p>
        <p>
          Eu, <Fill>{value("nomeConjuge")}</Fill>, declaro que também não
          possuo nenhum tipo de rendimento, seja renda formal ou informal.
        </p>
        <p>
          Data: <Fill>{date}</Fill>
        </p>
      </>
    ) : template.id === "checklist-renda-informal" ? (
      <div className="space-y-3 text-left not-italic">
        <PreviewSection title="Dados do cliente" color="#111111" />
        <p>
          Nome: <Fill>{value("nome")}</Fill>
        </p>
        <p>
          CPF: <Fill>{value("cpf")}</Fill>
        </p>
        <p>
          Renda solicitada: <Fill>{value("rendaSolicitada")}</Fill>
        </p>
        <p>
          Profissão: <Fill>{value("profissao")}</Fill>
        </p>
        <p>
          Renda nos extratos: <Fill>{value("rendaParcialExtratos")}</Fill>
        </p>
        <div className="flex flex-wrap gap-4">
          <PreviewMark
            checked={yes("bolsaFamilia")}
            label="Bolsa Família: Sim"
            color={accent}
          />
          <PreviewMark
            checked={no("bolsaFamilia")}
            label="Não"
            color={accent}
          />
        </div>
        <p>
          Valor Bolsa Família: <Fill>{value("bolsaFamiliaValor")}</Fill>
        </p>
        <PreviewSection title="Renda mista" color="#111111" />
        <div className="flex flex-wrap gap-4">
          <PreviewMark
            checked={yes("vinculoEmpregaticio")}
            label="Vínculo: Sim"
            color={accent}
          />
          <PreviewMark
            checked={no("vinculoEmpregaticio")}
            label="Não"
            color={accent}
          />
        </div>
        <p>
          Empresa: <Fill>{value("empresa")}</Fill>
        </p>
        <p>
          Salário: <Fill>{value("salarioContracheque")}</Fill>
        </p>
        <PreviewSection title="Documentação anexada" color="#111111" />
        <PreviewMark
          checked={checked("docExtratos")}
          label="Extratos bancários (6 meses)"
          color={accent}
        />
        <PreviewMark
          checked={checked("docContracheques")}
          label="Contracheques (renda mista)"
          color={accent}
        />
        <PreviewMark
          checked={checked("docFgts")}
          label="Extrato do FGTS do mesmo mês"
          color={accent}
        />
        <PreviewMark
          checked={checked("docIdentidade")}
          label="Documento de identificação"
          color={accent}
        />
        <PreviewMark
          checked={checked("docOutros")}
          label={`Outros${values.docOutrosTexto?.trim() ? `: ${values.docOutrosTexto.trim()}` : ""}`}
          color={accent}
        />
        <PreviewSection title="Observações" color="#111111" />
        <p className="whitespace-pre-wrap min-h-10">
          <Fill>{values.observacoes?.trim() || "—"}</Fill>
        </p>
        <p>
          <Fill>
            {value("cidade")}, {date}
          </Fill>
        </p>
      </div>
    ) : template.id === "recibo-pagamento" ? (
      <div className="flex flex-col gap-2">
        <ReciboPreviewCard viaLabel="1ª via" values={values} value={value} />
        <div className="border-t border-dashed border-muted-foreground/50 py-0.5 text-center text-[8px] uppercase tracking-widest text-muted-foreground">
          recorte
        </div>
        <ReciboPreviewCard viaLabel="2ª via" values={values} value={value} />
      </div>
    ) : (
      <>
        <p>
          Contratante: <Fill>{value("contratanteNome")}</Fill>, CPF{" "}
          <Fill>{value("contratanteCpf")}</Fill>.
        </p>
        <p>
          Proprietário: <Fill>{value("proprietarioNome")}</Fill>.
        </p>
        <p>
          Imóvel: <Fill>{value("empreendimento")}</Fill>, unidade{" "}
          <Fill>{value("unidade")}</Fill>.
        </p>
      </>
    );

  return (
    <aside className="sticky top-3 self-start rounded-xl border bg-background p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between border-b pb-2">
        <div>
          <div className="text-sm font-semibold">Prévia do documento</div>
          <div className="text-xs text-muted-foreground">
            Atualizada enquanto você preenche
          </div>
        </div>
        <FileText className="size-4 text-muted-foreground" />
      </div>
      <div
        className="aspect-210/297 min-h-120 overflow-y-auto rounded border-2 bg-card p-6 text-foreground"
        style={{ borderColor: accent }}
      >
        {template.id === "recibo-pagamento" ? (
          <div className="text-xs leading-relaxed">{content}</div>
        ) : (
          <>
            {logoUrl ? (
              <img
                src={logoUrl}
                alt=""
                className="mx-auto mb-5 h-12 max-w-36 object-contain"
              />
            ) : null}
            <h3
              className="text-center text-sm font-bold uppercase leading-snug"
              style={{ color: accent }}
            >
              {template.titulo}
            </h3>
            <div className="my-4 border-t" style={{ borderColor: accent }} />
            <div className="space-y-4 text-xs leading-relaxed text-justify">
              {content}
              <div className="mt-10 space-y-10 text-center text-[10px]">
                <div
                  className="mx-auto w-40 border-t pt-1"
                  style={{ borderColor: accent }}
                >
                  ASSINATURA
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

function ContratosPage() {
  const { lead: leadId, modelo } = Route.useSearch();
  const { logoUrl, tenant } = useTenantTheme();
  const isSolo = getSession()?.tenant?.plano === "solo";
  const [logoColor, setLogoColor] = useState<string | null>(null);
  const [selected, setSelected] = useState<ContratoTemplate | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const openedFromQuery = useRef("");
  const [leadPrefill, setLeadPrefill] = useState<{
    nome: string;
    telefone: string;
    email: string;
    cidade: string;
    bairro: string;
    estadoCivil?: string | null;
    cpf?: string | null;
    rg?: string | null;
    endereco?: string | null;
    cep?: string | null;
    corretorPerfil?: {
      name: string;
      email?: string | null;
      phone?: string | null;
      creci?: string | null;
      cpf?: string | null;
      rg?: string | null;
      endereco?: string | null;
      cep?: string | null;
    } | null;
    construtora?: { nome: string } | null;
    empreendimento?: { nome: string; cidade?: string | null } | null;
    prospeccao?: { endereco?: string | null } | null;
  } | null>(null);
  const [intermediacaoSection, setIntermediacaoSection] =
    useState<IntermediacaoSectionId>("contratante");

  const templatesVisiveis = useMemo(
    () => contratoTemplatesForRole(getSession()?.role),
    [],
  );

  const gruposVisiveis = useMemo(() => {
    const byId = new Map(templatesVisiveis.map((t) => [t.id, t]));
    return CONTRATO_GROUPS.map((group) => ({
      ...group,
      templates: group.templateIds
        .map((id) => byId.get(id))
        .filter(Boolean) as ContratoTemplate[],
    })).filter((group) => group.templates.length > 0);
  }, [templatesVisiveis]);

  useEffect(() => {
    let cancelled = false;
    void resolveContratoBrandHex(logoUrl, tenant?.primaryColor).then((hex) => {
      if (!cancelled) setLogoColor(hex);
    });
    return () => {
      cancelled = true;
    };
  }, [logoUrl, tenant?.primaryColor]);

  const openTemplate = (template: ContratoTemplate) => {
    if (!canUseContratoTemplate(template.id)) {
      toast.error("Seu perfil não tem acesso a este modelo.");
      return;
    }
    const base = prefillFromTenant(template, tenant);
    setSelected(template);
    setForm(leadPrefill ? applyLeadToContratoForm(base, leadPrefill) : base);
    setIntermediacaoSection("contratante");
  };

  useEffect(() => {
    if (!leadId) {
      setLeadPrefill(null);
      return;
    }
    let cancelled = false;
    void fetchLeadById(leadId)
      .then((api) => {
        if (cancelled) return;
        const lead = mapApiLead(api);
        setLeadPrefill(lead);
      })
      .catch(() => {
        if (!cancelled) {
          setLeadPrefill(null);
          toast.error("Não foi possível carregar o lead para o contrato.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  useEffect(() => {
    if (!modelo || !leadPrefill) return;
    const key = `${leadId ?? ""}:${modelo}`;
    if (openedFromQuery.current === key) return;
    const template = getContratoTemplate(modelo as ContratoTemplateId);
    if (!template || !canUseContratoTemplate(template.id)) return;
    openedFromQuery.current = key;
    openTemplate(template);
    // openTemplate depende do lead já carregado
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelo, leadPrefill, leadId]);

  const requiredMissing = useMemo(() => {
    if (!selected) return [];
    return selected.fields
      .filter((f) => f.required !== false && !(form[f.key] ?? "").trim())
      .map((f) => f.label);
  }, [form, selected]);
  const formFields = useMemo(() => {
    if (!selected) return [];
    if (selected.id !== "intermediacao") return selected.fields;
    const section = INTERMEDIACAO_SECTIONS.find(
      (item) => item.id === intermediacaoSection,
    );
    return selected.fields.filter((field) => section?.keys.includes(field.key));
  }, [intermediacaoSection, selected]);

  async function handleGenerate(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    if (!canUseContratoTemplate(selected.id)) {
      toast.error("Seu perfil não tem acesso a este modelo.");
      setSelected(null);
      return;
    }
    if (requiredMissing.length) {
      toast.error(
        `Preencha: ${requiredMissing.slice(0, 3).join(", ")}${requiredMissing.length > 3 ? "…" : ""}`,
      );
      return;
    }
    setGenerating(true);
    try {
      await downloadContratoPdf(selected.id as ContratoTemplateId, form, {
        logoUrl,
        primaryColor: logoColor ?? tenant?.primaryColor,
      });
      toast.success("PDF gerado e baixado.");
      setSelected(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Não foi possível gerar o PDF.",
      );
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Contratos"
        description={
          getSession()?.role === "super_admin"
            ? "Escolha o plano, preencha os dados da imobiliária contratante e baixe o PDF."
            : "Escolha o modelo por categoria, preencha os dados e baixe o PDF."
        }
      />

      {leadPrefill ? (
        <div className="rounded-xl border border-primary/25 bg-primary/8 px-4 py-3 text-sm">
          Preenchendo contrato para{" "}
          <span className="font-semibold">{leadPrefill.nome}</span>
          {leadPrefill.telefone ? ` · ${leadPrefill.telefone}` : ""}.
          Escolha o modelo — os dados do lead entram automaticamente.
        </div>
      ) : null}

      <div className="space-y-5">
        {gruposVisiveis.map((group) => (
          <section
            key={group.id}
            className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm"
          >
            <div className="border-b border-border/40 bg-linear-to-r from-primary/9 via-primary/3 to-transparent px-4 py-3.5 sm:px-5">
              <h2 className="text-base font-semibold tracking-tight text-module-title">
                {group.title}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {group.description}
              </p>
            </div>
            <div className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-3">
              {group.templates.map((template) => {
                const meta = TEMPLATE_META[template.id];
                const Icon = meta?.icon ?? FileText;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => openTemplate(template)}
                    className={cn(
                      "group flex h-full cursor-pointer flex-col rounded-2xl border border-black/5 bg-card p-4 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_20px_rgba(15,23,42,0.05)] transition",
                      "hover:border-primary/35 hover:bg-primary/4 hover:shadow-md",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                  >
                    <div
                      className={cn(
                        "mb-3 flex size-11 items-center justify-center rounded-xl",
                        meta?.accentBg ?? "bg-primary/10",
                        meta?.accent ?? "text-primary",
                      )}
                    >
                      <Icon className="size-5" />
                    </div>
                    <h3 className="text-[15px] font-semibold leading-snug text-foreground">
                      {template.titulo}
                    </h3>
                    <p className="mt-1.5 flex-1 text-xs leading-relaxed text-muted-foreground">
                      {template.descricao}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition group-hover:gap-2">
                      Preencher
                      <ArrowRight className="size-3.5" />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <FormDialogShell
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        icon={<FileText className="size-5" />}
        title={selected?.titulo ?? "Contrato"}
        description="Preencha os campos. O PDF será baixado ao gerar."
        className={selected?.id === "intermediacao" ? "max-w-3xl" : "max-w-6xl"}
        footer={
          <FormDialogActions>
            <Button
              type="button"
              variant="outline"
              className={SOFT_BTN}
              onClick={() => setSelected(null)}
              disabled={generating}
            >
              Cancelar
            </Button>
            <Button type="submit" form="contrato-form" disabled={generating}>
              {generating ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : (
                <Download className="mr-1 size-4" />
              )}
              Gerar PDF
            </Button>
          </FormDialogActions>
        }
      >
        {selected && (
          <form
            id="contrato-form"
            onSubmit={handleGenerate}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <FormDialogBody
              className={
                selected.id === "intermediacao"
                  ? ""
                  : "lg:grid lg:grid-cols-[minmax(22rem,0.85fr)_minmax(28rem,1.15fr)] lg:items-start lg:gap-5 lg:space-y-0"
              }
            >
              {selected.id === "intermediacao" ? (
                <div className="grid grid-cols-2 gap-2 rounded-xl border bg-muted/30 p-2 sm:grid-cols-3">
                  {INTERMEDIACAO_SECTIONS.map((section) => (
                    <Button
                      key={section.id}
                      type="button"
                      size="sm"
                      variant={
                        intermediacaoSection === section.id
                          ? "default"
                          : "ghost"
                      }
                      onClick={() => setIntermediacaoSection(section.id)}
                    >
                      {section.id === "imobiliaria" && isSolo
                        ? section.soloLabel
                        : section.label}
                    </Button>
                  ))}
                </div>
              ) : null}
              <FormSection title="Dados do documento">
                <div className="grid gap-3 sm:grid-cols-2">
                  {formFields.map((field) => {
                    const wide =
                      field.type === "textarea" ||
                      field.type === "check" ||
                      field.key === "endereco" ||
                      field.key === "descricaoImovel" ||
                      field.key === "contratanteEndereco" ||
                      field.key === "proprietarioEndereco" ||
                      field.key === "observacoes" ||
                      field.key === "referente";
                    return (
                      <div
                        key={field.key}
                        className={
                          wide ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"
                        }
                      >
                        {field.type === "check" ? (
                          <label
                            htmlFor={`contrato-${field.key}`}
                            className="flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2"
                          >
                            <Checkbox
                              id={`contrato-${field.key}`}
                              checked={form[field.key] === "true"}
                              onCheckedChange={(value) =>
                                setForm((prev) => ({
                                  ...prev,
                                  [field.key]: value === true ? "true" : "",
                                }))
                              }
                            />
                            <span className="text-sm">{field.label}</span>
                          </label>
                        ) : field.type === "yesno" ? (
                          <>
                            <Label>
                              {field.label}
                              {field.required !== false ? " *" : ""}
                            </Label>
                            <div className="flex gap-2">
                              {(["sim", "nao"] as const).map((option) => (
                                <Button
                                  key={option}
                                  type="button"
                                  size="sm"
                                  variant={
                                    form[field.key] === option
                                      ? "default"
                                      : "outline"
                                  }
                                  onClick={() =>
                                    setForm((prev) => ({
                                      ...prev,
                                      [field.key]: option,
                                    }))
                                  }
                                >
                                  {option === "sim" ? "Sim" : "Não"}
                                </Button>
                              ))}
                            </div>
                          </>
                        ) : field.type === "textarea" ? (
                          <>
                            <Label htmlFor={`contrato-${field.key}`}>
                              {field.label}
                            </Label>
                            <Textarea
                              id={`contrato-${field.key}`}
                              value={form[field.key] ?? ""}
                              onChange={(e) =>
                                setForm((prev) => ({
                                  ...prev,
                                  [field.key]: e.target.value,
                                }))
                              }
                              rows={4}
                            />
                          </>
                        ) : (
                          <>
                            <Label htmlFor={`contrato-${field.key}`}>
                              {field.label}
                              {field.required !== false ? " *" : ""}
                            </Label>
                            <Input
                              id={`contrato-${field.key}`}
                              type={field.type === "date" ? "date" : "text"}
                              inputMode={
                                field.type === "cpf" ||
                                field.type === "cnpj" ||
                                field.type === "rg" ||
                                field.type === "phone" ||
                                field.type === "money"
                                  ? "numeric"
                                  : undefined
                              }
                              placeholder={field.placeholder}
                              value={form[field.key] ?? ""}
                              onChange={(e) =>
                                setForm((prev) => {
                                  const next = maskField(
                                    field,
                                    e.target.value,
                                  );
                                  const updated = {
                                    ...prev,
                                    [field.key]: next,
                                  };
                                  if (field.key === "valor") {
                                    const amount = parseMoneyInput(next);
                                    updated.valorExtenso =
                                      Number.isFinite(amount) && amount > 0
                                        ? reaisPorExtenso(amount)
                                        : "";
                                  }
                                  return updated;
                                })
                              }
                              required={field.required !== false}
                            />
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </FormSection>
              {selected.id !== "intermediacao" ? (
                <div className="hidden lg:block">
                  <ContratoPreview
                    template={selected}
                    values={form}
                    logoUrl={logoUrl}
                    primaryColor={logoColor ?? tenant?.primaryColor}
                  />
                </div>
              ) : null}
            </FormDialogBody>
          </form>
        )}
      </FormDialogShell>
    </div>
  );
}
