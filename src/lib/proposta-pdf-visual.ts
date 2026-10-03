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

const INK: Rgb = [22, 18, 42];
const HEADER: Rgb = [18, 16, 42];
const HEADER_HI: Rgb = [62, 42, 118];
const LAVENDER: Rgb = [236, 231, 247];
const MUTED: Rgb = [120, 112, 148];
const PAGE: Rgb = [247, 246, 252];
const LINE: Rgb = [226, 222, 236];

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
      doc.setFillColor(36, 28, 78);
      doc.triangle(pageW - 120, 0, pageW, 0, pageW, 92, "F");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(196, 188, 220);
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
      doc.setTextColor(210, 204, 230);
      doc.text("Mais que imóveis,", margin, 128);
      doc.text("realizamos conexões.", margin, 144);

      const mottoX = pageW - margin - 4;
      doc.setDrawColor(180, 170, 210);
      doc.setLineWidth(0.7);
      doc.line(pageW * 0.62, 52, pageW * 0.62, 118);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(210, 204, 230);
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
    doc.setTextColor(90, 86, 110);
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
    doc.setTextColor(90, 86, 110);
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
    doc.setDrawColor(90, 80, 130);
    doc.setLineWidth(0.7);
    doc.line(split, y + 18, split, y + barH - 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(196, 188, 220);
    doc.setCharSpace(1.2);
    doc.text("TOTAL DA COMPOSIÇÃO", margin + 22, y + 28);
    doc.setCharSpace(0);
    doc.setDrawColor(196, 188, 220);
    doc.setLineWidth(1);
    doc.line(margin + 22, y + 34, margin + 58, y + 34);
    doc.setFont("times", "normal");
    doc.setFontSize(26);
    doc.setTextColor(255, 255, 255);
    doc.text(brl(propostaComposicaoTotal(p)), margin + 22, y + 64);

    const desconto = p.desconto ?? 0;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(196, 188, 220);
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
