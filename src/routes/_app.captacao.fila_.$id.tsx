import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CaptacaoProximosPassos } from "@/components/captacao-proximos-passos";
import { CaptacaoRegistrarContatoDialog } from "@/components/captacao-registrar-contato-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SOFT_SURFACE } from "@/lib/soft-surface";
import { fetchCaptacao, formatBrl } from "@/lib/captacao-api";
import {
  captacaoToAcompanhamento,
  digitsForWhatsApp,
  gapPretendido,
  grupoTimelineLabel,
  loadTarefas,
  mergeEventos,
  motivosDaCaptacao,
  saveTarefas,
  type AcompanhamentoItem,
  type AcompanhamentoTarefa,
} from "@/lib/captacao-acompanhamento";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Car,
  Home,
  MapPin,
  MoreHorizontal,
  Phone,
} from "lucide-react";

export const Route = createFileRoute("/_app/captacao/fila_/$id")({
  component: CaptacaoAcompanhamentoDetalhePage,
});

function CaptacaoAcompanhamentoDetalhePage() {
  const { id } = Route.useParams();
  const [item, setItem] = useState<AcompanhamentoItem | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [contatoAberto, setContatoAberto] = useState(false);
  const [tarefas, setTarefas] = useState<AcompanhamentoTarefa[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    fetchCaptacao(id)
      .then((c) => {
        if (!alive) return;
        const mapped = captacaoToAcompanhamento(c);
        setItem(mapped);
        setTarefas(loadTarefas(mapped));
      })
      .catch(() => {
        if (alive) setErro("Captação não encontrada.");
      });
    return () => {
      alive = false;
    };
  }, [id, tick]);

  const eventos = useMemo(() => (item ? mergeEventos(item) : []), [item, tick]);
  const gap = item ? gapPretendido(item) : null;
  const motivos = item ? motivosDaCaptacao(item) : [];

  if (erro) {
    return (
      <div className="space-y-3">
        <Link to="/captacao/fila" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          Voltar para Acompanhamento
        </Link>
        <p className="text-sm text-muted-foreground">{erro}</p>
      </div>
    );
  }

  if (!item) {
    return <p className="text-sm text-muted-foreground">Carregando…</p>;
  }

  function persistTarefas(next: AcompanhamentoTarefa[]) {
    setTarefas(next);
    saveTarefas(item.id, next);
  }

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            to="/captacao/fila"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Voltar para Acompanhamento
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{item.titulo}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Captação #{item.codigo}</span>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                item.diasSemMovimento >= 14
                  ? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                  : "bg-amber-500/10 text-amber-800 dark:text-amber-300",
              )}
            >
              Parada há {item.diasSemMovimento} dias
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setContatoAberto(true)}>Registrar contato</Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Mais ações">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {item.fonte === "api" ? (
                <DropdownMenuItem asChild>
                  <Link to="/captacao/captacoes/$id" params={{ id: item.id }}>
                    Abrir ficha completa
                  </Link>
                </DropdownMenuItem>
              ) : null}
              {item.imovelId ? (
                <DropdownMenuItem asChild>
                  <Link to="/captacao/imoveis/$id" params={{ id: item.imovelId }}>
                    Ver imóvel
                  </Link>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem asChild>
                <Link to="/captacao/funil">Abrir funil de captação</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-5">
          <section className={cn(SOFT_SURFACE, "p-4 sm:p-5")}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Resumo da negociação
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <ResumoCampo label="Etapa" value={item.etapa} />
              <ResumoCampo
                label="Valor pretendido"
                value={item.pretendido != null ? formatBrl(item.pretendido) : "—"}
              />
              <ResumoCampo
                label="Avaliação"
                value={item.avaliacao != null ? formatBrl(item.avaliacao) : "—"}
              />
              <ResumoCampo label="Último contato" value={item.ultimoContatoLabel} />
            </div>
            {gap && gap.delta > 0 ? (
              <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
                ⚠️{" "}
                <strong>
                  Valor pretendido acima da avaliação em {formatBrl(gap.delta)}
                </strong>
              </div>
            ) : null}
          </section>

          <section className={cn(SOFT_SURFACE, "p-4 sm:p-5")}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Cliente
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <PessoaBloco pessoa={item.proprietario} onContato={() => setContatoAberto(true)} />
              <PessoaBloco pessoa={item.segundaPessoa} onContato={() => setContatoAberto(true)} />
            </div>
          </section>

          <section className={cn(SOFT_SURFACE, "overflow-hidden")}>
            <div className="grid gap-0 md:grid-cols-[280px_minmax(0,1fr)]">
              <div className="relative min-h-[220px] bg-muted">
                {item.fotoUrl ? (
                  <img src={item.fotoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="p-4 sm:p-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Imóvel
                </p>
                <h2 className="text-lg font-semibold">{item.titulo}</h2>
                <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="size-3.5" />
                  {item.endereco || "Endereço não informado"}
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Home className="size-3.5" />
                    {item.tipoLabel}
                  </span>
                  {item.quartos != null ? (
                    <span className="inline-flex items-center gap-1">
                      <BedDouble className="size-3.5" />
                      {item.quartos} quartos
                    </span>
                  ) : null}
                  {item.banheiros != null ? (
                    <span className="inline-flex items-center gap-1">
                      <Bath className="size-3.5" />
                      {item.banheiros} banheiros
                    </span>
                  ) : null}
                  {item.vagas != null ? (
                    <span className="inline-flex items-center gap-1">
                      <Car className="size-3.5" />
                      {item.vagas} vagas
                    </span>
                  ) : null}
                </div>
                <p className="mt-4 text-xl font-semibold tabular-nums">
                  {item.pretendido != null ? formatBrl(item.pretendido) : "—"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Avaliação:{" "}
                  <strong className="text-foreground">
                    {item.avaliacao != null ? formatBrl(item.avaliacao) : "—"}
                  </strong>
                </p>
                {item.imovelId ? (
                  <Link
                    to="/captacao/imoveis/$id"
                    params={{ id: item.imovelId }}
                    className="mt-4 inline-flex text-sm font-medium text-primary hover:underline"
                  >
                    Ver imóvel completo →
                  </Link>
                ) : (
                  <p className="mt-4 text-xs text-muted-foreground">Ficha completa disponível nas captações reais.</p>
                )}
              </div>
            </div>
          </section>

          <section className={cn(SOFT_SURFACE, "p-4 sm:p-5")}>
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Histórico
            </p>
            <ol className="space-y-5">
              {eventos.map((ev, i) => {
                const label = grupoTimelineLabel(ev.at);
                const prev = i > 0 ? grupoTimelineLabel(eventos[i - 1].at) : null;
                return (
                  <li key={ev.id}>
                    {label !== prev ? (
                      <p className="mb-2 text-[11px] font-semibold tracking-wider text-muted-foreground">
                        {label}
                      </p>
                    ) : null}
                    <div className="relative border-l border-black/10 pl-4">
                      <span
                        className={cn(
                          "absolute -left-1 top-1.5 size-2 rounded-full",
                          ev.tom === "critico"
                            ? "bg-rose-500"
                            : ev.tom === "contato"
                              ? "bg-violet-500"
                              : "bg-muted-foreground/40",
                        )}
                      />
                      <p className="text-sm font-medium">
                        {ev.tom === "critico" ? "⚠️ " : null}
                        {ev.titulo}
                      </p>
                      <p className="text-sm text-muted-foreground">{ev.detalhe}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className={cn(SOFT_SURFACE, "border-primary/20 p-4 sm:p-5")}>
            <p className="mb-3 text-sm font-semibold">Próximos passos</p>
            <CaptacaoProximosPassos tarefas={tarefas} onChange={persistTarefas} />
          </section>
        </div>

        <aside className={cn(SOFT_SURFACE, "h-fit p-4 xl:sticky xl:top-4")}>
          <h2 className="text-sm font-semibold">Por que essa captação está aqui?</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            O corretor deve bater o olho e saber por que olhar este cliente agora.
          </p>
          <ul className="mt-4 space-y-3">
            {motivos.map((m) => (
              <li key={m.titulo}>
                <p className="text-sm font-medium">{m.titulo}</p>
                <span
                  className={cn(
                    "mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
                    m.nivel === "critico"
                      ? "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                      : m.nivel === "atencao"
                        ? "bg-orange-500/10 text-orange-700 dark:text-orange-300"
                        : "bg-violet-500/10 text-violet-700 dark:text-violet-300",
                  )}
                >
                  {m.nivel === "critico" ? "🔴 " : m.nivel === "atencao" ? "🟠 " : ""}
                  {m.detalhe}
                </span>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <CaptacaoRegistrarContatoDialog
        item={item}
        open={contatoAberto}
        onOpenChange={setContatoAberto}
        onSaved={() => setTick((n) => n + 1)}
      />
    </div>
  );
}

function ResumoCampo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function PessoaBloco({
  pessoa,
  onContato,
}: {
  pessoa: AcompanhamentoItem["proprietario"];
  onContato: () => void;
}) {
  const wa = digitsForWhatsApp(pessoa.telefone);
  return (
    <div className="rounded-xl border border-black/5 bg-muted/30 p-3">
      <p className="font-semibold">{pessoa.nome}</p>
      <p className="text-xs text-muted-foreground">{pessoa.papel}</p>
      <p className="mt-2 text-sm">{pessoa.telefone ?? "Telefone não informado"}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {wa ? (
          <Button size="sm" variant="outline" asChild>
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          </Button>
        ) : null}
        {pessoa.telefone ? (
          <Button size="sm" variant="outline" asChild>
            <a href={`tel:${pessoa.telefone.replace(/\D/g, "")}`}>
              <Phone className="mr-1 size-3.5" />
              Ligar
            </a>
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" onClick={onContato}>
          Registrar contato
        </Button>
      </div>
    </div>
  );
}
