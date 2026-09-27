import { GState, jsPDF } from "jspdf";
import { brl } from "@/lib/crm-types";
import type { TenantBranding } from "@/lib/auth";
import { phoneDigits, formatPhone } from "@/lib/phone";
import { formatCpfCnpj } from "@/lib/utils";
import {
  formatPropostaDate,
  PROPOSTA_COMPOSICAO_LABEL,
  PROPOSTA_INFORMATIVA_KEYS,
  PROPOSTA_LISTA_KEYS,
  PROPOSTA_SIMPLES_KEYS,
  propostaComposicaoTotal,
  propostaDiferenca,
  propostaValorLiquido,
  type Proposta,
  type PropostaListaKey,
  type PropostaSimplesKey,
} from "@/lib/propostas-api";

type Rgb = [number, number, number];

type PdfPalette = {
  navy: Rgb;
  navySoft: Rgb;
  gold: Rgb;
  goldSoft: Rgb;
  ink: Rgb;
  muted: Rgb;
  line: Rgb;
  band: Rgb;
  white: Rgb;
};

/** Fallback quando a logo não carrega / não tem cor útil. */
const DEFAULT_PALETTE: PdfPalette = {
  navy: [13, 27, 42],
  navySoft: [27, 42, 58],
  gold: [197, 160, 89],
  goldSoft: [245, 236, 214],
  ink: [22, 28, 36],
  muted: [110, 118, 128],
  line: [220, 224, 230],
  band: [241, 243, 245],
  white: [255, 255, 255],
};

export type PropostaPdfBrand = {
  logoUrl?: string | null;
  /** Hex opcional do tenant (#RRGGBB) — reforça a paleta se a logo for monocromática. */
  primaryColor?: string | null;
  company?: Pick<
    TenantBranding,
    | "name"
    | "documento"
    | "creci"
    | "email"
    | "telefone"
    | "endereco"
    | "cidade"
  > | null;
};

type CompositionLine = {
  label: string;
  detail?: string;
  value: number;
};

const COMPOSITION_ORDER = [
  "SINAL",
  "APARTADO",
  "PRÉ-CHAVES",
  "PÓS-CHAVES",
  "INTERCALADAS",
  "FGTS",
  "MORA BEM",
  "MCMV",
  "FINANCIAMENTO",
] as const;

type LoadedLogo = {
  dataUrl: string;
  format: "PNG" | "JPEG";
  width: number;
  height: number;
  /** Cores amostradas da própria logo. */
  dark: Rgb | null;
  accent: Rgb | null;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case rn:
      h = (gn - bn) / d + (gn < bn ? 6 : 0);
      break;
    case gn:
      h = (bn - rn) / d + 2;
      break;
    default:
      h = (rn - gn) / d + 4;
  }
  return [(h / 6) * 360, s, l];
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const hh = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = l - c / 2;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (hh < 60) [rp, gp, bp] = [c, x, 0];
  else if (hh < 120) [rp, gp, bp] = [x, c, 0];
  else if (hh < 180) [rp, gp, bp] = [0, c, x];
  else if (hh < 240) [rp, gp, bp] = [0, x, c];
  else if (hh < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];
  return [
    Math.round((rp + m) * 255),
    Math.round((gp + m) * 255),
    Math.round((bp + m) * 255),
  ];
}

function parseHexColor(hex: string | null | undefined): Rgb | null {
  if (!hex) return null;
  const raw = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return null;
  return [
    Number.parseInt(raw.slice(0, 2), 16),
    Number.parseInt(raw.slice(2, 4), 16),
    Number.parseInt(raw.slice(4, 6), 16),
  ];
}

function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/** Amostra pixels da logo e elege uma cor escura (fundo) + uma de destaque. */
function extractLogoColors(source: HTMLCanvasElement): {
  dark: Rgb | null;
  accent: Rgb | null;
} {
  const sample = document.createElement("canvas");
  const size = 48;
  sample.width = size;
  sample.height = size;
  const ctx = sample.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { dark: null, accent: null };
  ctx.drawImage(source, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  type Bucket = {
    r: number;
    g: number;
    b: number;
    count: number;
    sat: number;
    light: number;
  };
  const buckets = new Map<string, Bucket>();

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3]!;
    if (a < 140) continue;
    const r = data[i]!;
    const g = data[i + 1]!;
    const b = data[i + 2]!;
    // Ignora branco / quase branco (fundo da logo).
    if (r > 242 && g > 242 && b > 242) continue;
    const qr = Math.round(r / 20) * 20;
    const qg = Math.round(g / 20) * 20;
    const qb = Math.round(b / 20) * 20;
    const key = `${qr},${qg},${qb}`;
    const [, sat, light] = rgbToHsl(qr, qg, qb);
    const cur = buckets.get(key);
    if (cur) cur.count += 1;
    else buckets.set(key, { r: qr, g: qg, b: qb, count: 1, sat, light });
  }

  const entries = [...buckets.values()].filter((e) => e.count >= 2);
  if (!entries.length) return { dark: null, accent: null };

  // Escura: prioriza baixa luminosidade e presença.
  const darkScore = (e: Bucket) => e.count * (1.2 - e.light) * (0.5 + e.sat);
  const dark = [...entries]
    .filter((e) => e.light < 0.55)
    .sort((a, b) => darkScore(b) - darkScore(a))[0];

  // Destaque: saturada / média-clara, diferente da escura.
  const accentScore = (e: Bucket) =>
    e.count * (0.4 + e.sat) * (1 - Math.abs(e.light - 0.5));
  const accent = [...entries]
    .filter((e) => {
      if (e.light < 0.18 || e.light > 0.88) return false;
      if (e.sat < 0.12) return false;
      if (!dark) return true;
      const dr = e.r - dark.r;
      const dg = e.g - dark.g;
      const db = e.b - dark.b;
      return dr * dr + dg * dg + db * db > 40 * 40;
    })
    .sort((a, b) => accentScore(b) - accentScore(a))[0];

  return {
    dark: dark ? [dark.r, dark.g, dark.b] : null,
    accent: accent ? [accent.r, accent.g, accent.b] : null,
  };
}

function buildPaletteFromLogo(
  dark: Rgb | null,
  accent: Rgb | null,
  primaryHex?: string | null,
): PdfPalette {
  const fallbackPrimary = parseHexColor(primaryHex);
  const seed = dark ?? fallbackPrimary ?? DEFAULT_PALETTE.navy;

  let [h, s] = rgbToHsl(...seed);
  // Cabeçalho sempre escuro o bastante para texto branco.
  const navy = hslToRgb(h, clamp(Math.max(s, 0.28), 0, 0.75), 0.16);
  const navySoft = hslToRgb(h, clamp(Math.max(s, 0.22), 0, 0.65), 0.26);

  let accentRgb = accent;
  if (!accentRgb && fallbackPrimary) {
    const [ph, ps, pl] = rgbToHsl(...fallbackPrimary);
    // Se a primária for clara/média, usa como destaque; se for escura, deriva.
    accentRgb =
      pl > 0.35
        ? fallbackPrimary
        : hslToRgb((ph + 35) % 360, clamp(Math.max(ps, 0.45), 0, 0.8), 0.55);
  }
  if (!accentRgb) {
    accentRgb = hslToRgb((h + 42) % 360, 0.55, 0.55);
  }

  let [ah, as, al] = rgbToHsl(...accentRgb);
  // Garante destaque visível (evita cinza / quase preto).
  const gold = hslToRgb(
    ah,
    clamp(Math.max(as, 0.42), 0, 0.85),
    clamp(al < 0.35 ? 0.52 : al > 0.72 ? 0.58 : al, 0.4, 0.68),
  );
  const goldSoft = mixRgb(gold, DEFAULT_PALETTE.white, 0.86);

  return {
    navy,
    navySoft,
    gold,
    goldSoft,
    ink: DEFAULT_PALETTE.ink,
    muted: DEFAULT_PALETTE.muted,
    line: DEFAULT_PALETTE.line,
    band: DEFAULT_PALETTE.band,
    white: DEFAULT_PALETTE.white,
  };
}

function compositionLines(p: Proposta): CompositionLine[] {
  const lines: CompositionLine[] = [];

  for (const key of PROPOSTA_SIMPLES_KEYS) {
    if (
      PROPOSTA_INFORMATIVA_KEYS.includes(
        key as (typeof PROPOSTA_INFORMATIVA_KEYS)[number],
      )
    ) {
      continue;
    }
    const value = p[key as PropostaSimplesKey];
    if (value == null) continue;
    lines.push({
      label: PROPOSTA_COMPOSICAO_LABEL[key].toUpperCase(),
      value,
    });
  }

  for (const key of PROPOSTA_LISTA_KEYS) {
    const values = p[key as PropostaListaKey] ?? [];
    if (!values.length) continue;
    const subtotal = values.reduce((sum, n) => sum + n, 0);
    const equal = values.every((n) => n === values[0]);
    const detail = equal
      ? `${values.length} × ${brl(values[0] ?? 0)}`
      : values
          .map((value, index) => `${index + 1}ª · ${brl(value)}`)
          .join("  ·  ");
    lines.push({
      label: PROPOSTA_COMPOSICAO_LABEL[key].toUpperCase(),
      detail,
      value: subtotal,
    });
  }

  return lines.sort(
    (a, b) =>
      COMPOSITION_ORDER.indexOf(a.label as (typeof COMPOSITION_ORDER)[number]) -
      COMPOSITION_ORDER.indexOf(b.label as (typeof COMPOSITION_ORDER)[number]),
  );
}

function empreendimentoNome(p: Proposta) {
  return p.empreendimento?.nome ?? "Empreendimento a definir";
}

function safeFilename(codigo: string) {
  return codigo.replace(/[^\w.-]+/g, "_");
}

/** jsPDF rejeita valores null/undefined em `text`, mesmo quando o dado é opcional. */
function pdfText(value: unknown, fallback = "—"): string {
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number") return String(value);
  return fallback;
}

function absoluteAssetUrl(src: string) {
  if (
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("data:")
  ) {
    return src;
  }
  if (typeof window === "undefined") return src;
  return new URL(src, window.location.origin).href;
}

async function loadLogoForPdf(src: string): Promise<LoadedLogo | null> {
  if (typeof window === "undefined" || !src.trim()) return null;
  const url = absoluteAssetUrl(src.trim());
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("logo load failed"));
      image.src = url;
    });
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return null;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    const jpeg =
      /\.jpe?g($|\?)/i.test(url) || url.startsWith("data:image/jpeg");
    const { dark, accent } = extractLogoColors(canvas);
    return {
      dataUrl: canvas.toDataURL(jpeg ? "image/jpeg" : "image/png"),
      format: jpeg ? "JPEG" : "PNG",
      width: w,
      height: h,
      dark,
      accent,
    };
  } catch {
    return null;
  }
}

function ensureSpace(doc: jsPDF, y: number, need: number, margin = 40) {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + need > pageH - 56) {
    doc.addPage();
    return margin;
  }
  return y;
}

function roundedRect(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  style: "F" | "S" | "FD" = "F",
) {
  doc.roundedRect(x, y, w, h, r, r, style);
}

export function buildPropostaShareMessage(p: Proposta): string {
  const linhas = [
    `Olá${p.clienteNome ? `, ${p.clienteNome}` : ""}!`,
    "",
    `Segue a proposta comercial ${p.codigo}.`,
    `Empreendimento: ${empreendimentoNome(p)}${p.unidade ? ` · Unidade ${p.unidade}` : ""}`,
    `Valor: ${brl(p.valor)}`,
  ];
  if (p.validade) {
    linhas.push(`Validade: ${formatPropostaDate(p.validade)}`);
  }
  if (p.corretor?.name) {
    linhas.push(`Corretor: ${p.corretor.name}`);
  }
  linhas.push("", "O PDF completo foi baixado — anexe-o nesta conversa.");
  return linhas.join("\n");
}

/** Converte telefone BR (10/11 dígitos) para wa.me com DDI 55. */
export function propostaWhatsAppDigits(telefone: string | null | undefined) {
  const digits = phoneDigits(telefone ?? "");
  if (!digits) return null;
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length >= 10) return `55${digits}`;
  return null;
}

export function getPropostaWhatsAppUrl(
  p: Proposta,
  phoneOverride?: string | null,
) {
  const digits =
    propostaWhatsAppDigits(phoneOverride) ??
    propostaWhatsAppDigits(p.clienteTelefone);
  if (!digits) return null;
  const url = new URL(`https://wa.me/${digits}`);
  url.searchParams.set("text", buildPropostaShareMessage(p));
  return url.toString();
}

export function getPropostaMailtoUrl(p: Proposta) {
  const subject = `Proposta comercial ${p.codigo}`;
  const body = buildPropostaShareMessage(p);
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

async function buildPropostaPdfDescritivo(
  p: Proposta,
  filename: string,
  brand?: PropostaPdfBrand,
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 36;
  const rawText = doc.text.bind(doc) as (...args: unknown[]) => unknown;
  (
    doc as unknown as {
      text: (...args: unknown[]) => unknown;
    }
  ).text = (text, x, y, ...rest) => {
    const normalizedText = Array.isArray(text)
      ? text
          .filter(
            (line): line is string | number =>
              typeof line === "string" || typeof line === "number",
          )
          .map((line) => pdfText(line))
      : pdfText(text);
    return rawText(
      Array.isArray(normalizedText) && normalizedText.length === 0
        ? ["—"]
        : normalizedText,
      typeof x === "number" && Number.isFinite(x) ? x : margin,
      typeof y === "number" && Number.isFinite(y) ? y : margin,
      ...rest,
    );
  };
  const contentW = pageW - margin * 2;
  const company = brand?.company;
  const companyName = (company?.name ?? "").trim() || "Imobiliária";
  const logo = brand?.logoUrl ? await loadLogoForPdf(brand.logoUrl) : null;
  const C = buildPaletteFromLogo(
    logo?.dark ?? null,
    logo?.accent ?? null,
    brand?.primaryColor,
  );

  // ─── Cabeçalho (cor escura da logo) ───
  const headerH = 92;
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, pageW, headerH, "F");

  // Faixa/diagonais de destaque (canto inferior direito do header)
  doc.setFillColor(...C.gold);
  doc.triangle(pageW - 120, headerH, pageW, headerH - 28, pageW, headerH, "F");
  doc.setFillColor(...C.navySoft);
  doc.triangle(pageW - 70, headerH, pageW, headerH - 16, pageW, headerH, "F");

  // Logo à esquerda
  const logoMaxW = 88;
  const logoMaxH = 64;
  let logoDrawnW = 0;
  if (logo) {
    const scale = Math.min(logoMaxW / logo.width, logoMaxH / logo.height, 1);
    logoDrawnW = Math.max(36, logo.width * scale);
    const logoH = Math.max(28, logo.height * scale);
    doc.addImage(
      logo.dataUrl,
      logo.format,
      margin,
      (headerH - logoH) / 2 - 2,
      logoDrawnW,
      logoH,
    );
    // Divisor dourado vertical
    const dividerX = margin + logoDrawnW + 16;
    doc.setDrawColor(...C.gold);
    doc.setLineWidth(1.2);
    doc.line(dividerX, 28, dividerX, headerH - 28);
  }

  // Dados da imobiliária
  const infoX = logo ? margin + logoDrawnW + 30 : margin;
  const infoMaxW = pageW - infoX - margin - 8;
  let infoY = 30;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...C.gold);
  const nameLines = doc.splitTextToSize(companyName.toUpperCase(), infoMaxW);
  doc.text(nameLines.slice(0, 2), infoX, infoY);
  infoY += nameLines.slice(0, 2).length * 13 + 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...C.white);

  const metaLines: string[] = [];
  if (company?.documento?.trim()) {
    metaLines.push(`CNPJ: ${formatCpfCnpj(company.documento)}`);
  }
  if (company?.creci?.trim()) {
    metaLines.push(`CRECI: ${company.creci.trim()}`);
  }
  if (company?.endereco?.trim()) {
    metaLines.push(company.endereco.trim());
  }
  if (company?.email?.trim()) {
    metaLines.push(company.email.trim());
  }
  for (const line of metaLines) {
    const wrapped = doc.splitTextToSize(line, infoMaxW);
    doc.text(wrapped.slice(0, 2), infoX, infoY);
    infoY += wrapped.slice(0, 2).length * 11 + 2;
    if (infoY > headerH - 14) break;
  }

  let y = headerH + 18;
  const drawField = (
    label: string,
    value: unknown,
    x: number,
    top: number,
    width: number,
  ) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...C.gold);
    doc.text(label.toUpperCase(), x, top);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...C.ink);
    const lines = doc.splitTextToSize(pdfText(value, "----"), width);
    doc.text(lines.slice(0, 2), x, top + 12);
  };

  // Título + código + data
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...C.gold);
  doc.text("PROPOSTA COMERCIAL", margin, y);

  y += 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...C.ink);
  doc.text(pdfText(p.codigo, "PROPOSTA"), margin, y);

  // Badge "Emitida em"
  const emitted = new Date().toLocaleDateString("pt-BR");
  const badgeText = `Emitida em: ${emitted}`;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const badgeW = doc.getTextWidth(badgeText) + 22;
  const badgeH = 22;
  const badgeX = pageW - margin - badgeW;
  const badgeY = y - 16;
  doc.setFillColor(...C.navy);
  roundedRect(doc, badgeX, badgeY, badgeW, badgeH, 6, "F");
  doc.setTextColor(...C.white);
  doc.text(badgeText, badgeX + 11, badgeY + 14);

  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...C.ink);
  doc.text(`Prezado(a) ${p.clienteNome},`, margin, y);
  y += 12;
  doc.setFontSize(10);
  doc.setTextColor(...C.muted);
  const intro =
    "Apresentamos a composição financeira desta proposta de aquisição. Os valores abaixo descrevem de forma clara cada etapa do pagamento.";
  const introLines = doc.splitTextToSize(intro, contentW);
  doc.text(introLines, margin, y);
  y += introLines.length * 11 + 12;

  // Identificação do imóvel, no mesmo formato da proposta formal de referência.
  const cardH = 92;
  y = ensureSpace(doc, y, cardH + 10, margin);
  doc.setFillColor(...C.white);
  doc.setDrawColor(...C.line);
  doc.setLineWidth(1);
  roundedRect(doc, margin, y, contentW, cardH, 10, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...C.navy);
  doc.text("IDENTIFICAÇÃO DO IMÓVEL", margin + 14, y + 18);
  const propertyX = margin + 14;
  const propertyColW = (contentW - 42) / 3;
  drawField(
    "Construtora",
    p.construtora?.nome,
    propertyX,
    y + 34,
    propertyColW,
  );
  drawField(
    "Empreendimento",
    empreendimentoNome(p),
    propertyX + propertyColW + 14,
    y + 34,
    propertyColW,
  );
  drawField(
    "Unidade (AP)",
    p.unidade,
    propertyX + (propertyColW + 14) * 2,
    y + 34,
    propertyColW,
  );
  drawField("Índice de correção", "----", propertyX, y + 63, propertyColW);
  drawField(
    "Corretor responsável",
    p.corretor?.name,
    propertyX + propertyColW + 14,
    y + 63,
    propertyColW,
  );
  drawField(
    "Valor contratual",
    brl(p.valor),
    propertyX + (propertyColW + 14) * 2,
    y + 63,
    propertyColW,
  );

  y += cardH + 10;

  // Dados no formato de proposta formal: campos ainda não cadastrados ficam explícitos.
  const proponenteH = 108;
  y = ensureSpace(doc, y, proponenteH + 12, margin);
  doc.setFillColor(...C.white);
  doc.setDrawColor(...C.line);
  roundedRect(doc, margin, y, contentW, proponenteH, 10, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...C.navy);
  doc.text("PROPONENTE 01", margin + 14, y + 18);
  const fieldX = margin + 14;
  const colW = (contentW - 42) / 3;
  drawField("Nome completo", p.clienteNome, fieldX, y + 34, colW);
  drawField("CPF", "----", fieldX + colW + 14, y + 34, colW);
  drawField("Identidade (RG)", "----", fieldX + (colW + 14) * 2, y + 34, colW);
  drawField("Nacionalidade", "----", fieldX, y + 68, colW);
  drawField("Estado civil", "----", fieldX + colW + 14, y + 68, colW);
  drawField(
    "Celular",
    p.clienteTelefone,
    fieldX + (colW + 14) * 2,
    y + 68,
    colW,
  );
  y += proponenteH + 10;

  const enderecoH = 74;
  y = ensureSpace(doc, y, enderecoH + 12, margin);
  doc.setFillColor(...C.white);
  doc.setDrawColor(...C.line);
  roundedRect(doc, margin, y, contentW, enderecoH, 10, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...C.navy);
  doc.text("ENDEREÇO E DADOS DA EMPRESA", margin + 14, y + 18);
  drawField("Endereço residencial", "----", fieldX, y + 36, colW);
  drawField("Cidade / UF", "----", fieldX + colW + 14, y + 36, colW);
  drawField(
    "Profissão / empresa",
    "----",
    fieldX + (colW + 14) * 2,
    y + 36,
    colW,
  );
  y += enderecoH + 12;

  const desconto = p.desconto ?? 0;
  const valorLiquido = propostaValorLiquido(p);

  // Faixa valor de venda / total
  const valorH = 48;
  y = ensureSpace(doc, y, valorH + 10, margin);
  doc.setFillColor(...C.navy);
  roundedRect(doc, margin, y, contentW, valorH, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...C.white);
  doc.text(
    desconto > 0 ? "VALOR DE VENDA" : "VALOR TOTAL DA PROPOSTA",
    margin + 18,
    y + 16,
  );
  doc.setFontSize(20);
  doc.text(brl(p.valor), margin + 36);

  if (p.validade) {
    doc.setDrawColor(...C.white);
    doc.setLineWidth(0.6);
    const splitX = pageW - margin - 150;
    doc.line(splitX, y + 14, splitX, y + valorH - 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.gold);
    doc.text("Validade até:", splitX + 14, y + 24);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...C.white);
    doc.text(formatPropostaDate(p.validade), splitX + 14, y + 42);
  }
  y += valorH + 10;

  // Destaque do desconto do empreendimento
  if (desconto > 0) {
    const discH = 52;
    y = ensureSpace(doc, y, discH + valorH + 12, margin);
    doc.setFillColor(...C.goldSoft);
    roundedRect(doc, margin, y, contentW, discH, 10, "F");
    doc.setDrawColor(...C.gold);
    doc.setLineWidth(2);
    doc.line(margin, y, margin + contentW, y);
    doc.setLineWidth(1);
    doc.line(
      margin + contentW * 0.58,
      y + 14,
      margin + contentW * 0.58,
      y + discH - 14,
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...C.navy);
    doc.text("CONDIÇÃO ESPECIAL DO EMPREENDIMENTO", margin + 16, y + 18);
    doc.setFontSize(15);
    doc.text("DESCONTO DO EMPREENDIMENTO", margin + 16, y + 38);

    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.text("VOCÊ ECONOMIZA:", margin + contentW * 0.58 + 14, y + 18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...C.navy);
    doc.text(brl(desconto), margin + contentW * 0.58 + 14, y + 38);
    y += discH + 8;

    // Valor total com desconto
    doc.setFillColor(...C.navy);
    roundedRect(doc, margin, y, contentW, valorH, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...C.gold);
    doc.text("VALOR TOTAL DA PROPOSTA", margin + 18, y + 16);
    doc.setFontSize(20);
    doc.setTextColor(...C.white);
    doc.text(brl(valorLiquido), margin + 18, y + 36);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.gold);
    doc.text(
      `já com desconto de ${brl(desconto)}`,
      margin + contentW - 16,
      y + 30,
      { align: "right" },
    );
    y += valorH + 10;
  } else {
    y += 8;
  }

  // Composição
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...C.ink);
  doc.text("COMO O VALOR É COMPOSTO", pageW / 2, y, { align: "center" });
  y += 16;

  const lines = compositionLines(p);
  if (!lines.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...C.muted);
    doc.text("Nenhuma composição de pagamento informada.", margin, y + 10);
    y += 28;
  } else {
    const gap = 6;
    const colW = (contentW - gap) / 2;
    const rowH = 36;
    for (let i = 0; i < lines.length; i += 2) {
      y = ensureSpace(doc, y, rowH + 10, margin);
      const pair = [lines[i], lines[i + 1]].filter(
        Boolean,
      ) as CompositionLine[];
      pair.forEach((line, col) => {
        const x = margin + col * (colW + gap);
        doc.setFillColor(...C.band);
        roundedRect(doc, x, y, colW, rowH, 8, "F");

        // Ícone/marcador dourado
        doc.setFillColor(...C.navy);
        roundedRect(doc, x + 10, y + 9, 16, 16, 4, "F");
        doc.setFillColor(...C.gold);
        doc.circle(x + 18, y + 17, 3, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(...C.gold);
        doc.text(line.label, x + 34, y + 15);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...C.ink);
        doc.text(brl(line.value), x + colW - 12, y + 15, { align: "right" });

        if (line.detail) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(...C.muted);
          const d = doc.splitTextToSize(line.detail, colW - 48);
          doc.text(d.slice(0, 1), x + 34, y + 27);
        }
      });
      y += rowH + gap;
    }
  }

  // Totais
  const totH = 42;
  y = ensureSpace(doc, y, totH + 8, margin);
  const totalComp = propostaComposicaoTotal(p);
  const diff = propostaDiferenca(p);
  doc.setFillColor(...C.band);
  roundedRect(doc, margin, y, contentW, totH, 10, "F");
  doc.setDrawColor(...C.gold);
  doc.setLineWidth(1);
  doc.line(margin + contentW / 2, y + 9, margin + contentW / 2, y + totH - 9);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.muted);
  doc.text("TOTAL DA COMPOSIÇÃO", margin + 16, y + 14);
  doc.setFontSize(14);
  doc.setTextColor(...C.navy);
  doc.text(brl(totalComp), margin + 16, y + 30);

  doc.setFontSize(7.5);
  doc.setTextColor(...C.muted);
  doc.text(
    desconto > 0
      ? "DIFERENÇA EM RELAÇÃO AO VALOR COM DESCONTO"
      : "DIFERENÇA EM RELAÇÃO AO VALOR DE VENDA",
    margin + contentW / 2 + 16,
    y + 14,
  );
  doc.setFontSize(14);
  doc.setTextColor(...C.navy);
  doc.text(brl(diff), margin + contentW / 2 + 16, y + 30);
  y += totH + 8;

  if (p.observacao?.trim()) {
    y = ensureSpace(doc, y, 50, margin);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...C.ink);
    doc.text("Observações", margin, y);
    y += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.muted);
    const obs = doc.splitTextToSize(p.observacao.trim(), contentW);
    doc.text(obs, margin, y);
    y += obs.length * 12 + 10;
  }

  // Rodapé
  const footH = 44;
  const footY = pageH - footH - 16;
  if (y > footY - 8) {
    doc.addPage();
  }
  doc.setFillColor(...C.navy);
  roundedRect(doc, margin, pageH - footH - 16, contentW, footH, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...C.white);
  doc.text(
    "REALIZANDO SONHOS, CONSTRUINDO HISTÓRIAS!",
    margin + 16,
    pageH - footH + 8,
  );

  const contactBits: string[] = [];
  if (company?.telefone?.trim()) {
    contactBits.push(formatPhone(company.telefone));
  }
  if (company?.email?.trim()) {
    contactBits.push(company.email.trim());
  }
  if (contactBits.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.gold);
    doc.text(
      contactBits.join("  ·  "),
      pageW - margin - 16,
      pageH - footH + 8,
      {
        align: "right",
      },
    );
  }

  doc.save(filename);
}

/**
 * Versão documental da proposta: impressão limpa, sem identidade cromática
 * ou elementos decorativos, preparada para preenchimento/assinatura.
 */
async function buildPropostaPdfFormulario(
  p: Proposta,
  brand?: PropostaPdfBrand,
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;
  const companyName = brand?.company?.name?.trim() || "----";
  const logo = brand?.logoUrl ? await loadLogoForPdf(brand.logoUrl) : null;
  const C = buildPaletteFromLogo(
    logo?.dark ?? null,
    logo?.accent ?? null,
    brand?.primaryColor,
  );
  const yesNo = (value: boolean | null) =>
    value === null ? "----" : value ? "Sim" : "Não";
  const rawText = doc.text.bind(doc) as (...args: unknown[]) => unknown;
  (
    doc as unknown as {
      text: (...args: unknown[]) => unknown;
    }
  ).text = (text, x, y, ...rest) => {
    const normalized = Array.isArray(text)
      ? text
          .filter(
            (line): line is string | number =>
              typeof line === "string" || typeof line === "number",
          )
          .map((line) => pdfText(line, "----"))
      : pdfText(text, "----");
    return rawText(
      Array.isArray(normalized) && normalized.length === 0
        ? ["----"]
        : normalized,
      typeof x === "number" && Number.isFinite(x) ? x : margin,
      typeof y === "number" && Number.isFinite(y) ? y : margin,
      ...rest,
    );
  };

  doc.setLineWidth(0.45);
  doc.setDrawColor(...C.navy);
  doc.setTextColor(...C.navy);

  const write = (
    value: unknown,
    x: number,
    y: number,
    maxW: number,
    size = 7.5,
    align: "left" | "right" | "center" = "left",
  ) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size);
    doc.setTextColor(...C.navy);
    const lines = doc.splitTextToSize(pdfText(value, "----"), maxW);
    doc.text(lines.slice(0, 1), x, y, { align });
  };

  const section = (title: string, top: number) => {
    doc.setFillColor(...C.navy);
    doc.roundedRect(margin, top, contentW, 16, 3, 3, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...C.white);
    doc.text(title, margin + 7, top + 11);
    doc.setDrawColor(...C.gold);
    doc.setLineWidth(0.55);
    doc.line(margin, top + 16, pageW - margin, top + 16);
    doc.setLineWidth(0.45);
    return top + 18;
  };

  const field = (
    label: string,
    value: unknown,
    x: number,
    top: number,
    width: number,
    height = 27,
  ) => {
    doc.setDrawColor(...C.gold);
    doc.rect(x, top, width, height);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.2);
    doc.setTextColor(...C.muted);
    doc.text(label.toUpperCase(), x + 4, top + 7);
    write(value, x + 4, top + height - 7, width - 8, 7.4);
  };

  const row = (
    top: number,
    values: Array<{ label: string; value: unknown; fraction: number }>,
    height = 27,
  ) => {
    let x = margin;
    values.forEach((item, index) => {
      const width =
        index === values.length - 1
          ? pageW - margin - x
          : Math.round(contentW * item.fraction);
      field(item.label, item.value, x, top, width, height);
      x += width;
    });
    return top + height;
  };

  let y = margin;
  const logoMaxW = 42;
  const logoMaxH = 28;
  let titleX = margin;
  if (logo) {
    const scale = Math.min(logoMaxW / logo.width, logoMaxH / logo.height, 1);
    const logoW = Math.max(18, logo.width * scale);
    const logoH = Math.max(16, logo.height * scale);
    doc.addImage(logo.dataUrl, logo.format, margin, y, logoW, logoH);
    titleX += logoW + 9;
    doc.setDrawColor(...C.gold);
    doc.setLineWidth(0.7);
    doc.line(titleX - 5, y + 1, titleX - 5, y + 28);
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...C.navy);
  doc.text("PROPOSTA DE COMPRA", titleX, y + 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...C.gold);
  doc.text(
    `${companyName} · ${new Date().toLocaleDateString("pt-BR")}`,
    titleX,
    y + 25,
  );
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...C.navy);
  doc.text(pdfText(p.codigo, "----"), pageW - margin, y + 13, {
    align: "right",
  });
  y += 31;

  y = section("IDENTIFICAÇÃO DO IMÓVEL", y);
  y = row(y, [
    { label: "Construtora", value: p.construtora?.nome, fraction: 0.33 },
    {
      label: "Empreendimento",
      value: empreendimentoNome(p),
      fraction: 0.45,
    },
    { label: "Índice de correção", value: "----", fraction: 0.22 },
  ]);
  y = row(y, [
    { label: "Torre / bloco", value: "----", fraction: 0.33 },
    { label: "Unidade (AP)", value: p.unidade, fraction: 0.22 },
    { label: "Valor contratual", value: brl(p.valor), fraction: 0.45 },
  ]);

  y = section("PROPONENTE 01", y + 7);
  y = row(y, [
    { label: "Nome completo", value: p.clienteNome, fraction: 0.67 },
    {
      label: "CPF",
      value: p.clienteCpf ? formatCpfCnpj(p.clienteCpf) : "----",
      fraction: 0.33,
    },
  ]);
  y = row(y, [
    { label: "Identidade (RG)", value: p.clienteRg, fraction: 0.3 },
    { label: "Órgão emissor", value: p.clienteRgOrgaoEmissor, fraction: 0.18 },
    {
      label: "Nascimento",
      value: p.clienteDataNascimento
        ? formatPropostaDate(p.clienteDataNascimento)
        : "----",
      fraction: 0.24,
    },
    { label: "Nacionalidade", value: p.clienteNacionalidade, fraction: 0.28 },
  ]);
  y = row(y, [
    { label: "Estado civil", value: p.clienteEstadoCivil, fraction: 0.33 },
    { label: "Regime de bens", value: p.clienteRegimeBens, fraction: 0.34 },
    {
      label: "Data do casamento",
      value: p.clienteDataCasamento
        ? formatPropostaDate(p.clienteDataCasamento)
        : "----",
      fraction: 0.33,
    },
  ]);
  y = row(y, [
    { label: "Filiação — pai", value: p.clienteNomePai, fraction: 0.5 },
    { label: "Filiação — mãe", value: p.clienteNomeMae, fraction: 0.5 },
  ]);
  y = row(y, [
    {
      label: "Renda",
      value: p.clienteRenda == null ? null : brl(p.clienteRenda),
      fraction: 0.25,
    },
    { label: "Celular", value: p.clienteTelefone, fraction: 0.25 },
    { label: "Telefone", value: p.clienteTelefoneFixo, fraction: 0.25 },
    { label: "E-mail", value: p.clienteEmail, fraction: 0.25 },
  ]);

  y = section("ENDEREÇO", y + 7);
  y = row(y, [
    {
      label: "Endereço residencial",
      value: p.clienteEnderecoResidencial,
      fraction: 0.67,
    },
    { label: "Bairro", value: p.clienteBairroResidencial, fraction: 0.33 },
  ]);
  y = row(y, [
    { label: "Cidade", value: p.clienteCidadeResidencial, fraction: 0.42 },
    { label: "UF", value: p.clienteUfResidencial, fraction: 0.12 },
    { label: "CEP", value: p.clienteCepResidencial, fraction: 0.2 },
    {
      label: "Cobrança aqui?",
      value: yesNo(p.clienteCobrancaResidencial),
      fraction: 0.26,
    },
  ]);

  y = section("DADOS DA EMPRESA", y + 7);
  y = row(y, [
    {
      label: "Empresa onde trabalha",
      value: p.clienteEmpregador,
      fraction: 0.5,
    },
    { label: "Profissão", value: p.clienteProfissao, fraction: 0.5 },
  ]);
  y = row(y, [
    {
      label: "Endereço comercial",
      value: p.clienteEnderecoComercial,
      fraction: 0.67,
    },
    { label: "Bairro", value: p.clienteBairroComercial, fraction: 0.33 },
  ]);
  y = row(y, [
    { label: "Cidade", value: p.clienteCidadeComercial, fraction: 0.42 },
    { label: "UF", value: p.clienteUfComercial, fraction: 0.12 },
    { label: "CEP", value: p.clienteCepComercial, fraction: 0.2 },
    {
      label: "Cobrança aqui?",
      value: yesNo(p.clienteCobrancaComercial),
      fraction: 0.26,
    },
  ]);
  y = row(y, [
    { label: "Site", value: p.clienteSite, fraction: 0.5 },
    { label: "Fone 1", value: p.clienteTelefoneComercial1, fraction: 0.25 },
    { label: "Fone 2", value: p.clienteTelefoneComercial2, fraction: 0.25 },
  ]);

  y = section(
    `PLANO DE PAGAMENTO — CLIENTE: ${pdfText(p.clienteNome, "----")}`,
    y + 7,
  );
  const tableColumns = [0.1, 0.35, 0.2, 0.17, 0.18];
  const tableHeaders = ["QTD", "DESCRIÇÃO", "VALOR", "VENC. / OBS", "SUBTOTAL"];
  let tableX = margin;
  tableHeaders.forEach((header, index) => {
    const width =
      index === tableHeaders.length - 1
        ? pageW - margin - tableX
        : Math.round(contentW * tableColumns[index]!);
    doc.setFillColor(...C.gold);
    doc.rect(tableX, y, width, 17, "F");
    doc.setDrawColor(...C.gold);
    doc.rect(tableX, y, width, 17, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...C.white);
    doc.text(header, tableX + width / 2, y + 11, { align: "center" });
    tableX += width;
  });
  y += 17;

  const lines = compositionLines(p);
  if (!lines.length) {
    lines.push({ label: "----", value: 0 });
  }
  for (const line of lines) {
    tableX = margin;
    const quantity = line.detail?.match(/^(\d+)\s×/)?.[1] ?? "1";
    const unitValue =
      line.detail?.match(/×\s(R\$\s[\d.,]+)/)?.[1] ?? brl(line.value);
    const values = [quantity, line.label, unitValue, "----", brl(line.value)];
    values.forEach((value, index) => {
      const width =
        index === values.length - 1
          ? pageW - margin - tableX
          : Math.round(contentW * tableColumns[index]!);
      doc.setDrawColor(...C.gold);
      doc.rect(tableX, y, width, 17);
      write(
        value,
        index === 1 ? tableX + 4 : tableX + width / 2,
        y + 11,
        width - 8,
        6.8,
        index === 1 ? "left" : "center",
      );
      tableX += width;
    });
    y += 17;
  }

  const totalComp = propostaComposicaoTotal(p);
  const valorLiquido = propostaValorLiquido(p);
  const summaryX = pageW - margin - 225;
  y += 9;
  const summary = [
    ["VALOR DO IMÓVEL", brl(p.valor)],
    ["TOTAL NEGOCIADO", brl(valorLiquido)],
    ["SITUAÇÃO", "----"],
  ];
  summary.forEach(([label, value]) => {
    doc.setDrawColor(...C.gold);
    doc.rect(summaryX, y, 225, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(...C.muted);
    doc.text(label, summaryX + 5, y + 7);
    write(value, summaryX + 220, y + 15, 205, 7.4, "right");
    y += 20;
  });
  if (Math.abs(totalComp - valorLiquido) > 0.009) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.text(`Composição informada: ${brl(totalComp)}`, summaryX, y + 8);
  }

  const signY = Math.max(y + 27, pageH - 50);
  const signatureW = 160;
  [margin, pageW / 2 - signatureW / 2, pageW - margin - signatureW].forEach(
    (x, index) => {
      doc.setDrawColor(...C.gold);
      doc.line(x, signY, x + signatureW, signY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.setTextColor(...C.navy);
      doc.text(
        ["LOCAL E DATA", "PROPONENTE", companyName.toUpperCase()][index]!,
        x,
        signY + 10,
      );
    },
  );
  return doc.output("blob");
}

function savePdfBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function buildPropostaPdfClienteResumido(
  p: Proposta,
  brand?: PropostaPdfBrand,
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const sidebarW = 128;
  const mainX = sidebarW + 18;
  const mainRight = pageW - 18;
  const mainW = mainRight - mainX;
  const companyName = brand?.company?.name?.trim() || "Imobiliária";
  const logo = brand?.logoUrl ? await loadLogoForPdf(brand.logoUrl) : null;
  const C = buildPaletteFromLogo(
    logo?.dark ?? null,
    logo?.accent ?? null,
    brand?.primaryColor,
  );
  const pageBg: Rgb = [244, 246, 250];
  const rowAlt: Rgb = [241, 245, 250];
  const danger: Rgb = [214, 54, 78];
  const person: Rgb = [18, 158, 114];
  const personSoft: Rgb = [226, 246, 236];
  const cardTint = mixRgb(C.gold, C.white, 0.9);
  const mutedLine: Rgb = [186, 194, 206];
  const ink: Rgb = [14, 22, 38];
  const inkSoft: Rgb = [27, 42, 68];
  const contentBottom = pageH - 36;

  const propertyBits = [
    p.empreendimento?.nome?.trim(),
    p.unidade?.trim() ? `Un. ${p.unidade.trim()}` : "",
  ].filter((bit): bit is string => Boolean(bit));
  const imobiliariaSub = propertyBits.length
    ? propertyBits.join("  ·  ")
    : "PROPOSTA COMERCIAL";

  const paymentLines = compositionLines(p);
  const rows = paymentLines.length
    ? paymentLines
    : [{ label: "NENHUMA COMPOSIÇÃO INFORMADA", value: 0 }];

  function paymentCells(line: CompositionLine): [string, string, string, string] {
    if (!paymentLines.length) return ["—", line.label, "—", "—"];
    if (line.detail?.includes("×")) {
      const [qtyRaw, unitRaw] = line.detail.split("×").map((part) => part.trim());
      return [qtyRaw || "1", line.label, unitRaw || brl(line.value), brl(line.value)];
    }
    if (line.detail?.includes("·")) {
      const count = line.detail.split("·").filter((part) => part.trim()).length;
      return [String(count || 1), line.label, "valores variados", brl(line.value)];
    }
    return ["1", line.label, brl(line.value), brl(line.value)];
  }

  function paintPage() {
    doc.setFillColor(...pageBg);
    doc.rect(0, 0, pageW, pageH, "F");
    doc.setFillColor(...ink);
    doc.rect(0, 0, sidebarW, pageH, "F");

    const soft = new GState({ opacity: 0.22 });
    const clear = new GState({ opacity: 1 });
    doc.setGState(soft);
    doc.setFillColor(...C.gold);
    doc.circle(sidebarW - 8, -6, 42, "F");
    doc.circle(-16, pageH - 10, 54, "F");
    doc.setGState(clear);

    doc.setDrawColor(...C.gold);
    doc.setLineWidth(1.1);
    doc.circle(sidebarW + 8, 8, 46, "S");
    doc.circle(-22, pageH + 6, 96, "S");
    doc.setLineWidth(0.55);
    doc.setDrawColor(186, 214, 232);
    doc.circle(-4, pageH + 18, 64, "S");
    doc.circle(sidebarW - 4, 36, 22, "S");

    doc.setFillColor(...inkSoft);
    const towers: Array<[number, number, number]> = [
      [16, 22, 16],
      [34, 36, 14],
      [50, 26, 18],
      [70, 32, 16],
    ];
    const skyBase = pageH - 16;
    for (const [x, height, width] of towers) {
      doc.rect(x, skyBase - height, width, height, "F");
    }
    doc.setFillColor(...C.gold);
    doc.rect(38, skyBase - 28, 1.6, 2.2, "F");
    doc.rect(42, skyBase - 28, 1.6, 2.2, "F");
    doc.rect(38, skyBase - 22, 1.6, 2.2, "F");
    doc.rect(74, skyBase - 24, 1.6, 2.2, "F");
    doc.rect(78, skyBase - 24, 1.6, 2.2, "F");

    doc.setFillColor(...C.gold);
    doc.circle(18, 168, 1.6, "F");
    doc.circle(18, 178, 1.1, "F");
    doc.circle(18, 186, 1.1, "F");
    doc.setDrawColor(...C.gold);
    doc.setLineWidth(1.3);
    doc.line(sidebarW - 1.2, 72, sidebarW - 1.2, pageH - 118);

    doc.setFillColor(...pageBg);
    doc.rect(sidebarW, 0, pageW - sidebarW, pageH, "F");

    const pad = 16;
    let cursor = 22;
    if (logo) {
      const maxW = sidebarW - pad * 2;
      const maxH = 46;
      const scale = Math.min(maxW / logo.width, maxH / logo.height);
      const logoW = logo.width * scale;
      const logoH = logo.height * scale;
      doc.addImage(
        logo.dataUrl,
        logo.format,
        (sidebarW - logoW) / 2,
        cursor,
        logoW,
        logoH,
      );
      cursor += logoH + 10;
    } else {
      doc.setFillColor(...C.gold);
      doc.circle(sidebarW / 2, cursor + 16, 16, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(...ink);
      doc.text(
        companyName.slice(0, 1).toUpperCase(),
        sidebarW / 2,
        cursor + 21,
        { align: "center" },
      );
      cursor += 42;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...C.white);
    const sideName = doc.splitTextToSize(companyName, sidebarW - 28);
    doc.text(sideName.slice(0, 3), sidebarW / 2, cursor + 8, { align: "center" });
    const nameBlock = Math.min(3, sideName.length) * 10;
    doc.setDrawColor(...C.gold);
    doc.setLineWidth(1.2);
    doc.line(
      sidebarW / 2 - 16,
      cursor + 14 + nameBlock,
      sidebarW / 2 + 16,
      cursor + 14 + nameBlock,
    );

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    const lead = "Mais que imóveis, realizamos ";
    const accentWord = "conexões.";
    const leadW = doc.getTextWidth(lead);
    doc.setFont("helvetica", "bold");
    const accentW = doc.getTextWidth(accentWord);
    const phraseH = leadW + accentW;
    const textX = 28;
    const textY = Math.min(pageH - 148, pageH / 2 + phraseH / 2);
    doc.setDrawColor(...C.gold);
    doc.setLineWidth(1.4);
    doc.line(textX - 10, textY + 2, textX - 10, textY - phraseH - 2);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.white);
    doc.text(lead, textX, textY, { angle: 90 });
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.gold);
    doc.text(accentWord, textX, textY - leadW, { angle: 90 });

    const footY = pageH - 18;
    doc.setDrawColor(...mutedLine);
    doc.setLineWidth(0.7);
    doc.line(mainX, footY - 4, mainX + 22, footY - 4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(120, 128, 140);
    doc.setCharSpace(0.45);
    const footName =
      doc.splitTextToSize(companyName.toUpperCase(), mainW * 0.42)[0] ??
      companyName;
    doc.text(footName, mainX + 28, footY - 1);
    doc.setCharSpace(0);
    const rightLabel = "Transparência em cada etapa.";
    doc.setFont("helvetica", "normal");
    const rightW = doc.getTextWidth(rightLabel);
    doc.text(rightLabel, mainRight, footY - 1, { align: "right" });
    doc.line(mainRight - rightW - 34, footY - 4, mainRight - rightW - 8, footY - 4);
    doc.setLineWidth(0.6);
  }

  function drawBuildingMark(x: number, y: number) {
    doc.setFillColor(...mixRgb(C.gold, C.white, 0.78));
    roundedRect(doc, x, y, 30, 30, 8, "F");
    const base = y + 23;
    doc.setFillColor(...ink);
    doc.rect(x + 5, base - 8, 5, 8, "F");
    doc.rect(x + 11.5, base - 15, 7, 15, "F");
    doc.rect(x + 19.5, base - 10, 5.5, 10, "F");
    doc.setFillColor(...C.gold);
    doc.rect(x + 13.2, base - 12, 1.4, 1.6, "F");
    doc.rect(x + 15.4, base - 12, 1.4, 1.6, "F");
    doc.rect(x + 13.2, base - 8.6, 1.4, 1.6, "F");
    doc.rect(x + 15.4, base - 8.6, 1.4, 1.6, "F");
    doc.rect(x + 6.3, base - 5.4, 1.3, 1.4, "F");
    doc.rect(x + 21, base - 7, 1.3, 1.4, "F");
  }

  function drawPersonMark(x: number, y: number) {
    doc.setFillColor(...personSoft);
    roundedRect(doc, x, y, 30, 30, 8, "F");
    doc.setFillColor(...person);
    doc.circle(x + 15, y + 11, 3.5, "F");
    doc.ellipse(x + 15, y + 22, 6.2, 4.2, "F");
  }

  function drawLayersMark(x: number, y: number) {
    doc.setFillColor(...ink);
    roundedRect(doc, x, y, 26, 26, 8, "F");
    doc.setDrawColor(...C.white);
    doc.setLineWidth(1.1);
    doc.ellipse(x + 13, y + 8, 6.2, 2.1, "S");
    doc.line(x + 6.8, y + 8, x + 6.8, y + 16.5);
    doc.line(x + 19.2, y + 8, x + 19.2, y + 16.5);
    doc.ellipse(x + 13, y + 16.5, 6.2, 2.1, "S");
    doc.ellipse(x + 13, y + 12.2, 6.2, 2.1, "S");
    doc.setLineWidth(0.6);
  }

  function drawWalletMark(x: number, y: number) {
    doc.setDrawColor(...C.white);
    doc.setLineWidth(1.15);
    doc.roundedRect(x + 6, y + 9, 18, 12, 2.5, 2.5, "S");
    doc.line(x + 8.5, y + 13, x + 21.5, y + 13);
    doc.setFillColor(...C.white);
    doc.circle(x + 19.5, y + 16.6, 1.15, "F");
    doc.setLineWidth(0.6);
  }

  function drawHeader(top: number) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(130, 140, 156);
    doc.setCharSpace(1.05);
    doc.text("PROPOSTA DE COMPRA", mainX, top + 16);
    doc.setCharSpace(0);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...ink);
    const nameLines = doc.splitTextToSize(companyName, mainW);
    doc.text(nameLines.slice(0, 2), mainX, top + 40);
    const afterName = top + 40 + Math.max(1, nameLines.slice(0, 2).length) * 20;

    doc.setFontSize(8);
    doc.setTextColor(96, 106, 122);
    doc.setCharSpace(0.85);
    doc.text("PROPOSTA COMERCIAL", mainX, afterName);
    doc.setCharSpace(0);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(120, 128, 140);
    doc.text(
      `${formatPropostaDate(p.createdAt)}    ·    ${pdfText(p.codigo, "----")}`,
      mainX,
      afterName + 16,
    );
    return afterName + 8;
  }

  function drawIdentityCards(top: number) {
    const gap = 10;
    const cardW = (mainW - gap) / 2;
    const cardH = 74;
    doc.setFillColor(...cardTint);
    roundedRect(doc, mainX, top, cardW, cardH, 12, "F");
    drawBuildingMark(mainX + 14, top + 22);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(120, 130, 148);
    doc.setCharSpace(0.45);
    doc.text("IDENTIFICAÇÃO DA IMOBILIÁRIA", mainX + 54, top + 26);
    doc.setCharSpace(0);
    doc.setFontSize(12);
    doc.setTextColor(...ink);
    const agency = doc.splitTextToSize(companyName, cardW - 72);
    doc.text(agency.slice(0, 1), mainX + 54, top + 44);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(110, 118, 132);
    const sub = doc.splitTextToSize(imobiliariaSub, cardW - 72);
    doc.text(sub.slice(0, 1), mainX + 54, top + 58);

    const rightX = mainX + cardW + gap;
    doc.setFillColor(248, 249, 252);
    doc.setDrawColor(226, 230, 236);
    doc.setLineWidth(0.7);
    roundedRect(doc, rightX, top, cardW, cardH, 12, "FD");
    drawPersonMark(rightX + 14, top + 22);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(120, 130, 148);
    doc.setCharSpace(0.5);
    doc.text("PROPONENTE", rightX + 54, top + 24);
    doc.setCharSpace(0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(140, 148, 160);
    doc.text("NOME DO CLIENTE", rightX + 54, top + 36);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...ink);
    const client = doc.splitTextToSize(
      pdfText(p.clienteNome, "----"),
      cardW - 72,
    );
    doc.text(client.slice(0, 1), rightX + 54, top + 54);
    return top + cardH;
  }

  function drawPayment(
    top: number,
    slice: CompositionLine[],
    withTotals: boolean,
    rowH: number,
  ) {
    const pad = 12;
    const titleH = 36;
    const headH = 22;
    const totalH = withTotals ? 58 : 0;
    const cardH =
      pad +
      titleH +
      headH +
      slice.length * rowH +
      (withTotals ? 10 + totalH : 0) +
      pad;

    doc.setFillColor(226, 230, 236);
    roundedRect(doc, mainX + 1.2, top + 2, mainW, cardH, 14, "F");
    doc.setFillColor(...C.white);
    doc.setDrawColor(226, 230, 236);
    doc.setLineWidth(0.6);
    roundedRect(doc, mainX, top, mainW, cardH, 14, "FD");

    drawLayersMark(mainX + 14, top + 14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...ink);
    doc.text("PLANO DE PAGAMENTO", mainX + 48, top + 24);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(130, 138, 150);
    doc.text("Condições e valores da proposta", mainX + 48, top + 36);

    let y = top + pad + titleH;
    const fractions = [0.1, 0.46, 0.22, 0.22];
    const headers = ["QTD", "DESCRIÇÃO", "VALOR", "SUBTOTAL"];
    const tableX = mainX + pad;
    const tableW = mainW - pad * 2;
    const colW = fractions.map((fraction, index) => {
      if (index === fractions.length - 1) {
        const used = fractions
          .slice(0, -1)
          .reduce((sum, value) => sum + Math.round(tableW * value), 0);
        return tableW - used;
      }
      return Math.round(tableW * fraction);
    });

    let x = tableX;
    headers.forEach((header, index) => {
      const width = colW[index]!;
      doc.setFillColor(...ink);
      doc.rect(x, y, width, headH, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...C.white);
      const align = index === 1 ? "left" : index === 0 ? "center" : "right";
      const textX =
        index === 1 ? x + 8 : index === 0 ? x + width / 2 : x + width - 8;
      doc.text(header, textX, y + 14, { align });
      x += width;
    });
    y += headH;

    slice.forEach((line, index) => {
      const cells = paymentCells(line);
      x = tableX;
      doc.setFillColor(...(index % 2 === 0 ? C.white : rowAlt));
      doc.rect(x, y, tableW, rowH, "F");
      cells.forEach((cell, cellIndex) => {
        const width = colW[cellIndex]!;
        doc.setFont("helvetica", cellIndex === 1 ? "bold" : "normal");
        doc.setFontSize(8);
        doc.setTextColor(...ink);
        const align =
          cellIndex === 1 ? "left" : cellIndex === 0 ? "center" : "right";
        const textX =
          cellIndex === 1
            ? x + 8
            : cellIndex === 0
              ? x + width / 2
              : x + width - 8;
        const shown =
          cellIndex === 1
            ? (doc.splitTextToSize(cell, width - 14)[0] ?? cell)
            : cell;
        doc.text(shown, textX, y + rowH * 0.68, { align });
        x += width;
      });
      y += rowH;
    });

    if (!withTotals) return;

    y += 10;
    const barH = totalH;
    const split = tableX + tableW * 0.52;
    doc.setFillColor(...ink);
    roundedRect(doc, tableX, y, tableW, barH, 12, "F");
    doc.setFillColor(...C.white);
    roundedRect(doc, split, y, tableX + tableW - split, barH, 12, "F");
    doc.rect(split, y, 16, barH, "F");
    doc.setDrawColor(226, 230, 236);
    doc.setLineWidth(0.6);
    doc.line(split, y + 12, split, y + barH - 12);

    doc.setFillColor(...inkSoft);
    roundedRect(doc, tableX + 10, y + (barH - 30) / 2, 30, 30, 8, "F");
    drawWalletMark(tableX + 10, y + (barH - 30) / 2);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(196, 204, 218);
    doc.setCharSpace(0.35);
    doc.text("TOTAL DA COMPOSIÇÃO", tableX + 48, y + 22);
    doc.setCharSpace(0);
    doc.setFontSize(15);
    doc.setTextColor(...C.white);
    const totalLabel = brl(propostaComposicaoTotal(p));
    doc.text(totalLabel, tableX + 48, y + 42);

    const desconto = p.desconto ?? 0;
    const negociado = propostaValorLiquido(p);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(120, 128, 140);
    doc.text("DESCONTO DO IMÓVEL", split + 16, y + 22);
    doc.setFontSize(10);
    if (desconto > 0) {
      doc.setTextColor(...danger);
      doc.text(`- ${brl(desconto)}`, tableX + tableW - 14, y + 22, {
        align: "right",
      });
    } else {
      doc.setTextColor(...ink);
      doc.text(brl(0), tableX + tableW - 14, y + 22, { align: "right" });
    }
    doc.setDrawColor(230, 234, 240);
    doc.line(split + 16, y + barH / 2, tableX + tableW - 14, y + barH / 2);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(120, 128, 140);
    doc.text("VALOR NEGOCIADO", split + 16, y + 42);
    doc.setFontSize(11);
    doc.setTextColor(...ink);
    doc.text(brl(negociado), tableX + tableW - 14, y + 42, { align: "right" });
  }

  paintPage();
  let y = 18;
  y = drawHeader(y) + 12;
  y = drawIdentityCards(y) + 12;

  const rowH = 18;
  const overhead = 12 + 36 + 22 + 12;
  const totalsBlock = 10 + 58;
  let pending = rows;
  let pageStart = y;
  let guard = 0;
  while (pending.length && guard < 8) {
    guard += 1;
    const room = contentBottom - pageStart;
    const withTotals = Math.floor((room - overhead - totalsBlock) / rowH);
    if (withTotals >= pending.length && withTotals > 0) {
      drawPayment(pageStart, pending, true, rowH);
      break;
    }
    if (pending.length === 1) {
      doc.addPage();
      paintPage();
      pageStart = 18;
      continue;
    }
    const plain = Math.max(1, Math.floor((room - overhead) / rowH));
    const count = Math.min(plain, pending.length - 1);
    drawPayment(pageStart, pending.slice(0, count), false, rowH);
    pending = pending.slice(count);
    doc.addPage();
    paintPage();
    pageStart = 18;
  }

  return doc.output("blob");
}

export async function downloadPropostaPdfCliente(
  p: Proposta,
  brand?: PropostaPdfBrand,
) {
  const filename = `proposta-cliente-${safeFilename(p.codigo)}.pdf`;
  const pdf = await buildPropostaPdfClienteResumido(p, brand);
  savePdfBlob(pdf, filename);
}

export async function downloadPropostaPdfCorretor(
  p: Proposta,
  brand?: PropostaPdfBrand,
) {
  const filename = `proposta-corretor-${safeFilename(p.codigo)}.pdf`;
  const pdf = await buildPropostaPdfFormulario(p, brand);
  savePdfBlob(pdf, filename);
}

/**
 * Compartilha o PDF pelo menu nativo do dispositivo. Quando anexos não são
 * suportados pelo navegador, baixa o arquivo e abre o WhatsApp já preenchido.
 */
export async function sharePropostaPdfWhatsApp(
  p: Proposta,
  brand?: PropostaPdfBrand,
  phoneOverride?: string | null,
) {
  const filename = `proposta-cliente-${safeFilename(p.codigo)}.pdf`;
  const pdf = await buildPropostaPdfClienteResumido(p, brand);
  const text = buildPropostaShareMessage(p);
  const file = new File([pdf], filename, { type: "application/pdf" });

  if (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    (!navigator.canShare || navigator.canShare({ files: [file] }))
  ) {
    await navigator.share({
      title: `Proposta ${p.codigo}`,
      text,
      files: [file],
    });
    return "native" as const;
  }

  savePdfBlob(pdf, filename);
  const url = getPropostaWhatsAppUrl(p, phoneOverride);
  if (url) window.open(url, "_blank", "noopener,noreferrer");
  return "fallback" as const;
}
