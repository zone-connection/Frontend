import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/app-shell";
import { CaptacaoProximosPassos } from "@/components/captacao-proximos-passos";
import { CaptacaoRegistrarContatoDialog } from "@/components/captacao-registrar-contato-dialog";
import { PillTabs, StatusChip } from "@/components/operacao-ui";
import { Button } from "@/components/ui/button";
import { SOFT_SURFACE } from "@/lib/soft-surface";
import {
  fetchCaptacoes,
  formatBrl,
  type Captacao,
} from "@/lib/captacao-api";
import {
  captacaoToAcompanhamento,
  gapPretendido,
  loadTarefas,
  saveTarefas,
  type AcompanhamentoItem,
  type AcompanhamentoTarefa,
} from "@/lib/captacao-acompanhamento";
import { cn } from "@/lib/utils";
import { ArrowRight, MapPin } from "lucide-react";

type Aba = "paradas" | "portal" | "exclusividade";
type FiltroStatus = "todos" | "paradas" | "critico" | "atencao";

export const Route = createFileRoute("/_app/captacao/fila")({
  validateSearch: (search: Record<string, unknown>): { aba?: Aba } => {
    const aba = search.aba;
    if (aba === "paradas" || aba === "portal" || aba === "exclusividade") {
      return { aba };
    }
    return {};
  },
  component: FilaCaptacaoPage,
});

function FilaCaptacaoPage() {
  const { aba: abaSearch } = Route.useSearch();
  const navigate = useNavigate();
  const aba: Aba = abaSearch ?? "paradas";
  const [contatoItem, setContatoItem] = useState<AcompanhamentoItem | null>(null);
  const [filtro, setFiltro] = useState<FiltroStatus>("todos");
  const [captacoes, setCaptacoes] = useState<Captacao[]>([]);

  useEffect(() => {
    let alive = true;
    fetchCaptacoes()
      .then((list) => {
        if (alive) setCaptacoes(list);
      })
      .catch(() => {
        if (alive) setCaptacoes([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const todos = useMemo(
    () =>
      captacoes
        .filter((item) => item.funilEtapa.papel !== "perdido")
        .map(captacaoToAcompanhamento)
        .sort((a, b) => b.diasSemMovimento - a.diasSemMovimento),
    [captacoes],
  );
  const visiveis = todos.filter((item) => {
    if (filtro === "critico") return item.diasSemMovimento >= 14;
    if (filtro === "atencao") return item.diasSemMovimento >= 7 && item.diasSemMovimento < 14;
    if (filtro === "paradas") return item.diasSemMovimento >= 7;
    return true;
  });
  const portalItens = captacoes.filter(
    (item) => item.sugestaoProprietario || item.canceladoPeloProprietario,
  );
  const exclusividades = useMemo(
    () =>
      captacoes
        .filter(
          (item) =>
            item.exclusividade && item.funilEtapa.papel !== "perdido",
        )
        .map(captacaoToAcompanhamento)
        .sort((a, b) => b.diasSemMovimento - a.diasSemMovimento),
    [captacoes],
  );

  return (
    <>
      <PageHeader
        title="Acompanhamento"
        description="Acompanhe as negociações, visualize os próximos passos e mantenha seus clientes sempre no radar."
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <PillTabs
          value={aba}
          onChange={(id) => {
            void navigate({
              to: "/captacao/fila",
              search: { aba: id as Aba },
            });
          }}
          items={[
            { id: "paradas", label: `Captações (${todos.length})` },
            { id: "portal", label: `Portal (${portalItens.length})` },
            { id: "exclusividade", label: `Exclusividade (${exclusividades.length})` },
          ]}
        />
        {aba === "paradas" ? (
          <select
            className="h-9 rounded-full border border-black/10 bg-card px-3 text-sm text-muted-foreground"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value as FiltroStatus)}
          >
            <option value="todos">Todas</option>
            <option value="paradas">Paradas (7+ dias)</option>
            <option value="critico">Crítico (14+ dias)</option>
            <option value="atencao">Atenção (7–13 dias)</option>
          </select>
        ) : null}
      </div>
      {aba === "paradas" ? (
        <ul className="space-y-4">
          {visiveis.length === 0 ? (
            <Vazio text="Nenhuma captação neste filtro." />
          ) : (
            visiveis.map((item) => (
              <li key={item.id}>
                <CaptacaoCard
                  item={item}
                  onContato={() => setContatoItem(item)}
                />
              </li>
            ))
          )}
        </ul>
      ) : null}
      {aba === "portal" ? (
        <ul className="space-y-3">
          {portalItens.length === 0 ? (
            <Vazio text="Nenhum aviso do portal do proprietário." />
          ) : (
            portalItens.map((item) => (
              <li key={item.id} className={cn(SOFT_SURFACE, "p-4")}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{item.imovel.titulo}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.proprietario.nome} · {item.responsavel.name}
                    </p>
                  </div>
                  <StatusChip tone={item.canceladoPeloProprietario ? "orange" : "teal"}>
                    {item.canceladoPeloProprietario
                      ? "Cancelado pelo dono"
                      : "Sugerido pelo dono"}
                  </StatusChip>
                </div>
                <Link
                  to="/captacao/fila/$id"
                  params={{ id: item.id }}
                  className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
                >
                  Ver detalhes
                </Link>
              </li>
            ))
          )}
        </ul>
      ) : null}
      {aba === "exclusividade" ? (
        <ul className="space-y-4">
          {exclusividades.length === 0 ? (
            <Vazio text="Nenhuma captação com exclusividade." />
          ) : (
            exclusividades.map((item) => (
              <li key={item.id}>
                <CaptacaoCard
                  item={item}
                  chip={<StatusChip tone="violet">Exclusividade</StatusChip>}
                  onContato={() => setContatoItem(item)}
                />
              </li>
            ))
          )}
        </ul>
      ) : null}
      <CaptacaoRegistrarContatoDialog
        item={contatoItem}
        open={Boolean(contatoItem)}
        onOpenChange={(open) => {
          if (!open) setContatoItem(null);
        }}
      />
    </>
  );
}

function CaptacaoCard({
  item,
  onContato,
  chip,
}: {
  item: AcompanhamentoItem;
  onContato: () => void;
  chip?: ReactNode;
}) {
  const gap = gapPretendido(item);
  const [tarefas, setTarefas] = useState<AcompanhamentoTarefa[]>(() => loadTarefas(item));

  useEffect(() => {
    setTarefas(loadTarefas(item));
  }, [item]);

  function persist(next: AcompanhamentoTarefa[]) {
    setTarefas(next);
    saveTarefas(item.id, next);
  }

  return (
    <article className={cn(SOFT_SURFACE, "overflow-hidden")}>
      <div className="grid gap-0 lg:grid-cols-[200px_minmax(0,1fr)_240px]">
        <div className="relative min-h-[160px] bg-muted">
          {item.fotoUrl ? (
            <img src={item.fotoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : null}
          <span className="absolute bottom-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-medium text-white">
            Cód. {item.codigo}
          </span>
        </div>
        <div className="min-w-0 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold tracking-tight">{item.titulo}</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {item.proprietario.nome} · {item.segundaPessoa.nome}
              </p>
            </div>
            {chip}
          </div>
          <p className="mt-3 text-sm tabular-nums">
            <span className="font-semibold">{item.pretendido != null ? formatBrl(item.pretendido) : "—"}</span>
            <span className="text-muted-foreground">
              {" "}
              · avaliação {item.avaliacao != null ? formatBrl(item.avaliacao) : "—"}
            </span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Último contato: {item.ultimoContatoLabel}</p>
          {item.endereco ? (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3" />
              {item.endereco}
            </p>
          ) : null}
          {gap && gap.delta > 0 ? (
            <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">
              Pretendido acima da avaliação
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button size="sm" onClick={onContato}>
              Registrar contato
            </Button>
            <Link
              to="/captacao/fila/$id"
              params={{ id: item.id }}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Ver detalhes
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
        <div className="border-t border-black/5 p-4 lg:border-l lg:border-t-0">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Próximos passos
            </p>
            <StatusChip
              tone={
                item.diasSemMovimento >= 14
                  ? "orange"
                  : item.diasSemMovimento >= 7
                    ? "orange"
                    : "muted"
              }
            >
              {item.diasSemMovimento >= 7
                ? `${item.diasSemMovimento} dias parada`
                : item.diasSemMovimento <= 0
                  ? "Em dia"
                  : `${item.diasSemMovimento} dias`}
            </StatusChip>
          </div>
          <CaptacaoProximosPassos compact tarefas={tarefas} onChange={persist} />
        </div>
      </div>
    </article>
  );
}

function Vazio({ text }: { text: string }) {
  return (
    <li className="rounded-2xl border px-4 py-8 text-center text-sm text-muted-foreground">
      {text}
    </li>
  );
}
