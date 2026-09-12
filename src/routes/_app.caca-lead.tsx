import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Crosshair, Loader2, Phone, Search, UserRoundCog } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { TablePager } from "@/components/table-pager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LeadDetalheDialog } from "@/components/lead-detalhe-dialog";
import { LeadReatribuirDialog } from "@/components/lead-reatribuir-dialog";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { brl, type Lead } from "@/lib/crm-types";
import { FILTER_CONTROL, FILTER_SEARCH_ICON } from "@/lib/filter-bar";
import {
  fetchCacaLeads,
  mapApiLead,
  pegarCacaLead,
} from "@/lib/leads-api";
import { useLeads } from "@/lib/leads-store";
import { phoneDigits } from "@/lib/phone";
import { canReassignLead } from "@/lib/permissions";
import { useTablePager } from "@/lib/use-table-pager";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/caca-lead")({
  head: () => ({ meta: [{ title: "Caça-lead — Zone Connection" }] }),
  component: CacaLeadPage,
});

function CacaLeadPage() {
  const user = getSession();
  const { applyLead, refresh } = useLeads();
  const canPegar =
    user?.role === "admin" ||
    user?.role === "gerente" ||
    user?.role === "corretor" ||
    user?.role === "treinee";
  const canReassign = canReassignLead(user?.role);
  const [items, setItems] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pegandoId, setPegandoId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Lead | null>(null);
  const [reassignLead, setReassignLead] = useState<Lead | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchCacaLeads();
      setItems(list.map(mapApiLead));
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar o Caça-lead.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const digits = phoneDigits(search);
    if (!q) return items;
    return items.filter((item) => {
      const hay = `${item.nome} ${item.telefone} ${item.origem} ${item.cidade}`.toLowerCase();
      const phoneOk =
        digits.length >= 3 && phoneDigits(item.telefone).includes(digits);
      return hay.includes(q) || phoneOk;
    });
  }, [items, search]);
  const pager = useTablePager(rows, search);

  async function handlePegar(lead: Lead) {
    setPegandoId(lead.id);
    try {
      const updated = mapApiLead(await pegarCacaLead(lead.id));
      applyLead(updated);
      void refresh({ silent: true });
      setItems((current) => current.filter((item) => item.id !== lead.id));
      setDetail(null);
      toast.success(`${lead.nome} agora está na sua carteira.`);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível pegar este lead.",
      );
      if (err instanceof ApiError && err.status === 409) {
        setItems((current) => current.filter((item) => item.id !== lead.id));
      }
    } finally {
      setPegandoId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Caça-lead"
        description="Lista os leads em atraso do funil, sem tirar da carteira nem do kanban. Corretor pode pegar; gerente e admin também reatribuem."
      />

      <div className="relative mb-4 max-w-sm">
        <Search className={FILTER_SEARCH_ICON} />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar nome, telefone ou origem…"
          className={cn("pl-9", FILTER_CONTROL)}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/5 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_20px_rgba(15,23,42,0.05)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lead</TableHead>
              <TableHead>Corretor</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead className="text-right">Renda</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead className="text-right">
                {canPegar || canReassign ? "Ação" : ""}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center">
                  <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : pager.total === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  {items.length === 0
                    ? "Nenhum lead em atraso agora."
                    : "Nenhum lead neste filtro."}
                </TableCell>
              </TableRow>
            ) : (
              pager.pageItems.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => setDetail(lead)}
                >
                  <TableCell>
                    <div className="font-medium">{lead.nome}</div>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Phone className="size-3" />
                      {lead.telefone}
                    </div>
                    {lead.origemAtrasoLiberacao === "retrabalho" ? (
                      <Badge
                        variant="outline"
                        className="mt-1 h-5 border-amber-500/50 bg-amber-500/15 px-1.5 text-[10px] text-amber-900 dark:text-amber-200"
                      >
                        Retrabalho
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>{lead.corretor && lead.corretor !== "—" ? lead.corretor : "Sem corretor"}</TableCell>
                  <TableCell>{lead.origem || "—"}</TableCell>
                  <TableCell>{lead.cidade || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {lead.renda != null ? brl(lead.renda) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{lead.stage}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                    {canReassign ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReassignLead(lead);
                        }}
                      >
                        <UserRoundCog className="size-4" />
                        Reatribuir
                      </Button>
                    ) : null}
                    {canPegar ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={pegandoId === lead.id || lead.corretorId === user?.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handlePegar(lead);
                      }}
                    >
                      {pegandoId === lead.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Crosshair className="size-4" />
                      )}
                      Pegar
                    </Button>
                    ) : null}
                    </div>
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
      </div>
      {user?.name ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Logado como {user.name}.
        </p>
      ) : null}

      <LeadDetalheDialog
        lead={detail}
        open={!!detail}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
        showCorretor={true}
        footer={
          detail && (canPegar || canReassign) ? (
            <div className="flex flex-col gap-2 border-t px-4 py-3 sm:flex-row sm:px-6">
              {canReassign ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const lead = detail;
                    setDetail(null);
                    setReassignLead(lead);
                  }}
                >
                  <UserRoundCog className="size-4" />
                  Reatribuir
                </Button>
              ) : null}
              {canPegar ? (
                <Button
                  type="button"
                  className="w-full"
                  disabled={
                    pegandoId === detail.id || detail.corretorId === user?.id
                  }
                  onClick={() => void handlePegar(detail)}
                >
                  {pegandoId === detail.id ? "Pegando…" : "Pegar este lead"}
                </Button>
              ) : null}
            </div>
          ) : null
        }
      />
      <LeadReatribuirDialog
        lead={reassignLead}
        open={!!reassignLead}
        onOpenChange={(open) => {
          if (!open) setReassignLead(null);
        }}
        onReassigned={(next) => {
          applyLead(next);
          void refresh({ silent: true });
          setItems((current) =>
            current.map((item) => (item.id === next.id ? next : item)),
          );
          setDetail((cur) => (cur && cur.id === next.id ? next : cur));
        }}
      />
    </div>
  );
}
