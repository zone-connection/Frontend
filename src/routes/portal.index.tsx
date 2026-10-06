import { createFileRoute, getRouteApi, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Handshake,
  Home,
  Kanban,
  Loader2,
  ShieldCheck,
  Store,
  Tag,
  Users,
} from "lucide-react";
import { PortalEmpty, PortalImovelCard, PortalPageTitle, PortalStatCard } from "@/components/portal-ui";
import { ApiError } from "@/lib/api";
import {
  fetchPortalDashboard,
  type PortalDashboard,
  type PortalNovidade,
} from "@/lib/portal-api";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/")({
  ssr: false,
  component: PortalDashboardPage,
});

const portalRoute = getRouteApi("/portal");

function monthKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function DesempenhoChart({ items }: { items: PortalNovidade[] }) {
  const now = new Date();
  const days = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (7 - i));
    d.setHours(0, 0, 0, 0);
    const count = items.filter((item) => {
      const x = new Date(item.createdAt);
      return x.toDateString() === d.toDateString();
    }).length;
    return { label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), count };
  });
  const max = Math.max(1, ...days.map((d) => d.count));
  const w = 280;
  const h = 90;
  const pts = days.map((d, i) => {
    const x = (i / (days.length - 1)) * w;
    const y = h - (d.count / max) * (h - 8) - 4;
    return `${x},${y}`;
  });
  const area = `0,${h} ${pts.join(" ")} ${w},${h}`;

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-24 w-full">
        <defs>
          <linearGradient id="portalArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#portalArea)" />
        <polyline
          points={pts.join(" ")}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        {days.map((d) => (
          <span key={d.label}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

function PortalDashboardPage() {
  const { proprietario } = portalRoute.useRouteContext();
  const first = proprietario?.nome?.trim().split(/\s+/)[0] ?? "proprietário";
  const [data, setData] = useState<PortalDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchPortalDashboard()
      .then(setData)
      .catch((err) => {
        toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar.");
      })
      .finally(() => setLoading(false));
  }, []);

  const thisMonth = useMemo(() => {
    const now = new Date();
    const items = data?.novidades ?? [];
    const monthItems = items.filter((item) => monthKey(new Date(item.createdAt)) === monthKey(now));
    return {
      items: monthItems,
      imoveis: data?.resumo.total ?? 0,
      visitas: monthItems.filter((i) => i.tipo.includes("visita")).length,
      propostas: monthItems.filter((i) => i.tipo.includes("proposta") || i.tipo.includes("negociacao")).length,
    };
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando…
      </div>
    );
  }
  if (!data) return null;

  const novidades = (data.novidades ?? []).slice(0, 5);

  return (
    <div className="space-y-6">
      <PortalPageTitle
        title={`Olá, ${first}`}
        subtitle="Acompanhe o desempenho dos seus imóveis e negociações."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <PortalStatCard
          label="Imóveis"
          hint="Cadastrados"
          value={data.resumo.total}
          icon={Home}
          tone="teal"
        />
        <PortalStatCard
          label="Captação"
          hint="Em andamento"
          value={data.resumo.captacao}
          icon={Users}
          tone="blue"
        />
        <PortalStatCard
          label="À venda"
          hint="Disponíveis"
          value={data.resumo.disponiveis}
          icon={Store}
          tone="emerald"
        />
        <PortalStatCard
          label="Negociação"
          hint="Em andamento"
          value={data.resumo.negociacao}
          icon={Handshake}
          tone="violet"
        />
        <PortalStatCard
          label="Vendidos"
          hint="Concluídos"
          value={data.resumo.vendidos}
          icon={Tag}
          tone="orange"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(20rem,0.85fr)]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Seus imóveis</h2>
            <Link
              to="/portal/imoveis"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Cadastrar ou ver todos
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {data.imoveis.length === 0 ? (
            <PortalEmpty>Nenhum imóvel vinculado ainda.</PortalEmpty>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {data.imoveis.slice(0, 4).map((imovel) => (
                <PortalImovelCard key={imovel.id} imovel={imovel} />
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Kanban className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">Novidades</h2>
              </div>
              <Link to="/portal/novidades" className="text-xs font-medium text-primary">
                Ver todas
              </Link>
            </div>
            {novidades.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Quando a imobiliária avançar uma etapa, isso aparece aqui.
              </p>
            ) : (
              <ol className="space-y-3">
                {novidades.map((item) => (
                  <li key={item.id}>
                    <Link to="/portal/imoveis/$id" params={{ id: item.imovelId }} className="block">
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                      <p className="text-xs font-medium text-primary">{item.identificacao}</p>
                      <p className="text-sm leading-snug text-muted-foreground">{item.texto}</p>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Desempenho geral</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                Este mês
              </span>
            </div>
            <DesempenhoChart items={thisMonth.items} />
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[11px] text-muted-foreground">Novos imóveis</p>
                <p className="text-lg font-semibold">{thisMonth.imoveis}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Visitas</p>
                <p className="text-lg font-semibold">{thisMonth.visitas}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Propostas</p>
                <p className="text-lg font-semibold">{thisMonth.propostas}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="flex flex-col items-start justify-between gap-3 rounded-xl border bg-card px-5 py-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold">
              Seu patrimônio, nossa prioridade
            </p>
            <p className="text-sm text-muted-foreground">
              Acompanhe cada etapa e tenha mais segurança nas suas negociações.
            </p>
          </div>
        </div>
        <Link
          to="/portal/documentos"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Saiba mais
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
