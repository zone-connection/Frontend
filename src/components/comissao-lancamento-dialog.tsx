import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
  FormSection,
} from "@/components/form-dialog";
import { ArquivoNotaField } from "@/components/arquivo-nota-field";
import { IdSearchSelect } from "@/components/id-search-select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { fetchConstrutoras, type Construtora } from "@/lib/construtoras-api";
import {
  fetchDocumentacaoCorretores,
  type DocumentacaoCorretor,
} from "@/lib/documentacao-api";
import {
  fetchEmpreendimentos,
  type Empreendimento,
} from "@/lib/empreendimentos-api";
import {
  createComissao,
  createComissaoComVendaAvulsa,
  createTituloComissao,
  createTituloComissaoAvulsa,
  fetchVendasElegiveisComissao,
  fetchVendasElegiveisTituloComissao,
  fetchNotasFiscais,
  saveNotaFiscal,
  updateComissao,
  type Comissao,
  type NotaFiscal,
  type ComissaoRelacionamento,
  type ComissaoStatus,
  type VendaElegivelComissao,
} from "@/lib/financeiro-api";
import { BRAND_GRADIENT_BTN, BRAND_GRADIENT_STYLE } from "@/lib/brand-gradient";
import { brl, formatDate } from "@/lib/financeiro-mock";
import { formatMoneyInput, maskMoneyInput, parseOptionalMoneyInput } from "@/lib/money-input";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronsUpDown,
  FileText,
  Home,
  Loader2,
  Percent,
  Trophy,
} from "lucide-react";

export type OrigemVendaComissao = "existente" | "avulsa";

export type ComissaoFormState = {
  origemVenda: OrigemVendaComissao;
  documentacaoId: string;
  clienteNome: string;
  vgv: string;
  dataVenda: string;
  corretorId: string;
  construtoraId: string;
  empreendimentoId: string;
  dataPrevistaRecebimento: string;
  percentualImobiliaria: string;
  percentualIss: string;
  percentualTributos: string;
  percentualCorretor: string;
  percentualGerente: string;
  percentualCaixa: string;
  percentualSocios: string;
  valorPremiacao: string;
  percentualPremiacaoCorretor: string;
  percentualPremiacaoImposto: string;
  percentualPremiacaoImobiliaria: string;
  percentualPremiacaoGerente: string;
  status: ComissaoStatus;
  observacao: string;
};

const EMPTY_FORM: ComissaoFormState = {
  origemVenda: "existente",
  documentacaoId: "",
  clienteNome: "",
  vgv: "",
  dataVenda: "",
  corretorId: "",
  construtoraId: "",
  empreendimentoId: "",
  dataPrevistaRecebimento: "",
  percentualImobiliaria: "",
  percentualIss: "",
  percentualTributos: "",
  percentualCorretor: "",
  percentualGerente: "",
  percentualCaixa: "",
  percentualSocios: "",
  valorPremiacao: "",
  percentualPremiacaoCorretor: "",
  percentualPremiacaoImposto: "",
  percentualPremiacaoImobiliaria: "",
  percentualPremiacaoGerente: "",
  status: "pendente",
  observacao: "",
};

const REGISTRAR_DOC_KEY = "crm_comissao_registrar_documentacao";

function readRegistrarDocumentacao() {
  try {
    return localStorage.getItem(REGISTRAR_DOC_KEY) === "1";
  } catch {
    return false;
  }
}

function writeRegistrarDocumentacao(value: boolean) {
  try {
    localStorage.setItem(REGISTRAR_DOC_KEY, value ? "1" : "0");
  } catch {
    /* preferência local; o lançamento segue mesmo sem storage */
  }
}

const STATUS_OPTIONS: { value: ComissaoStatus; label: string }[] = [
  { value: "pendente", label: "Pendente" },
  { value: "liberada", label: "Liberada" },
  { value: "paga", label: "Paga" },
];

export function relationName(
  value?: string | ComissaoRelacionamento | null,
  fallback = "—",
) {
  if (typeof value === "string") return value || fallback;
  return value?.nome || value?.name || fallback;
}

export function numberValue(value: string | number | undefined) {
  const parsed =
    typeof value === "number"
      ? value
      : Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function calculatePremiacaoCascata(input: {
  valor: number;
  percentualCorretor: number;
  percentualImposto: number;
  percentualImobiliaria: number;
  percentualGerente: number;
}) {
  let restante = roundMoney(Math.max(0, input.valor));
  const corretor = roundMoney(restante * (input.percentualCorretor / 100));
  restante = roundMoney(restante - corretor);
  const imposto = roundMoney(restante * (input.percentualImposto / 100));
  restante = roundMoney(restante - imposto);
  const imobiliaria = roundMoney(
    restante * (input.percentualImobiliaria / 100),
  );
  restante = roundMoney(restante - imobiliaria);
  const gerente = roundMoney(restante * (input.percentualGerente / 100));
  restante = roundMoney(restante - gerente);
  return { corretor, imposto, imobiliaria, gerente, restante };
}

function toForm(comissao: Comissao): ComissaoFormState {
  return {
    ...EMPTY_FORM,
    documentacaoId: comissao.documentacaoId ?? "",
    dataPrevistaRecebimento: (comissao.dataPrevistaRecebimento ?? "").slice(
      0,
      10,
    ),
    percentualImobiliaria: String(comissao.percentualImobiliaria ?? ""),
    percentualIss: String(comissao.percentualIss ?? ""),
    percentualTributos: String(comissao.percentualTributos ?? ""),
    percentualCorretor: String(comissao.percentualCorretor ?? ""),
    percentualGerente: String(comissao.percentualGerente ?? ""),
    percentualCaixa: String(comissao.percentualCaixa ?? ""),
    percentualSocios: String(comissao.percentualSocios ?? ""),
    valorPremiacao:
      comissao.valorPremiacao && comissao.valorPremiacao > 0
        ? formatMoneyInput(comissao.valorPremiacao)
        : "",
    percentualPremiacaoCorretor: String(
      comissao.percentualPremiacaoCorretor ?? "",
    ),
    percentualPremiacaoImposto: String(
      comissao.percentualPremiacaoImposto ?? "",
    ),
    percentualPremiacaoImobiliaria: String(
      comissao.percentualPremiacaoImobiliaria ?? "",
    ),
    percentualPremiacaoGerente: String(
      comissao.percentualPremiacaoGerente ?? "",
    ),
    status: comissao.status,
    observacao: comissao.observacao ?? "",
  };
}

function corretorLabel(user: DocumentacaoCorretor) {
  if (user.role === "gerente") return `${user.name} · Gerente`;
  if (user.role === "treinee") return `${user.name} · Treinee`;
  return user.name;
}

export function ComissaoLancamentoDialog({
  open,
  onOpenChange,
  mode,
  editing,
  onSaved,
  via = "comissao",
  createSuccessMessage = "Comissão lançada — já aparece em Contas a receber.",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  editing?: Comissao | null;
  onSaved?: (item: Comissao, context: { created: boolean }) => void;
  via?: "comissao" | "titulo";
  createSuccessMessage?: string;
}) {
  const session = getSession();
  const isSolo = session?.tenant?.plano === "solo";
  const [form, setForm] = useState<ComissaoFormState>(EMPTY_FORM);
  const [eligibleSales, setEligibleSales] = useState<VendaElegivelComissao[]>(
    [],
  );
  const [loadingSales, setLoadingSales] = useState(false);
  const [salePickerOpen, setSalePickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [notaFiscalId, setNotaFiscalId] = useState("");
  const [notaArquivo, setNotaArquivo] = useState<File | null>(null);
  const [notaNumero, setNotaNumero] = useState("");
  const [corretores, setCorretores] = useState<DocumentacaoCorretor[]>([]);
  const [construtoras, setConstrutoras] = useState<Construtora[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);
  const [registrarDocumentacao, setRegistrarDocumentacao] = useState(
    readRegistrarDocumentacao,
  );
  const [passo, setPasso] = useState(0);
  const [premiacaoAberta, setPremiacaoAberta] = useState(false);

  const isAvulsa = mode === "create" && form.origemVenda === "avulsa";

  const loadEligibleSales = useCallback(async () => {
    setLoadingSales(true);
    try {
      setEligibleSales(
        via === "titulo"
          ? await fetchVendasElegiveisTituloComissao()
          : await fetchVendasElegiveisComissao(),
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar as vendas elegíveis.",
      );
    } finally {
      setLoadingSales(false);
    }
  }, [via]);

  const loadCatalogs = useCallback(async () => {
    setLoadingCatalogs(true);
    try {
      const [nextCorretores, nextConstrutoras, nextEmpreendimentos] =
        await Promise.all([
          fetchDocumentacaoCorretores(),
          fetchConstrutoras(),
          fetchEmpreendimentos({ ativo: true }),
        ]);
      setCorretores(nextCorretores);
      setConstrutoras(nextConstrutoras);
      setEmpreendimentos(nextEmpreendimentos);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar corretor e empreendimentos.",
      );
    } finally {
      setLoadingCatalogs(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setSalePickerOpen(false);
      return;
    }
    setPasso(0);
    setPremiacaoAberta(Number(editing?.valorPremiacao ?? 0) > 0);
    setNotaArquivo(null);
    setNotaNumero("");
    setNotaFiscalId(editing?.notaFiscalId ?? editing?.notaFiscal?.id ?? "");
    void fetchNotasFiscais().then(setNotas).catch(() => setNotas([]));
    if (mode === "edit" && editing) {
      setForm(toForm(editing));
      return;
    }
    setForm({
      ...EMPTY_FORM,
      ...(isSolo && session?.id ? { corretorId: session.id } : {}),
    });
    void loadEligibleSales();
    void loadCatalogs();
  }, [open, mode, editing, loadEligibleSales, loadCatalogs, isSolo, session?.id]);

  const selectedSale = useMemo(
    () =>
      eligibleSales.find((sale) => sale.documentacaoId === form.documentacaoId),
    [eligibleSales, form.documentacaoId],
  );
  const saleSummary = selectedSale ?? editing ?? null;
  const avulsoVgv = parseOptionalMoneyInput(form.vgv) ?? 0;
  const previewVgv = isAvulsa ? avulsoVgv : numberValue(saleSummary?.vgv);
  function dadosNotaDoLancamento() {
    const nome = (value?: string | ComissaoRelacionamento | null) => {
      const text = relationName(value, "");
      return text === "—" ? "" : text;
    };
    const corretorAvulso = corretores.find((item) => item.id === form.corretorId);
    const construtoraAvulsa = construtoras.find(
      (item) => item.id === form.construtoraId,
    );
    const empreendimentoAvulso = empreendimentos.find(
      (item) => item.id === form.empreendimentoId,
    );
    return {
      cliente: nome(saleSummary?.cliente) || form.clienteNome.trim(),
      vgv: previewVgv || null,
      corretor: isAvulsa
        ? (corretorAvulso?.name ?? "")
        : nome(saleSummary?.corretor),
      construtora: isAvulsa
        ? (construtoraAvulsa?.nome ?? "")
        : (selectedSale?.construtora ?? ""),
      empreendimento: isAvulsa
        ? (empreendimentoAvulso?.nome ?? "")
        : nome(saleSummary?.empreendimento),
      torreBloco: selectedSale?.torreBloco ?? "",
    };
  }
  const filteredEmpreendimentos = useMemo(() => {
    if (!form.construtoraId) return empreendimentos;
    return empreendimentos.filter(
      (item) =>
        !item.construtoraId || item.construtoraId === form.construtoraId,
    );
  }, [empreendimentos, form.construtoraId]);

  const percentages = useMemo(() => {
    const base = {
      percentualImobiliaria: numberValue(form.percentualImobiliaria),
      percentualIss: numberValue(form.percentualIss),
      percentualTributos: numberValue(form.percentualTributos),
      percentualCorretor: numberValue(form.percentualCorretor),
      percentualGerente: numberValue(form.percentualGerente),
      percentualCaixa: numberValue(form.percentualCaixa),
      percentualSocios: numberValue(form.percentualSocios),
    };
    if (!isSolo) return base;
    // Solo: só caixa + uso pessoal no rateio da líquida.
    return {
      ...base,
      percentualGerente: 0,
      percentualSocios: 0,
    };
  }, [form, isSolo]);
  const splitTotal = isSolo
    ? percentages.percentualCorretor + percentages.percentualCaixa
    : percentages.percentualCorretor +
      percentages.percentualGerente +
      percentages.percentualCaixa +
      percentages.percentualSocios;
  const preview = useMemo(() => {
    const vgv = previewVgv;
    const gross = (vgv * percentages.percentualImobiliaria) / 100;
    const iss = (gross * percentages.percentualIss) / 100;
    const afterIss = gross - iss;
    const taxes = (afterIss * percentages.percentualTributos) / 100;
    const net = afterIss - taxes;
    return {
      gross,
      iss,
      taxes,
      net,
      broker: (net * percentages.percentualCorretor) / 100,
      manager: (net * percentages.percentualGerente) / 100,
      cash: (net * percentages.percentualCaixa) / 100,
      partners: (net * percentages.percentualSocios) / 100,
    };
  }, [percentages, previewVgv]);
  const premiacaoValor = parseOptionalMoneyInput(form.valorPremiacao) ?? 0;
  const premiacaoPerc = {
    corretor: numberValue(form.percentualPremiacaoCorretor),
    imposto: numberValue(form.percentualPremiacaoImposto),
    imobiliaria: numberValue(form.percentualPremiacaoImobiliaria),
    gerente: isSolo ? 0 : numberValue(form.percentualPremiacaoGerente),
  };
  const premiacaoPreview = calculatePremiacaoCascata({
    valor: premiacaoValor,
    percentualCorretor: premiacaoPerc.corretor,
    percentualImposto: premiacaoPerc.imposto,
    percentualImobiliaria: premiacaoPerc.imobiliaria,
    percentualGerente: premiacaoPerc.gerente,
  });
  const premiacaoPayload = {
    valorPremiacao: premiacaoValor,
    percentualPremiacaoCorretor: premiacaoPerc.corretor,
    percentualPremiacaoImposto: premiacaoPerc.imposto,
    percentualPremiacaoImobiliaria: premiacaoPerc.imobiliaria,
    percentualPremiacaoGerente: premiacaoPerc.gerente,
  };

  function setField<K extends keyof ComissaoFormState>(
    key: K,
    value: ComissaoFormState[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (mode === "create" && !isAvulsa && !form.documentacaoId) {
      toast.error("Selecione uma venda elegível.");
      return;
    }
    if (isAvulsa) {
      if (form.clienteNome.trim().length < 2) {
        toast.error("Informe o nome do cliente.");
        return;
      }
      if (!form.dataVenda) {
        toast.error("Informe a data da venda.");
        return;
      }
      if (!avulsoVgv || avulsoVgv <= 0) {
        toast.error("Informe o valor da venda.");
        return;
      }
      if (!form.corretorId) {
        toast.error("Selecione o corretor.");
        return;
      }
    }
    if (percentages.percentualImobiliaria <= 0) {
      toast.error(
        isSolo
          ? "Informe o percentual de comissão sobre o VGV."
          : "Informe o percentual da imobiliária.",
      );
      return;
    }
    if (!form.dataPrevistaRecebimento) {
      toast.error("Informe a data prevista de recebimento.");
      return;
    }
    if (
      Object.values(percentages).some(
        (value) => !Number.isFinite(value) || value < 0 || value > 100,
      )
    ) {
      toast.error("Os percentuais devem estar entre 0 e 100.");
      return;
    }
    if (Math.abs(splitTotal - 100) > 0.001) {
      toast.error(
        isSolo
          ? "Caixa e uso pessoal devem somar 100%."
          : "Corretor, gerente, caixa e sócios devem somar 100%.",
      );
      return;
    }
    if (
      [
        premiacaoPerc.corretor,
        premiacaoPerc.imposto,
        premiacaoPerc.imobiliaria,
        premiacaoPerc.gerente,
      ].some((value) => !Number.isFinite(value) || value < 0 || value > 100)
    ) {
      toast.error("Os percentuais da premiação devem estar entre 0 e 100.");
      return;
    }
    if (premiacaoValor < 0) {
      toast.error("O valor da premiação não pode ser negativo.");
      return;
    }

    setSaving(true);
    try {
      let notaId = notaFiscalId;
      if (notaArquivo) {
        const selecionada = notas.find((nota) => nota.id === notaFiscalId);
        if (!selecionada && !notaNumero.trim()) {
          toast.error("Informe o número da NF para anexar o arquivo.");
          setSaving(false);
          return;
        }
        const dadosNota = dadosNotaDoLancamento();
        const salva = await saveNotaFiscal(
          selecionada
            ? {
                ...selecionada,
                numero: notaNumero.trim() || selecionada.numero,
                file: notaArquivo,
              }
            : {
                ...dadosNota,
                numero: notaNumero.trim(),
                file: notaArquivo,
              },
          selecionada?.id,
        );
        notaId = salva.id;
      }
      const created = mode === "create";
      const avulsaPayload = {
        clienteNome: form.clienteNome.trim(),
        vgv: Math.round(avulsoVgv),
        dataVenda: form.dataVenda,
        corretorId: form.corretorId,
        ...(form.construtoraId ? { construtoraId: form.construtoraId } : {}),
        ...(form.empreendimentoId
          ? { empreendimentoId: form.empreendimentoId }
          : {}),
        dataPrevistaRecebimento: form.dataPrevistaRecebimento,
        ...percentages,
        ...premiacaoPayload,
      };
      const observacao = form.observacao.trim();
      const saved =
        mode === "edit" && editing
              ? await updateComissao(editing.id, {
              ...percentages,
              ...premiacaoPayload,
              dataPrevistaRecebimento: form.dataPrevistaRecebimento,
              status: form.status,
              observacao,
              notaFiscalId: notaId || null,
            })
          : isAvulsa
            ? via === "titulo"
              ? (await createTituloComissaoAvulsa({
                  ...avulsaPayload,
                  observacao,
                  registrarDocumentacao,
                  ...(notaId ? { notaFiscalId: notaId } : {}),
                })).comissao
              : await createComissaoComVendaAvulsa({
                  ...avulsaPayload,
                  observacao,
                  registrarDocumentacao,
                  ...(notaId ? { notaFiscalId: notaId } : {}),
                })
            : via === "titulo"
              ? (
                  await createTituloComissao({
                    documentacaoId: form.documentacaoId,
                    dataPrevistaRecebimento: form.dataPrevistaRecebimento,
                    ...percentages,
                    ...premiacaoPayload,
                    observacao,
                    ...(notaId ? { notaFiscalId: notaId } : {}),
                  })
                ).comissao
              : await createComissao({
                  documentacaoId: form.documentacaoId,
                  dataPrevistaRecebimento: form.dataPrevistaRecebimento,
                  ...percentages,
                  ...premiacaoPayload,
                  observacao,
                  ...(notaId ? { notaFiscalId: notaId } : {}),
                });
      onOpenChange(false);
      toast.success(
        created
          ? isAvulsa
            ? registrarDocumentacao
              ? "Comissão lançada e venda registrada na documentação."
              : "Comissão lançada."
            : createSuccessMessage
          : "Comissão atualizada.",
      );
      onSaved?.(saved, { created });
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar a comissão.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormDialogShell
      open={open}
      onOpenChange={onOpenChange}
      icon={<Percent className="size-5" />}
      title={mode === "create" ? "Lançar comissão" : "Editar comissão"}
      description={
        mode === "create"
          ? "Use uma venda já cadastrada ou lance um cliente que ainda não está no sistema."
          : "Defina a data prevista de recebimento e os percentuais antes de salvar."
      }
      footer={
        <FormDialogActions>
          <Button
            type="button"
            variant="outline"
            onClick={() => (passo === 0 ? onOpenChange(false) : setPasso((atual) => atual - 1))}
            disabled={saving}
          >
            {passo === 0 ? "Cancelar" : "Voltar"}
          </Button>
          {passo < 1 ? (
            <Button
              type="button"
              className={BRAND_GRADIENT_BTN}
              style={BRAND_GRADIENT_STYLE}
              onClick={() => setPasso((atual) => atual + 1)}
            >
              Próximo
              <ArrowRight className="ml-1.5 size-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              form="commission-form"
              className={BRAND_GRADIENT_BTN}
              style={BRAND_GRADIENT_STYLE}
              disabled={saving}
            >
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Salvar comissão
            </Button>
          )}
        </FormDialogActions>
      }
    >
      <form
        id="commission-form"
        onSubmit={handleSubmit}
        className="flex min-h-0 flex-1 flex-col"
      >
        <FormDialogBody className="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-5">
          <div className="space-y-4">
          <PassosLancamento passo={passo} onChange={setPasso} />
          {passo === 0 && mode === "create" && (
            <FormSection title="Origem da venda" icon={<Home className="size-4 text-[#079ED4]" />} description="Informe como a venda foi gerada.">
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant={
                    form.origemVenda === "existente" ? "default" : "outline"
                  }
                  onClick={() => setField("origemVenda", "existente")}
                >
                  Venda existente
                </Button>
                <Button
                  type="button"
                  variant={form.origemVenda === "avulsa" ? "default" : "outline"}
                  onClick={() => setField("origemVenda", "avulsa")}
                >
                  Cliente não cadastrado
                </Button>
              </div>

              {form.origemVenda === "existente" ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Venda</Label>
                  <span className="text-xs text-muted-foreground">
                    {loadingSales
                      ? "Carregando…"
                      : `${eligibleSales.length} elegível(is)`}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Todas as vendas ficam disponíveis e podem receber mais de um
                  lançamento de comissão.
                </p>
                <Popover open={salePickerOpen} onOpenChange={setSalePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      className="h-auto min-h-10 w-full justify-between py-2 font-normal"
                      disabled={loadingSales}
                    >
                      {loadingSales ? (
                        "Carregando vendas…"
                      ) : selectedSale ? (
                        <span className="min-w-0 flex-1 text-left">
                          <span className="block truncate font-medium">
                            {relationName(selectedSale.cliente)}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {relationName(selectedSale.empreendimento)} ·{" "}
                            {formatDate(selectedSale.dataVenda)} ·{" "}
                            {brl(numberValue(selectedSale.vgv))}
                          </span>
                        </span>
                      ) : (
                        "Selecione uma venda"
                      )}
                      {loadingSales ? (
                        <Loader2 className="size-4 shrink-0 animate-spin" />
                      ) : (
                        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-(--radix-popover-trigger-width) p-0"
                    align="start"
                  >
                    <Command>
                      <CommandInput placeholder="Buscar cliente, corretor ou empreendimento…" />
                      <CommandList className="max-h-72">
                        <CommandEmpty>Nenhuma venda elegível.</CommandEmpty>
                        <CommandGroup>
                          {eligibleSales.map((sale) => (
                            <CommandItem
                              key={sale.documentacaoId}
                              value={`${relationName(sale.cliente)} ${relationName(sale.empreendimento)} ${relationName(sale.corretor)} ${formatDate(sale.dataVenda)} ${sale.documentacaoId}`}
                              onSelect={() => {
                                setField("documentacaoId", sale.documentacaoId);
                                setSalePickerOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "size-4 shrink-0",
                                  form.documentacaoId === sale.documentacaoId
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">
                                  {relationName(sale.cliente)}
                                  {sale.origem === "usado" ? " · Usado" : ""}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {relationName(sale.empreendimento)} ·{" "}
                                  {relationName(sale.corretor)}
                                </p>
                                <p className="truncate text-xs tabular-nums text-muted-foreground">
                                  {formatDate(sale.dataVenda)} ·{" "}
                                  {brl(numberValue(sale.vgv))}
                                </p>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3 rounded-md border bg-muted/30 px-3 py-2.5 sm:col-span-2">
                  <Checkbox
                    id="comissao-registrar-documentacao"
                    checked={registrarDocumentacao}
                    onCheckedChange={(checked) => {
                      const next = checked === true;
                      setRegistrarDocumentacao(next);
                      writeRegistrarDocumentacao(next);
                    }}
                  />
                  <div className="space-y-1">
                    <Label
                      htmlFor="comissao-registrar-documentacao"
                      className="cursor-pointer font-medium"
                    >
                      Registrar na documentação
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Desligado por padrão. Ligado, a venda entra em
                      Documentação e a escolha permanece até você desmarcar.
                      {loadingCatalogs ? " Carregando cadastros…" : ""}
                    </p>
                  </div>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="comissao-cliente-nome">Nome do cliente</Label>
                  <Input
                    id="comissao-cliente-nome"
                    value={form.clienteNome}
                    onChange={(event) =>
                      setField("clienteNome", event.target.value)
                    }
                    required={isAvulsa}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comissao-vgv">Valor da venda (VGV)</Label>
                  <Input
                    id="comissao-vgv"
                    inputMode="decimal"
                    value={form.vgv}
                    onChange={(event) =>
                      setField("vgv", maskMoneyInput(event.target.value))
                    }
                    placeholder="0,00"
                    required={isAvulsa}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comissao-data-venda">Data da venda</Label>
                  <Input
                    id="comissao-data-venda"
                    type="date"
                    value={form.dataVenda}
                    onChange={(event) =>
                      setField("dataVenda", event.target.value)
                    }
                    required={isAvulsa}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Corretor</Label>
                  {isSolo ? (
                    <p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                      {session?.name?.trim() || "Você"}
                    </p>
                  ) : (
                    <IdSearchSelect
                      value={form.corretorId}
                      options={corretores.map((item) => ({
                        id: item.id,
                        label: corretorLabel(item),
                      }))}
                      onChange={(id) => setField("corretorId", id)}
                      placeholder="Selecione o corretor"
                      searchPlaceholder="Pesquisar corretor…"
                      emptyLabel="Nenhum corretor cadastrado"
                      allowNone={false}
                      disabled={loadingCatalogs}
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Construtora</Label>
                  <IdSearchSelect
                    value={form.construtoraId}
                    options={construtoras.map((item) => ({
                      id: item.id,
                      label: item.nome,
                    }))}
                    onChange={(id) => {
                      setForm((current) => ({
                        ...current,
                        construtoraId: id,
                        empreendimentoId: "",
                      }));
                    }}
                    placeholder="Opcional"
                    searchPlaceholder="Pesquisar construtora…"
                    emptyLabel="Nenhuma construtora cadastrada"
                    disabled={loadingCatalogs}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Empreendimento</Label>
                  <IdSearchSelect
                    value={form.empreendimentoId}
                    options={filteredEmpreendimentos.map((item) => ({
                      id: item.id,
                      label: item.nome,
                      keywords: item.cidade ?? "",
                    }))}
                    onChange={(id) => {
                      const selected = empreendimentos.find(
                        (item) => item.id === id,
                      );
                      setForm((current) => ({
                        ...current,
                        empreendimentoId: id,
                        construtoraId:
                          current.construtoraId ||
                          selected?.construtoraId ||
                          "",
                      }));
                    }}
                    placeholder="Opcional"
                    searchPlaceholder="Pesquisar empreendimento…"
                    emptyLabel="Nenhum empreendimento cadastrado"
                    disabled={loadingCatalogs}
                  />
                </div>
              </div>
              )}
            </FormSection>
          )}

          {passo === 0 && !isAvulsa && saleSummary && (
            <FormSection title="Resumo da venda">
              <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <Summary
                  label="Cliente"
                  value={relationName(saleSummary.cliente)}
                />
                <Summary
                  label="Empreendimento"
                  value={relationName(saleSummary.empreendimento)}
                />
                {!isSolo ? (
                  <Summary
                    label="Corretor"
                    value={relationName(saleSummary.corretor)}
                  />
                ) : null}
                {!isSolo ? (
                  <Summary
                    label="Gerente"
                    value={relationName(saleSummary.gerente)}
                  />
                ) : null}
                <Summary
                  label="Data da venda"
                  value={formatDate(saleSummary.dataVenda)}
                />
                <Summary
                  label="VGV"
                  value={brl(numberValue(saleSummary.vgv))}
                />
              </div>
            </FormSection>
          )}

          {passo === 1 && (
          <FormSection title="Recebimento" icon={<CalendarDays className="size-4 text-[#079ED4]" />}>
            <div className="max-w-xs space-y-2">
              <Label htmlFor="comissao-data-prevista">
                Data prevista de recebimento
              </Label>
              <Input
                id="comissao-data-prevista"
                type="date"
                value={form.dataPrevistaRecebimento}
                onChange={(event) =>
                  setField("dataPrevistaRecebimento", event.target.value)
                }
                required
              />
              <p className="text-xs text-muted-foreground">
                Nesta data as fatias entram em Contas a receber e no fluxo como
                previsão. Ao marcar como paga, o fluxo registra o recebimento.
              </p>
            </div>
          </FormSection>
          )}

          {passo === 1 && (
          <FormSection title="Nota fiscal" icon={<FileText className="size-4 text-[#079ED4]" />}>
            <p className="text-xs text-muted-foreground">
              Opcional. Anexe um arquivo para criar a NF ou escolha uma já cadastrada.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Número da NF do arquivo</Label>
                <Input value={notaNumero} onChange={(event) => setNotaNumero(event.target.value)} placeholder="Obrigatório só se enviar arquivo" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Arquivo</Label>
                <ArquivoNotaField file={notaArquivo} onChange={setNotaArquivo} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Selecionar NF cadastrada</Label>
              <IdSearchSelect
                value={notaFiscalId}
                onChange={setNotaFiscalId}
                placeholder="Sem NF vinculada"
                noneLabel="Sem NF vinculada"
                emptyLabel="Nenhuma NF cadastrada"
                searchPlaceholder="Cliente, VGV, corretor, construtora, empreendimento, torre ou número"
                options={notas.map((nota) => ({
                  id: nota.id,
                  label: `NF ${nota.numero}${nota.cliente ? ` · ${nota.cliente}` : ""}`,
                  hint: [nota.empreendimento, nota.torreBloco].filter(Boolean).join(" · "),
                  keywords: [
                    nota.numero,
                    nota.cliente,
                    nota.corretor,
                    nota.construtora,
                    nota.empreendimento,
                    nota.torreBloco,
                    nota.vgv ?? "",
                    nota.vgv == null ? "" : brl(nota.vgv),
                  ].join(" "),
                }))}
              />
            </div>
          </FormSection>
          )}

          {passo === 1 && (
          <FormSection title="Observação">
            <div className="space-y-2">
              <Label htmlFor="comissao-observacao">Observação</Label>
              <Textarea
                id="comissao-observacao"
                value={form.observacao}
                onChange={(event) =>
                  setField("observacao", event.target.value.slice(0, 2000))
                }
                placeholder="Notas internas sobre este lançamento (opcional)"
                rows={3}
              />
            </div>
          </FormSection>
          )}

          {passo === 0 && (
          <>
          <FormSection title="Comissão" icon={<Percent className="size-4 text-[#079ED4]" />} description="Imobiliária sobre o VGV, depois ISS, depois tributos. A líquida é rateada abaixo.">
            {isSolo ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <PercentField
                    label="Comissão (% sobre o VGV)"
                    value={form.percentualImobiliaria}
                    onChange={(value) =>
                      setField("percentualImobiliaria", value)
                    }
                  />
                  <PercentField
                    label="ISS"
                    value={form.percentualIss}
                    onChange={(value) => setField("percentualIss", value)}
                  />
                  <PercentField
                    label="Tributos"
                    value={form.percentualTributos}
                    onChange={(value) => setField("percentualTributos", value)}
                  />
                  <PercentField
                    label="Caixa"
                    value={form.percentualCaixa}
                    onChange={(value) => setField("percentualCaixa", value)}
                  />
                  <PercentField
                    label="Uso pessoal"
                    value={form.percentualCorretor}
                    onChange={(value) => setField("percentualCorretor", value)}
                  />
                </div>
                <p
                  className={cn(
                    "text-xs",
                    Math.abs(splitTotal - 100) < 0.001
                      ? "text-emerald-600"
                      : "text-destructive",
                  )}
                >
                  Caixa + uso pessoal: {splitTotal.toLocaleString("pt-BR")}%
                  (deve somar 100% da líquida)
                </p>
              </>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  <PercentField
                    label="Imobiliária"
                    value={form.percentualImobiliaria}
                    onChange={(value) =>
                      setField("percentualImobiliaria", value)
                    }
                  />
                  <PercentField
                    label="ISS"
                    value={form.percentualIss}
                    onChange={(value) => setField("percentualIss", value)}
                  />
                  <PercentField
                    label="Tributos"
                    value={form.percentualTributos}
                    onChange={(value) => setField("percentualTributos", value)}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <PercentField
                    label="Corretor"
                    value={form.percentualCorretor}
                    onChange={(value) => setField("percentualCorretor", value)}
                  />
                  <PercentField
                    label="Gerente"
                    value={form.percentualGerente}
                    onChange={(value) => setField("percentualGerente", value)}
                  />
                  <PercentField
                    label="Caixa"
                    value={form.percentualCaixa}
                    onChange={(value) => setField("percentualCaixa", value)}
                  />
                  <PercentField
                    label="Sócios"
                    value={form.percentualSocios}
                    onChange={(value) => setField("percentualSocios", value)}
                  />
                </div>
                <p
                  className={cn(
                    "text-xs",
                    Math.abs(splitTotal - 100) < 0.001
                      ? "text-emerald-600"
                      : "text-destructive",
                  )}
                >
                  Corretor + gerente + caixa + sócios:{" "}
                  {splitTotal.toLocaleString("pt-BR")}% (deve somar 100%)
                </p>
              </>
            )}
            {mode === "edit" && (
              <div className="max-w-xs space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value) =>
                    setField("status", value as ComissaoStatus)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </FormSection>

          <FormSection
            title="Premiação"
            icon={<Trophy className="size-4 text-[#079ED4]" />}
            description="Opcional. Não entra no rateio de 100% da líquida."
          >
            <button
              type="button"
              className={cn(
                "relative h-6 w-11 rounded-full transition",
                premiacaoAberta ? "bg-[#079ED4]" : "bg-[#E2E8EC]",
              )}
              aria-pressed={premiacaoAberta}
              onClick={() => setPremiacaoAberta((atual) => !atual)}
            >
              <span
                className={cn(
                  "absolute top-0.5 size-5 rounded-full bg-white shadow transition",
                  premiacaoAberta ? "left-5" : "left-0.5",
                )}
              />
            </button>
            {premiacaoAberta && (
            <>
            <p className="text-xs text-muted-foreground">
              {isSolo
                ? "Valor à parte da comissão. Cada percentual incide sobre o saldo da etapa anterior (uso pessoal → tributos → caixa)."
                : "Valor à parte da comissão. Cada percentual incide sobre o saldo da etapa anterior (corretor → imposto → imobiliária → gerente) e não entra no rateio de 100% da líquida."}
            </p>
            <div className="max-w-xs space-y-2">
              <Label htmlFor="comissao-premiacao">Valor total da premiação</Label>
              <Input
                id="comissao-premiacao"
                inputMode="decimal"
                value={form.valorPremiacao}
                onChange={(event) =>
                  setField("valorPremiacao", maskMoneyInput(event.target.value))
                }
                placeholder="0,00"
              />
            </div>
            {isSolo ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <PercentField
                  label="Uso pessoal"
                  value={form.percentualPremiacaoCorretor}
                  onChange={(value) =>
                    setField("percentualPremiacaoCorretor", value)
                  }
                  required={false}
                />
                <PercentField
                  label="Tributos"
                  value={form.percentualPremiacaoImposto}
                  onChange={(value) =>
                    setField("percentualPremiacaoImposto", value)
                  }
                  required={false}
                />
                <PercentField
                  label="Caixa"
                  value={form.percentualPremiacaoImobiliaria}
                  onChange={(value) =>
                    setField("percentualPremiacaoImobiliaria", value)
                  }
                  required={false}
                />
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <PercentField
                  label="Corretor"
                  value={form.percentualPremiacaoCorretor}
                  onChange={(value) =>
                    setField("percentualPremiacaoCorretor", value)
                  }
                  required={false}
                />
                <PercentField
                  label="Imposto (%)"
                  value={form.percentualPremiacaoImposto}
                  onChange={(value) =>
                    setField("percentualPremiacaoImposto", value)
                  }
                  required={false}
                />
                <PercentField
                  label="Imobiliária"
                  value={form.percentualPremiacaoImobiliaria}
                  onChange={(value) =>
                    setField("percentualPremiacaoImobiliaria", value)
                  }
                  required={false}
                />
                <PercentField
                  label="Gerente"
                  value={form.percentualPremiacaoGerente}
                  onChange={(value) =>
                    setField("percentualPremiacaoGerente", value)
                  }
                  required={false}
                />
              </div>
            )}
            {premiacaoValor > 0 && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Summary
                  label={isSolo ? "Uso pessoal" : "Corretor"}
                  value={brl(premiacaoPreview.corretor)}
                />
                <Summary
                  label={isSolo ? "Tributos" : "Imposto"}
                  value={brl(premiacaoPreview.imposto)}
                />
                <Summary
                  label={isSolo ? "Caixa" : "Imobiliária"}
                  value={brl(premiacaoPreview.imobiliaria)}
                />
                {!isSolo ? (
                  <Summary
                    label="Gerente"
                    value={brl(premiacaoPreview.gerente)}
                  />
                ) : null}
                <Summary
                  label="Valor restante"
                  value={brl(premiacaoPreview.restante)}
                  emphasized
                />
              </div>
            )}
            </>
            )}
          </FormSection>
          </>
          )}
          </div>

          <ResumoComissaoPainel
            isSolo={isSolo}
            vgv={previewVgv}
            preview={preview}
            premiacao={premiacaoValor}
            premiacaoPreview={premiacaoPreview}
          />
        </FormDialogBody>
      </form>
    </FormDialogShell>
  );
}

const PASSOS = ["Origem e comissão", "Recebimento e documentos"] as const;

function PassosLancamento({
  passo,
  onChange,
}: {
  passo: number;
  onChange: (passo: number) => void;
}) {
  return (
    <ol className="flex items-center gap-2 overflow-x-auto pb-1">
      {PASSOS.map((label, index) => {
        const ativo = index === passo;
        const feito = index < passo;
        return (
          <li key={label} className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => onChange(index)}
              className="flex items-center gap-2"
            >
              <span
                className={cn(
                  "grid size-7 place-items-center rounded-full text-xs font-semibold",
                  ativo || feito
                    ? "bg-[#079ED4] text-white"
                    : "bg-[#E6EEF2] text-[#5C6B76]",
                )}
              >
                {index + 1}
              </span>
              <span
                className={cn(
                  "whitespace-nowrap text-sm",
                  ativo ? "font-semibold text-[#0B3148]" : "text-[#8B98A3]",
                )}
              >
                {label}
              </span>
            </button>
            {index < PASSOS.length - 1 ? (
              <span className="mx-1 hidden h-px w-8 bg-[#E2E8EC] sm:block" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function ResumoComissaoPainel({
  isSolo,
  vgv,
  preview,
  premiacao,
  premiacaoPreview,
}: {
  isSolo: boolean;
  vgv: number;
  preview: {
    gross: number;
    iss: number;
    taxes: number;
    net: number;
    broker: number;
    manager: number;
    cash: number;
    partners: number;
  };
  premiacao: number;
  premiacaoPreview: {
    corretor: number;
    imposto: number;
    imobiliaria: number;
    gerente: number;
    restante: number;
  };
}) {
  const fatias = [
    { label: isSolo ? "Uso pessoal" : "Corretor", valor: preview.broker, pct: preview.net ? (preview.broker / preview.net) * 100 : 0 },
    ...(!isSolo
      ? [{ label: "Gerente", valor: preview.manager, pct: preview.net ? (preview.manager / preview.net) * 100 : 0 }]
      : []),
    { label: "Caixa", valor: preview.cash, pct: preview.net ? (preview.cash / preview.net) * 100 : 0 },
    ...(!isSolo
      ? [{ label: "Sócios", valor: preview.partners, pct: preview.net ? (preview.partners / preview.net) * 100 : 0 }]
      : []),
  ];
  return (
    <aside className="space-y-3 lg:sticky lg:top-0">
      <div className="rounded-2xl bg-[#0B3148] p-5 text-white shadow-sm">
        <p className="text-sm font-medium text-white/80">Resumo da comissão</p>
        <p className="mt-3 text-3xl font-semibold tracking-tight">{brl(preview.gross)}</p>
        <p className="text-xs text-white/60">Comissão bruta</p>
        <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
          {fatias.map((fatia) => (
            <div key={fatia.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-[#079ED4]" />
                {fatia.label}
              </span>
              <span className="text-white/70">{fatia.pct.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%</span>
              <span className="font-medium">{brl(fatia.valor)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-[#F3C98B]/20 px-3 py-2 text-sm text-[#F8E2BC]">
          <span className="inline-flex items-center gap-2">
            <Trophy className="size-4" />
            Premiação
          </span>
          <span>{brl(premiacao)}</span>
        </div>
      </div>
      <div className="rounded-2xl border border-[#E2E8EC] bg-white p-4 text-sm shadow-sm dark:border-white/10 dark:bg-[#1c2430]">
        <p className="mb-3 font-medium text-[#0B3148] dark:text-white">Resumo geral</p>
        <dl className="space-y-2">
          <LinhaResumo label="Valor da venda" value={brl(vgv)} />
          <LinhaResumo label="ISS" value={brl(preview.iss)} />
          <LinhaResumo label="Tributos" value={brl(preview.taxes)} />
          <LinhaResumo label="Comissão líquida" value={brl(preview.net)} />
          <LinhaResumo label="Premiação restante" value={brl(premiacaoPreview.restante)} />
        </dl>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-[#E7F6FC] px-3 py-3 dark:bg-[#132833]">
          <span className="text-sm font-medium text-[#05749E]">Total líquido</span>
          <span className="text-lg font-semibold text-[#079ED4]">{brl(preview.net)}</span>
        </div>
      </div>
    </aside>
  );
}

function LinhaResumo({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[#5C6B76]">{label}</dt>
      <dd className="font-medium text-[#0B3148] dark:text-white">{value}</dd>
    </div>
  );
}

function PercentField({
  label,
  value,
  onChange,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="pr-8"
          required={required}
        />
        <Percent className="absolute right-2.5 top-2.5 size-4 text-muted-foreground" />
      </div>
    </div>
  );
}

function Summary({
  label,
  value,
  emphasized,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "wrap-break-word",
          emphasized && "font-semibold text-primary",
        )}
      >
        {value}
      </p>
    </div>
  );
}
