import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  X,
} from "lucide-react";
import { ApiError } from "@/lib/api";
import { brl } from "@/lib/crm-types";
import {
  fetchEmpreendimentoPublico,
  type EmpreendimentoPublico,
} from "@/lib/empreendimentos-api";
import { getWhatsAppUrl } from "@/lib/env";
import { absoluteUrl } from "@/marketing/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/publico/empreendimento/$id")({
  ssr: false,
  head: ({ params }) => ({
    meta: [
      { title: "Empreendimento — Zone Connection" },
      {
        name: "description",
        content: "Galeria do empreendimento compartilhado pela imobiliária.",
      },
      {
        property: "og:url",
        content: absoluteUrl(`/publico/empreendimento/${params.id}`),
      },
    ],
  }),
  component: PublicoEmpreendimentoPage,
});

function formatPrevisao(iso: string | null | undefined) {
  if (!iso) return null;
  const [year, month] = iso.slice(0, 7).split("-");
  if (!year || !month) return iso;
  return `${month}/${year}`;
}

function PublicoEmpreendimentoPage() {
  const { id } = Route.useParams();
  const [item, setItem] = useState<EmpreendimentoPublico | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    void fetchEmpreendimentoPublico(id)
      .then((next) => {
        setItem(next);
        setIndex(0);
      })
      .catch((err) => {
        setItem(null);
        setError(
          err instanceof ApiError
            ? err.message
            : "Não foi possível abrir este empreendimento.",
        );
      })
      .finally(() => setLoading(false));
  }, [id]);

  const photos = item?.imagens ?? [];
  const current = photos[index] ?? null;

  function prev() {
    if (photos.length === 0) return;
    setIndex((i) => (i - 1 + photos.length) % photos.length);
  }

  function next() {
    if (photos.length === 0) return;
    setIndex((i) => (i + 1) % photos.length);
  }

  useEffect(() => {
    if (!lightbox) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, photos.length]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-center text-white">
        <p className="text-sm text-zinc-400">{error}</p>
      </div>
    );
  }

  const local =
    [item.localidade, item.cidade].filter(Boolean).join(" · ") || item.endereco;
  const accent = item.cor || "#d4a017";
  const wa = item.telefone
    ? getWhatsAppUrl(
        `Olá, vi o empreendimento ${item.nome} e gostaria de mais informações.`,
        item.telefone.replace(/\D/g, ""),
      )
    : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-white/10 px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          {item.logoUrl ? (
            <img
              src={item.logoUrl}
              alt={item.imobiliaria}
              className="h-10 w-10 rounded-full object-cover ring-1 ring-white/20"
            />
          ) : (
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold"
              style={{ backgroundColor: accent }}
            >
              {item.imobiliaria.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{item.imobiliaria}</p>
            <p className="text-xs text-zinc-400">Empreendimento</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        <p className="text-xs uppercase tracking-[0.2em] text-amber-400/90">
          {item.construtora || "Catálogo"}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          {item.nome}
        </h1>
        {local ? (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-zinc-400">
            <MapPin className="h-4 w-4 shrink-0" />
            {local}
          </p>
        ) : null}

        <section className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 shadow-2xl shadow-black/40">
          <div className="relative aspect-16/10 bg-zinc-800">
            {current ? (
              <button
                type="button"
                className="h-full w-full"
                onClick={() => setLightbox(true)}
              >
                <img
                  src={current}
                  alt={`${item.nome} ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              </button>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                Sem fotos cadastradas
              </div>
            )}
            {photos.length > 1 ? (
              <>
                <button
                  type="button"
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 backdrop-blur hover:bg-black/70"
                  onClick={prev}
                  aria-label="Foto anterior"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 backdrop-blur hover:bg-black/70"
                  onClick={next}
                  aria-label="Próxima foto"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <p className="absolute bottom-3 right-3 rounded-full bg-black/55 px-3 py-1 text-xs">
                  {index + 1} / {photos.length}
                </p>
              </>
            ) : null}
          </div>
          {photos.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto p-3">
              {photos.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={cn(
                    "h-16 w-24 shrink-0 overflow-hidden rounded-lg ring-2 ring-transparent",
                    i === index && "ring-amber-400",
                  )}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            item.valorReferencia != null
              ? ["A partir de", brl(item.valorReferencia)]
              : null,
            item.areaM2 != null ? ["Metragem", `${item.areaM2} m²`] : null,
            item.quartos != null ? ["Quartos", String(item.quartos)] : null,
            item.vagas != null ? ["Vagas", String(item.vagas)] : null,
            formatPrevisao(item.previsaoEntrega)
              ? ["Entrega", formatPrevisao(item.previsaoEntrega)!]
              : null,
            item.endereco ? ["Endereço", item.endereco] : null,
          ]
            .filter((row): row is [string, string] => Boolean(row))
            .map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <dt className="text-[11px] uppercase tracking-wide text-zinc-500">
                  {label}
                </dt>
                <dd className="mt-1 text-sm font-medium">{value}</dd>
              </div>
            ))}
        </dl>

        {wa ? (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-flex h-11 items-center rounded-full px-6 text-sm font-semibold text-zinc-950"
            style={{ backgroundColor: accent }}
          >
            Falar no WhatsApp
          </a>
        ) : null}
      </main>

      {lightbox && current ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2"
            onClick={() => setLightbox(false)}
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
          {photos.length > 1 ? (
            <>
              <button
                type="button"
                className="absolute left-4 rounded-full bg-white/10 p-2"
                onClick={prev}
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                className="absolute right-16 rounded-full bg-white/10 p-2"
                onClick={next}
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          ) : null}
          <img
            src={current}
            alt={item.nome}
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
          />
        </div>
      ) : null}
    </div>
  );
}
