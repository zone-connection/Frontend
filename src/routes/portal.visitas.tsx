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
import { fetchPortalVisitasCarteira } from "@/lib/portal-api";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/visitas")({
  ssr: false,
  component: PortalVisitasPage,
});

function PortalVisitasPage() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchPortalVisitasCarteira>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchPortalVisitasCarteira()
      .then(setRows)
      .catch((err) => {
        toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar.");
      })
      .finally(() => setLoading(false));
  }, []);

  const itens = rows.flatMap((row) => {
    const all = [
      ...row.visitas.proximas.map((v) => ({ ...v, grupo: "Próxima" })),
      ...row.visitas.realizadas.map((v) => ({ ...v, grupo: "Realizada" })),
      ...row.visitas.canceladas.map((v) => ({ ...v, grupo: "Cancelada" })),
    ];
    return all.map((visita) => ({ ...visita, imovel: row.imovel }));
  });

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
        title="Visitas"
        subtitle="Agenda e feedbacks, sem o nome do interessado."
      />
      {itens.length === 0 ? (
        <PortalEmpty>Nenhuma visita registrada ainda.</PortalEmpty>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white">
          <Table className="[&_th]:px-4 [&_td]:px-4 [&_th]:text-[11px] [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-slate-500">
            <TableHeader>
              <TableRow>
                <TableHead>Imóvel</TableHead>
                <TableHead>Quando</TableHead>
                <TableHead>Grupo</TableHead>
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
                    {new Date(item.dataHora).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex rounded-full bg-sky-500 px-2.5 py-1 text-[11px] font-semibold text-white">
                      {item.grupo}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {item.status}
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
