import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Ban,
  Check,
  ClipboardList,
  FileSpreadsheet,
  Loader2,
  Mail,
  Phone,
  Search,
  Snowflake,
  Trash2,
  Upload,
  UserPlus,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import {
  FILTER_BAR_SHELL,
  FILTER_CONTROL,
  FILTER_SEARCH_ICON,
  TABLE_LUX,
  TABLE_SHELL,
} from "@/lib/filter-bar";
import {
  downloadImportTemplate,
  parseLeadsFromFile,
  type ParsedImportLead,
} from "@/lib/leads-io";
import {
  apagarLeadsFrios,
  fetchLeadsFrios,
  importarLeadsFrios,
  puxarLeadsFrios,
  tempoNaBaseFria,
} from "@/lib/leads-frios-api";
import type { Lead } from "@/lib/crm-types";
import { cn } from "@/lib/utils";

const SECONDARY_BTN =
  "!h-9 !rounded-lg border border-[#E2E8EC] bg-white px-3 text-[13px] font-medium text-[#16324A] shadow-none hover:border-[#B7D7E6] hover:bg-[#F3FAFD] hover:text-[#16324A] dark:border-white/15 dark:bg-[#1c2430] dark:text-[#f8fafc] dark:hover:border-[#079ED4]/50 dark:hover:bg-[#243044] dark:hover:text-[#f8fafc]";

export const Route = createFileRoute("/_app/leads-frios")({
  head: () => ({ meta: [{ title: "Leads frios — Zone Connection" }] }),
  component: LeadsFriosPage,
});

type FrioLead = Lead & { baseFriaEm?: string | null };

function LeadsFriosPage() {
  const session = getSession();
  const role = session?.role;
  const podeImportar =
    role === "admin" || role === "super_admin" || role === "gerente";
  const podeApagar = role === "admin" || role === "super_admin";
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<FrioLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [ajudaAberta, setAjudaAberta] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [arquivo, setArquivo] = useState("");
  const [lidas, setLidas] = useState<ParsedImportLead[]>([]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((lead) =>
      [lead.nome, lead.telefone, lead.cidade, lead.origem]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [rows, search]);

  const allSelected = filtered.length > 0 && filtered.every((lead) => selected.has(lead.id));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchLeadsFrios());
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar a base fria.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function toggle(id: string, on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAll(on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const lead of filtered) {
        if (on) next.add(lead.id);
        else next.delete(lead.id);
      }
      return next;
    });
  }

  async function onFile(file: File) {
    try {
      const parsed = await parseLeadsFromFile(file, { origem: "Base fria" });
      if (parsed.length === 0) {
        toast.error("A planilha não tem linhas de lead.");
        return;
      }
      setArquivo(file.name);
      setLidas(parsed.slice(0, 5000));
      setAjudaAberta(false);
      setConfirmar(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível ler a planilha.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function confirmarImportacao() {
    const valid = lidas.filter((row) => !row.error);
    if (valid.length === 0) return;
    setBusy(true);
    try {
      const result = await importarLeadsFrios(
        valid.map((row) => ({
          nome: row.nome,
          telefone: row.telefone,
          email: row.email,
          cidade: row.cidade,
          bairro: row.bairro,
          origem: row.origem || "Base fria",
          ...(row.renda != null ? { renda: row.renda } : {}),
          tipoRenda: row.tipoRenda,
          estadoCivil: row.estadoCivil,
          empreendimento: row.empreendimento,
        })),
      );
      toast.success(
        result.created === 1
          ? "1 lead entrou na base fria."
          : `${result.created} leads entraram na base fria.`,
      );
      setConfirmar(false);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível importar a planilha.");
    } finally {
      setBusy(false);
    }
  }

  async function puxar() {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBusy(true);
    try {
      const result = await puxarLeadsFrios(ids);
      toast.success(
        result.updated === 1
          ? "Lead puxado para a sua carteira."
          : `${result.updated} leads puxados para a sua carteira.`,
      );
      setSelected(new Set());
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível puxar os leads.");
    } finally {
      setBusy(false);
    }
  }

  async function apagar() {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBusy(true);
    try {
      const result = await apagarLeadsFrios(ids);
      toast.success(
        result.deleted === 1 ? "1 lead apagado." : `${result.deleted} leads apagados.`,
      );
      setSelected(new Set());
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível apagar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Leads frios"
        description={
          loading
            ? "Carregando a base..."
            : `${rows.length} ${rows.length === 1 ? "lead na base compartilhada" : "leads na base compartilhada"}`
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {podeImportar ? (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void onFile(file);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={SECONDARY_BTN}
                  disabled={busy}
                  onClick={() => setAjudaAberta(true)}
                >
                  {busy ? (
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  ) : (
                    <Upload className="mr-1.5 size-3.5 text-[#079ED4]" />
                  )}
                  Importar
                </Button>
              </>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={SECONDARY_BTN}
              disabled={busy || selected.size === 0}
              onClick={() => void puxar()}
            >
              <UserPlus className="mr-1.5 size-3.5 text-[#079ED4]" />
              Puxar para minha carteira
              {selected.size ? ` (${selected.size})` : ""}
            </Button>
            {podeApagar ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={SECONDARY_BTN}
                disabled={busy || selected.size === 0}
                onClick={() => void apagar()}
              >
                <Trash2 className="mr-1.5 size-3.5 text-[#079ED4]" />
                Apagar
              </Button>
            ) : null}
          </div>
        }
      />

      <div className={FILTER_BAR_SHELL}>
        <div className="relative min-w-0 flex-1">
          <Search className={FILTER_SEARCH_ICON} />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, telefone ou cidade"
            className={cn(FILTER_CONTROL, "pl-9")}
          />
        </div>
      </div>

      <Card className={cn("min-w-0", TABLE_SHELL)}>
        <Table
          containerClassName="overflow-x-auto overflow-y-hidden overscroll-x-contain"
          className={cn(
            "w-full min-w-[40rem] text-[13px] [&_th]:h-9 [&_td]:py-2.5 [&_td]:align-middle",
            TABLE_LUX,
          )}
        >
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected ? true : selected.size > 0 ? "indeterminate" : false}
                  onCheckedChange={(value) => toggleAll(value === true)}
                  aria-label="Selecionar todos"
                  disabled={filtered.length === 0 || busy}
                />
              </TableHead>
              <TableHead>Lead</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Na base há</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">
                  Carregando a base...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-28 text-center">
                  <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                    <Snowflake className="size-5 text-[#079ED4]" />
                    {rows.length === 0
                      ? "Nenhum lead frio no momento."
                      : "Nenhum lead encontrado com essa busca."}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((lead) => (
                <TableRow
                  key={lead.id}
                  data-state={selected.has(lead.id) ? "selected" : undefined}
                  className="hover:bg-muted/40"
                >
                  <TableCell>
                    <Checkbox
                      checked={selected.has(lead.id)}
                      onCheckedChange={(value) => toggle(lead.id, value === true)}
                      aria-label={`Selecionar ${lead.nome}`}
                      disabled={busy}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar className="size-8">
                        <AvatarFallback className="bg-[#D3EBF5] text-[10px] font-semibold text-[#05749E]">
                          {lead.nome
                            .split(" ")
                            .filter(Boolean)
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[#16324A] dark:text-foreground">
                          {lead.nome}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {lead.origem || "Base fria"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="tabular-nums text-[#16324A] dark:text-foreground">
                    {lead.telefone}
                  </TableCell>
                  <TableCell>{lead.cidade || "—"}</TableCell>
                  <TableCell>
                    <span className="inline-flex rounded-full bg-[#F3FAFD] px-2.5 py-0.5 text-[12px] font-medium text-[#05749E] dark:bg-[#079ED4]/15 dark:text-[#7DD3FC]">
                      {tempoNaBaseFria(lead.baseFriaEm)}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={ajudaAberta} onOpenChange={setAjudaAberta}>
        <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="flex-row items-start gap-3 space-y-0 border-b px-6 py-5 text-left">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#079ed4] text-white">
              <Upload className="size-5" />
            </span>
            <div>
              <DialogTitle>Importar leads frios</DialogTitle>
              <DialogDescription className="mt-1">
                Use o padrão abaixo para o arquivo ser lido corretamente. Preferível Excel (.xlsx).
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="space-y-4 overflow-auto px-6 py-5 text-sm">
            <div className="overflow-hidden rounded-2xl border">
              <div className="border-b px-4 py-3">
                <p className="font-semibold">Colunas, nessa ordem</p>
                <p className="text-xs text-muted-foreground">A primeira linha do modelo já traz esses títulos.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#079ed4]/10 text-left text-[#075a82]">
                      <th className="px-3 py-2 font-medium">Nome</th>
                      <th className="px-3 py-2 font-medium">Telefone</th>
                      <th className="px-3 py-2 font-medium">Email</th>
                      <th className="px-3 py-2 font-medium">Origem</th>
                      <th className="px-3 py-2 font-medium">Região</th>
                      <th className="px-3 py-2 font-medium">Regime de Trabalho</th>
                      <th className="px-3 py-2 font-medium">Estado Civil</th>
                      <th className="px-3 py-2 font-medium">Renda Bruta</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      <td className="px-3 py-2.5">Maria Silva</td>
                      <td className="px-3 py-2.5 tabular-nums">(81) 98888-7777</td>
                      <td className="px-3 py-2.5">maria@email.com</td>
                      <td className="px-3 py-2.5">WhatsApp</td>
                      <td className="px-3 py-2.5">Recife</td>
                      <td className="px-3 py-2.5">CLT</td>
                      <td className="px-3 py-2.5">Casado</td>
                      <td className="px-3 py-2.5 tabular-nums">5000</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="rounded-2xl border">
              <div className="flex items-center gap-2 border-b px-4 py-3">
                <ClipboardList className="size-4 text-[#079ed4]" />
                <p className="font-semibold">Regras</p>
              </div>
              <ul className="space-y-3 px-4 py-3 text-muted-foreground">
                <li className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-[#079ed4]" />
                  <span><span className="font-medium text-foreground">Nome</span> e <span className="font-medium text-foreground">Telefone</span> são obrigatórios.</span>
                </li>
                <li className="flex gap-2">
                  <Phone className="mt-0.5 size-4 shrink-0 text-[#079ed4]" />
                  <span>Telefone já com DDD, ex.: (81) 98888-7777 ou 81 98888-7777.</span>
                </li>
                <li className="flex gap-2">
                  <Mail className="mt-0.5 size-4 shrink-0 text-[#079ed4]" />
                  <span>Email, origem, região, regime de trabalho, estado civil e renda bruta são opcionais.</span>
                </li>
                <li className="flex gap-2">
                  <Users className="mt-0.5 size-4 shrink-0 text-[#079ed4]" />
                  <span>Uma linha = um lead na base fria, sem corretor. O empreendimento de interesse entra na ficha. Até 5.000 linhas por arquivo.</span>
                </li>
              </ul>
            </div>
            <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
              <Ban className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-semibold">Não incluir</p>
                <p className="mt-0.5 text-xs opacity-90">Corretor, etapa ou prioridade. O lead fica na base compartilhada.</p>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 border-t px-6 py-4 sm:gap-2">
            <Button type="button" variant="outline" className="rounded-full" onClick={() => downloadImportTemplate("modelo-importacao-leads-frios.xlsx")}>
              <FileSpreadsheet className="size-4" />
              Baixar modelo Excel
            </Button>
            <Button type="button" className="rounded-full bg-[#079ed4] hover:bg-[#075a82]" onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" />
              Escolher arquivo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmar} onOpenChange={setConfirmar}>
        <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col">
          <DialogHeader>
            <DialogTitle>Confirmar importação</DialogTitle>
            <DialogDescription>
              {arquivo ? `Arquivo: ${arquivo}. ` : ""}
              Formato: Nome, Telefone, Email, Origem, Região, Regime de Trabalho, Estado Civil e Renda Bruta.
            </DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            {lidas.filter((row) => !row.error).length} lead(s) pronto(s) para a base fria.
          </p>
          <div className="min-h-0 flex-1 overflow-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-2 font-medium">#</th>
                  <th className="p-2 font-medium">Nome</th>
                  <th className="p-2 font-medium">Telefone</th>
                  <th className="p-2 font-medium">Email</th>
                  <th className="p-2 font-medium">Região</th>
                  <th className="p-2 font-medium">Empreendimento</th>
                  <th className="p-2 font-medium">Origem</th>
                  <th className="p-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {lidas.map((row, index) => (
                  <tr key={`${row.telefone}-${index}`} className={cn("border-b last:border-0", row.error && "bg-destructive/5")}>
                    <td className="p-2 tabular-nums text-muted-foreground">{index + 1}</td>
                    <td className="p-2">{row.nome || "—"}</td>
                    <td className="p-2 tabular-nums">{row.telefone || "—"}</td>
                    <td className="p-2">{row.email || "—"}</td>
                    <td className="p-2">{row.cidade || "—"}</td>
                    <td className="p-2">{row.empreendimento || "—"}</td>
                    <td className="p-2">{row.origem || "—"}</td>
                    <td className={cn("p-2 font-medium", row.error ? "text-destructive" : "text-emerald-600")}>
                      {row.error || "OK"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" className="rounded-full" onClick={() => setConfirmar(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="rounded-full bg-[#079ed4] hover:bg-[#075a82]"
              disabled={busy || lidas.every((row) => row.error)}
              onClick={() => void confirmarImportacao()}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Importar {lidas.filter((row) => !row.error).length}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
