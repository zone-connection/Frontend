import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchCaptacaoRelatorio, type CaptacaoRelatorio } from "@/lib/captacao-api";
import { RELATORIO_MOCK } from "@/lib/modulos-mock";

export const Route = createFileRoute("/_app/captacao/relatorios")({
  component: RelatoriosPage,
});

function RelatoriosPage() {
  const [data, setData] = useState<CaptacaoRelatorio | null>(null);

  useEffect(() => {
    void fetchCaptacaoRelatorio()
      .then((next) =>
        setData(next.corretores.length || next.motivos.length ? next : RELATORIO_MOCK),
      )
      .catch(() => setData(RELATORIO_MOCK));
  }, []);

  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Captações, visitas, tempo até concluir e motivos de perda."
      />
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Corretor</TableHead>
              <TableHead>Em andamento</TableHead>
              <TableHead>Concluídas</TableHead>
              <TableHead>Visitas</TableHead>
              <TableHead>Tempo médio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.corretores ?? []).map((row) => (
              <TableRow key={row.responsavelId}>
                <TableCell>{row.nome}</TableCell>
                <TableCell>{row.abertas}</TableCell>
                <TableCell>{row.concluidas}</TableCell>
                <TableCell>{row.visitas}</TableCell>
                <TableCell>
                  {row.tempoMedioDias == null ? "—" : `${row.tempoMedioDias} dias`}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="mt-6 rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Motivo de perda</TableHead>
              <TableHead>Quantidade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.motivos ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-muted-foreground">
                  Nenhuma perda registrada.
                </TableCell>
              </TableRow>
            ) : (
              data?.motivos.map((row) => (
                <TableRow key={row.motivo}>
                  <TableCell>{row.motivo}</TableCell>
                  <TableCell>{row.total}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
