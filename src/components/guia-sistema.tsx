import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Compass,
  Lightbulb,
  ListChecks,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { GuiaTourStartButton } from "@/components/guia-tour";
import { getSession } from "@/lib/auth";
import {
  findGuiaTopic,
  GUIA_GROUPS,
  GUIA_JOURNEY,
  GUIA_JOURNEY_USADOS,
  type GuiaFormula,
  type GuiaTopic,
} from "@/lib/guia-sistema-content";
import { peekGuiaTourLive, startGuiaTour, stopGuiaTour } from "@/lib/guia-tour";
import { canAccessRoute } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const JOURNEY_ID = "jornada";

function topicMatches(topic: GuiaTopic, query: string) {
  if (!query) return true;
  const blob = [
    topic.title,
    topic.summary,
    topic.who,
    ...(topic.how ?? []),
    ...(topic.tips ?? []),
    ...topic.actions.flatMap((action) => [action.title, action.detail]),
    ...(topic.formulas ?? []).flatMap((f) => [
      f.title,
      f.expression,
      f.note ?? "",
      f.example ?? "",
    ]),
  ]
    .join(" ")
    .toLocaleLowerCase("pt-BR");
  return blob.includes(query);
}

function FormulaCard({ formula }: { formula: GuiaFormula }) {
  return (
    <div className="rounded-2xl border border-brand-accent/20 bg-gradient-to-br from-brand-accent/8 via-background to-background p-4">
      <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-accent">
        <Calculator className="h-3.5 w-3.5" />
        {formula.title}
      </p>
      <p className="font-mono text-[13px] leading-relaxed text-foreground">
        {formula.expression}
      </p>
      {formula.example ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Ex.: {formula.example}
        </p>
      ) : null}
      {formula.note ? (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {formula.note}
        </p>
      ) : null}
    </div>
  );
}

function JourneyPage() {
  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-border/80">
        <div className="relative h-40 sm:h-48">
          <img
            src="/guia/hero.png"
            alt="Jornada do lead até a venda"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-accent">
              Visão geral
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">
              Do lead à comissão
            </h2>
          </div>
        </div>
      </div>
      <Card>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Há duas operações no seletor do menu. A de lançamentos reúne Leads
            e Funil. A de imóvel usado troca o seletor para Captação ou Venda
            de Usados — ligue esses módulos em Configurações se não
            aparecerem. Dashboard, agenda, imóveis, treinamento e fechamento
            ficam sempre visíveis.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            No índice ao lado, abra a pasta (Operação, Captação e usados,
            Fechamento…) e clique no módulo. A página deste guia troca aqui —
            você não sai do CRM.
          </p>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand-accent">
              Lançamentos — do lead à comissão
            </p>
            <div className="grid gap-2 sm:grid-cols-5">
              {GUIA_JOURNEY.map((item) => (
                <div
                  key={`lead-${item.n}`}
                  className="rounded-xl border border-border/70 bg-background p-3"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-accent/15 text-[11px] font-bold text-brand-accent">
                    {item.n}
                  </span>
                  <p className="mt-2 text-sm font-semibold">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand-accent">
              Usados — do proprietário à pós-venda
            </p>
            <div className="grid gap-2 sm:grid-cols-5">
              {GUIA_JOURNEY_USADOS.map((item) => (
                <div
                  key={`usado-${item.n}`}
                  className="rounded-xl border border-border/70 bg-background p-3"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-accent/15 text-[11px] font-bold text-brand-accent">
                    {item.n}
                  </span>
                  <p className="mt-2 text-sm font-semibold">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TopicPage({
  kicker,
  image,
  topic,
  canOpen,
}: {
  kicker: string;
  image: string;
  topic: GuiaTopic;
  canOpen: boolean;
}) {
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      if (!peekGuiaTourLive()) stopGuiaTour();
    };
  }, [topic.id]);

  function startTutorial() {
    const live = Boolean(topic.href && canOpen);
    startGuiaTour(topic.id, { live });
    if (live && topic.href) {
      void navigate({ to: topic.href as "/dashboard" });
    }
  }

  return (
    <div className="space-y-5">
      <div
        data-guia="guia-topic-header"
        className="overflow-hidden rounded-2xl border border-border/80"
      >
        <div className="relative h-36 sm:h-44">
          <img src={image} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/55 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-accent">
              {kicker}
            </p>
            <h2 className="text-2xl font-semibold tracking-tight">
              {topic.title}
            </h2>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <GuiaTourStartButton onClick={startTutorial} />
        {topic.href && canOpen ? (
          <Button asChild size="sm">
            <Link to={topic.href as "/dashboard"}>
              Abrir módulo
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        ) : null}
        <p className="w-full text-xs text-muted-foreground sm:w-auto sm:ml-1">
          {canOpen
            ? "Abre a tela real e destaca o que clicar."
            : "Passo a passo aqui no guia — este perfil não abre o módulo."}
        </p>
      </div>

      <Card>
        <CardContent className="space-y-3 p-5 sm:p-6">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {topic.summary}
          </p>
          <div className="flex items-start gap-2 rounded-xl border border-border/70 bg-muted/30 px-3 py-2.5 text-sm">
            <Users className="mt-0.5 h-4 w-4 shrink-0 text-brand-accent" />
            <p>
              <span className="font-medium">Quem usa. </span>
              <span className="text-muted-foreground">{topic.who}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <ListChecks className="h-4 w-4 text-brand-accent" />
          O que você pode fazer
        </h3>
        <div className="space-y-2">
          {topic.actions.map((action, index) => (
            <Card key={action.title} data-guia={`guia-action-${index}`}>
              <CardContent className="flex gap-3 p-4 sm:p-5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-accent/15 text-xs font-bold text-brand-accent">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{action.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {action.detail}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {topic.how?.length ? (
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="h-4 w-4 text-brand-accent" />
            Ordem típica
          </h3>
          <Card data-guia="guia-how">
            <CardContent className="space-y-2.5 p-5">
              {topic.how.map((step, index) => (
                <p
                  key={step}
                  className="flex gap-3 text-sm leading-relaxed text-muted-foreground"
                >
                  <span className="font-semibold text-brand-accent">
                    {index + 1}.
                  </span>
                  {step}
                </p>
              ))}
            </CardContent>
          </Card>
        </section>
      ) : null}

      {topic.formulas?.length ? (
        <section className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Calculator className="h-4 w-4 text-brand-accent" />
            Como os números fecham
          </h3>
          <div
            className={cn(
              "grid gap-3",
              topic.formulas.length > 1 ? "sm:grid-cols-2" : "",
            )}
          >
            {topic.formulas.map((formula) => (
              <FormulaCard key={formula.title} formula={formula} />
            ))}
          </div>
        </section>
      ) : null}

      {topic.tips?.length ? (
        <div className="rounded-xl border border-sky-200/80 bg-sky-50/80 px-4 py-3 text-sm dark:border-sky-900/50 dark:bg-sky-950/30">
          <p className="mb-1.5 flex items-center gap-2 font-semibold text-sky-950 dark:text-sky-50">
            <Lightbulb className="h-4 w-4" />
            Vale saber
          </p>
          <ul className="space-y-1.5 text-[13px] leading-relaxed text-sky-950/80 dark:text-sky-50/80">
            {topic.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function GuiaSistemaPage({
  modulo,
  onSelectModulo,
}: {
  modulo?: string;
  onSelectModulo: (id: string) => void;
}) {
  const user = getSession();
  const selectedId = modulo ?? JOURNEY_ID;
  const [query, setQuery] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    operacao: true,
    "imoveis-terceiros": true,
  });

  const filtered = useMemo(() => {
    const byAccess = GUIA_GROUPS.map((group) => ({
      ...group,
      topics: group.topics.filter((topic) => {
        if (group.alwaysShow) return true;
        if (!topic.href || !user) return true;
        return canAccessRoute(
          user.role,
          topic.href,
          user.tenant?.modules ?? null,
          user.tenant?.plano ?? null,
          user.permissions ?? null,
        );
      }),
    })).filter((group) => group.topics.length > 0);

    const q = query.trim().toLocaleLowerCase("pt-BR");
    if (!q) return byAccess;
    return byAccess
      .map((group) => ({
        ...group,
        topics: group.topics.filter((topic) => topicMatches(topic, q)),
      }))
      .filter((group) => group.topics.length > 0);
  }, [query, user]);

  useEffect(() => {
    if (!query.trim()) return;
    setOpenGroups((prev) => {
      const next = { ...prev };
      for (const group of filtered) next[group.id] = true;
      return next;
    });
  }, [query, filtered]);

  const selected = selectedId === JOURNEY_ID ? null : findGuiaTopic(selectedId);
  const selectedVisible =
    !selected ||
    filtered.some((group) =>
      group.topics.some((topic) => topic.id === selected.topic.id),
    );

  function selectModulo(id: string) {
    onSelectModulo(id);
    const match = findGuiaTopic(id);
    if (match) {
      setOpenGroups((prev) => ({ ...prev, [match.group.id]: true }));
    }
  }

  function toggleGroup(id: string) {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function canOpen(href?: string) {
    if (!href || !user) return false;
    return canAccessRoute(
      user.role,
      href,
      user.tenant?.modules ?? null,
      user.tenant?.plano ?? null,
      user.permissions ?? null,
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <Badge className="w-fit bg-brand-accent/15 text-brand-accent hover:bg-brand-accent/15">
            <Compass className="mr-1 h-3.5 w-3.5" />
            Guia do sistema
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight">
            Como usar cada módulo
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Clique no módulo no índice. Em cada um, use Ensinar a usar para um
            tutorial na tela — abre o módulo e mostra o que clicar.
          </p>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar módulo, cálculo, ação…"
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex gap-6 lg:items-start">
        <nav className="sticky top-20 hidden w-64 shrink-0 self-start max-h-[calc(100dvh-6rem)] overflow-y-auto pr-1 lg:block">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Índice
          </p>
          <button
            type="button"
            onClick={() => selectModulo(JOURNEY_ID)}
            className={cn(
              "mb-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors",
              selectedId === JOURNEY_ID
                ? "bg-brand-accent/10 font-medium text-brand-accent"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            Jornada do lead
          </button>
          {filtered.map((group) => {
            const isOpen = !!openGroups[group.id];
            const groupActive = group.topics.some(
              (topic) => topic.id === selectedId,
            );
            return (
              <div key={group.id} className="mb-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors",
                    groupActive
                      ? "text-brand-accent"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="flex-1 truncate">{group.label}</span>
                  {isOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
                  )}
                </button>
                {isOpen ? (
                  <ul className="mb-2 space-y-0.5 border-l border-border pl-3">
                    {group.topics.map((topic) => (
                      <li key={topic.id}>
                        <button
                          type="button"
                          onClick={() => selectModulo(topic.id)}
                          className={cn(
                            "block w-full rounded-md px-2 py-1.5 text-left text-[13px] transition-colors",
                            selectedId === topic.id
                              ? "bg-brand-accent/10 font-medium text-brand-accent"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {topic.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="-mx-1 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            <button
              type="button"
              onClick={() => selectModulo(JOURNEY_ID)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-xs",
                selectedId === JOURNEY_ID
                  ? "border-brand-accent/40 bg-brand-accent/10 text-brand-accent"
                  : "border-border text-muted-foreground",
              )}
            >
              Jornada
            </button>
            {filtered.flatMap((group) =>
              group.topics.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => selectModulo(topic.id)}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1 text-xs",
                    selectedId === topic.id
                      ? "border-brand-accent/40 bg-brand-accent/10 text-brand-accent"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {topic.title}
                </button>
              )),
            )}
          </div>

          {filtered.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">Nada encontrado</p>
                <p className="text-xs text-muted-foreground">
                  Tente outro termo — módulo, ação ou cálculo.
                </p>
              </CardContent>
            </Card>
          ) : !selectedVisible || selectedId === JOURNEY_ID ? (
            <JourneyPage />
          ) : selected ? (
            <TopicPage
              kicker={selected.group.label}
              image={selected.group.image}
              topic={selected.topic}
              canOpen={canOpen(selected.topic.href)}
            />
          ) : (
            <JourneyPage />
          )}
        </div>
      </div>
    </div>
  );
}
