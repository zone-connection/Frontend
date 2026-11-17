import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { parseLeadsFromFile } from "@/lib/leads-io";
import {
  apagarLeadsFrios,
  fetchLeadsFrios,
  importarLeadsFrios,
  puxarLeadsFrios,
  tempoNaBaseFria,
} from "@/lib/leads-frios-api";
import type { Lead } from "@/lib/crm-types";

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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

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

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
    <div className="space-y-4">
      <PageHeader
        title="Leads frios"
        description="Base compartilhada. Quem puxar um lead leva para a própria carteira e ele sai daqui, marcado como vindo da base fria."
      />
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
            <Button type="button" disabled={busy} onClick={() => fileRef.current?.click()}>
              Subir planilha
            </Button>
          </>
        ) : null}
        <Button type="button" variant="outline" disabled={busy || selected.size === 0} onClick={() => void puxar()}>
          Puxar para minha carteira{selected.size ? ` (${selected.size})` : ""}
        </Button>
        {podeApagar ? (
          <Button type="button" variant="outline" disabled={busy || selected.size === 0} onClick={() => void apagar()}>
            Apagar selecionados
          </Button>
        ) : null}
        <span className="text-sm text-muted-foreground">{rows.length} na base</span>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Na base há</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-20 text-center text-sm text-muted-foreground">
                  Carregando…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-20 text-center text-sm text-muted-foreground">
                  Nenhum lead frio no momento.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selected.has(lead.id)}
                      onChange={() => toggle(lead.id)}
                      aria-label={`Selecionar ${lead.nome}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{lead.nome}</span>
                      <Badge variant="outline" className="rounded-full text-[10px]">
                        Base fria
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>{lead.telefone}</TableCell>
                  <TableCell>{lead.cidade || "—"}</TableCell>
                  <TableCell>{tempoNaBaseFria(lead.baseFriaEm)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
