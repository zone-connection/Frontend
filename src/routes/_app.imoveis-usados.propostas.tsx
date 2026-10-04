import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { PillTabs, StatusChip } from "@/components/operacao-ui";
import { SOFT_SURFACE } from "@/lib/soft-surface";
import { ApiError } from "@/lib/api";
import { formatBrl, imovelCapaUrl } from "@/lib/captacao-api";
import {
  fetchTodasPropostasUsado,
  PROPOSTA_STATUS_LABEL,
  type PropostaUsado,
  type PropostaUsadoStatus,
} from "@/lib/imoveis-usados-api";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type Fila = PropostaUsadoStatus | "todas";

export const Route = createFileRoute("/_app/imoveis-usados/propostas")({
  validateSearch: (search: Record<string, unknown>): { fila?: Fila } => {
    const fila = search.fila;
    if (
      fila === "todas" ||
      fila === "rascunho" ||
      fila === "enviada" ||
      fila === "em_analise" ||
      fila === "aceita" ||
      fila === "recusada" ||
      fila === "cancelada"
    ) {
      return { fila };
    }
    return {};
  },
  component: PropostasPage,
});

const FILAS: Fila[] = [
  "todas",
  "enviada",
  "em_analise",
  "aceita",
  "recusada",
];

function toneFila(status: PropostaUsadoStatus) {
  if (status === "aceita") return "emerald" as const;
  if (status === "recusada" || status === "cancelada") return "orange" as const;
  if (status === "em_analise") return "violet" as const;
  return "blue" as const;
}

type PropostaLista = PropostaUsado & {
  vendaUsado?: {
    id: string;
    imovel: { id?: string; titulo?: string; fotoUrl?: string | null; tipo?: string };
  };
};

function PropostasPage() {
  const { fila } = Route.useSearch();
  const navigate = useNavigate();
  const aba: Fila = fila ?? "todas";
  const [items, setItems] = useState<PropostaLista[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodasPropostasUsado()
      .then(setItems)
      .catch((err) => {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Não foi possível listar as propostas.",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const lista = useMemo(
    () => (aba === "todas" ? items : items.filter((item) => item.status === aba)),
    [aba, items],
  );

  return (
    <>
      <PageHeader
        title="Caixa de propostas"
        description="Propostas reais dos imóveis em venda de usados."
      />
      <PillTabs
        value={aba}
        onChange={(id) => {
          void navigate({
            to: "/imoveis-usados/propostas",
            search: id === "todas" ? {} : { fila: id as Fila },
          });
        }}
        items={FILAS.map((id) => ({
          id,
          label:
            id === "todas"
              ? `Todas (${items.length})`
              : `${PROPOSTA_STATUS_LABEL[id]} (${items.filter((i) => i.status === id).length})`,
        }))}
      />
      {loading ? (
        <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando…
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {lista.length === 0 ? (
            <li className="rounded-2xl border px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhuma proposta neste filtro.
            </li>
          ) : (
            lista.map((item) => {
              const imovel = item.vendaUsado?.imovel;
              const capa = imovelCapaUrl(imovel);
              return (
                <li key={item.id} className={cn(SOFT_SURFACE, "p-4")}>
                  <div className="flex gap-3">
                    {capa ? (
                      <img src={capa} alt="" className="h-16 w-20 shrink-0 rounded-lg object-cover" />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{imovel?.titulo ?? "Imóvel"}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.interessado.nome} · {item.responsavel.name}
                          </p>
                        </div>
                        <StatusChip tone={toneFila(item.status)}>
                          {PROPOSTA_STATUS_LABEL[item.status]}
                        </StatusChip>
                      </div>
                      <p className="mt-1 text-sm font-semibold tabular-nums">
                        {formatBrl(item.valorAtual ?? item.valor)}
                      </p>
                      {item.vendaUsado?.id ? (
                        <Link
                          to="/imoveis-usados/vendas/$id"
                          params={{ id: item.vendaUsado.id }}
                          className="mt-2 inline-flex text-sm font-medium text-primary hover:underline"
                        >
                          Abrir venda
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      )}
    </>
  );
}
