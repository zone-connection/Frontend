import { createFileRoute } from "@tanstack/react-router";
import { FileText, FileWarning, Link2Off, Plus, Receipt } from "lucide-react";
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
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import { PagePanel } from "@/components/page-panel";
import { FinanceiroFiltrosBar } from "@/components/financeiro-filtros";
import { FILTRO_CAMPO } from "@/components/filtros-painel";
import { TablePager } from "@/components/table-pager";
import {
  fetchNotasFiscais,
  fetchNotasFiscaisOpcoes,
  saveNotaFiscal,
  type NotaFiscal,
} from "@/lib/financeiro-api";
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
    setOpen(true);
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
    setOpen(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.numero.trim()) {
      toast.error("Informe o número da NF.");
      return;
    }
    setSaving(true);
    try {
      await saveNotaFiscal(
        {
          numero: form.numero.trim(),
          cliente: form.cliente,
          corretor: form.corretor,
          construtora: form.construtora,
          empreendimento: form.empreendimento,
          torreBloco: form.torreBloco,
          dataEmissao: form.dataEmissao || null,
          vgv: form.vgv.trim() ? Number(form.vgv.replace(",", ".")) : null,
          file,
        },
        editing?.id,
      );
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
        description="Só o número é obrigatório. Os demais dados podem ser preenchidos depois."
      >
        <form onSubmit={(event) => void submit(event)}>
          <FormDialogBody>
            <FormSection title="Nota">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Número da NF" required value={form.numero} onChange={(numero) => setForm({ ...form, numero })} />
                <div className="space-y-1.5">
                  <Label>Data de emissão</Label>
                  <Input type="date" value={form.dataEmissao} onChange={(event) => setForm({ ...form, dataEmissao: event.target.value })} />
                </div>
                <Field label="Cliente" value={form.cliente} onChange={(cliente) => setForm({ ...form, cliente })} />
                <Field label="Valor da venda (VGV)" value={form.vgv} onChange={(vgv) => setForm({ ...form, vgv })} />
                <Field label="Corretor" value={form.corretor} onChange={(corretor) => setForm({ ...form, corretor })} />
                <Field label="Construtora" value={form.construtora} onChange={(construtora) => setForm({ ...form, construtora })} />
                <Field label="Empreendimento" value={form.empreendimento} onChange={(empreendimento) => setForm({ ...form, empreendimento })} />
                <Field label="Torre / Bloco" value={form.torreBloco} onChange={(torreBloco) => setForm({ ...form, torreBloco })} />
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Arquivo da NF</Label>
                  <Input type="file" accept=".pdf,.doc,.docx,application/pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
                  {editing?.arquivoUrl ? (
                    <a className="text-xs text-primary underline" href={editing.arquivoUrl} target="_blank" rel="noreferrer">
                      Arquivo atual: {editing.arquivoNome || "abrir"}
                    </a>
                  ) : null}
                </div>
              </div>
            </FormSection>
          </FormDialogBody>
          <FormDialogActions>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" className={BRAND_GRADIENT_BTN} style={BRAND_GRADIENT_STYLE} disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </FormDialogActions>
        </form>
      </FormDialogShell>
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
