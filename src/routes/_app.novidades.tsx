import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ListTodo } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { NovoBadge } from "@/components/novo-badge";
import { Button } from "@/components/ui/button";
import { formatNovidadeDate, NOVIDADES } from "@/lib/novidades";

export const Route = createFileRoute("/_app/novidades")({
  head: () => ({ meta: [{ title: "Novidades — Zone Connection" }] }),
  component: NovidadesPage,
});

function NovidadesPage() {
  const item = NOVIDADES[0];

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <PageHeader
        title="Novidades"
        description="O que está acontecendo no sistema agora."
      />

      {item ? (
        <article className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="border-b bg-muted/40 px-5 py-4 sm:px-8">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              <ListTodo className="h-3.5 w-3.5" />
              {item.kicker}
              <span className="text-muted-foreground/70">·</span>
              <span className="font-medium normal-case tracking-normal text-muted-foreground">
                {formatNovidadeDate(item.publishedAt)}
              </span>
            </div>
            <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight">
              {item.title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {item.summary}
            </p>
          </div>

          <div className="space-y-5 px-5 py-6 sm:px-8">
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950">
              {item.status}. O módulo ainda está em desenvolvimento, então nada
              é desligado agora.
            </p>

            <div>
              <h3 className="text-sm font-semibold">O que muda</h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
                {item.agora.map((linha) => (
                  <li key={linha}>{linha}</li>
                ))}
              </ul>
            </div>

            <p className="text-sm leading-relaxed text-muted-foreground">
              {item.where} O selo <NovoBadge className="align-middle" /> fica
              só em Tarefas.
            </p>

            <Button asChild>
              <Link to="/tarefas">
                {item.hrefLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </article>
      ) : (
        <p className="text-sm text-muted-foreground">Nada em andamento no momento.</p>
      )}
    </div>
  );
}
