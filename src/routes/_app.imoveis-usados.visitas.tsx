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
import { Building2, CalendarDays, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

function ResumoVisita({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[#E2E8EC] bg-white px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums text-[#0B3148]">{value}</p>
    </div>
  );
}

function CalendarioVisitas({
  mes,
  contagem,
  dia,
  onMes,
  onDia,
}: {
  mes: Date;
  contagem: Map<string, { agendadas: number; realizadas: number }>;
  dia: string | null;
  onMes: (delta: number) => void;
  onDia: (key: string) => void;
}) {
  const ano = mes.getFullYear();
  const month = mes.getMonth();
  const inicio = new Date(ano, month, 1);
  const diasNoMes = new Date(ano, month + 1, 0).getDate();
  const offset = (inicio.getDay() + 6) % 7;
  const celulas = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: diasNoMes }, (_, index) => index + 1),
  ];
  const titulo = mes.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="mb-4 rounded-2xl border border-[#E2E8EC] bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold capitalize text-[#0B3148]">
          <CalendarDays className="size-4 text-[#079ED4]" />
          {titulo}
        </p>
        <div className="flex gap-1">
          <Button type="button" variant="outline" size="icon" className="size-8" onClick={() => onMes(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" className="size-8" onClick={() => onMes(1)}>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-medium text-muted-foreground">
        {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((label) => (
          <span key={label} className="py-1">{label}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {celulas.map((numero, index) => {
          if (!numero) return <span key={`vazio-${index}`} />;
          const key = `${ano}-${String(month + 1).padStart(2, "0")}-${String(numero).padStart(2, "0")}`;
          const conta = contagem.get(key);
          const total = (conta?.agendadas ?? 0) + (conta?.realizadas ?? 0);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onDia(key)}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center rounded-lg text-sm",
                dia === key ? "bg-[#079ED4] text-white" : "hover:bg-[#F3FAFD]",
              )}
            >
              <span>{numero}</span>
              {total > 0 ? (
                <span className={cn("text-[10px] tabular-nums", dia === key ? "text-white" : "text-[#05749E]")}>
                  {total}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        O número do dia soma visitas realizadas e agendadas. Clique de novo para limpar o dia.
      </p>
    </div>
  );
}

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

  const [mes, setMes] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [dia, setDia] = useState<string | null>(null);

  const agendadas = items.filter(
    (item) => item.status === "agendada" || item.status === "confirmada",
  ).length;
  const realizadas = items.filter((item) => item.status === "realizada").length;

  const lista = useMemo(() => {
    const porAba =
      aba === "todas"
        ? items
        : aba === "agendada"
          ? items.filter(
              (item) => item.status === "agendada" || item.status === "confirmada",
            )
          : items.filter((item) => item.status === "realizada");
    if (!dia) return porAba;
    return porAba.filter((item) => item.dataHora.slice(0, 10) === dia);
  }, [aba, dia, items]);

  const contagemDia = useMemo(() => {
    const map = new Map<string, { agendadas: number; realizadas: number }>();
    for (const item of items) {
      const key = item.dataHora.slice(0, 10);
      const atual = map.get(key) ?? { agendadas: 0, realizadas: 0 };
      if (item.status === "agendada" || item.status === "confirmada") {
        atual.agendadas += 1;
      }
      if (item.status === "realizada") atual.realizadas += 1;
      map.set(key, atual);
    }
    return map;
  }, [items]);

  return (
    <>
      <PageHeader
        title="Visitas"
        description="Agenda de visitas nos imóveis em venda de usados."
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <ResumoVisita label="Visitas" value={items.length} />
        <ResumoVisita label="Realizadas" value={realizadas} />
        <ResumoVisita label="Agendadas" value={agendadas} />
      </div>
      <CalendarioVisitas
        mes={mes}
        contagem={contagemDia}
        dia={dia}
        onMes={(delta) =>
          setMes((atual) => new Date(atual.getFullYear(), atual.getMonth() + delta, 1))
        }
        onDia={(key) => setDia((atual) => (atual === key ? null : key))}
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
            label: `Agendadas (${agendadas})`,
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
