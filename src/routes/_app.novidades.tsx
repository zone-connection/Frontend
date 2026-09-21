import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Newspaper, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { NovoBadge } from "@/components/novo-badge";
import { Button } from "@/components/ui/button";
import {
  formatNovidadeDate,
  formatNovidadePlanos,
  NOVIDADES,
} from "@/lib/novidades";

export const Route = createFileRoute("/_app/novidades")({
  head: () => ({ meta: [{ title: "Novidades — Zone Connection" }] }),
  component: NovidadesPage,
});

function NovidadesPage() {
  const edition = formatNovidadeDate(NOVIDADES[0]?.publishedAt ?? "2026-09-20");

  return (
    <div className="mx-auto max-w-4xl pb-10">
      <PageHeader
        title="Novidades"
        description="O jornal das funcionalidades recém-lançadas: onde achar, como ligar e como usar."
      />

      <div className="mb-8 overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_28px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/40 px-5 py-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <Newspaper className="h-4 w-4 text-primary" />
            Edição do CRM
          </div>
          <p className="text-xs text-muted-foreground">{edition}</p>
        </div>
        <div className="px-5 py-6 sm:px-8">
          <p className="font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            O que chegou agora
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Cada matéria abaixo é uma funcionalidade nova e indica em quais
            planos ela entra. O selo{" "}
            <NovoBadge className="align-middle" /> no menu aponta o mesmo lugar.
            Quando lançarmos outra, ela entra neste jornal automaticamente.
          </p>
        </div>
      </div>

      <ol className="space-y-6">
        {NOVIDADES.map((item, index) => (
          <li
            key={item.id}
            id={item.id}
            className="rounded-2xl border bg-card p-5 shadow-sm sm:p-7"
          >
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              {item.kicker}
              <span className="text-muted-foreground/70">·</span>
              <span className="font-medium normal-case tracking-normal text-muted-foreground">
                {formatNovidadeDate(item.publishedAt)}
              </span>
              <NovoBadge />
            </div>
            <h2 className="mt-2 font-serif text-2xl font-semibold tracking-tight">
              {index + 1}. {item.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {item.summary}
            </p>

            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-primary/15 bg-primary/5 p-4 sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Planos
                </dt>
                <dd className="mt-1 text-sm leading-relaxed">
                  {formatNovidadePlanos(item)}
                </dd>
              </div>
              <div className="rounded-xl bg-muted/40 p-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Onde achar
                </dt>
                <dd className="mt-1 text-sm leading-relaxed">{item.where}</dd>
              </div>
              <div className="rounded-xl bg-muted/40 p-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Quem usa
                </dt>
                <dd className="mt-1 text-sm leading-relaxed">{item.who}</dd>
              </div>
            </dl>

            <section className="mt-5">
              <h3 className="text-sm font-semibold">Como ativar</h3>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
                {item.activate.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </section>

            <section className="mt-4">
              <h3 className="text-sm font-semibold">Como usar</h3>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
                {item.how.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </section>

            <Button asChild className="mt-5">
              <a href={item.href}>
                {item.hrefLabel}
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </li>
        ))}
      </ol>
    </div>
  );
}
