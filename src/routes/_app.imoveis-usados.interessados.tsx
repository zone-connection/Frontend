import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/app-shell";
import { lostLeadAvatarClass } from "@/components/lost-leads-lux";
import { TablePager } from "@/components/table-pager";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTablePager } from "@/lib/use-table-pager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/api";
import {
  CAPTACAO_IMOVEL_TIPO_LABEL,
  CAPTACAO_IMOVEL_TIPOS,
} from "@/lib/captacao-api";
import {
  createInteressadoUsado,
  fetchInteressadosUsado,
  formatBrl,
  type InteressadoUsado,
} from "@/lib/imoveis-usados-api";
import { DemoInteressadosPreview } from "@/components/demo-interessados-preview";
import { TableFrame } from "@/components/operacao-ui";
import { TABLE_LUX } from "@/lib/filter-bar";
import { cn } from "@/lib/utils";
import { maskMoneyInput, parseOptionalMoneyInput } from "@/lib/money-input";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/imoveis-usados/interessados")({
  component: InteressadosUsadoPage,
});

function InteressadosUsadoPage() {
  const [items, setItems] = useState<InteressadoUsado[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    email: "",
    tipoDesejado: "",
    cidade: "",
    bairros: "",
    precoMin: "",
    precoMax: "",
    quartosMin: "",
    banheirosMin: "",
    vagasMin: "",
    areaMin: "",
  });

  async function load() {
    setLoading(true);
    try {
      setItems(await fetchInteressadosUsado());
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível listar.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const pager = useTablePager(items);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createInteressadoUsado({
        nome: form.nome,
        telefone: form.telefone || undefined,
        email: form.email || undefined,
        tipoDesejado: form.tipoDesejado || undefined,
        cidade: form.cidade || undefined,
        bairros: form.bairros || undefined,
        precoMin: parseOptionalMoneyInput(form.precoMin) ?? undefined,
        precoMax: parseOptionalMoneyInput(form.precoMax) ?? undefined,
        quartosMin: form.quartosMin ? Number(form.quartosMin) : undefined,
        banheirosMin: form.banheirosMin ? Number(form.banheirosMin) : undefined,
        vagasMin: form.vagasMin ? Number(form.vagasMin) : undefined,
        areaMin: form.areaMin ? Number(form.areaMin.replace(",", ".")) : undefined,
      });
      toast.success("Interessado cadastrado.");
      setOpen(false);
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível cadastrar.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Interessados"
        description="Compradores de imóveis usados. A prévia mostra a ficha com o estoque compatível."
        actions={
          <Button
            size="sm"
            onClick={() => {
              setForm({
                nome: "",
                telefone: "",
                email: "",
                tipoDesejado: "",
                cidade: "",
                bairros: "",
                precoMin: "",
                precoMax: "",
                quartosMin: "",
                banheirosMin: "",
                vagasMin: "",
                areaMin: "",
              });
              setOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            Novo interessado
          </Button>
        }
      />
      <DemoInteressadosPreview />
      <h2 className="mb-3 text-sm font-semibold">Cadastrados no sistema</h2>
      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando…
        </div>
      ) : (
        <TableFrame>
        <Table className={TABLE_LUX}>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Faixa de preço</TableHead>
              <TableHead>Quartos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  Nenhum interessado cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              pager.pageItems.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/40">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback
                          className={cn(
                            "text-xs text-white",
                            lostLeadAvatarClass(item.nome),
                          )}
                        >
                          {item.nome
                            .split(" ")
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((part) => part[0]?.toUpperCase() ?? "")
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{item.nome}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.cidade || "—"}
                  </TableCell>
                  <TableCell>
                    {item.tipoDesejado ? (
                      <span className="inline-flex rounded-full bg-sky-500 px-2.5 py-1 text-[11px] font-semibold text-white">
                        {CAPTACAO_IMOVEL_TIPO_LABEL[item.tipoDesejado]}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-sm font-semibold tabular-nums">
                    {formatBrl(item.precoMin)} — {formatBrl(item.precoMax)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.quartosMin ?? "—"}
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
        </TableFrame>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <form onSubmit={(e) => void handleSave(e)}>
            <DialogHeader>
              <DialogTitle>Novo interessado</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div>
                <Label>Nome</Label>
                <Input
                  required
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={form.telefone}
                    onChange={(e) =>
                      setForm({ ...form, telefone: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <Label>Tipo desejado</Label>
                <select
                  className="mt-1 flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={form.tipoDesejado}
                  onChange={(e) =>
                    setForm({ ...form, tipoDesejado: e.target.value })
                  }
                >
                  <option value="">Qualquer</option>
                  {CAPTACAO_IMOVEL_TIPOS.map((t) => (
                    <option key={t} value={t}>
                      {CAPTACAO_IMOVEL_TIPO_LABEL[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Cidade</Label>
                  <Input
                    value={form.cidade}
                    onChange={(e) =>
                      setForm({ ...form, cidade: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Bairros</Label>
                  <Input
                    placeholder="Centro, Boa Viagem"
                    value={form.bairros}
                    onChange={(e) =>
                      setForm({ ...form, bairros: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Preço mínimo</Label>
                  <Input
                    inputMode="numeric"
                    value={form.precoMin}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        precoMin: maskMoneyInput(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Preço máximo</Label>
                  <Input
                    inputMode="numeric"
                    value={form.precoMax}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        precoMax: maskMoneyInput(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label>Quartos</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.quartosMin}
                    onChange={(e) =>
                      setForm({ ...form, quartosMin: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Banheiros</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.banheirosMin}
                    onChange={(e) =>
                      setForm({ ...form, banheirosMin: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Vagas</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.vagasMin}
                    onChange={(e) =>
                      setForm({ ...form, vagasMin: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Área mín.</Label>
                  <Input
                    value={form.areaMin}
                    onChange={(e) =>
                      setForm({ ...form, areaMin: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando…" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
