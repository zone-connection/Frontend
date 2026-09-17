import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
  FormSection,
} from "@/components/form-dialog";
import { IdSearchSelect } from "@/components/id-search-select";
import { Button } from "@/components/ui/button";
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
  updateComissao,
  type Comissao,
  type ComissaoRelacionamento,
  type ComissaoStatus,
  type VendaElegivelComissao,
} from "@/lib/financeiro-api";
import { brl, formatDate } from "@/lib/financeiro-mock";
import { formatMoneyInput, maskMoneyInput, parseOptionalMoneyInput } from "@/lib/money-input";
import { cn } from "@/lib/utils";
import {
  Check,
  ChevronsUpDown,
  Loader2,
  Percent,
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
    documentacaoId: comissao.documentacaoId,
    dataPrevistaRecebimento: (comissao.dataPrevistaRecebimento ?? "").slice(
      0,
      10,
    ),
    percentualImobiliaria: String(comissao.percentualImobiliaria ?? ""),
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
  const [corretores, setCorretores] = useState<DocumentacaoCorretor[]>([]);
  const [construtoras, setConstrutoras] = useState<Construtora[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);

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
    const taxes = (gross * percentages.percentualTributos) / 100;
    const net = gross - taxes;
    return {
      gross,
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
            })
          : isAvulsa
            ? via === "titulo"
              ? (await createTituloComissaoAvulsa({
                  ...avulsaPayload,
                  observacao,
                })).comissao
              : await createComissaoComVendaAvulsa({
                  ...avulsaPayload,
                  observacao,
                })
            : via === "titulo"
              ? (
                  await createTituloComissao({
                    documentacaoId: form.documentacaoId,
                    dataPrevistaRecebimento: form.dataPrevistaRecebimento,
                    ...percentages,
                    ...premiacaoPayload,
                    observacao,
                  })
                ).comissao
              : await createComissao({
                  documentacaoId: form.documentacaoId,
                  dataPrevistaRecebimento: form.dataPrevistaRecebimento,
                  ...percentages,
                  ...premiacaoPayload,
                  observacao,
                });
      onOpenChange(false);
      toast.success(
        created
          ? isAvulsa
            ? "Comissão lançada — a venda já aparece em Vendas e Documentação."
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
      className="max-w-3xl"
      footer={
        <FormDialogActions
          hint={`Distribuição: ${splitTotal.toLocaleString("pt-BR")}% de 100%`}
        >
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button type="submit" form="commission-form" disabled={saving}>
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            Salvar comissão
          </Button>
        </FormDialogActions>
      }
    >
      <form
        id="commission-form"
        onSubmit={handleSubmit}
        className="flex min-h-0 flex-1 flex-col"
      >
        <FormDialogBody>
          {mode === "create" && (
            <FormSection title="Origem da venda">
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
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  Cria o cliente, a venda em Documentação/Vendas e a comissão
                  juntos.
                  {loadingCatalogs ? " Carregando cadastros…" : ""}
                </p>
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

          {!isAvulsa && saleSummary && (
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

          <FormSection title="Recebimento">
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

          <FormSection title="Percentuais">
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
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <PercentField
                    label="Imobiliária"
                    value={form.percentualImobiliaria}
                    onChange={(value) =>
                      setField("percentualImobiliaria", value)
                    }
                  />
                  <PercentField
                    label="Tributos"
                    value={form.percentualTributos}
                    onChange={(value) => setField("percentualTributos", value)}
                  />
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

          <FormSection title="Premiação">
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
          </FormSection>

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

          <FormSection title="Prévia do cálculo" className="bg-muted/20">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Summary label="Comissão bruta" value={brl(preview.gross)} />
              <Summary label="Tributos" value={brl(preview.taxes)} />
              <Summary
                label="Comissão líquida"
                value={brl(preview.net)}
                emphasized
              />
              <Summary
                label={isSolo ? "Uso pessoal" : "Corretor"}
                value={brl(preview.broker)}
              />
              {!isSolo ? (
                <Summary label="Gerente" value={brl(preview.manager)} />
              ) : null}
              <Summary label="Caixa" value={brl(preview.cash)} />
              {!isSolo ? (
                <Summary label="Sócios" value={brl(preview.partners)} />
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {isSolo
                ? "Bruta = VGV × % comissão; líquida = bruta − tributos; caixa e uso pessoal sobre a líquida."
                : "Bruta = VGV × % imobiliária; líquida = bruta − tributos; distribuição calculada sobre a líquida."}
            </p>
          </FormSection>
        </FormDialogBody>
      </form>
    </FormDialogShell>
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
