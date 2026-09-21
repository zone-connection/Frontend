import { useEffect, useState } from "react";
import {
  Bath,
  BedDouble,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  MapPin,
  Ruler,
  X,
} from "lucide-react";
import { brl } from "@/lib/crm-types";
import { tipologiasVisiveis } from "@/lib/empreendimento-tipologias";
import type { EmpreendimentoPublico } from "@/lib/empreendimentos-api";
import { env, getWhatsAppUrl } from "@/lib/env";
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

function formatPhone(value: string | null | undefined) {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("55")) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 12 && digits.startsWith("55")) {
    return `+55 (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return value?.trim() || "";
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
  const tipologias = tipologiasVisiveis({
    areaM2: item.areaM2,
    quartos: item.quartos,
    banheiros: item.banheiros,
    vagas: item.vagas,
    valorReferencia: item.valorReferencia,
    vitrine,
  });
  const plantas = [
    ...new Set(
      [
        ...(vitrine?.plantas ?? []),
        ...tipologias
          .map((row) => row.plantaUrl)
          .filter((url): url is string => Boolean(url)),
      ],
    ),
  ];

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
  const diferenciais = vitrine?.detalhesUnidade?.length
    ? vitrine.detalhesUnidade
    : (vitrine?.diferenciais ?? []);
  const lazer = vitrine?.lazer ?? [];
  const infra = vitrine?.infraestrutura ?? [];
  const local = item.localidade || item.cidade;
  const mapaQuery =
    vitrine?.latitude != null && vitrine?.longitude != null
      ? `${vitrine.latitude},${vitrine.longitude}`
      : [
          item.endereco,
          vitrine?.numero,
          vitrine?.bairro,
          local,
          item.cidade,
          vitrine?.estado,
          vitrine?.cep,
        ]
          .filter(Boolean)
          .join(", ");
  const mapaHref = mapaQuery
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapaQuery)}`
    : null;
  const hasAddress =
    Boolean(item.endereco) ||
    Boolean(vitrine?.numero) ||
    Boolean(vitrine?.bairro) ||
    Boolean(item.cidade) ||
    Boolean(vitrine?.estado) ||
    Boolean(vitrine?.cep);
  const metragem =
    item.areaM2 != null &&
    vitrine?.areaMax != null &&
    vitrine.areaMax !== item.areaM2
      ? `${item.areaM2} a ${vitrine.areaMax} m²`
      : item.areaM2 != null
        ? `${item.areaM2} m²`
        : null;

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-white text-zinc-900">
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            {item.logoUrl ? (
              <img
                src={item.logoUrl}
                alt={`Logo ${item.imobiliaria}`}
                className="h-11 w-11 shrink-0 rounded-full object-cover ring-1 ring-zinc-200"
              />
            ) : (
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: accent }}
              >
                {item.imobiliaria.slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">{item.imobiliaria}</p>
              {item.construtora ? (
                <p className="truncate text-sm text-zinc-600">{item.construtora}</p>
              ) : null}
            </div>
          </div>
          {wa ? (
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-semibold text-white"
              style={{ backgroundColor: accent }}
            >
              WhatsApp
            </a>
          ) : null}
        </div>
      </header>

      <section className="relative h-[46vh] min-h-[240px] w-full overflow-hidden bg-zinc-950 sm:h-[62vh] sm:min-h-[340px]">
        {photos[0] ? (
          <img
            src={photos[0]}
            alt=""
            className="h-full w-full max-w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-zinc-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/25" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-4 pb-7 text-center text-white sm:px-8 sm:pb-10">
          <h1 className="break-words text-3xl font-semibold tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)] sm:text-5xl">
            {item.nome}
          </h1>
          {item.tipo ? (
            <span className="mt-3 inline-flex rounded-full bg-black/45 px-4 py-1.5 text-sm font-medium text-white backdrop-blur">
              {item.tipo}
            </span>
          ) : null}
        </div>
      </section>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 pb-24 sm:px-8 sm:py-10 sm:pb-10">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
          {item.valorReferencia != null ? (
            <div>
              <p className="text-sm font-medium text-zinc-600">A partir de</p>
              <p
                className="text-3xl font-semibold tracking-tight sm:text-4xl"
                style={{ color: accent }}
              >
                {brl(item.valorReferencia)}
              </p>
            </div>
          ) : (
            <p className="text-lg font-semibold text-zinc-800">Consulte valores</p>
          )}
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            {vitrine?.bookUrl ? (
              <a
                href={vitrine.bookUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center rounded-full border border-zinc-300 px-4 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
              >
                <FileText className="mr-1.5 h-4 w-4" />
                Book
              </a>
            ) : null}
            {vitrine?.tabelaValoresUrl ? (
              <a
                href={vitrine.tabelaValoresUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center rounded-full border border-zinc-300 px-4 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
              >
                <FileText className="mr-1.5 h-4 w-4" />
                Tabela de valores
              </a>
            ) : null}
            {mapaHref ? (
              <a
                href={mapaHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center rounded-full border border-zinc-300 px-4 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
              >
                <MapPin className="mr-1.5 h-4 w-4" />
                Abrir no mapa
              </a>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center text-center sm:items-stretch sm:text-left">
          {(item.status || formatPrevisao(item.previsaoEntrega)) && (
            <div className="mb-4 flex w-full max-w-sm flex-col items-center gap-2 sm:max-w-none sm:flex-row sm:justify-start">
              {item.status ? (
                <div className="w-full rounded-2xl bg-zinc-50 px-4 py-3 sm:w-auto">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                    Status
                  </p>
                  <p className="mt-1 text-base font-medium">{item.status}</p>
                </div>
              ) : null}
              {formatPrevisao(item.previsaoEntrega) ? (
                <div className="w-full rounded-2xl bg-zinc-50 px-4 py-3 sm:w-auto">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                    Previsão de entrega
                  </p>
                  <p className="mt-1 text-base font-medium">
                    {formatPrevisao(item.previsaoEntrega)}
                  </p>
                </div>
              ) : null}
            </div>
          )}
          <div className="flex w-full flex-wrap justify-center gap-x-6 gap-y-3 text-zinc-800 sm:justify-start">
            {item.quartos != null ? (
              <span className="flex items-center gap-2 text-base">
                <BedDouble className="h-5 w-5" /> {item.quartos} quartos
              </span>
            ) : null}
            {item.banheiros != null ? (
              <span className="flex items-center gap-2 text-base">
                <Bath className="h-5 w-5" /> {item.banheiros} banheiros
              </span>
            ) : null}
            {item.vagas != null ? (
              <span className="flex items-center gap-2 text-base">
                <Car className="h-5 w-5" /> {item.vagas} vagas
              </span>
            ) : null}
            {metragem ? (
              <span className="flex items-center gap-2 text-base">
                <Ruler className="h-5 w-5" /> {metragem}
              </span>
            ) : null}
            {vitrine?.suites != null ? (
              <span className="flex items-center gap-2 text-base">
                {vitrine.suites} suíte(s)
              </span>
            ) : null}
          </div>
        </div>

        <section className="mt-10">
          <h2 className="mb-3 text-xl font-semibold">Fotos</h2>
          <div className="w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
            <div className="relative flex min-h-[220px] items-center justify-center bg-zinc-100 sm:min-h-[320px]">
              {current ? (
                <button
                  type="button"
                  className="flex h-full w-full items-center justify-center p-3"
                  onClick={() => setLightbox(true)}
                  aria-label="Ampliar foto"
                >
                  <img
                    src={current}
                    alt={`Foto ${index + 1} de ${item.nome}`}
                    className="max-h-[28rem] w-auto max-w-full object-contain"
                  />
                </button>
              ) : (
                <p className="p-8 text-base text-zinc-600">Sem fotos cadastradas</p>
              )}
              {photos.length > 1 ? (
                <>
                  <button
                    type="button"
                    className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow"
                    onClick={prev}
                    aria-label="Foto anterior"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow"
                    onClick={next}
                    aria-label="Próxima foto"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              ) : null}
            </div>
            {photos.length > 1 ? (
              <div className="flex max-w-full gap-2 overflow-x-auto p-3">
                {photos.map((src, i) => (
                  <button
                    key={`${src}-${i}`}
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`Ver foto ${i + 1}`}
                    className={cn(
                      "h-16 w-24 shrink-0 overflow-hidden rounded-lg ring-2 ring-offset-2",
                      i === index ? "ring-zinc-900" : "ring-transparent",
                    )}
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        {vitrine?.headline || descricao ? (
          <section className="mt-10">
            <h2 className="text-xl font-semibold">Sobre o empreendimento</h2>
            {vitrine?.headline ? (
              <p className="mt-2 text-base font-medium text-zinc-800">{vitrine.headline}</p>
            ) : null}
            {descricao ? (
              <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-zinc-700">
                {descricao}
              </p>
            ) : null}
          </section>
        ) : null}

        {tipologias.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-xl font-semibold">Tipos de unidade</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {tipologias.map((row, i) => (
                <article
                  key={`${row.nome}-${i}`}
                  className="rounded-2xl border border-zinc-200 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-lg font-semibold">{row.nome || "Unidade"}</p>
                    {row.valor != null ? (
                      <p className="text-base font-semibold" style={{ color: accent }}>
                        {brl(row.valor)}
                      </p>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-zinc-700">
                    {[
                      row.areaM2 != null ? `${row.areaM2} m²` : null,
                      row.valorM2 != null ? `${brl(row.valorM2)}/m²` : null,
                      row.quartos != null ? `${row.quartos} quartos` : null,
                      row.suites != null ? `${row.suites} suítes` : null,
                      row.vagas != null ? `${row.vagas} vagas` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {row.plantaUrl ? (
                    <img
                      src={row.plantaUrl}
                      alt={`Planta ${row.nome || ""}`}
                      className="mt-3 h-40 w-full rounded-xl bg-zinc-50 object-contain"
                    />
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {plantas.length > 0 && !tipologias.some((row) => row.plantaUrl) ? (
          <section className="mt-10">
            <h2 className="text-xl font-semibold">Plantas</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {plantas.map((src) => (
                <img
                  key={src}
                  src={src}
                  alt="Planta do empreendimento"
                  className="h-44 w-full rounded-2xl border border-zinc-200 bg-zinc-50 object-contain p-2"
                />
              ))}
            </div>
          </section>
        ) : null}

        {diferenciais.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-xl font-semibold">Diferenciais</h2>
            <ul className="mt-3 space-y-2 text-base text-zinc-700">
              {diferenciais.map((line) => (
                <li key={line} className="flex gap-2">
                  <Check className="mt-0.5 h-5 w-5 shrink-0" style={{ color: accent }} />
                  {line}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {lazer.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-xl font-semibold">Lazer</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {lazer.map((line) => (
                <li key={line} className="flex items-center gap-2 text-base text-zinc-700">
                  <Check className="h-5 w-5 shrink-0" style={{ color: accent }} />
                  {line}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {infra.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-xl font-semibold">Infraestrutura</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {infra.map((line) => (
                <li key={line} className="flex items-center gap-2 text-base text-zinc-700">
                  <Check className="h-5 w-5 shrink-0" style={{ color: accent }} />
                  {line}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {hasAddress ? (
          <section className="mt-12 border-t border-zinc-200 pt-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Endereço</h2>
              {mapaHref ? (
                <a
                  href={mapaHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center rounded-full border border-zinc-300 px-4 text-sm font-semibold text-zinc-800"
                >
                  <MapPin className="mr-1.5 h-4 w-4" />
                  Abrir no mapa
                </a>
              ) : null}
            </div>
            <p className="mt-3 text-base leading-relaxed text-zinc-800">
              {[
                item.endereco,
                vitrine?.numero,
                vitrine?.bairro,
                item.cidade || item.localidade,
                vitrine?.estado,
                vitrine?.cep ? formatCep(vitrine.cep) : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </section>
        ) : null}

        {wa ? (
          <section className="mt-14 rounded-3xl px-6 py-10 text-center text-white" style={{ backgroundColor: accent }}>
            <h2 className="text-2xl font-semibold tracking-tight">
              Gostou? Fale com a imobiliária
            </h2>
            <p className="mx-auto mt-2 max-w-md text-base text-white/90">
              Tire dúvidas de valores, plantas e visita pelo WhatsApp.
            </p>
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex min-h-12 items-center rounded-full bg-white px-8 text-base font-semibold text-zinc-900"
            >
              Conversar no WhatsApp
            </a>
          </section>
        ) : null}
      </main>

      {wa ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 p-3 backdrop-blur sm:hidden">
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-12 items-center justify-center rounded-full text-base font-semibold text-white"
            style={{ backgroundColor: accent }}
          >
            Falar no WhatsApp
          </a>
        </div>
      ) : null}

      <footer className="bg-zinc-900 px-4 py-12 text-zinc-300 sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Imobiliária
            </p>
            <p className="mt-2 text-base font-semibold text-white">{item.imobiliaria}</p>
            {item.creci ? (
              <p className="mt-1 text-sm">CRECI {item.creci}</p>
            ) : null}
            {item.imobiliariaEndereco ? (
              <p className="mt-3 text-sm leading-relaxed">{item.imobiliariaEndereco}</p>
            ) : null}
            {item.imobiliariaCidade ? (
              <p className="mt-1 text-sm">{item.imobiliariaCidade}</p>
            ) : null}
            {item.telefone ? (
              <a
                href={wa ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block text-base text-white underline"
              >
                {formatPhone(item.telefone)}
              </a>
            ) : null}
            {item.email ? (
              <a
                href={`mailto:${item.email}`}
                className="mt-1 block text-base text-white underline"
              >
                {item.email}
              </a>
            ) : null}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Imóvel
            </p>
            <p className="mt-2 text-base font-semibold text-white">{item.nome}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Tecnologia
            </p>
            <p className="mt-2 text-base font-semibold text-white">{env.appName}</p>
            <a
              href="https://www.zoneconnection.com.br"
              target="_blank"
              rel="noreferrer"
              className="mt-3 block text-sm text-white underline"
            >
              www.zoneconnection.com.br
            </a>
          </div>
        </div>
      </footer>

      {lightbox && current ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 p-4">
          <button
            type="button"
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white"
            onClick={() => setLightbox(false)}
            aria-label="Fechar foto"
          >
            <X className="h-6 w-6" />
          </button>
          {photos.length > 1 ? (
            <>
              <button
                type="button"
                className="absolute left-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white"
                onClick={prev}
                aria-label="Foto anterior"
              >
                <ChevronLeft className="h-7 w-7" />
              </button>
              <button
                type="button"
                className="absolute right-16 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white"
                onClick={next}
                aria-label="Próxima foto"
              >
                <ChevronRight className="h-7 w-7" />
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
