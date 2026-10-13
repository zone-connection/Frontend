import { jsPDF } from "jspdf";
import { brl } from "@/lib/crm-types";
import {
  formatPropostaDate,
  PROPOSTA_COMPOSICAO_LABEL,
  PROPOSTA_LISTA_KEYS,
  PROPOSTA_SIMPLES_KEYS,
  propostaComposicaoTotal,
  propostaValorLiquido,
  type Proposta,
  type PropostaListaKey,
  type PropostaSimplesKey,
} from "@/lib/propostas-api";
import type { TenantBranding } from "@/lib/auth";
import { parseHexRgb, sampleLogoPalette } from "@/lib/brand-hue";

type PropostaPdfBrand = {
  logoUrl?: string | null;
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

type Rgb = [number, number, number];

const BRAND_SEED: Rgb = [7, 158, 212];

export type PropostaVisualPalette = {
  ink: string;
  header: string;
  accent: string;
  accentDeep: string;
  mist: string;
  muted: string;
  wash: string;
  page: string;
  line: string;
  divider: string;
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
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [h * 60, s, l];
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const hue = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function rgbHex(rgb: Rgb) {
  return `#${rgb.map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function paletteFromSeeds(seeds: Rgb[]): PropostaVisualPalette {
  const scored = (seeds.length ? seeds : [BRAND_SEED]).map((rgb) => {
    const [h, s, l] = rgbToHsl(...rgb);
    return { rgb, h, s, l };
  });
  const brand =
    [...scored].sort((a, b) => b.s - a.s || a.l - b.l)[0] ?? scored[0]!;
  const accent =
    [...scored]
      .filter((item) => {
        if (item === brand || item.s < 0.16) return false;
        const gap = Math.min(
          Math.abs(item.h - brand.h),
          360 - Math.abs(item.h - brand.h),
        );
        return gap > 14;
      })
      .sort((a, b) => b.s - a.s)[0] ?? null;
  const hue = brand.h;
  const sat = clamp(Math.max(brand.s, accent?.s ?? 0.35), 0.22, 0.72);
  const header = hslToRgb(hue, sat, 0.14);
  const hi = accent?.rgb ?? hslToRgb(hue, clamp(sat + 0.08, 0, 0.8), 0.4);
  return {
    ink: rgbHex(hslToRgb(hue, clamp(sat, 0, 0.45), 0.12)),
    header: rgbHex(header),
    accent: rgbHex(hi),
    accentDeep: rgbHex(mixRgb(header, hi, 0.42)),
    mist: rgbHex(hslToRgb(hue, clamp(sat * 0.45, 0, 0.35), 0.82)),
    muted: rgbHex(hslToRgb(hue, clamp(sat * 0.35, 0, 0.28), 0.42)),
    wash: rgbHex(hslToRgb(hue, clamp(sat * 0.35, 0, 0.3), 0.94)),
    page: rgbHex(hslToRgb(hue, clamp(sat * 0.28, 0, 0.22), 0.975)),
    line: rgbHex(hslToRgb(hue, clamp(sat * 0.22, 0, 0.2), 0.88)),
    divider: rgbHex(mixRgb(header, hi, 0.55)),
  };
}

export async function resolvePropostaVisualPalette(
  logoUrl?: string | null,
  primaryColor?: string | null,
): Promise<PropostaVisualPalette> {
  const fromLogo = logoUrl?.trim() ? await sampleLogoPalette(logoUrl) : [];
  const logoSeeds = fromLogo
    .map((hex) => parseHexRgb(hex))
    .filter((rgb): rgb is Rgb => rgb != null);
  const fallback = parseHexRgb(primaryColor ?? "");
  const seeds = logoSeeds.length ? logoSeeds : fallback ? [fallback] : [];
  return paletteFromSeeds(seeds);
}

function asRgb(hex: string, fallback: Rgb): Rgb {
  return parseHexRgb(hex) ?? fallback;
}

const ORDER = [
  "SINAL",
  "PRÉ-CHAVES",
  "PÓS-CHAVES",
  "INTERCALADAS",
  "FGTS",
  "MORA BEM",
  "MCMV",
  "FINANCIAMENTO",
  "PARCELA CAIXA (INFORMATIVO)",
] as const;

function splitAgencyName(name: string) {
  const trimmed = name.trim() || "Imobiliária";
  const match = trimmed.match(/^(imobili[áa]ria)\s+(.+)$/i);
  if (match?.[1] && match[2]) {
    return {
      kicker: match[1].toUpperCase(),
      display: match[2].toUpperCase(),
    };
  }
  return { kicker: "IMOBILIÁRIA", display: trimmed.toUpperCase() };
}

function pdfText(value: unknown, fallback = "—") {
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number") return String(value);
  return fallback;
}

type PayRow = { qtd: string; descricao: string; valor: string; subtotal: string };

function paymentRows(p: Proposta): PayRow[] {
  const rows: PayRow[] = [];
  for (const key of PROPOSTA_SIMPLES_KEYS) {
    const value = p[key as PropostaSimplesKey];
    if (value == null) continue;
    rows.push({
      qtd: "1",
      descricao: PROPOSTA_COMPOSICAO_LABEL[key].toUpperCase(),
      valor: brl(value),
      subtotal: brl(value),
    });
  }
  for (const key of PROPOSTA_LISTA_KEYS) {
    const values = p[key as PropostaListaKey] ?? [];
    if (!values.length) continue;
    const subtotal = values.reduce((sum, n) => sum + n, 0);
    const equal = values.every((n) => n === values[0]);
    rows.push({
      qtd: String(values.length),
      descricao: PROPOSTA_COMPOSICAO_LABEL[key].toUpperCase(),
      valor: equal ? brl(values[0] ?? 0) : "valores variados",
      subtotal: brl(subtotal),
    });
  }
  return rows.sort((a, b) => {
    const ia = ORDER.indexOf(a.descricao as (typeof ORDER)[number]);
    const ib = ORDER.indexOf(b.descricao as (typeof ORDER)[number]);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

export async function buildPropostaPdfVisual(
  p: Proposta,
  brand?: PropostaPdfBrand,
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 42;
  const contentW = pageW - margin * 2;
  const companyName = brand?.company?.name?.trim() || "Imobiliária";
  const { kicker, display } = splitAgencyName(companyName);
  const headerH = 168;
  const propertyBits = [
    p.empreendimento?.nome?.trim(),
    p.unidade?.trim() ? `Un. ${p.unidade.trim()}` : "",
  ].filter(Boolean);
  const imobiliariaSub = propertyBits.length
    ? propertyBits.join("  ·  ").toUpperCase()
    : (brand?.company?.endereco || brand?.company?.cidade || "PROPOSTA COMERCIAL").toUpperCase();

  const palette = await resolvePropostaVisualPalette(
    brand?.logoUrl,
    brand?.primaryColor,
  );
  const INK = asRgb(palette.ink, BRAND_SEED);
  const HEADER = asRgb(palette.header, BRAND_SEED);
  const HEADER_HI = asRgb(palette.accent, BRAND_SEED);
  const HEADER_DEEP = asRgb(palette.accentDeep, BRAND_SEED);
  const LAVENDER = asRgb(palette.wash, BRAND_SEED);
  const MUTED = asRgb(palette.muted, BRAND_SEED);
  const PAGE = asRgb(palette.page, BRAND_SEED);
  const LINE = asRgb(palette.line, BRAND_SEED);
  const MIST = asRgb(palette.mist, [210, 220, 230]);
  const DIVIDER = asRgb(palette.divider, BRAND_SEED);
  const rows = paymentRows(p);
  const tableRows = rows.length
    ? rows
    : [
        {
          qtd: "—",
          descricao: "NENHUMA COMPOSIÇÃO INFORMADA",
          valor: "—",
          subtotal: "—",
        },
      ];

  function paintChrome(withHeader: boolean) {
    doc.setFillColor(...PAGE);
    doc.rect(0, 0, pageW, pageH, "F");
    if (withHeader) {
      doc.setFillColor(...HEADER);
      doc.rect(0, 0, pageW, headerH, "F");
      doc.setFillColor(...HEADER_HI);
      doc.triangle(pageW - 210, 0, pageW, 0, pageW, headerH + 8, "F");
      doc.setFillColor(...HEADER_DEEP);
      doc.triangle(pageW - 120, 0, pageW, 0, pageW, 92, "F");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...MIST);
      doc.setCharSpace(3.2);
      doc.text(kicker, margin, 48);
      doc.setCharSpace(0);

      doc.setFont("times", "normal");
      doc.setFontSize(32);
      doc.setTextColor(255, 255, 255);
      const title = doc.splitTextToSize(display, contentW * 0.58);
      doc.text(title.slice(0, 2), margin, 84);

      doc.setFont("times", "italic");
      doc.setFontSize(11);
      doc.setTextColor(...MIST);
      doc.text("Mais que imóveis,", margin, 128);
      doc.text("realizamos conexões.", margin, 144);

      const mottoX = pageW - margin - 4;
      doc.setDrawColor(...MIST);
      doc.setLineWidth(0.7);
      doc.line(pageW * 0.62, 52, pageW * 0.62, 118);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...MIST);
      doc.setCharSpace(1.4);
      doc.text("TRANSPARÊNCIA", mottoX, 78, { align: "right" });
      doc.text("EM CADA ETAPA.", mottoX, 94, { align: "right" });
      doc.setCharSpace(0);
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.setCharSpace(0.6);
    doc.text(companyName.toUpperCase(), margin, pageH - 28);
    doc.setCharSpace(0);
    doc.setFont("times", "italic");
    doc.setFontSize(8);
    doc.text("Seu próximo capítulo começa aqui.", margin, pageH - 16);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.6);
    doc.line(margin + 210, pageH - 20, pageW - margin - 90, pageH - 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...INK);
    doc.text(pdfText(p.codigo, "----"), pageW - margin, pageH - 18, {
      align: "right",
    });
  }

  function drawIntro(top: number) {
    const colW = (contentW - 28) / 2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.setCharSpace(1.6);
    doc.text("PROPOSTA DE COMPRA", margin, top);
    doc.setCharSpace(0);

    doc.setFont("times", "normal");
    doc.setFontSize(22);
    doc.setTextColor(...INK);
    const nameLines = doc.splitTextToSize(companyName.toUpperCase(), colW);
    doc.text(nameLines.slice(0, 2), margin, top + 28);
    const afterName = top + 28 + Math.max(1, nameLines.slice(0, 2).length) * 24;

    doc.setDrawColor(...INK);
    doc.setLineWidth(1.1);
    doc.line(margin, afterName + 4, margin + 36, afterName + 4);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.setCharSpace(1.2);
    doc.text("PROPOSTA COMERCIAL", margin, afterName + 22);
    doc.setCharSpace(0);
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(
      `${formatPropostaDate(p.createdAt)}  ·  ${pdfText(p.codigo, "----")}`,
      margin,
      afterName + 38,
    );

    const rightX = margin + colW + 28;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.setCharSpace(1.1);
    doc.text("IDENTIFICAÇÃO DA IMOBILIÁRIA", rightX, top);
    doc.setCharSpace(0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(companyName.toUpperCase(), rightX, top + 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTED);
    const sub = doc.splitTextToSize(imobiliariaSub, colW);
    doc.text(sub.slice(0, 2), rightX, top + 34);

    const lineY = top + 34 + Math.max(1, sub.slice(0, 2).length) * 12 + 10;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.6);
    doc.line(rightX, lineY, rightX + colW, lineY);

    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.setCharSpace(1.1);
    doc.text("PROPONENTE", rightX, lineY + 18);
    doc.setCharSpace(0);
    doc.setFontSize(7);
    doc.text("NOME DO CLIENTE", rightX, lineY + 32);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    const client = doc.splitTextToSize(
      pdfText(p.clienteNome, "----").toUpperCase(),
      colW,
    );
    doc.text(client.slice(0, 2), rightX, lineY + 48);
    return Math.max(afterName + 52, lineY + 48 + 20);
  }

  function drawTable(
    top: number,
    slice: PayRow[],
    withTitle: boolean,
    withTotals: boolean,
  ) {
    let y = top;
    if (withTitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(...INK);
      doc.setCharSpace(1.4);
      doc.text("PLANO DE PAGAMENTO", margin, y);
      doc.setCharSpace(0);
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
      doc.text("Condições e valores da proposta", margin, y + 16);
      y += 32;
    }

    const cols = [0.12, 0.4, 0.24, 0.24].map((f) => f * contentW);
    const headH = 28;
    const rowH = 28;
    doc.setFillColor(...LAVENDER);
    doc.roundedRect(margin, y, contentW, headH, 6, 6, "F");
    doc.rect(margin, y + 14, contentW, 14, "F");
    const headers = ["QTD", "DESCRIÇÃO", "VALOR", "SUBTOTAL"];
    let x = margin;
    headers.forEach((header, i) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED);
      doc.setCharSpace(0.8);
      const align = i === 0 || i === 1 ? "left" : "right";
      const tx = i === 0 || i === 1 ? x + 14 : x + cols[i]! - 14;
      doc.text(header, tx, y + 18, { align });
      doc.setCharSpace(0);
      x += cols[i]!;
    });
    y += headH;

    slice.forEach((row) => {
      x = margin;
      const cells = [row.qtd, row.descricao, row.valor, row.subtotal];
      cells.forEach((cell, i) => {
        doc.setFont("helvetica", i === 1 || i === 3 ? "bold" : "normal");
        doc.setFontSize(9);
        doc.setTextColor(...INK);
        const align = i === 0 || i === 1 ? "left" : "right";
        const tx = i === 0 || i === 1 ? x + 14 : x + cols[i]! - 14;
        const shown = doc.splitTextToSize(cell, cols[i]! - 22)[0] ?? cell;
        doc.text(shown, tx, y + 18, { align });
        x += cols[i]!;
      });
      y += rowH;
    });

    if (!withTotals) return y;

    y += 16;
    const barH = 86;
    doc.setFillColor(...HEADER);
    doc.roundedRect(margin, y, contentW, barH, 10, 10, "F");
    const split = margin + contentW * 0.52;
    doc.setDrawColor(...DIVIDER);
    doc.setLineWidth(0.7);
    doc.line(split, y + 18, split, y + barH - 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MIST);
    doc.setCharSpace(1.2);
    doc.text("TOTAL DA COMPOSIÇÃO", margin + 22, y + 28);
    doc.setCharSpace(0);
    doc.setDrawColor(...MIST);
    doc.setLineWidth(1);
    doc.line(margin + 22, y + 34, margin + 58, y + 34);
    doc.setFont("times", "normal");
    doc.setFontSize(26);
    doc.setTextColor(255, 255, 255);
    doc.text(brl(propostaComposicaoTotal(p)), margin + 22, y + 64);

    const desconto = p.desconto ?? 0;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MIST);
    doc.setCharSpace(0.8);
    doc.text("DESCONTO DO IMÓVEL", split + 22, y + 32);
    doc.text("VALOR NEGOCIADO", split + 22, y + 58);
    doc.setCharSpace(0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(brl(desconto), pageW - margin - 22, y + 32, { align: "right" });
    doc.setFontSize(12);
    doc.text(brl(propostaValorLiquido(p)), pageW - margin - 22, y + 58, {
      align: "right",
    });
    return y + barH;
  }

  paintChrome(true);
  let y = drawIntro(headerH + 36);
  y += 18;
  const footerReserve = 48;
  const rowH = 28;
  const titleBlock = 32;
  const totalsBlock = 16 + 86;
  let pending = tableRows;
  let first = true;
  let guard = 0;
  while (pending.length && guard < 8) {
    guard += 1;
    const room = pageH - footerReserve - y;
    const titleH = first ? titleBlock : 0;
    const fitWithTotals = Math.floor(
      (room - titleH - totalsBlock) / rowH,
    );
    if (fitWithTotals >= pending.length && fitWithTotals > 0) {
      drawTable(y, pending, first, true);
      break;
    }
    const fitPlain = Math.max(1, Math.floor((room - titleH) / rowH));
    const count = Math.min(fitPlain, Math.max(1, pending.length - 1));
    if (count >= pending.length) {
      drawTable(y, pending, first, true);
      break;
    }
    drawTable(y, pending.slice(0, count), first, false);
    pending = pending.slice(count);
    first = false;
    doc.addPage();
    paintChrome(false);
    y = 48;
  }

  return doc.output("blob");
}
