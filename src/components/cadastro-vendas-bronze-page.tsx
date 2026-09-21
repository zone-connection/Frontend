import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2, Pencil, Plus, ReceiptText, Trash2, Wallet } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import {
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
} from "@/components/form-dialog";
import { SemConexao } from "@/components/sem-conexao";
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
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { isCorretorLike } from "@/lib/permissions";
import {
  createCadastroVenda,
  deleteCadastroVenda,
  fetchCadastroVendas,
  updateCadastroVenda,
  type CadastroVenda,
} from "@/lib/cadastro-vendas-api";
import { fetchConstrutoras, type Construtora } from "@/lib/construtoras-api";
import { fetchDocumentacaoCorretores } from "@/lib/documentacao-api";
import {
  fetchEmpreendimentos,
  type Empreendimento,
} from "@/lib/empreendimentos-api";
import {
  formatMoneyInput,
  maskMoneyInput,
  parseOptionalMoneyInput,
} from "@/lib/money-input";
import { toast } from "sonner";

function brl(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dateBr(value: string | null | undefined) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : "—";
}

type FormState = {
  clienteNome: string;
  telefone: string;
  construtoraId: string;
  empreendimentoId: string;
  corretorId: string;
  dataVenda: string;
  vgv: string;
  obs: string;
};

function emptyForm(corretorId = ""): FormState {
  return {
    clienteNome: "",
    telefone: "",
    construtoraId: "",
    empreendimentoId: "",
    corretorId,
    dataVenda: new Date().toISOString().slice(0, 10),
    vgv: "",
    obs: "",
  };
}

export function CadastroVendasBronzePage() {
  const user = getSession();
  const corretorLike = isCorretorLike(user?.role);
  const [rows, setRows] = useState<CadastroVenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CadastroVenda | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm(user?.id ?? ""));
  const [construtoras, setConstrutoras] = useState<Construtora[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [corretores, setCorretores] = useState<{ id: string; name: string }[]>(
    [],
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      fetchCadastroVendas(),
      fetchConstrutoras().catch(() => [] as Construtora[]),
      fetchEmpreendimentos().catch(() => [] as Empreendimento[]),
      fetchDocumentacaoCorretores().catch(() => []),
    ])
      .then(([vendas, cons, emps, cors]) => {
        if (!active) return;
        setRows(vendas);
        setConstrutoras(cons);
        setEmpreendimentos(emps);
        setCorretores(cors);
      })
      .catch((error) => {
        if (!active) return;
        toast.error(
          error instanceof ApiError
            ? error.message
            : "Não foi possível carregar as vendas.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const imoveisDaConstrutora = useMemo(
    () =>
      empreendimentos.filter(
        (item) =>
          !form.construtoraId || item.construtoraId === form.construtoraId,
      ),
    [empreendimentos, form.construtoraId],
  );

  const totais = useMemo(() => {
    const vgv = rows.reduce((sum, row) => sum + (row.vgv || 0), 0);
    return { quantidade: rows.length, vgv };
  }, [rows]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm(user?.id ?? ""));
    setOpen(true);
  }

  function openEdit(row: CadastroVenda) {
    setEditing(row);
    setForm({
      clienteNome: row.clienteNome,
      telefone: row.telefone ?? "",
      construtoraId: row.construtoraId ?? "",
      empreendimentoId: row.empreendimentoId ?? "",
      corretorId: row.corretorId ?? user?.id ?? "",
      dataVenda: row.dataVenda.slice(0, 10),
      vgv: formatMoneyInput(row.vgv),
      obs: row.obs ?? "",
    });
    setOpen(true);
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    const clienteNome = form.clienteNome.trim();
    if (clienteNome.length < 2) {
      toast.error("Informe o nome do cliente.");
      return;
    }
    const vgv = parseOptionalMoneyInput(form.vgv);
    if (vgv == null) {
      toast.error("Informe o valor da venda (VGV).");
      return;
    }
    const payload = {
      clienteNome,
      telefone: form.telefone.trim() || null,
      construtoraId: form.construtoraId || null,
      empreendimentoId: form.empreendimentoId || null,
      corretorId: corretorLike ? user?.id ?? null : form.corretorId || null,
      dataVenda: form.dataVenda,
      vgv: Math.round(vgv),
      obs: form.obs.trim() || null,
    };
    setSaving(true);
    try {
      if (editing) {
        const saved = await updateCadastroVenda(editing.id, payload);
        setRows((current) =>
          current.map((item) => (item.id === saved.id ? saved : item)),
        );
        toast.success("Venda atualizada.");
      } else {
        const created = await createCadastroVenda(payload);
        setRows((current) => [created, ...current]);
        toast.success("Venda cadastrada.");
      }
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Não foi possível salvar a venda.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: CadastroVenda) {
    if (!window.confirm(`Excluir a venda de ${row.clienteNome}?`)) return;
    try {
      await deleteCadastroVenda(row.id);
      setRows((current) => current.filter((item) => item.id !== row.id));
      toast.success("Venda excluída.");
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Não foi possível excluir a venda.",
      );
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando vendas…
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Vendas"
        description="Cadastro simples de vendidos do plano Bronze — para contabilizar quantidade e VGV, sem ficha de documentação."
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nova venda
          </Button>
        }
      />

      <section className="mb-4 grid gap-3 grid-cols-2 sm:max-w-xl">
        <FinanceKpiCard
          variant="dash"
          label="Vendas cadastradas"
          value={totais.quantidade}
          icon={ReceiptText}
          tone="emerald"
        />
        <FinanceKpiCard
          variant="dash"
          label="VGV"
          value={totais.vgv}
          icon={Wallet}
          tone="teal"
        />
      </section>

      {rows.length === 0 ? (
        <SemConexao
          title="Nenhuma venda cadastrada"
          description="Registre as vendas fechadas para acompanhar o volume e o VGV no dashboard."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Corretor</TableHead>
                <TableHead>Imóvel</TableHead>
                <TableHead className="text-right">VGV</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.clienteNome}</TableCell>
                  <TableCell>{dateBr(row.dataVenda)}</TableCell>
                  <TableCell>{row.corretor?.name ?? "—"}</TableCell>
                  <TableCell>
                    {row.empreendimento?.nome ??
                      row.construtora?.nome ??
                      "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {brl(row.vgv)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => openEdit(row)}
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => void handleDelete(row)}
                      aria-label="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <FormDialogShell
        open={open}
        onOpenChange={setOpen}
        icon={<ReceiptText className="w-5 h-5" />}
        title={editing ? "Editar venda" : "Nova venda"}
        description="Só os dados para contar o vendido. Sem documentação, proposta ou análise."
      >
        <form onSubmit={(event) => void handleSave(event)}>
          <FormDialogBody className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="venda-cliente">Cliente</Label>
              <Input
                id="venda-cliente"
                value={form.clienteNome}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    clienteNome: e.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="venda-data">Data da venda</Label>
              <Input
                id="venda-data"
                type="date"
                value={form.dataVenda}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    dataVenda: e.target.value,
                  }))
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="venda-vgv">VGV</Label>
              <Input
                id="venda-vgv"
                inputMode="decimal"
                value={form.vgv}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    vgv: maskMoneyInput(e.target.value),
                  }))
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="venda-tel">Telefone</Label>
              <Input
                id="venda-tel"
                value={form.telefone}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    telefone: e.target.value,
                  }))
                }
              />
            </div>
            {!corretorLike ? (
              <div className="space-y-1.5">
                <Label>Corretor</Label>
                <Select
                  value={form.corretorId || "__none__"}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      corretorId: value === "__none__" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sem corretor</SelectItem>
                    {corretores.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label>Construtora</Label>
              <Select
                value={form.construtoraId || "__none__"}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    construtoraId: value === "__none__" ? "" : value,
                    empreendimentoId: "",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Não informar</SelectItem>
                  {construtoras.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Empreendimento</Label>
              <Select
                value={form.empreendimentoId || "__none__"}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    empreendimentoId: value === "__none__" ? "" : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Opcional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Não informar</SelectItem>
                  {imoveisDaConstrutora.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="venda-obs">Observação</Label>
              <Input
                id="venda-obs"
                value={form.obs}
                onChange={(e) =>
                  setForm((current) => ({ ...current, obs: e.target.value }))
                }
              />
            </div>
          </FormDialogBody>
          <FormDialogActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </FormDialogActions>
        </form>
      </FormDialogShell>
    </div>
  );
}
