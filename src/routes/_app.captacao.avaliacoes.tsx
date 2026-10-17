import { createFileRoute, Link } from "@tanstack/react-router";
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
import { ApiError } from "@/lib/api";
import { fetchCaptacoes, type Captacao } from "@/lib/captacao-api";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/captacao/avaliacoes")({
  component: AvaliacoesPage,
});

function AvaliacoesPage() {
  const [rows, setRows] = useState<Captacao[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchCaptacoes()
      .then((items) => {
        setRows(
          items.filter(
            (item) =>
              item.valorAvaliacao == null && item.funilEtapa.papel !== "perdido",
          ),
        );
      })
      .catch((err) => {
        toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar.");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader
        title="Avaliações e vistorias"
        description="Captações que ainda não têm valor de avaliação."
      />
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Proprietário</TableHead>
              <TableHead>Imóvel</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead>Responsável</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4}>Carregando…</TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  Todas as captações em andamento já têm avaliação.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Link
                      to="/captacao/captacoes/$id"
                      params={{ id: row.id }}
                      className="underline"
                    >
                      {row.proprietario.nome}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {[row.imovel.logradouro, row.imovel.bairro, row.imovel.cidade]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </TableCell>
                  <TableCell>{row.funilEtapa.label}</TableCell>
                  <TableCell>{row.responsavel.name}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
