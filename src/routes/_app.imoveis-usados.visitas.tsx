import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { PillTabs, StatusChip } from "@/components/operacao-ui";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError } from "@/lib/api";
import { imovelCapaUrl } from "@/lib/captacao-api";
import {
  fetchTodasVisitasUsado,
  VISITA_STATUS_LABEL,
  type VisitaUsado,
  type VisitaUsadoStatus,
} from "@/lib/imoveis-usados-api";
import { Building2, Loader2 } from "lucide-react";
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
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {lista.length === 0 ? (
            <li className="col-span-full rounded-2xl border px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhuma visita neste filtro.
            </li>
          ) : (
            lista.map((item) => {
              const imovel = item.vendaUsado?.imovel;
              const capa = imovelCapaUrl(imovel);
              return (
                <li key={item.id}>
                  <Card className="group overflow-hidden rounded-2xl border-black/5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-md">
                    <div className="relative h-40 overflow-hidden bg-muted">
                      {capa ? (
                        <img
                          src={capa}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Building2 className="h-10 w-10 text-muted-foreground/40" />
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-black/60 to-transparent" />
                      <Badge className="absolute bottom-3 right-3 border-white/20 bg-black/45 text-white hover:bg-black/55">
                        {new Date(item.dataHora).toLocaleString("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </Badge>
                    </div>
                    <CardHeader className="pb-2 pt-4">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base leading-snug">
                          {imovel?.titulo ?? "Imóvel"}
                        </CardTitle>
                        <StatusChip tone={toneVisita(item.status)}>
                          {VISITA_STATUS_LABEL[item.status]}
                        </StatusChip>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.interessado.nome} · {item.responsavel.name}
                      </p>
                    </CardHeader>
                    <CardContent>
                      {item.vendaUsado?.id ? (
                        <Link
                          to="/imoveis-usados/vendas/$id"
                          params={{ id: item.vendaUsado.id }}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          Abrir venda
                        </Link>
                      ) : null}
                    </CardContent>
                  </Card>
                </li>
              );
            })
          )}
        </ul>
      )}
    </>
  );
}
