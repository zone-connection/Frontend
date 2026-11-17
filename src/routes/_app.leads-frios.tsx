import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Search, Snowflake, Trash2, Upload, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { parseLeadsFromFile } from "@/lib/leads-io";
import {
  apagarLeadsFrios,
  fetchLeadsFrios,
  importarLeadsFrios,
  puxarLeadsFrios,
  tempoNaBaseFria,
} from "@/lib/leads-frios-api";
import type { Lead } from "@/lib/crm-types";
import { cn } from "@/lib/utils";

const PRIMARY_BTN =
  "!h-9 !rounded-lg border-0 bg-[#079ED4] px-3.5 text-[13px] font-medium text-white shadow-none before:hidden hover:bg-[#0689b8] hover:brightness-100";

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
    setBusy(true);
    try {
      const parsed = await parseLeadsFromFile(file, { origem: "Base fria" });
      const valid = parsed.filter((row) => !row.error);
      if (valid.length === 0) {
        toast.error("Nenhum lead válido na planilha.");
        return;
      }
      const result = await importarLeadsFrios(
        valid.slice(0, 600).map((row) => ({
          nome: row.nome,
          telefone: row.telefone,
          email: row.email,
          cidade: row.cidade,
          origem: row.origem || "Base fria",
        })),
      );
      toast.success(
        result.created === 1
          ? "1 lead entrou na base fria."
          : `${result.created} leads entraram na base fria.`,
      );
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível importar a planilha.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
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
                  size="sm"
                  className={PRIMARY_BTN}
                  disabled={busy}
                  onClick={() => fileRef.current?.click()}
                >
                  {busy ? (
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  ) : (
                    <Upload className="mr-1.5 size-3.5" />
                  )}
                  Subir planilha
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
    </div>
  );
}
