import { Link } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { brl } from "@/lib/crm-types";
import {
  empreendimentoImagens,
  empreendimentoLocalidadeNome,
  empreendimentoShareText,
  empreendimentoShareUrl,
  empreendimentoStatusLabel,
  empreendimentoTipoLabel,
  type Empreendimento,
} from "@/lib/empreendimentos-api";
import { tipologiasVisiveis } from "@/lib/empreendimento-tipologias";
import { fetchOruloOAuthUrl, type OruloComercial } from "@/lib/orulo-api";
import { getSession } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Bath,
  BedDouble,
  Building2,
  Car,
  Check,
  FileText,
  Globe,
  Layers,
  MapPin,
  Ruler,
  Share2,
  Sparkles,
  View,
} from "lucide-react";
import { toast } from "sonner";

const TEMAS = [
  { id: "sistema", cor: "#079ed4" },
  { id: "azul", cor: "#2563eb" },
  { id: "verde", cor: "#10b981" },
  { id: "violeta", cor: "#8b5cf6" },
  { id: "laranja", cor: "#f59e0b" },
  { id: "rosa", cor: "#ec4899" },
] as const;

type TemaId = (typeof TEMAS)[number]["id"];
type ModoFicha = "completa" | "atuais";

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return {
    r: Number.parseInt(h.slice(0, 2), 16),
    g: Number.parseInt(h.slice(2, 4), 16),
    b: Number.parseInt(h.slice(4, 6), 16),
  };
}

function kpiTone(accent: string, destaque: boolean, shade: number) {
  const mixWhite = destaque ? [0, 0.06, 0.14][shade % 3] : 0.88;
  const a = hexToRgb(accent);
  const r = Math.round(a.r + (255 - a.r) * mixWhite);
  const g = Math.round(a.g + (255 - a.g) * mixWhite);
  const b = Math.round(a.b + (255 - a.b) * mixWhite);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return {
    background: `rgb(${r}, ${g}, ${b})`,
    color: lum > 0.62 ? "#0f172a" : "#ffffff",
  };
}

function formatPrevisao(iso: string | null | undefined) {
  if (!iso) return null;
  if (iso.length >= 10) {
    const [year, month, day] = iso.slice(0, 10).split("-");
    if (year && month && day) return `${day}/${month}/${year}`;
  }
  const [year, month] = iso.slice(0, 7).split("-");
  if (!year || !month) return iso;
  return `${month}/${year}`;
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return null;
  const [year, month, day] = iso.slice(0, 10).split("-");
  if (!year || !month) return iso;
  return day ? `${day}/${month}/${year}` : `${month}/${year}`;
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return formatDate(iso);
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function prazoInfo(lancamento?: string | null, entrega?: string | null) {
  if (!entrega) return null;
  const end = Date.parse(entrega);
  if (!Number.isFinite(end)) return null;
  const start = lancamento ? Date.parse(lancamento) : end - 1000 * 60 * 60 * 24 * 365;
  const now = Date.now();
  const span = Math.max(1, end - start);
  const pct = Math.min(100, Math.max(0, Math.round(((now - start) / span) * 100)));
  const days = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return { pct, days, entrega: formatPrevisao(entrega), lancamento: formatDate(lancamento) };
}

function show(modo: ModoFicha, hasValue: boolean) {
  return modo === "completa" || hasValue;
}

export function EmpreendimentoDetalhe({
  item,
  comercial,
}: {
  item: Empreendimento;
  comercial: OruloComercial | null;
}) {
  const covers = empreendimentoImagens(item);
  const [photo, setPhoto] = useState(0);
  const [modo, setModo] = useState<ModoFicha>("completa");
  const [tema, setTema] = useState<TemaId>("sistema");
  const [aba, setAba] = useState("sobre");
  const tenant = getSession()?.tenant;
  const imobiliaria = tenant?.name?.trim() || "Imobiliária";
  const tenantSlug = tenant?.slug?.trim() || "";
  const vitrine = item.vitrine;
  const tipologias = tipologiasVisiveis(item);
  const diferenciais = vitrine?.diferenciais ?? [];
  const lazer = vitrine?.lazer ?? [];
  const infra = vitrine?.infraestrutura ?? [];
  const unidade =
    vitrine?.detalhesUnidade?.length
      ? vitrine.detalhesUnidade
      : [];
  const plantas = vitrine?.plantas ?? [];
  const local = empreendimentoLocalidadeNome(item);
  const enderecoLinha = [
    local,
    item.endereco,
    vitrine?.numero,
    vitrine?.bairro,
  ]
    .filter(Boolean)
    .join(" · ");
  const areaLabel =
    item.areaM2 != null &&
    vitrine?.areaMax != null &&
    vitrine.areaMax !== item.areaM2
      ? `${item.areaM2}–${vitrine.areaMax} m²`
      : item.areaM2 != null
        ? `${item.areaM2} m²`
        : null;
  const prazo = prazoInfo(vitrine?.lancamento, item.previsaoEntrega);
  const accent = TEMAS.find((t) => t.id === tema)?.cor ?? TEMAS[0].cor;

  const kpis = [
    {
      label: "Valor a partir de",
      value: item.valorReferencia != null ? brl(item.valorReferencia) : null,
      icon: Sparkles,
      destaque: true,
    },
    {
      label: "Renda a partir de",
      value: item.rendaAPartirDe != null ? brl(item.rendaAPartirDe) : null,
      icon: FileText,
      destaque: true,
    },
    {
      label: "Unidades",
      value: vitrine?.unidades != null ? String(vitrine.unidades) : null,
      icon: Layers,
      destaque: true,
    },
    {
      label: "Valor por m²",
      value: vitrine?.valorM2 != null ? brl(Math.round(vitrine.valorM2)) : null,
      icon: Ruler,
      destaque: true,
    },
    {
      label: "Valor máximo",
      value: vitrine?.valorMax != null ? brl(vitrine.valorMax) : null,
      icon: Sparkles,
      destaque: true,
    },
    { label: "Metragem", value: areaLabel, icon: Ruler, destaque: false },
    {
      label: "Quartos",
      value: item.quartos != null ? String(item.quartos) : null,
      icon: BedDouble,
      destaque: false,
    },
    {
      label: "Suítes (mín.)",
      value: vitrine?.suites != null ? String(vitrine.suites) : null,
      icon: Sparkles,
      destaque: false,
    },
    {
      label: "Banheiros",
      value: item.banheiros != null ? String(item.banheiros) : null,
      icon: Bath,
      destaque: false,
    },
    {
      label: "Vagas",
      value: item.vagas != null ? String(item.vagas) : null,
      icon: Car,
      destaque: false,
    },
    {
      label: "Andares",
      value: vitrine?.andares != null ? String(vitrine.andares) : null,
      icon: Building2,
      destaque: false,
    },
  ].filter((kpi) => show(modo, kpi.value != null));

  const abas = useMemo(
    () =>
      [
        { id: "sobre", label: "Sobre", on: show(modo, Boolean(vitrine?.descricao || vitrine?.headline || unidade.length)) },
        {
          id: "diferenciais",
          label: "Diferenciais",
          on: show(modo, Boolean(diferenciais.length || lazer.length || infra.length)),
        },
        { id: "tipologias", label: "Tipologias", on: show(modo, tipologias.length > 0) },
        { id: "plantas", label: "Plantas", on: show(modo, plantas.length > 0) },
        {
          id: "localizacao",
          label: "Localização",
          on: show(
            modo,
            Boolean(
              local ||
                item.endereco ||
                vitrine?.bairro ||
                (vitrine?.latitude != null && vitrine?.longitude != null),
            ),
          ),
        },
      ].filter((tab) => tab.on),
    [modo, vitrine, unidade.length, diferenciais.length, lazer.length, infra.length, tipologias.length, plantas.length, local, item.endereco],
  );

  async function compartilhar() {
    if (!tenantSlug) {
      toast.error("Não foi possível montar o link de compartilhamento.");
      return;
    }
    const url = empreendimentoShareUrl(tenantSlug, item.nome);
    const text = empreendimentoShareText(item.nome, imobiliaria, tenantSlug);
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: item.nome, text, url });
        return;
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Texto copiado. Cole no WhatsApp para enviar.");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  }

  const current = covers[photo] ?? covers[0];

  return (
    <div
      className="space-y-6 pb-10"
      style={{ ["--ficha-accent" as string]: accent }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Button asChild variant="ghost" size="sm" className="-ml-2 rounded-full">
            <Link to="/imoveis">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Empreendimentos
            </Link>
          </Button>
          <span>/</span>
          <span className="font-medium text-foreground">{item.nome}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-border/80 bg-muted/40 p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setModo("completa")}
              className={cn(
                "rounded-full px-3 py-1.5",
                modo === "completa"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Ficha completa
            </button>
            <button
              type="button"
              onClick={() => setModo("atuais")}
              className={cn(
                "rounded-full px-3 py-1.5",
                modo === "atuais"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Só dados atuais
            </button>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-border/80 bg-card px-2 py-1.5">
            {TEMAS.map((itemTema) => (
              <button
                key={itemTema.id}
                type="button"
                title={itemTema.id}
                onClick={() => setTema(itemTema.id)}
                className={cn(
                  "h-4 w-4 rounded-full border border-black/10",
                  tema === itemTema.id && "ring-2 ring-offset-2 ring-primary",
                )}
                style={{ background: itemTema.cor }}
              />
            ))}
          </div>
          <Button type="button" size="sm" className="rounded-full" onClick={() => void compartilhar()}>
            <Share2 className="mr-1.5 h-4 w-4" />
            Compartilhar
          </Button>
        </div>
      </div>

      <section className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-card shadow-sm">
        <div className="relative bg-white px-3 pb-4 pt-3 sm:px-6">
          <div className="absolute left-4 top-4 z-10 flex justify-between gap-2 sm:left-7 sm:right-7">
            {item.status ? (
              <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-amber-950">
                {empreendimentoStatusLabel(item.status)}
              </span>
            ) : (
              <span />
            )}
            <div className="ml-auto flex gap-2">
              <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-800 shadow-sm">
                {item.ativo ? "Ativo" : "Inativo"}
              </span>
              {item.externalUrl ? (
                <a
                  href={item.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-800 shadow-sm"
                >
                  Link externo
                </a>
              ) : null}
            </div>
          </div>
          {current ? (
            <div className="relative mx-auto max-w-4xl">
              <img
                src={current}
                alt={item.nome}
                className="mx-auto max-h-[28rem] w-auto max-w-full rounded-md object-contain"
              />
              <span className="absolute bottom-4 left-4 rounded-full bg-[#6b7a3d]/92 px-5 py-1.5 text-sm font-medium text-white shadow-sm">
                {photo === 0 ? "Capa" : `Foto ${photo + 1}`}
              </span>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-md bg-muted/40">
              <Building2 className="h-14 w-14 text-primary/35" />
            </div>
          )}
          {covers.length > 1 ? (
            <div className="mx-auto mt-4 grid max-w-4xl grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {covers.slice(0, 15).map((src, index) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setPhoto(index)}
                  className={cn(
                    "aspect-[16/10] overflow-hidden rounded-md",
                    index === photo
                      ? "ring-2 ring-primary ring-offset-2"
                      : "opacity-80 hover:opacity-100",
                  )}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 border-t border-border/60 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {item.construtora?.nome ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {item.construtora.nome}
              </p>
            ) : null}
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              {item.nome}
            </h1>
            {enderecoLinha ? (
              <p className="mt-1.5 flex items-start gap-1.5 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                {enderecoLinha}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {vitrine?.tourVirtual ? (
              <a
                href={vitrine.tourVirtual}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted"
              >
                Tour 360°
              </a>
            ) : null}
            {vitrine?.website ? (
              <a
                href={vitrine.website}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-muted"
              >
                Website
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {item.tipo ? (
          <Chip>{empreendimentoTipoLabel(item.tipo)}</Chip>
        ) : null}
        {(item.tags ?? []).map((tag) => (
          <Chip key={tag}>{tag}</Chip>
        ))}
      </div>

      {abas.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {abas.map((tab) => (
            <a
              key={tab.id}
              href={`#${tab.id}`}
              onClick={() => setAba(tab.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm",
                aba === tab.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/80 bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </a>
          ))}
        </div>
      ) : null}

      {kpis.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {kpis.map((kpi, index) => (
            <div
              key={kpi.label}
              className="rounded-3xl p-4 shadow-sm"
              style={kpiTone(accent, kpi.destaque, index)}
            >
              <kpi.icon className="h-4 w-4 opacity-80" />
              <p className="mt-3 text-xl font-semibold leading-none">
                {kpi.value ?? "—"}
              </p>
              <p className="mt-1 text-xs opacity-80">{kpi.label}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.85fr)]">
        <div className="space-y-5">
          {show(modo, Boolean(vitrine?.descricao || unidade.length)) ? (
            <Panel id="sobre" title="Sobre" publico>
              {vitrine?.descricao ? (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {vitrine.descricao}
                </p>
              ) : modo === "completa" ? (
                <p className="text-sm text-muted-foreground">Sem descrição cadastrada.</p>
              ) : null}
              {unidade.length > 0 ? (
                <div className="mt-4 rounded-2xl bg-muted/50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Detalhes da unidade
                  </p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {unidade.map((line) => (
                      <li key={line} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 text-emerald-500" />
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </Panel>
          ) : null}

          {show(modo, Boolean(diferenciais.length || lazer.length || infra.length)) ? (
            <Panel id="diferenciais" title="Diferenciais, lazer e infraestrutura" publico>
              <div className="grid gap-4 sm:grid-cols-3">
                <Lista title="Diferenciais" items={diferenciais} modo={modo} />
                <Lista title="Lazer do condomínio" items={lazer} modo={modo} />
                <Lista title="Infraestrutura" items={infra} modo={modo} />
              </div>
            </Panel>
          ) : null}

          {show(modo, tipologias.length > 0) ? (
            <Panel id="tipologias" title="Tipologias" publico>
              {tipologias.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma tipologia cadastrada.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {tipologias.map((row, index) => (
                    <article
                      key={`${row.nome}-${index}`}
                      className="rounded-2xl border border-border/70 bg-muted/30 p-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold">{row.nome || "Unidade"}</p>
                        {row.valor != null ? (
                          <p className="font-semibold" style={{ color: accent }}>
                            {brl(row.valor)}
                          </p>
                        ) : null}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {row.areaM2 != null ? <span>{row.areaM2} m²</span> : null}
                        {row.quartos != null ? <span>{row.quartos} quartos</span> : null}
                        {row.suites != null ? <span>{row.suites} suítes</span> : null}
                        {row.banheiros != null ? <span>{row.banheiros} banheiros</span> : null}
                        {row.vagas != null ? <span>{row.vagas} vagas</span> : null}
                        {row.pavimento ? <span>{row.pavimento}</span> : null}
                      </div>
                    </article>
                  ))}
                </div>
              )}
              {(vitrine?.tiposUnidade ?? []).length > 0 ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  Tipos de unidade: {(vitrine?.tiposUnidade ?? []).join(" · ")}
                </p>
              ) : null}
            </Panel>
          ) : null}

          {show(modo, plantas.length > 0) ? (
            <Panel id="plantas" title="Plantas" publico>
              {plantas.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  {plantas.map((src, index) => (
                    <img
                      key={src}
                      src={src}
                      alt={tipologias[index]?.nome ?? "Planta"}
                      className="h-36 w-full rounded-2xl border border-dashed border-border object-contain bg-muted/40 p-2"
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma planta enviada.</p>
              )}
            </Panel>
          ) : null}

          {show(
            modo,
            Boolean(
              local ||
                item.cidade ||
                item.endereco ||
                (vitrine?.latitude != null && vitrine?.longitude != null),
            ),
          ) ? (
            <Panel id="localizacao" title="Localização" publico>
              <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
                {vitrine?.latitude != null && vitrine?.longitude != null ? (
                  <iframe
                    title="Mapa"
                    className="h-56 w-full rounded-2xl border-0"
                    loading="lazy"
                    src={`https://maps.google.com/maps?q=${vitrine.latitude},${vitrine.longitude}&z=15&output=embed`}
                  />
                ) : (
                  <div className="flex h-56 items-center justify-center rounded-2xl bg-muted text-sm text-muted-foreground">
                    Sem coordenadas
                  </div>
                )}
                <dl className="space-y-2 text-sm">
                  <Info label="Localidade" value={local} modo={modo} />
                  <Info label="Cidade" value={item.cidade} modo={modo} />
                  <Info label="Endereço" value={item.endereco} modo={modo} />
                  <Info label="Número" value={vitrine?.numero} modo={modo} />
                  <Info label="Bairro" value={vitrine?.bairro} modo={modo} />
                  <Info label="Estado" value={vitrine?.estado} modo={modo} />
                  <Info label="CEP" value={vitrine?.cep} modo={modo} />
                  {vitrine?.latitude != null ? (
                    <a
                      className="mt-3 inline-flex items-center gap-1 text-primary underline"
                      href={`https://www.google.com/maps?q=${vitrine.latitude},${vitrine.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      Abrir no mapa
                    </a>
                  ) : null}
                </dl>
              </div>
            </Panel>
          ) : null}

          {show(modo, Boolean(item.observacao?.trim())) ? (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                Observação interna
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-amber-950">
                {item.observacao?.trim() || "Sem nota interna."}
              </p>
            </div>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-3 lg:self-start">
          {prazo ? (
            <div
              className="rounded-3xl p-5 text-amber-950 shadow-sm"
              style={{ background: `linear-gradient(135deg, ${accent} 0%, #f59e0b 100%)` }}
            >
              <p className="text-sm font-medium text-white/90">
                Entrega prevista em {prazo.entrega}
              </p>
              <p className="mt-1 text-4xl font-semibold text-white">
                {prazo.days > 0 ? prazo.days : 0}
                <span className="ml-1 text-base font-medium">dias restantes</span>
              </p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/30">
                <div
                  className="h-full rounded-full bg-white"
                  style={{ width: `${prazo.pct}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-white/85">
                <span>Lançamento {prazo.lancamento ?? "—"}</span>
                <span>{prazo.pct}% do prazo</span>
              </div>
            </div>
          ) : null}

          <Panel title="Resumo comercial" publico compact>
            <dl className="space-y-2 text-sm">
              <Info label="Construtora" value={item.construtora?.nome} modo={modo} />
              <Info label="Condomínio" value={vitrine?.nomeCondominio} modo={modo} />
              <Info label="Tipo" value={item.tipo ? empreendimentoTipoLabel(item.tipo) : null} modo={modo} />
              <Info label="Status" value={item.status ? empreendimentoStatusLabel(item.status) : null} modo={modo} />
              <Info label="Lançamento" value={formatDate(vitrine?.lancamento)} modo={modo} />
              <Info label="Entrega" value={formatPrevisao(item.previsaoEntrega)} modo={modo} />
              <Info label="Atualizado em" value={formatDate(vitrine?.atualizadoEm) ?? formatDate(item.updatedAt)} modo={modo} />
            </dl>
            <div className="mt-4 flex flex-col gap-2">
              {vitrine?.website ? (
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <a href={vitrine.website} target="_blank" rel="noreferrer">
                    <Globe className="mr-1.5 h-4 w-4" /> Website
                  </a>
                </Button>
              ) : null}
              {vitrine?.tourVirtual ? (
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <a href={vitrine.tourVirtual} target="_blank" rel="noreferrer">
                    <View className="mr-1.5 h-4 w-4" /> Tour 360°
                  </a>
                </Button>
              ) : null}
            </div>
          </Panel>

          {item.oruloBuildingId ? (
            <Panel title="Órulo" interno compact>
              <dl className="space-y-2 text-sm">
                <Info label="ID do prédio" value={String(item.oruloBuildingId)} modo="completa" />
                <Info label="Status no catálogo" value={item.oruloStatus} modo={modo} />
                <Info label="Último sync" value={formatDateTime(item.oruloSyncedAt)} modo={modo} />
              </dl>
              <div className="mt-4 rounded-2xl bg-muted/60 p-3 text-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
                  Ao vivo · não fica gravado no CRM
                </p>
                {comercial?.authorized === false ? (
                  <div className="mt-2 space-y-2">
                    <p className="text-muted-foreground">Autorize para ver comissão e arquivos.</p>
                    <Button
                      size="sm"
                      className="rounded-full"
                      onClick={() => {
                        void fetchOruloOAuthUrl()
                          .then((res) => window.location.assign(res.url))
                          .catch((err) =>
                            toast.error(
                              err instanceof ApiError
                                ? err.message
                                : "Não foi possível abrir a autorização.",
                            ),
                          );
                      }}
                    >
                      Autorizar Órulo
                    </Button>
                  </div>
                ) : comercial?.authorized ? (
                  <div className="mt-2 space-y-2">
                    {(comercial.commercialContacts ?? []).map((contact, index) => (
                      <p key={String(contact.id ?? index)}>
                        {String(contact.name ?? "Contato")}
                        {contact.real_estate_agency_commission != null
                          ? ` · ${String(contact.real_estate_agency_commission)}%`
                          : ""}
                      </p>
                    ))}
                    {(comercial.files ?? []).map((file, index) =>
                      typeof file.uri === "string" || typeof file.url === "string" ? (
                        <a
                          key={String(file.id ?? index)}
                          href={String(file.uri ?? file.url)}
                          className="block underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {String(file.name ?? file.title ?? "Arquivo")}
                        </a>
                      ) : null,
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-muted-foreground">Carregando…</p>
                )}
              </div>
            </Panel>
          ) : null}

          <Panel title="Sistema" interno compact>
            <p className="text-3xl font-semibold" style={{ color: accent }}>
              {item.matchTotal ?? 0}
            </p>
            <p className="text-sm text-muted-foreground">clientes compatíveis (matching)</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-center text-sm">
              <div className="rounded-2xl bg-muted/60 p-3">
                <p className="text-lg font-semibold">{item.matchMuitoCompativeis ?? 0}</p>
                <p className="text-xs text-muted-foreground">Muito compatíveis</p>
              </div>
              <div className="rounded-2xl bg-muted/60 p-3">
                <p className="text-lg font-semibold">{item.matchInteressePrevio ?? 0}</p>
                <p className="text-xs text-muted-foreground">Interesse prévio</p>
              </div>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <Info label="ID interno" value={item.id} modo="completa" />
              <Info label="Chave externa" value={item.externalKey} modo={modo} />
              <Info label="Criado em" value={formatDate(item.createdAt)} modo={modo} />
              <Info label="Atualizado em" value={formatDateTime(item.updatedAt)} modo={modo} />
            </dl>
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function Chip({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border/80 bg-card px-3 py-1 text-xs font-medium">
      {children}
    </span>
  );
}

function Panel({
  id,
  title,
  publico,
  interno,
  compact,
  children,
}: {
  id?: string;
  title: string;
  publico?: boolean;
  interno?: boolean;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        "rounded-3xl border border-border/70 bg-card shadow-sm",
        compact ? "p-5" : "p-6",
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {publico ? (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
            Ficha pública
          </span>
        ) : null}
        {interno ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Interno
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Lista({
  title,
  items,
  modo,
}: {
  title: string;
  items: string[];
  modo: ModoFicha;
}) {
  if (!items.length && modo === "atuais") return null;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {items.length ? (
        <ul className="mt-2 space-y-1 text-sm">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 text-emerald-500" />
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">—</p>
      )}
    </div>
  );
}

function Info({
  label,
  value,
  modo,
}: {
  label: string;
  value?: string | number | null;
  modo: ModoFicha;
}) {
  if ((value == null || value === "") && modo === "atuais") return null;
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="max-w-[62%] text-right font-medium">{value || "—"}</dd>
    </div>
  );
}
