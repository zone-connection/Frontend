import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Calendar,
  Handshake,
  UserCheck,
  UserRound,
  UserX,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { FinanceKpiCard } from "@/components/finance-kpi-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import { ETAPA_LABEL, painel, type Painel, type RhEtapa } from "@/lib/rh-api";

export const Route = createFileRoute("/_app/rh/")({
  component: Page,
});

const TIPO: Record<string, string> = {
  entrevista: "Entrevista",
  retorno: "Retorno",
  reuniao: "Reunião",
  documentos: "Documentos",
  assinatura: "Assinatura",
  treinamento: "Treinamento",
  avaliacao: "Avaliação",
};

function inicioMes() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function quando(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Page() {
  const [de, setDe] = useState(inicioMes);
  const [ate, setAte] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<Painel | null>(null);
  const [erro, setErro] = useState("");

  async function carregar() {
    try {
      setErro("");
      setData(await painel(de, ate));
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Não foi possível carregar o painel.");
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  const k = data?.indicadores;
  const maxVendas = Math.max(1, ...(data?.desempenho.map((item) => item.vendas) ?? [1]));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Visão geral"
        description="Recrutamento, agenda e resultado da equipe no período."
        actions={
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs text-muted-foreground">
              De
              <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
            </label>
            <label className="text-xs text-muted-foreground">
              Até
              <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
            </label>
            <Button type="button" onClick={() => void carregar()}>
              Filtrar
            </Button>
          </div>
        }
      />
      {erro ? <p className="text-sm text-destructive">{erro}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <FinanceKpiCard label="Candidatos em processo" value={k?.emProcesso ?? 0} icon={Users} tone="blue" format="number" href="/rh/recrutamento" />
        <FinanceKpiCard label="Entrevistas agendadas" value={k?.entrevistas ?? 0} icon={Calendar} tone="violet" format="number" href="/rh/agenda" />
        <FinanceKpiCard label="Contratações no período" value={k?.contratacoes ?? 0} icon={UserCheck} tone="emerald" format="number" href="/rh/equipe" />
        <FinanceKpiCard label="Corretores ativos" value={k?.corretoresAtivos ?? 0} icon={UserRound} tone="teal" format="number" href="/rh/equipe" />
        <FinanceKpiCard label="Desistentes ou reprovados" value={k?.encerrados ?? 0} icon={UserX} tone="rose" format="number" href="/rh/equipe" />
        <FinanceKpiCard label="Vendas da equipe" value={k?.vendas ?? 0} icon={Handshake} tone="orange" format="number" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Painel titulo="Próximos compromissos" href="/rh/agenda" vazio="Nenhum compromisso de RH à frente.">
          {data?.proximos.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 rounded-xl bg-[#F4F9FE] px-3 py-2">
              <div>
                <p className="font-medium text-[#0B3148]">{item.titulo}</p>
                <p className="text-xs text-[#5C6B76]">
                  {item.rhCandidato?.nome || item.rhUser?.name || "Sem pessoa"}
                  {item.rhTipo ? ` · ${TIPO[item.rhTipo] ?? item.rhTipo}` : ""}
                </p>
              </div>
              <span className="shrink-0 text-xs font-medium text-[#1570C8]">{quando(item.startsAt)}</span>
            </li>
          ))}
        </Painel>
        <Painel titulo="Precisam de acompanhamento" href="/rh/recrutamento" vazio="Ninguém parado no funil.">
          {data?.parados.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#F5C48A]/70 bg-[#FFF8F1] px-3 py-2">
              <span className="font-medium text-[#0B3148]">{item.nome}</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-[#C45C0A]">
                {ETAPA_LABEL[item.etapa as RhEtapa]}
              </span>
            </li>
          ))}
        </Painel>
        <Painel titulo="Contratações recentes" href="/rh/equipe" vazio="Nenhuma contratação neste período.">
          {data?.contratacoesRecentes.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#F3FBF6] px-3 py-2">
              <span className="font-medium text-[#0B3148]">{item.nome}</span>
              <span className="text-xs text-[#067647]">
                {item.contratadoEm ? new Date(item.contratadoEm).toLocaleDateString("pt-BR") : ""}
              </span>
            </li>
          ))}
        </Painel>
        <Painel titulo="Desempenho da equipe no período" vazio="Sem vendas da equipe neste período.">
          {data?.desempenho.map((item) => (
            <li key={item.userId} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-[#0B3148]">{item.nome}</span>
                <span className="text-xs text-[#5C6B76]">{item.vendas} venda(s)</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#E6EEF3]">
                <div
                  className="h-full rounded-full bg-[#079ED4]"
                  style={{ width: `${Math.max(item.vendas > 0 ? 8 : 0, (item.vendas / maxVendas) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </Painel>
      </div>
    </div>
  );
}

function Painel({
  titulo,
  href,
  vazio,
  children,
}: {
  titulo: string;
  href?: "/rh/agenda" | "/rh/recrutamento" | "/rh/equipe";
  vazio: string;
  children: React.ReactNode;
}) {
  const itens = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  return (
    <section className="rounded-2xl border border-[#E6EEF3] bg-white p-4 shadow-[0_8px_24px_rgba(11,49,72,0.04)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[#0B3148]">{titulo}</h2>
        {href ? (
          <Link to={href} className="text-xs font-medium text-[#079ED4]">
            Abrir
          </Link>
        ) : null}
      </div>
      {itens.length === 0 ? (
        <p className="rounded-xl border border-dashed border-[#E2E8EC] px-3 py-6 text-center text-sm text-[#5C6B76]">
          {vazio}
        </p>
      ) : (
        <ul className="space-y-2 text-sm">{children}</ul>
      )}
    </section>
  );
}
