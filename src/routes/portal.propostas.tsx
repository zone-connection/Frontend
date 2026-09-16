import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PortalEmpty, PortalPageTitle } from "@/components/portal-ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/api";
import { formatBrl } from "@/lib/captacao-api";
import { fetchPortalPropostasCarteira } from "@/lib/portal-api";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/propostas")({
  ssr: false,
  component: PortalPropostasPage,
});

function PortalPropostasPage() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchPortalPropostasCarteira>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchPortalPropostasCarteira()
      .then(setRows)
      .catch((err) => {
        toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar.");
      })
      .finally(() => setLoading(false));
  }, []);

  const itens = rows.flatMap((row) =>
    row.propostas.map((proposta) => ({ ...proposta, imovel: row.imovel })),
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PortalPageTitle
        title="Propostas"
        subtitle="Valores e status sem identificar o interessado."
      />
      {itens.length === 0 ? (
        <PortalEmpty>
          Ainda não há propostas. Elas aparecem quando o imóvel entra em venda de usados.
        </PortalEmpty>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white">
          <Table className="[&_th]:px-4 [&_td]:px-4 [&_th]:text-[11px] [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-slate-500">
            <TableHeader>
              <TableRow>
                <TableHead>Imóvel</TableHead>
                <TableHead>Proposta</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.map((item) => (
                <TableRow key={item.id} className="hover:bg-slate-50">
                  <TableCell>
                    <Link
                      to="/portal/imoveis/$id"
                      params={{ id: item.imovel.id }}
                      className="text-sm font-medium text-[#12343d] hover:underline"
                    >
                      {item.imovel.identificacao}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    #{item.numero}
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold tabular-nums">
                    {formatBrl(item.valor)}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex rounded-full bg-violet-500 px-2.5 py-1 text-[11px] font-semibold text-white">
                      {item.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
