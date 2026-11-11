import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
} from "@/components/form-dialog";
import { fetchNotasFiscais, saveNotaFiscal, type NotaFiscal } from "@/lib/financeiro-api";
import { brl } from "@/lib/financeiro-mock";
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

function Page() {
  const [rows, setRows] = useState<NotaFiscal[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<NotaFiscal | null>(null);
  const [form, setForm] = useState(empty);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setRows(await fetchNotasFiscais());
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar as notas.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      [row.numero, row.cliente, row.corretor, row.construtora, row.empreendimento, row.torreBloco, row.vgv ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [rows, q]);

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
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível salvar a nota.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Gestão de NF"
        description="Notas fiscais das vendas e das comissões."
        actions={<Button onClick={startCreate}>Nova NF</Button>}
      />
      <Input
        value={q}
        onChange={(event) => setQ(event.target.value)}
        placeholder="Buscar por número, cliente, corretor, construtora, empreendimento ou torre"
      />
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left">
            <tr>
              <th className="px-3 py-2">Número</th>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">VGV</th>
              <th className="px-3 py-2">Corretor</th>
              <th className="px-3 py-2">Empreendimento</th>
              <th className="px-3 py-2">Arquivo</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                  Nenhuma nota fiscal cadastrada.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id} className="cursor-pointer border-t" onClick={() => startEdit(row)}>
                  <td className="px-3 py-2 font-medium">{row.numero}</td>
                  <td className="px-3 py-2">{row.cliente || "—"}</td>
                  <td className="px-3 py-2">{row.vgv == null ? "—" : brl(row.vgv)}</td>
                  <td className="px-3 py-2">{row.corretor || "—"}</td>
                  <td className="px-3 py-2">{row.empreendimento || "—"}</td>
                  <td className="px-3 py-2">
                    {row.arquivoUrl ? (
                      <a className="text-primary underline" href={row.arquivoUrl} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>
                        {row.arquivoNome || "Abrir"}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <FormDialogShell open={open} onOpenChange={setOpen} icon={<FileText className="size-5" />} title={editing ? "Editar NF" : "Nova NF"}>
        <form onSubmit={(event) => void submit(event)}>
          <FormDialogBody className="grid gap-3 sm:grid-cols-2">
            <Field label="Número da NF" required value={form.numero} onChange={(numero) => setForm({ ...form, numero })} />
            <Field label="Cliente" value={form.cliente} onChange={(cliente) => setForm({ ...form, cliente })} />
            <Field label="Valor da venda (VGV)" value={form.vgv} onChange={(vgv) => setForm({ ...form, vgv })} />
            <Field label="Corretor" value={form.corretor} onChange={(corretor) => setForm({ ...form, corretor })} />
            <Field label="Construtora" value={form.construtora} onChange={(construtora) => setForm({ ...form, construtora })} />
            <Field label="Empreendimento" value={form.empreendimento} onChange={(empreendimento) => setForm({ ...form, empreendimento })} />
            <Field label="Torre / Bloco" value={form.torreBloco} onChange={(torreBloco) => setForm({ ...form, torreBloco })} />
            <div className="space-y-1.5">
              <Label>Data de emissão</Label>
              <Input type="date" value={form.dataEmissao} onChange={(event) => setForm({ ...form, dataEmissao: event.target.value })} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Arquivo da NF</Label>
              <Input type="file" accept=".pdf,.doc,.docx,application/pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
              {editing?.arquivoUrl ? (
                <a className="text-xs text-primary underline" href={editing.arquivoUrl} target="_blank" rel="noreferrer">
                  Arquivo atual: {editing.arquivoNome || "abrir"}
                </a>
              ) : null}
            </div>
          </FormDialogBody>
          <FormDialogActions>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
          </FormDialogActions>
        </form>
      </FormDialogShell>
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
      <Label>{label}{required ? " *" : ""}</Label>
      <Input value={value} required={required} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
