import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, FileText, FileWarning, Link2Off, Plus, Receipt } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
  FormSection,
} from "@/components/form-dialog";
import { ArquivoNotaField } from "@/components/arquivo-nota-field";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import { PagePanel } from "@/components/page-panel";
import { FinanceiroFiltrosBar } from "@/components/financeiro-filtros";
import { FILTRO_CAMPO } from "@/components/filtros-painel";
import { TablePager } from "@/components/table-pager";
import { IdSearchSelect } from "@/components/id-search-select";
import { relationName } from "@/components/comissao-lancamento-dialog";
import {
  fetchComissoes,
  fetchNotasFiscais,
  fetchNotasFiscaisOpcoes,
  saveNotaFiscal,
  updateComissao,
  type Comissao,
  type NotaFiscal,
} from "@/lib/financeiro-api";
import { maskMoneyInput, parseOptionalMoneyInput } from "@/lib/money-input";
import { brl, formatDate, type PeriodoFiltro } from "@/lib/financeiro-mock";
import { TABLE_LUX, TABLE_SHELL } from "@/lib/filter-bar";
import { BRAND_GRADIENT_BTN, BRAND_GRADIENT_STYLE } from "@/lib/brand-gradient";
import { useTablePager } from "@/lib/use-table-pager";
import { ApiError } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/financeiro/gestao-nf")({
  head: () => ({ meta: [{ title: "Gestão de NF — Zone Connection" }] }),
  component: Page,
});

const empty = {
  numero: "",
  cliente: "",
  vgv: "",
  corretor: "",
  construtora: "",
  empreendimento: "",
  torreBloco: "",
  dataEmissao: "",
};

type ArquivoFiltro = "todos" | "com" | "sem";

function Page() {
  const [rows, setRows] = useState<NotaFiscal[]>([]);
  const [corretores, setCorretores] = useState<string[]>([]);
  const [construtoras, setConstrutoras] = useState<string[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("tudo");
  const [dataDe, setDataDe] = useState("");
  const [dataAte, setDataAte] = useState("");
  const [corretor, setCorretor] = useState("todos");
  const [construtora, setConstrutora] = useState("todos");
  const [empreendimento, setEmpreendimento] = useState("todos");
  const [arquivo, setArquivo] = useState<ArquivoFiltro>("todos");
  const [open, setOpen] = useState(false);
  const [passo, setPasso] = useState(0);
  const [comissoes, setComissoes] = useState<Comissao[]>([]);
  const [comissaoId, setComissaoId] = useState("");
  const [editing, setEditing] = useState<NotaFiscal | null>(null);
  const [form, setForm] = useState(empty);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadOpcoes() {
    try {
      const opcoes = await fetchNotasFiscaisOpcoes();
      setCorretores(opcoes.corretores);
      setConstrutoras(opcoes.construtoras);
      setEmpreendimentos(opcoes.empreendimentos);
    } catch {
      /* a lista segue mesmo sem as opções do filtro */
    }
  }

  useEffect(() => {
    void loadOpcoes();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          setRows(
            await fetchNotasFiscais({
              q,
              periodo,
              de: dataDe,
              ate: dataAte,
              corretor,
              construtora,
              empreendimento,
              arquivo: arquivo === "todos" ? undefined : arquivo,
            }),
          );
        } catch (err) {
          toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar as notas.");
        }
      })();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [q, periodo, dataDe, dataAte, corretor, construtora, empreendimento, arquivo]);

  const hasActive =
    Boolean(q.trim()) ||
    periodo !== "tudo" ||
    Boolean(dataDe || dataAte) ||
    corretor !== "todos" ||
    construtora !== "todos" ||
    empreendimento !== "todos" ||
    arquivo !== "todos";

  const pager = useTablePager(
    rows,
    `${q}|${periodo}|${dataDe}|${dataAte}|${corretor}|${construtora}|${empreendimento}|${arquivo}`,
  );

  function clearFilters() {
    setQ("");
    setPeriodo("tudo");
    setDataDe("");
    setDataAte("");
    setCorretor("todos");
    setConstrutora("todos");
    setEmpreendimento("todos");
    setArquivo("todos");
  }

  function startCreate() {
    setEditing(null);
    setForm(empty);
    setFile(null);
    setPasso(0);
    setComissaoId("");
    setOpen(true);
    void fetchComissoes().then(setComissoes).catch(() => setComissoes([]));
  }

  function startEdit(row: NotaFiscal) {
    setEditing(row);
    setForm({
      numero: row.numero,
      cliente: row.cliente,
      vgv: row.vgv == null ? "" : String(row.vgv),
      corretor: row.corretor,
      construtora: row.construtora,
      empreendimento: row.empreendimento,
      torreBloco: row.torreBloco,
      dataEmissao: row.dataEmissao ?? "",
    });
    setFile(null);
    setPasso(0);
    setComissaoId("");
    setOpen(true);
    void fetchComissoes()
      .then((lista) => {
        setComissoes(lista);
        setComissaoId(lista.find((item) => item.notaFiscalId === row.id)?.id ?? "");
      })
      .catch(() => setComissoes([]));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.numero.trim()) {
      toast.error("Informe o número da NF.");
      return;
    }
    setSaving(true);
    try {
      const salva = await saveNotaFiscal(
        {
          numero: form.numero.trim(),
          cliente: form.cliente,
          corretor: form.corretor,
          construtora: form.construtora,
          empreendimento: form.empreendimento,
          torreBloco: form.torreBloco,
          dataEmissao: form.dataEmissao || null,
          vgv: parseOptionalMoneyInput(form.vgv),
          file,
        },
        editing?.id,
      );
      if (comissaoId) {
        await updateComissao(comissaoId, { notaFiscalId: salva.id });
      }
      setOpen(false);
      toast.success(editing ? "Nota atualizada." : "Nota cadastrada.");
      setRows(
        await fetchNotasFiscais({
          q,
          periodo,
          de: dataDe,
          ate: dataAte,
          corretor,
          construtora,
          empreendimento,
          arquivo: arquivo === "todos" ? undefined : arquivo,
        }),
      );
      await loadOpcoes();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível salvar a nota.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Gestão de NF"
        description="Notas fiscais das vendas e das comissões."
        actions={
          <Button type="button" className={BRAND_GRADIENT_BTN} style={BRAND_GRADIENT_STYLE} onClick={startCreate}>
            <Plus className="mr-1.5 size-4" />
            Nova NF
          </Button>
        }
      />

      <FinanceiroFiltrosBar
        kicker="Gestão de NF"
        resultCount={rows.length}
        search={q}
        onSearchChange={setQ}
        searchPlaceholder="Buscar número, cliente, corretor, construtora, empreendimento ou torre"
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        dataDe={dataDe}
        onDataDeChange={setDataDe}
        dataAte={dataAte}
        onDataAteChange={setDataAte}
        hasActive={hasActive}
        onClear={clearFilters}
        extra={
          <div className="grid gap-3 sm:grid-cols-2">
            <FiltroOpcoes label="Corretor" value={corretor} onChange={setCorretor} options={corretores} todos="Todos os corretores" />
            <FiltroOpcoes label="Construtora" value={construtora} onChange={setConstrutora} options={construtoras} todos="Todas as construtoras" />
            <FiltroOpcoes label="Empreendimento" value={empreendimento} onChange={setEmpreendimento} options={empreendimentos} todos="Todos os empreendimentos" />
            <div className="space-y-1.5">
              <Label>Arquivo</Label>
              <Select value={arquivo} onValueChange={(value) => setArquivo(value as ArquivoFiltro)}>
                <SelectTrigger className={FILTRO_CAMPO}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Com ou sem arquivo</SelectItem>
                  <SelectItem value="com">Com arquivo</SelectItem>
                  <SelectItem value="sem">Sem arquivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        }
      />

      <PagePanel
        inset="muted"
        className="mb-4"
        title="Notas no recorte"
        description="Os números acompanham a busca e os filtros."
      >
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <FinanceKpiCard
            label="Notas"
            value={rows.length}
            format="number"
            icon={FileText}
            variant="dash"
            tone="blue"
          />
          <FinanceKpiCard
            label="Sem comissão"
            value={rows.filter((row) => !row.vinculada).length}
            format="number"
            icon={Link2Off}
            variant="dash"
            tone="orange"
          />
          <FinanceKpiCard
            label="Sem arquivo"
            value={rows.filter((row) => !row.arquivoUrl).length}
            format="number"
            icon={FileWarning}
            variant="dash"
            tone="rose"
          />
          <FinanceKpiCard
            label="VGV das notas"
            value={rows.reduce((sum, row) => sum + (row.vgv ?? 0), 0)}
            icon={Receipt}
            variant="dash"
            tone="teal"
          />
        </section>
      </PagePanel>

      <div className={TABLE_SHELL}>
        <div className="overflow-x-auto">
          <Table className={TABLE_LUX}>
            <TableHeader>
              <TableRow>
                <TableHead className="h-9">Número</TableHead>
                <TableHead className="h-9">Cliente</TableHead>
                <TableHead className="h-9">VGV</TableHead>
                <TableHead className="h-9">Corretor</TableHead>
                <TableHead className="h-9">Construtora</TableHead>
                <TableHead className="h-9">Empreendimento</TableHead>
                <TableHead className="h-9">Emissão</TableHead>
                <TableHead className="h-9">Arquivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pager.pageItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    {hasActive ? "Nenhuma nota neste filtro." : "Nenhuma nota fiscal cadastrada."}
                  </TableCell>
                </TableRow>
              ) : (
                pager.pageItems.map((row) => (
                  <TableRow key={row.id} className="cursor-pointer" onClick={() => startEdit(row)}>
                    <TableCell className="font-medium">{row.numero}</TableCell>
                    <TableCell>{row.cliente || "—"}</TableCell>
                    <TableCell>{row.vgv == null ? "—" : brl(row.vgv)}</TableCell>
                    <TableCell>{row.corretor || "—"}</TableCell>
                    <TableCell>{row.construtora || "—"}</TableCell>
                    <TableCell>
                      {row.empreendimento || "—"}
                      {row.torreBloco ? <span className="block text-xs text-muted-foreground">{row.torreBloco}</span> : null}
                    </TableCell>
                    <TableCell>{row.dataEmissao ? formatDate(row.dataEmissao) : "—"}</TableCell>
                    <TableCell>
                      {row.arquivoUrl ? (
                        <a
                          className="text-primary underline"
                          href={row.arquivoUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {row.arquivoNome || "Abrir"}
                        </a>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <TablePager
          page={pager.page}
          totalPages={pager.totalPages}
          total={pager.total}
          onPageChange={pager.setPage}
        />
      </div>

      <FormDialogShell
        open={open}
        onOpenChange={setOpen}
        icon={<FileText className="size-5" />}
        title={editing ? "Editar NF" : "Nova NF"}
        description="Cadastre a nota e, se quiser, vincule a um lançamento de comissão."
        footer={
          <FormDialogActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => (passo === 0 ? setOpen(false) : setPasso((atual) => atual - 1))}
              disabled={saving}
            >
              {passo === 0 ? "Cancelar" : "Voltar"}
            </Button>
            {passo < 2 ? (
              <Button
                type="button"
                className={BRAND_GRADIENT_BTN}
                style={BRAND_GRADIENT_STYLE}
                onClick={() => {
                  if (passo === 0 && !form.numero.trim()) {
                    toast.error("Informe o número da NF.");
                    return;
                  }
                  setPasso((atual) => atual + 1);
                }}
              >
                Próximo
                <ArrowRight className="ml-1.5 size-4" />
              </Button>
            ) : (
              <Button type="submit" form="nf-form" className={BRAND_GRADIENT_BTN} style={BRAND_GRADIENT_STYLE} disabled={saving}>
                {saving ? "Salvando…" : "Salvar NF"}
              </Button>
            )}
          </FormDialogActions>
        }
      >
        <form id="nf-form" onSubmit={(event) => void submit(event)} className="flex min-h-0 flex-1 flex-col">
          <FormDialogBody className="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-5">
            <div className="space-y-4">
              <PassosNf passo={passo} onChange={setPasso} />
              {passo === 0 && (
                <FormSection title="Dados da nota fiscal" icon={<FileText className="size-4 text-[#079ED4]" />} description="Só o número é obrigatório.">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Número da NF" required value={form.numero} onChange={(numero) => setForm({ ...form, numero })} />
                    <div className="space-y-1.5">
                      <Label>Data de emissão</Label>
                      <Input type="date" value={form.dataEmissao} onChange={(event) => setForm({ ...form, dataEmissao: event.target.value })} />
                    </div>
                    <Field label="Cliente" value={form.cliente} onChange={(cliente) => setForm({ ...form, cliente })} />
                    <Field label="Valor da venda (VGV)" value={form.vgv} onChange={(vgv) => setForm({ ...form, vgv: maskMoneyInput(vgv) })} />
                    <Field label="Corretor" value={form.corretor} onChange={(corretor) => setForm({ ...form, corretor })} />
                    <Field label="Construtora" value={form.construtora} onChange={(construtora) => setForm({ ...form, construtora })} />
                    <Field label="Empreendimento" value={form.empreendimento} onChange={(empreendimento) => setForm({ ...form, empreendimento })} />
                    <Field label="Torre / Bloco" value={form.torreBloco} onChange={(torreBloco) => setForm({ ...form, torreBloco })} />
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Arquivo da NF</Label>
                      <ArquivoNotaField file={file} onChange={setFile} atualUrl={editing?.arquivoUrl} atualNome={editing?.arquivoNome} />
                    </div>
                  </div>
                </FormSection>
              )}
              {passo === 1 && (
                <FormSection title="Vinculação" icon={<Receipt className="size-4 text-[#079ED4]" />} description="Opcional. A nota pode ficar sem comissão.">
                  <IdSearchSelect
                    value={comissaoId}
                    onChange={setComissaoId}
                    placeholder="Sem vínculo"
                    noneLabel="Sem vínculo"
                    emptyLabel="Nenhuma comissão lançada"
                    searchPlaceholder="Cliente, corretor ou empreendimento"
                    options={comissoes.map((item) => ({
                      id: item.id,
                      label: relationName(item.cliente, "Comissão"),
                      hint: [relationName(item.empreendimento, ""), relationName(item.corretor, "")].filter((parte) => parte && parte !== "—").join(" · "),
                      keywords: [relationName(item.cliente, ""), relationName(item.corretor, ""), relationName(item.empreendimento, ""), item.notaFiscal?.numero ?? ""].join(" "),
                    }))}
                  />
                </FormSection>
              )}
              {passo === 2 && (
                <FormSection title="Confirmação" description="Confira os dados antes de salvar.">
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <Confirma label="Número" value={form.numero || "—"} />
                    <Confirma label="Emissão" value={form.dataEmissao ? formatDate(form.dataEmissao) : "—"} />
                    <Confirma label="Cliente" value={form.cliente || "—"} />
                    <Confirma label="VGV" value={brl(parseOptionalMoneyInput(form.vgv) ?? 0)} />
                    <Confirma label="Corretor" value={form.corretor || "—"} />
                    <Confirma label="Construtora" value={form.construtora || "—"} />
                    <Confirma label="Empreendimento" value={form.empreendimento || "—"} />
                    <Confirma label="Torre / bloco" value={form.torreBloco || "—"} />
                    <Confirma label="Arquivo" value={file?.name || editing?.arquivoNome || "Nenhum"} />
                    <Confirma label="Comissão" value={comissoes.find((item) => item.id === comissaoId) ? relationName(comissoes.find((item) => item.id === comissaoId)?.cliente) : "Sem vínculo"} />
                  </dl>
                </FormSection>
              )}
            </div>
            <aside className="lg:sticky lg:top-0">
              <div className="rounded-2xl bg-[#0B3148] p-5 text-white shadow-sm">
                <p className="text-sm font-medium text-white/80">Resumo da NF</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight">{brl(parseOptionalMoneyInput(form.vgv) ?? 0)}</p>
                <p className="text-xs text-white/60">Valor da venda (VGV)</p>
                <dl className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm">
                  <ResumoLinha label="Número" value={form.numero || "—"} />
                  <ResumoLinha label="Cliente" value={form.cliente || "—"} />
                  <ResumoLinha label="Corretor" value={form.corretor || "—"} />
                  <ResumoLinha label="Empreendimento" value={form.empreendimento || "—"} />
                </dl>
                <div className="mt-4 flex items-center justify-between rounded-xl bg-[#E7F6FC] px-3 py-3 text-[#05749E]">
                  <span className="text-sm font-medium">Comissão</span>
                  <span className="text-sm font-semibold">
                    {comissoes.find((item) => item.id === comissaoId) ? relationName(comissoes.find((item) => item.id === comissaoId)?.cliente) : "Sem vínculo"}
                  </span>
                </div>
              </div>
            </aside>
          </FormDialogBody>
        </form>
      </FormDialogShell>
    </div>
  );
}

const PASSOS_NF = ["Dados da NF", "Vinculação", "Confirmação"] as const;

function PassosNf({ passo, onChange }: { passo: number; onChange: (passo: number) => void }) {
  return (
    <ol className="flex items-center gap-2 overflow-x-auto pb-1">
      {PASSOS_NF.map((label, index) => {
        const ativo = index === passo;
        return (
          <li key={label} className="flex items-center gap-2">
            <button type="button" onClick={() => onChange(index)} className="flex items-center gap-2">
              <span className={`grid size-7 place-items-center rounded-full text-xs font-semibold ${ativo || index < passo ? "bg-[#079ED4] text-white" : "bg-[#E6EEF2] text-[#5C6B76]"}`}>
                {index + 1}
              </span>
              <span className={`whitespace-nowrap text-sm ${ativo ? "font-semibold text-[#0B3148]" : "text-[#8B98A3]"}`}>{label}</span>
            </button>
            {index < PASSOS_NF.length - 1 ? <span className="mx-1 hidden h-px w-8 bg-[#E2E8EC] sm:block" /> : null}
          </li>
        );
      })}
    </ol>
  );
}

function Confirma({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-[#8B98A3]">{label}</dt>
      <dd className="font-medium text-[#0B3148]">{value}</dd>
    </div>
  );
}

function ResumoLinha({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-white/60">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  );
}

function FiltroOpcoes({
  label,
  value,
  onChange,
  options,
  todos,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  todos: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={FILTRO_CAMPO}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">{todos}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {required ? " *" : ""}
      </Label>
      <Input value={value} required={required} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
