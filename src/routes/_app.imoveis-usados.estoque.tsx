import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { PillTabs, StatusChip, TableFrame, vendaStatusTone } from "@/components/operacao-ui";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBrl, imovelCapaUrl } from "@/lib/captacao-api";
import { FILTER_CONTROL, TABLE_LUX } from "@/lib/filter-bar";
import {
  fetchVendasUsado,
  VENDA_STATUS_LABEL,
  type VendaUsado,
  type VendaUsadoStatus,
} from "@/lib/imoveis-usados-api";
import { ApiError } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type Search = { status?: VendaUsadoStatus };

const STATUS_OPTS: Array<VendaUsadoStatus | "todos"> = [
  "todos",
  "disponivel",
  "reservado",
  "vendido",
];

export const Route = createFileRoute("/_app/imoveis-usados/estoque")({
  validateSearch: (search: Record<string, unknown>): Search => {
    const status = search.status;
    if (
      status === "disponivel" ||
      status === "reservado" ||
      status === "vendido" ||
      status === "indisponivel"
    ) {
      return { status };
    }
    return {};
  },
  component: EstoquePage,
});

function diasNoMercado(iso: string) {
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000),
  );
}

function EstoquePage() {
  const { status } = Route.useSearch();
  const navigate = useNavigate();
  const [busca, setBusca] = useState("");
  const [items, setItems] = useState<VendaUsado[]>([]);
  const [loading, setLoading] = useState(true);
  const filtro = status ?? "todos";

  useEffect(() => {
    setLoading(true);
    fetchVendasUsado()
      .then(setItems)
      .catch((err) => {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Não foi possível carregar o estoque.",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return items.filter((item) => {
      if (filtro !== "todos" && item.status !== filtro) return false;
      if (!q) return true;
      const hay = [
        item.imovel.titulo,
        item.imovel.bairro,
        item.imovel.cidade,
        item.imovel.proprietario?.nome,
        item.responsavel.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [busca, filtro, items]);

  return (
    <>
      <PageHeader
        title="Estoque"
        description="Disponível, reservado e vendido, com preço e dias no mercado."
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PillTabs
          value={filtro}
          onChange={(id) => {
            void navigate({
              to: "/imoveis-usados/estoque",
              search: id === "todos" ? {} : { status: id as VendaUsadoStatus },
            });
          }}
          items={STATUS_OPTS.map((id) => ({
            id,
            label:
              id === "todos"
                ? `Todos (${items.length})`
                : `${VENDA_STATUS_LABEL[id]} (${items.filter((item) => item.status === id).length})`,
          }))}
        />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar imóvel, bairro ou dono"
          className={`sm:max-w-xs ${FILTER_CONTROL}`}
        />
      </div>
      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando…
        </div>
      ) : (
        <TableFrame>
          <Table className={TABLE_LUX}>
            <TableHeader>
              <TableRow>
                <TableHead>Imóvel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Dias no mercado</TableHead>
                <TableHead>Responsável</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lista.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">
                    Nenhum imóvel neste filtro.
                  </TableCell>
                </TableRow>
              ) : (
                lista.map((item) => {
                  const capa = imovelCapaUrl(item.imovel);
                  return (
                    <TableRow key={item.id} className="hover:bg-muted/40">
                      <TableCell>
                        <Link
                          to="/imoveis-usados/vendas/$id"
                          params={{ id: item.id }}
                          className="flex items-center gap-3 hover:underline"
                        >
                          {capa ? (
                            <img
                              src={capa}
                              alt=""
                              className="h-12 w-16 shrink-0 rounded-md object-cover"
                            />
                          ) : (
                            <span className="h-12 w-16 shrink-0 rounded-md bg-muted" />
                          )}
                          <div>
                            <div className="text-sm font-medium">{item.imovel.titulo}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.imovel.bairro} · {item.imovel.cidade}
                            </div>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <StatusChip tone={vendaStatusTone(item.status)}>
                          {VENDA_STATUS_LABEL[item.status]}
                        </StatusChip>
                      </TableCell>
                      <TableCell className="text-sm font-semibold tabular-nums">
                        {formatBrl(item.precoVenda)}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {diasNoMercado(item.dataDisponibilizacao)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.responsavel.name}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableFrame>
      )}
    </>
  );
}
