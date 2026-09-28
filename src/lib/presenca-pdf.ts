import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { sampleLogoPalette } from "@/lib/brand-hue";
import type { PresencaCelula, PresencaMes, PresencaTipo } from "@/lib/presenca-api";
import {
  avatarTone,
  monthRangeLabel,
  PRESENCA_ROLE_LABEL,
  presencaInitials,
  weekdayLabel,
} from "@/lib/presenca-filter";

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

type Rgb = [number, number, number];

const PAPER: Rgb = [244, 248, 252];
const INK: Rgb = [15, 40, 90];
const MUTED: Rgb = [100, 116, 139];
const LINE: Rgb = [226, 232, 240];
const WHITE: Rgb = [255, 255, 255];
const NAVY: Rgb = [15, 40, 90];
const GREEN: Rgb = [16, 185, 129];
const FALLBACK_ACCENT: Rgb = [2, 125, 194];

function parseHex(hex?: string | null): Rgb | null {
  const raw = hex?.trim().replace(/^#/, "");
  if (!raw || !/^[0-9a-fA-F]{6}$/.test(raw)) return null;
  return [
    Number.parseInt(raw.slice(0, 2), 16),
    Number.parseInt(raw.slice(2, 4), 16),
    Number.parseInt(raw.slice(4, 6), 16),
  ];
}

function lum([r, g, b]: Rgb) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    Math.round(a[0] * (1 - t) + b[0] * t),
    Math.round(a[1] * (1 - t) + b[1] * t),
    Math.round(a[2] * (1 - t) + b[2] * t),
  ];
}

async function colorsFromAdminLogo(
  logoUrl?: string | null,
  primaryColor?: string | null,
) {
  const sampled = logoUrl?.trim()
    ? await sampleLogoPalette(logoUrl.trim())
    : [];
  const fromLogo = sampled
    .map((hex) => parseHex(hex))
    .filter((rgb): rgb is Rgb => Boolean(rgb));
  const fallback = parseHex(primaryColor) ?? FALLBACK_ACCENT;
  const dark =
    [...fromLogo].sort((a, b) => lum(a) - lum(b))[0] ?? mix(fallback, NAVY, 0.55);
  const accent =
    fromLogo.find((rgb) => lum(rgb) > 0.28 && lum(rgb) < 0.78) ??
    fromLogo.find((rgb) => rgb !== dark) ??
    fallback;
  const title = lum(dark) > 0.42 ? mix(dark, NAVY, 0.7) : dark;
  return {
    accent,
    title,
    paper: mix(PAPER, accent, 0.04),
    line: mix(LINE, accent, 0.08),
  };
}

function num(n: number) {
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function signed(n: number) {
  if (Math.abs(n) < 0.005) return "0";
  return `${n > 0 ? "+" : ""}${num(n)}`;
}

async function logoDataUrl(url?: string | null): Promise<string | null> {
  const src = url?.trim();
  if (!src) return null;
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || "") || null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export type PresencaPdfBrand = {
  logoUrl?: string | null;
  companyName?: string | null;
  primaryColor?: string | null;
  filtroLabel?: string | null;
};

export async function downloadPresencaPdf(
  data: PresencaMes,
  brand?: PresencaPdfBrand | null,
) {
  const company = brand?.companyName?.trim() || "Zone Connection";
  const [logo, palette] = await Promise.all([
    logoDataUrl(brand?.logoUrl),
    colorsFromAdminLogo(brand?.logoUrl, brand?.primaryColor),
  ]);
  const { accent, title, paper, line } = palette;
  const filtro = brand?.filtroLabel?.trim() || "Equipe completa";

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 22;

  const paint = () => {
    doc.setFillColor(...paper);
    doc.rect(0, 0, pageW, pageH, "F");
  };
  paint();

  const mesNome = MESES[data.mes - 1] ?? "";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...accent);
  doc.text("RELATÓRIO DE FREQUÊNCIA", margin, 28);

  doc.setTextColor(...title);
  doc.setFontSize(26);
  doc.text(`${mesNome} ${data.ano}`, margin, 52);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(
    "Acompanhe a frequência da sua equipe de forma prática e organizada.",
    margin,
    68,
  );

  const periodo = monthRangeLabel(data.dias);
  const chipW = 210;
  const chipX = pageW - margin - chipW;
  doc.setFillColor(...WHITE);
  doc.setDrawColor(...line);
  doc.setLineWidth(0.8);
  doc.roundedRect(chipX, 22, chipW, 42, 8, 8, "FD");
  doc.setFillColor(...accent);
  doc.roundedRect(chipX + 10, 33, 16, 16, 3, 3, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text("Período analisado", chipX + 32, 36);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...title);
  doc.text(periodo, chipX + 32, 50);
  if (logo) {
    try {
      doc.addImage(logo, "PNG", chipX - 36, 26, 28, 28);
    } catch {
      /* logo inválida */
    }
  }

  const tipos = data.tipos.filter((t) => t.ativo);
  const cardX = margin;
  const cardW = pageW - margin * 2;
  const tableTop = 84;

  doc.setFillColor(...WHITE);
  doc.roundedRect(cardX, tableTop, cardW, 8, 14, 14, "F");

  const head = [
    [
      "Colaborador",
      "Função",
      ...data.dias.map((d) => `${weekdayLabel(d)}\n${Number(d.slice(8))}`),
    ],
  ];
  const body = data.usuarios.map((u) => [
    u.nome,
    PRESENCA_ROLE_LABEL[u.role] ?? u.role,
    ...data.dias.map(() => ""),
  ]);

  autoTable(doc, {
    startY: tableTop + 10,
    margin: { left: margin + 10, right: margin + 10, bottom: 168 },
    head,
    body: body.length ? body : [["Nenhuma pessoa neste recorte", "", ...data.dias.map(() => "")]],
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 6.2,
      cellPadding: { top: 5, bottom: 5, left: 1.5, right: 1.5 },
      textColor: INK,
      halign: "center",
      valign: "middle",
      minCellHeight: 22,
      overflow: "hidden",
    },
    headStyles: {
      fillColor: WHITE,
      textColor: MUTED,
      fontStyle: "bold",
      fontSize: 5.4,
      halign: "center",
      minCellHeight: 22,
    },
    columnStyles: {
      0: {
        halign: "left",
        cellWidth: 128,
        cellPadding: { left: 30, right: 4, top: 5, bottom: 5 },
        fontStyle: "bold",
        fontSize: 7.2,
        textColor: title,
      },
      1: {
        halign: "left",
        cellWidth: 52,
        textColor: MUTED,
        fontStyle: "normal",
        fontSize: 7,
      },
    },
    didParseCell: (hook) => {
      if (hook.section === "body" && hook.column.index >= 2) {
        hook.cell.text = [""];
      }
    },
    didDrawCell: (hook) => {
      if (hook.section === "head" && hook.column.index >= 2) {
        doc.setDrawColor(...line);
        doc.setLineWidth(0.3);
        doc.line(
          hook.cell.x,
          hook.cell.y + hook.cell.height,
          hook.cell.x + hook.cell.width,
          hook.cell.y + hook.cell.height,
        );
      }
      if (hook.section !== "body") return;
      if (hook.column.index === 0) {
        const user = data.usuarios[hook.row.index];
        if (!user) return;
        const rgb = parseHex(avatarTone(user.userId)) ?? accent;
        const cx = hook.cell.x + 14;
        const cy = hook.cell.y + hook.cell.height / 2;
        doc.setFillColor(...rgb);
        doc.circle(cx, cy, 8, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(5.4);
        doc.setTextColor(...WHITE);
        doc.text(presencaInitials(user.nome) || "?", cx, cy + 1.8, {
          align: "center",
        });
        return;
      }
      if (hook.column.index < 2) return;
      const user = data.usuarios[hook.row.index];
      const day = data.dias[hook.column.index - 2];
      const cell = user?.dias[day];
      drawMark(doc, hook.cell.x + hook.cell.width / 2, hook.cell.y + hook.cell.height / 2, cell, line);
    },
  });

  const tableBottom =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 120;

  doc.setFillColor(...WHITE);
  doc.roundedRect(cardX, tableBottom, cardW, 36, 0, 0, "F");
  doc.setFillColor(...WHITE);
  doc.roundedRect(cardX, tableBottom + 12, cardW, 36, 14, 14, "F");
  drawLegend(doc, tipos, margin + 18, tableBottom + 30, pageW / 2 - 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(
    `Média de presentes/dia: ${num(data.resumo.mediaVieram)}   ·   Equivalente: ${num(data.resumo.mediaEquivalente)}   ·   vs mês ant.: ${num(data.resumoAnterior.mediaVieram)}`,
    pageW - margin - 14,
    tableBottom + 32,
    { align: "right" },
  );

  let kpiY = tableBottom + 62;
  if (kpiY + 88 > pageH - 46) {
    doc.addPage("a4", "landscape");
    paint();
    kpiY = 28;
  }
  drawKpis(doc, data, kpiY, pageW, margin);

  const obsY = kpiY + 78;
  if (obsY + 40 < pageH - 22) {
    doc.setFillColor(...WHITE);
    doc.roundedRect(margin, obsY, pageW - margin * 2, 36, 10, 10, "F");
    doc.setFillColor(...accent);
    doc.circle(margin + 16, obsY + 18, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...WHITE);
    doc.text("i", margin + 16, obsY + 20.5, { align: "center" });
    doc.setTextColor(...title);
    doc.text("Observações", margin + 28, obsY + 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(
      "Os dados de frequência são atualizados diariamente e podem sofrer pequenas variações conforme o fechamento do ponto.",
      margin + 28,
      obsY + 26,
    );
    doc.setDrawColor(...accent);
    doc.setLineWidth(1.4);
    doc.line(pageW - margin - 168, obsY + 28, pageW - margin - 132, obsY + 28);
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text("Gestão eficiente, melhores resultados.", pageW - margin - 14, obsY + 26, {
      align: "right",
    });
  }

  doc.addPage("a4", "landscape");
  paint();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...accent);
  doc.text("COMPARATIVO POR PESSOA", margin, 28);
  doc.setFontSize(18);
  doc.setTextColor(...title);
  doc.text(
    `${mesNome} ${data.ano}  ×  ${MESES[data.resumoAnterior.mes - 1] ?? ""} ${data.resumoAnterior.ano}`,
    margin,
    50,
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(filtro, margin, 64);
  drawComparativo(doc, data, accent, line, title, margin, 78);

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "normal");
    doc.text(
      `${company}  ·  Gerado em ${new Date().toLocaleString("pt-BR")}  ·  ${i}/${pages}`,
      pageW / 2,
      pageH - 12,
      { align: "center" },
    );
  }

  doc.save(`presenca-${data.ano}-${String(data.mes).padStart(2, "0")}.pdf`);
}

function drawMark(
  doc: jsPDF,
  x: number,
  y: number,
  cell: PresencaCelula | null | undefined,
  line: Rgb,
) {
  if (!cell) {
    doc.setDrawColor(...line);
    doc.setLineWidth(0.7);
    doc.circle(x, y, 2.4, "S");
    return;
  }
  if (cell.natureza === "presente") {
    const rgb = parseHex(cell.cor) ?? GREEN;
    doc.setFillColor(...rgb);
    doc.circle(x, y, 3.1, "F");
    return;
  }
  const rgb = parseHex(cell.cor) ?? GREEN;
  const label = cell.sigla.slice(0, 3);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.6);
  const w = Math.max(14, doc.getTextWidth(label) + 8);
  doc.setFillColor(...mix(rgb, WHITE, 0.82));
  doc.roundedRect(x - w / 2, y - 6, w, 12, 3, 3, "F");
  doc.setTextColor(...rgb);
  doc.text(label, x, y + 2.2, { align: "center" });
}

function drawLegend(
  doc: jsPDF,
  tipos: PresencaTipo[],
  x: number,
  y: number,
  maxW: number,
) {
  let cursor = x;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  for (const tipo of tipos) {
    const label = tipo.nome;
    const w = doc.getTextWidth(label) + 16;
    if (cursor + w > x + maxW) break;
    const rgb = parseHex(tipo.cor) ?? GREEN;
    if (tipo.natureza === "presente") {
      doc.setFillColor(...rgb);
      doc.circle(cursor + 3, y - 1.5, 2.6, "F");
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6);
      doc.setTextColor(...rgb);
      doc.text(tipo.sigla, cursor, y + 1);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.8);
      cursor += doc.getTextWidth(tipo.sigla) + 3;
    }
    doc.setTextColor(...MUTED);
    doc.text(label, cursor + 8, y + 1);
    cursor += w + 10;
  }
}

function drawKpis(doc: jsPDF, data: PresencaMes, y: number, pageW: number, margin: number) {
  const faltas = (data.comparativoUsuarios ?? []).reduce(
    (s, c) => s + c.atual.faltas,
    0,
  );
  const faltasAnt = (data.comparativoUsuarios ?? []).reduce(
    (s, c) => s + c.anterior.faltas,
    0,
  );
  const dVieram = data.resumo.mediaVieram - data.resumoAnterior.mediaVieram;
  const dEq = data.resumo.mediaEquivalente - data.resumoAnterior.mediaEquivalente;
  const dFalta = faltas - faltasAnt;
  const cards = [
    {
      wash: [232, 250, 240] as Rgb,
      icon: [16, 185, 129] as Rgb,
      label: "Média de presentes/dia",
      value: num(data.resumo.mediaVieram),
      hint: `${signed(dVieram)} vs. mês anterior`,
      hintRgb: dVieram >= 0 ? GREEN : ([244, 63, 94] as Rgb),
    },
    {
      wash: [232, 242, 255] as Rgb,
      icon: [37, 99, 235] as Rgb,
      label: "Equivalente (dias)",
      value: num(data.resumo.mediaEquivalente),
      hint: `${signed(dEq)} vs. mês anterior`,
      hintRgb: dEq >= 0 ? GREEN : ([244, 63, 94] as Rgb),
    },
    {
      wash: [243, 236, 255] as Rgb,
      icon: [139, 92, 246] as Rgb,
      label: "Mês anterior",
      value: num(data.resumoAnterior.mediaVieram),
      hint: "média de presentes no recorte",
      hintRgb: MUTED,
    },
    {
      wash: [255, 236, 238] as Rgb,
      icon: [244, 63, 94] as Rgb,
      label: "Faltas no mês",
      value: String(faltas),
      hint: `${signed(dFalta)} vs. mês anterior`,
      hintRgb: dFalta > 0 ? ([244, 63, 94] as Rgb) : GREEN,
    },
  ];
  const gap = 10;
  const width = (pageW - margin * 2 - gap * 3) / 4;
  cards.forEach((card, i) => {
    const cx = margin + i * (width + gap);
    doc.setFillColor(...card.wash);
    doc.roundedRect(cx, y, width, 68, 12, 12, "F");
    doc.setFillColor(...card.icon);
    doc.circle(cx + 22, y + 34, 13, "F");
    doc.setFillColor(...WHITE);
    doc.circle(cx + 22, y + 30, 4, "F");
    doc.circle(cx + 18, y + 38, 3.2, "F");
    doc.circle(cx + 26, y + 38, 3.2, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.4);
    doc.setTextColor(...MUTED);
    doc.text(card.label, cx + 44, y + 22);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...NAVY);
    doc.text(card.value, cx + 44, y + 42);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...card.hintRgb);
    doc.text(card.hint, cx + 44, y + 56);
  });
}

function drawComparativo(
  doc: jsPDF,
  data: PresencaMes,
  accent: Rgb,
  line: Rgb,
  title: Rgb,
  x: number,
  y: number,
) {
  const rows = (data.comparativoUsuarios ?? []).map((c) => [
    c.nome,
    c.equipe || PRESENCA_ROLE_LABEL[c.role] || c.role,
    String(c.atual.presentes),
    String(c.anterior.presentes),
    signed(c.atual.presentes - c.anterior.presentes),
    num(c.atual.equivalente),
    num(c.anterior.equivalente),
    signed(c.atual.equivalente - c.anterior.equivalente),
    String(c.atual.faltas),
    String(c.anterior.faltas),
    signed(c.atual.faltas - c.anterior.faltas),
    String(c.atual.justificadas),
    String(c.anterior.justificadas),
  ]);
  autoTable(doc, {
    startY: y,
    margin: { left: x, right: 22, bottom: 28 },
    head: [
      [
        "Pessoa",
        "Equipe",
        "Vieram",
        "Mês ant.",
        "Δ",
        "Equiv.",
        "Mês ant.",
        "Δ",
        "Faltas",
        "Mês ant.",
        "Δ",
        "Just.",
        "Mês ant.",
      ],
    ],
    body: rows.length
      ? rows
      : [["Nenhuma pessoa no recorte", "", "", "", "", "", "", "", "", "", "", "", ""]],
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 7.2,
      cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
      textColor: INK,
      halign: "center",
      valign: "middle",
      lineColor: line,
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: mix(accent, WHITE, 0.12),
      textColor: title,
      fontStyle: "bold",
      fontSize: 6.4,
      halign: "center",
    },
    columnStyles: {
      0: { halign: "left", cellWidth: 118, fontStyle: "bold", textColor: title },
      1: { halign: "left", cellWidth: 70, textColor: MUTED, fontStyle: "normal" },
    },
    alternateRowStyles: { fillColor: mix(PAPER, WHITE, 0.4) },
  });
}
