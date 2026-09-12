import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Crosshair, Loader2, Phone, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
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
  const [items, setItems] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pegandoId, setPegandoId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Lead | null>(null);

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
        description="Leads liberados após atraso. Qualquer usuário da imobiliária pode ver; corretor, gerente e admin podem pegar para a própria carteira."
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
              <TableHead>Origem</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead className="text-right">Renda</TableHead>
              <TableHead>Etapa</TableHead>
                  <TableHead className="text-right">
                    {canPegar ? "Ação" : ""}
                  </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center">
                  <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  {items.length === 0
                    ? "Nenhum lead no Caça-lead agora."
                    : "Nenhum lead neste filtro."}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((lead) => (
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
                  </TableCell>
                  <TableCell>{lead.origem || "—"}</TableCell>
                  <TableCell>{lead.cidade || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {lead.renda != null ? brl(lead.renda) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{lead.stage}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {canPegar ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={pegandoId === lead.id}
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
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {rows.length} lead(s) disponíveis
        {user?.name ? ` · logado como ${user.name}` : ""}.
      </p>

      <LeadDetalheDialog
        lead={detail}
        open={!!detail}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
        showCorretor={false}
        footer={
          canPegar && detail ? (
            <div className="border-t px-4 py-3 sm:px-6">
              <Button
                type="button"
                className="w-full"
                disabled={pegandoId === detail.id}
                onClick={() => void handlePegar(detail)}
              >
                {pegandoId === detail.id ? "Pegando…" : "Pegar este lead"}
              </Button>
            </div>
          ) : null
        }
      />
    </div>
  );
}
