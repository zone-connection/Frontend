import { jsPDF } from "jspdf";
import { loadContractLogo, resolveContratoBrandHex } from "@/lib/contratos-pdf";

type Rgb = [number, number, number];

export type ListaDocumentoPdfItem = {
  titulo: string;
  descricao: string;
};

export type ListaDocumentoPdfInput = {
  nome: string;
  chave?: string | null;
  intro: string;
  aviso: string;
  itens: ListaDocumentoPdfItem[];
  brandName: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
};

function parseHex(value?: string | null): Rgb {
  const hex = value?.trim().replace(/^#/, "");
  if (!hex || !/^[\da-f]{6}$/i.test(hex)) return [7, 158, 212];
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ];
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    Math.round(a[0] * (1 - t) + b[0] * t),
    Math.round(a[1] * (1 - t) + b[1] * t),
    Math.round(a[2] * (1 - t) + b[2] * t),
  ];
}

function luminance([r, g, b]: Rgb) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function css([r, g, b]: Rgb) {
  return `rgb(${r}, ${g}, ${b})`;
}

export function listaDocumentoPaletteCss(hex?: string | null) {
  const palette = listaDocumentoPalette(hex);
  return {
    accent: css(palette.accent),
    header: css(palette.header),
    tint: css(palette.tint),
    ink: css(palette.ink),
    muted: css(palette.muted),
    page: css(palette.page),
  };
}

export function listaDocumentoPalette(hex?: string | null) {
  const raw = parseHex(hex);
  const accent = luminance(raw) < 0.22 ? mix(raw, [255, 255, 255], 0.35) : raw;
  return {
    accent,
    header: mix(accent, [7, 14, 32], 0.78),
    headerGlow: mix(accent, [7, 14, 32], 0.45),
    tint: mix(accent, [255, 255, 255], 0.9),
    card: [255, 255, 255] as Rgb,
    page: [244, 246, 248] as Rgb,
    ink: [15, 23, 42] as Rgb,
    muted: [100, 116, 139] as Rgb,
  };
}

function drawFooter(
  doc: jsPDF,
  logo: Awaited<ReturnType<typeof loadContractLogo>>,
  brandName: string,
  palette: ReturnType<typeof listaDocumentoPalette>,
) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const y = pageH - 46;
  doc.setFillColor(...palette.page);
  doc.rect(0, y - 8, pageW, 54, "F");
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.6);
  doc.line(28, y, pageW - 28, y);
  if (logo) {
    const maxH = 18;
    const scale = Math.min(72 / logo.width, maxH / logo.height);
    const w = logo.width * scale;
    const h = logo.height * scale;
    doc.addImage(logo.dataUrl, logo.format, 28, y + 10, w, h);
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...palette.muted);
  doc.text(brandName.toUpperCase(), pageW - 28, y + 20, { align: "right" });
}

function drawHeader(
  doc: jsPDF,
  logo: Awaited<ReturnType<typeof loadContractLogo>>,
  brandName: string,
  palette: ReturnType<typeof listaDocumentoPalette>,
) {
  const pageW = doc.internal.pageSize.getWidth();
  const headerH = 132;
  doc.setFillColor(...palette.header);
  doc.rect(0, 0, pageW, headerH, "F");
  doc.setFillColor(...palette.headerGlow);
  doc.circle(pageW - 40, 28, 70, "F");
  doc.setFillColor(...palette.accent);
  doc.circle(pageW - 10, 96, 46, "F");
  doc.setFillColor(...palette.header);
  doc.circle(pageW + 20, 20, 36, "F");

  const logoX = 28;
  const logoY = 28;
  let logoBottom = logoY;
  if (logo) {
    const maxW = 118;
    const maxH = 48;
    const scale = Math.min(maxW / logo.width, maxH / logo.height);
    const w = logo.width * scale;
    const h = logo.height * scale;
    doc.addImage(logo.dataUrl, logo.format, logoX, logoY, w, h);
    logoBottom = logoY + h;
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    const lines = doc.splitTextToSize(brandName, 220);
    doc.text(lines, logoX, logoY + 16);
    logoBottom = logoY + 16 + lines.length * 16;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(brandName.toUpperCase(), 28, logoBottom + 16);
}

export async function downloadListaDocumentoPdf(input: ListaDocumentoPdfInput) {
  const hex = await resolveContratoBrandHex(input.logoUrl, input.primaryColor);
  const palette = listaDocumentoPalette(hex);
  const logo = await loadContractLogo(input.logoUrl);
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 28;
  const contentW = pageW - margin * 2;

  function paintPage(continued: boolean) {
    doc.setFillColor(...palette.page);
    doc.rect(0, 0, pageW, pageH, "F");
    if (continued) {
      doc.setFillColor(...palette.header);
      doc.rect(0, 0, pageW, 36, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(input.nome, margin, 23);
      return 56;
    }
    drawHeader(doc, logo, input.brandName, palette);
    return 150;
  }

  let y = paintPage(false);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  const badge = "LISTA DE DOCUMENTOS";
  const badgeW = doc.getTextWidth(badge) + 24;
  doc.setFillColor(...palette.tint);
  doc.roundedRect(margin, y, badgeW, 18, 9, 9, "F");
  doc.setTextColor(...palette.accent);
  doc.text(badge, margin + 12, y + 12);
  y += 36;

  const prefix = input.chave ? "Tipo de renda: " : "Lista: ";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  const prefixW = doc.getTextWidth(prefix);
  const nameMax = contentW - 86;
  const nameLines = doc.splitTextToSize(input.nome, Math.max(120, nameMax - prefixW));
  doc.setTextColor(...palette.ink);
  doc.text(prefix, margin, y);
  doc.setTextColor(...palette.accent);
  doc.text(nameLines, margin + prefixW, y);
  const titleBlock = Math.max(28, nameLines.length * 24);

  const box = 62;
  const boxX = pageW - margin - box;
  const boxY = y - 18;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...palette.accent);
  doc.setLineWidth(1.4);
  doc.roundedRect(boxX, boxY, box, box, 12, 12, "FD");
  doc.setDrawColor(...palette.accent);
  doc.setLineWidth(1.3);
  doc.roundedRect(boxX + 18, boxY + 22, 26, 18, 2, 2, "S");
  doc.line(boxX + 24, boxY + 18, boxX + 24, boxY + 22);
  doc.line(boxX + 38, boxY + 18, boxX + 38, boxY + 22);
  doc.line(boxX + 24, boxY + 18, boxX + 31, boxY + 14);
  doc.line(boxX + 38, boxY + 18, boxX + 31, boxY + 14);
  const short = input.nome.length <= 14 ? input.nome : input.nome.split(/[\s/]/)[0] || input.nome;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...palette.accent);
  const label = doc.splitTextToSize(short, box - 10);
  doc.text(label, boxX + box / 2, boxY + 50, { align: "center" });

  y = Math.max(y + titleBlock, boxY + box) + 14;

  y += titleBlock + 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...palette.muted);
  const intro = doc.splitTextToSize(input.intro, contentW);
  doc.text(intro, margin, y);
  y += intro.length * 13 + 16;

  function newPage() {
    doc.addPage();
    y = paintPage(true);
  }

  input.itens.forEach((item, index) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    const titleLines = doc.splitTextToSize(`${index + 1}.  ${item.titulo}`, contentW - 78);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const descLines = item.descricao
      ? doc.splitTextToSize(item.descricao, contentW - 78)
      : [];
    const cardH = 16 + titleLines.length * 13 + (descLines.length ? descLines.length * 11 + 4 : 0) + 12;
    if (y + cardH > pageH - 64) newPage();

    doc.setFillColor(...palette.card);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.6);
    doc.roundedRect(margin, y, contentW, cardH, 10, 10, "FD");

    doc.setFillColor(...palette.tint);
    doc.roundedRect(margin + 12, y + (cardH - 28) / 2, 28, 28, 8, 8, "F");
    doc.setDrawColor(...palette.accent);
    doc.setLineWidth(1);
    const ix = margin + 20;
    const iy = y + (cardH - 28) / 2 + 7;
    doc.roundedRect(ix, iy, 12, 15, 1.5, 1.5, "S");
    doc.line(ix + 3, iy + 5, ix + 9, iy + 5);
    doc.line(ix + 3, iy + 8, ix + 9, iy + 8);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...palette.ink);
    doc.text(titleLines, margin + 50, y + 22);
    if (descLines.length) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...palette.muted);
      doc.text(descLines, margin + 50, y + 22 + titleLines.length * 13 + 2);
    }

    const check = 14;
    const checkX = margin + contentW - 26;
    const checkY = y + cardH / 2 - check / 2;
    doc.setDrawColor(...palette.accent);
    doc.setLineWidth(1.1);
    doc.roundedRect(checkX, checkY, check, check, 3, 3, "S");

    y += cardH + 8;
  });

  const avisoLines = doc.splitTextToSize(input.aviso, contentW - 78);
  const avisoH = 36 + avisoLines.length * 12;
  if (y + avisoH > pageH - 64) newPage();
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentW, avisoH, 10, 10, "FD");
  doc.setFillColor(...palette.accent);
  doc.rect(margin, y + 10, 3, avisoH - 20, "F");
  doc.setFillColor(...palette.tint);
  doc.circle(margin + 28, y + 22, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...palette.accent);
  doc.text("i", margin + 28, y + 25, { align: "center" });
  doc.setFontSize(11);
  doc.text("Importante", margin + 46, y + 26);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...palette.muted);
  doc.text(avisoLines, margin + 46, y + 42);

  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    drawFooter(doc, logo, input.brandName, palette);
  }

  const slug = input.nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  doc.save(`lista-documentos-${slug || "renda"}.pdf`);
}
