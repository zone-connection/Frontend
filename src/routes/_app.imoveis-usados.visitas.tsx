import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { PillTabs, StatusChip } from "@/components/operacao-ui";
import { SOFT_SURFACE } from "@/lib/soft-surface";
import { ApiError } from "@/lib/api";
import { imovelCapaUrl } from "@/lib/captacao-api";
import {
  fetchTodasVisitasUsado,
  VISITA_STATUS_LABEL,
  type VisitaUsado,
  type VisitaUsadoStatus,
} from "@/lib/imoveis-usados-api";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type Periodo = "todas" | "agendada" | "realizada";

export const Route = createFileRoute("/_app/imoveis-usados/visitas")({
  validateSearch: (search: Record<string, unknown>): { periodo?: Periodo } => {
    const periodo = search.periodo;
    if (periodo === "todas" || periodo === "agendada" || periodo === "realizada") {
      return { periodo };
    }
    return {};
  },
  component: VisitasPage,
});

function toneVisita(status: VisitaUsadoStatus) {
  if (status === "confirmada" || status === "realizada") return "emerald" as const;
  if (status === "nao_compareceu" || status === "cancelada") return "orange" as const;
  return "teal" as const;
}

type VisitaLista = VisitaUsado & {
  vendaUsado?: {
    id: string;
    imovel: {
      id?: string;
      titulo?: string;
      cidade?: string;
      fotoUrl?: string | null;
      tipo?: string;
    };
  };
};

function VisitasPage() {
  const { periodo } = Route.useSearch();
  const navigate = useNavigate();
  const aba: Periodo = periodo ?? "todas";
  const [items, setItems] = useState<VisitaLista[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTodasVisitasUsado()
      .then(setItems)
      .catch((err) => {
        toast.error(
          err instanceof ApiError ? err.message : "Não foi possível listar as visitas.",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const lista = useMemo(() => {
    if (aba === "todas") return items;
    return items.filter((item) => item.status === aba);
  }, [aba, items]);

  return (
    <>
      <PageHeader
        title="Visitas"
        description="Agenda de visitas nos imóveis em venda de usados."
      />
      <PillTabs
        value={aba}
        onChange={(id) => {
          void navigate({
            to: "/imoveis-usados/visitas",
            search: id === "todas" ? {} : { periodo: id as Periodo },
          });
        }}
        items={[
          { id: "todas", label: `Todas (${items.length})` },
          {
            id: "agendada",
            label: `Agendadas (${items.filter((i) => i.status === "agendada").length})`,
          },
          {
            id: "realizada",
            label: `Realizadas (${items.filter((i) => i.status === "realizada").length})`,
          },
        ]}
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
              Nenhuma visita neste filtro.
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
                          <p className="text-sm font-semibold">
                            {imovel?.titulo ?? "Imóvel"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {item.interessado.nome} · {item.responsavel.name}
                          </p>
                        </div>
                        <StatusChip tone={toneVisita(item.status)}>
                          {VISITA_STATUS_LABEL[item.status]}
                        </StatusChip>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(item.dataHora).toLocaleString("pt-BR")}
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
