import { useEffect, useState } from "react";
import {
  Bath,
  BedDouble,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  Ruler,
  X,
} from "lucide-react";
import { brl } from "@/lib/crm-types";
import type { EmpreendimentoPublico } from "@/lib/empreendimentos-api";
import { getWhatsAppUrl } from "@/lib/env";
import { cn } from "@/lib/utils";

function formatPrevisao(iso: string | null | undefined) {
  if (!iso) return null;
  const [year, month, day] = iso.slice(0, 10).split("-");
  if (!year || !month) return iso;
  if (day) return `${day}/${month}/${year}`;
  return `${month}/${year}`;
}

function formatCep(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 8) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return value;
}

export function PublicoEmpreendimentoView({
  item,
}: {
  item: EmpreendimentoPublico;
}) {
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const photos = item.imagens ?? [];
  const current = photos[index] ?? null;
  const vitrine = item.vitrine;
  const accent = item.cor || "#1d4ed8";

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

  const wa = item.telefone
    ? getWhatsAppUrl(
        `Olá, vi o empreendimento ${item.nome} e gostaria de mais informações.`,
        item.telefone.replace(/\D/g, ""),
      )
    : null;

  const descricao = vitrine?.descricao?.trim() || "";
  const diferenciais = vitrine?.diferenciais ?? [];
  const lazer = vitrine?.lazer ?? [];
  const hasAddress =
    Boolean(item.endereco) ||
    Boolean(vitrine?.numero) ||
    Boolean(vitrine?.bairro) ||
    Boolean(item.cidade) ||
    Boolean(vitrine?.estado) ||
    Boolean(vitrine?.cep);

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <header className="sticky top-0 z-30 border-b border-zinc-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            {item.logoUrl ? (
              <img
                src={item.logoUrl}
                alt={item.imobiliaria}
                className="h-10 w-10 rounded-full object-cover ring-1 ring-zinc-200"
              />
            ) : (
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: accent }}
              >
                {item.imobiliaria.slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{item.imobiliaria}</p>
              {item.construtora ? (
                <p className="truncate text-xs text-zinc-500">{item.construtora}</p>
              ) : null}
            </div>
          </div>
          {wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white"
              style={{ backgroundColor: accent }}
            >
              Corretor(a)
            </a>
          ) : null}
        </div>
      </header>

      <section className="relative h-[52vh] min-h-[320px] overflow-hidden bg-zinc-900 sm:h-[62vh]">
        {current ? (
          <img
            src={photos[0] ?? current}
            alt={item.nome}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-zinc-800" />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/25 to-black/20" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-4 pb-10 text-center text-white sm:px-8">
          <h1 className="text-3xl font-semibold tracking-[0.18em] sm:text-5xl">
            {item.nome}
          </h1>
          {item.tipo ? (
            <span className="mt-4 inline-flex rounded-full bg-white/15 px-4 py-1 text-xs font-medium uppercase tracking-widest backdrop-blur">
              {item.tipo}
            </span>
          ) : null}
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <section>
            <p className="mb-3 text-sm font-medium text-zinc-500">Fotos</p>
            <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-50 shadow-sm">
              <div className="relative aspect-16/10">
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
                  <div className="flex h-full items-center justify-center text-sm text-zinc-400">
                    Sem fotos cadastradas
                  </div>
                )}
                {photos.length > 1 ? (
                  <>
                    <button
                      type="button"
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow"
                      onClick={prev}
                      aria-label="Foto anterior"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow"
                      onClick={next}
                      aria-label="Próxima foto"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
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
                        i === index && "ring-zinc-900",
                      )}
                    >
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </section>

          <section className="space-y-6">
            <div className="grid grid-cols-3 gap-3 text-center">
              {item.status ? (
                <div className="rounded-xl bg-zinc-50 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                    Status
                  </p>
                  <p className="mt-1 text-sm font-medium">{item.status}</p>
                </div>
              ) : null}
              {formatPrevisao(item.previsaoEntrega) ? (
                <div className="rounded-xl bg-zinc-50 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                    Previsão entrega
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {formatPrevisao(item.previsaoEntrega)}
                  </p>
                </div>
              ) : null}
              {item.valorReferencia != null ? (
                <div className="rounded-xl bg-zinc-50 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                    Valor
                  </p>
                  <p className="mt-1 text-sm font-semibold" style={{ color: accent }}>
                    {brl(item.valorReferencia)}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-zinc-600">
              {item.quartos != null ? (
                <span className="flex items-center gap-2 text-sm">
                  <BedDouble className="h-4 w-4" /> {item.quartos} Quartos
                </span>
              ) : null}
              {item.banheiros != null ? (
                <span className="flex items-center gap-2 text-sm">
                  <Bath className="h-4 w-4" /> {item.banheiros} Banheiros
                </span>
              ) : null}
              {item.vagas != null ? (
                <span className="flex items-center gap-2 text-sm">
                  <Car className="h-4 w-4" /> {item.vagas} Garagens
                </span>
              ) : null}
              {item.areaM2 != null ? (
                <span className="flex items-center gap-2 text-sm">
                  <Ruler className="h-4 w-4" /> {item.areaM2} m²
                </span>
              ) : null}
            </div>

            {vitrine?.headline || descricao ? (
              <div>
                <h2 className="text-lg font-semibold">Descrição</h2>
                {vitrine?.headline ? (
                  <p className="mt-2 text-sm font-medium uppercase tracking-wide text-zinc-700">
                    {vitrine.headline}
                  </p>
                ) : null}
                {descricao ? (
                  <div className="mt-3 space-y-3 whitespace-pre-line text-sm leading-relaxed text-zinc-600">
                    {descricao}
                  </div>
                ) : null}
              </div>
            ) : null}

            {diferenciais.length > 0 ? (
              <div>
                <h2 className="text-lg font-semibold">Diferenciais</h2>
                <ul className="mt-3 space-y-1.5 text-sm text-zinc-600">
                  {diferenciais.map((line) => (
                    <li key={line}>• {line}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {lazer.length > 0 ? (
              <div>
                <h2 className="text-lg font-semibold">Área de lazer</h2>
                <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                  {lazer.map((line) => (
                    <li
                      key={line}
                      className="flex items-center gap-2 text-sm text-zinc-600"
                    >
                      <Check className="h-4 w-4 shrink-0" style={{ color: accent }} />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        </div>

        {hasAddress ? (
          <section className="mt-12 border-t border-zinc-100 pt-8">
            <h2 className="text-lg font-semibold">Endereço</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {item.endereco ? (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-zinc-400">
                    Endereço
                  </dt>
                  <dd className="mt-1 text-sm">{item.endereco}</dd>
                </div>
              ) : null}
              {vitrine?.numero ? (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-zinc-400">
                    Número
                  </dt>
                  <dd className="mt-1 text-sm">{vitrine.numero}</dd>
                </div>
              ) : null}
              {vitrine?.bairro ? (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-zinc-400">
                    Bairro
                  </dt>
                  <dd className="mt-1 text-sm">{vitrine.bairro}</dd>
                </div>
              ) : null}
              {item.cidade || item.localidade ? (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-zinc-400">
                    Cidade
                  </dt>
                  <dd className="mt-1 text-sm">
                    {item.cidade || item.localidade}
                  </dd>
                </div>
              ) : null}
              {vitrine?.estado ? (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-zinc-400">
                    Estado
                  </dt>
                  <dd className="mt-1 text-sm">{vitrine.estado}</dd>
                </div>
              ) : null}
              {vitrine?.cep ? (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-zinc-400">
                    CEP
                  </dt>
                  <dd className="mt-1 text-sm">{formatCep(vitrine.cep)}</dd>
                </div>
              ) : null}
            </dl>
          </section>
        ) : null}

        {wa ? (
          <section className="mt-14 border-t border-zinc-100 py-12 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              Se interessou? Vamos conversar!
            </h2>
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex h-11 items-center rounded-full px-8 text-sm font-semibold text-white"
              style={{ backgroundColor: accent }}
            >
              Falar no WhatsApp
            </a>
          </section>
        ) : null}
      </main>

      <footer className="bg-zinc-900 py-10 text-center text-zinc-400">
        <p className="text-xs uppercase tracking-[0.2em]">Imobiliária</p>
        <p className="mt-1 text-sm text-white">{item.imobiliaria}</p>
        {item.valorReferencia != null ? (
          <p className="mt-4 text-sm">Valor: {brl(item.valorReferencia)}</p>
        ) : null}
      </footer>

      {lightbox && current ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white"
            onClick={() => setLightbox(false)}
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
          {photos.length > 1 ? (
            <>
              <button
                type="button"
                className="absolute left-4 rounded-full bg-white/10 p-2 text-white"
                onClick={prev}
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                className="absolute right-16 rounded-full bg-white/10 p-2 text-white"
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
