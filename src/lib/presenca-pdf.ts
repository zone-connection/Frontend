import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
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
const INK: Rgb = [5, 54, 71];
const MUTED: Rgb = [100, 116, 139];
const LINE: Rgb = [226, 232, 240];
const WHITE: Rgb = [255, 255, 255];
const FALLBACK_ACCENT: Rgb = [2, 125, 194];
const SUCCESS: Rgb = [5, 150, 105];
const DANGER: Rgb = [220, 38, 38];
const INFO: Rgb = [2, 179, 238];

function parseHex(hex?: string | null): Rgb | null {
  const raw = hex?.trim().replace(/^#/, "");
  if (!raw || !/^[0-9a-fA-F]{6}$/.test(raw)) return null;
  return [
    Number.parseInt(raw.slice(0, 2), 16),
    Number.parseInt(raw.slice(2, 4), 16),
    Number.parseInt(raw.slice(4, 6), 16),
  ];
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    Math.round(a[0] * (1 - t) + b[0] * t),
    Math.round(a[1] * (1 - t) + b[1] * t),
    Math.round(a[2] * (1 - t) + b[2] * t),
  ];
}

function cssHex(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || null;
}

function lightPalette(primaryColor?: string | null) {
  const accent =
    parseHex(cssHex("--primary")) ??
    parseHex(primaryColor) ??
    FALLBACK_ACCENT;
  return {
    accent,
    paper: mix(PAPER, accent, 0.05),
    card: WHITE,
    ink: INK,
    muted: MUTED,
    line: LINE,
    success: parseHex(cssHex("--success")) ?? SUCCESS,
    danger: parseHex(cssHex("--destructive")) ?? DANGER,
    info: parseHex(cssHex("--info")) ?? INFO,
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

async function blobToDataUrl(blob: Blob): Promise<string | null> {
  return await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || "") || null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

async function logoDataUrl(url?: string | null): Promise<string | null> {
  const src = url?.trim();
  if (!src) return null;
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    return blobToDataUrl(await res.blob());
  } catch {
    return null;
  }
}

async function arrayBufferToBase64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.subarray(i, i + step));
  }
  return btoa(binary);
}

let carlitoCache: { regular: string; bold: string } | null = null;

async function loadCarlito() {
  if (carlitoCache) return carlitoCache;
  const [regularRes, boldRes] = await Promise.all([
    fetch("/fonts/Carlito-Regular.ttf"),
    fetch("/fonts/Carlito-Bold.ttf"),
  ]);
  if (!regularRes.ok || !boldRes.ok) throw new Error("Fonte indisponivel");
  carlitoCache = {
    regular: await arrayBufferToBase64(await regularRes.arrayBuffer()),
    bold: await arrayBufferToBase64(await boldRes.arrayBuffer()),
  };
  return carlitoCache;
}

async function registerFont(doc: jsPDF) {
  try {
    const fonts = await loadCarlito();
    doc.addFileToVFS("Carlito-Regular.ttf", fonts.regular);
    doc.addFont("Carlito-Regular.ttf", "Carlito", "normal");
    doc.addFileToVFS("Carlito-Bold.ttf", fonts.bold);
    doc.addFont("Carlito-Bold.ttf", "Carlito", "bold");
    return "Carlito";
  } catch {
    return "helvetica";
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
    Promise.resolve(lightPalette(brand?.primaryColor)),
  ]);
  const { accent, paper, card, ink, muted, line, success, danger, info } =
    palette;

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const font = await registerFont(doc);
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 22;

  const paint = () => {
    doc.setFillColor(...paper);
    doc.rect(0, 0, pageW, pageH, "F");
  };
  paint();

  const mesNome = MESES[data.mes - 1] ?? "";
  doc.setFont(font, "bold");
  doc.setFontSize(8);
  doc.setTextColor(...accent);
  doc.text("RELATÓRIO DE FREQUÊNCIA", margin, 28);

  doc.setTextColor(...ink);
  doc.setFontSize(26);
  doc.text(`${mesNome} ${data.ano}`, margin, 52);

  doc.setFont(font, "normal");
  doc.setFontSize(9);
  doc.setTextColor(...muted);
  doc.text(
    "Acompanhe a frequência da sua equipe de forma prática e organizada.",
    margin,
    68,
  );

  const periodo = monthRangeLabel(data.dias);
  const chipW = 210;
  const chipX = pageW - margin - chipW;
  doc.setFillColor(...card);
  doc.setDrawColor(...line);
  doc.setLineWidth(0.8);
  doc.roundedRect(chipX, 22, chipW, 42, 8, 8, "FD");
  doc.setFillColor(...accent);
  doc.roundedRect(chipX + 10, 33, 16, 16, 3, 3, "F");
  doc.setFont(font, "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...muted);
  doc.text("Período analisado", chipX + 32, 36);
  doc.setFont(font, "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...ink);
  doc.text(periodo, chipX + 32, 50);
  if (logo) {
    try {
      doc.addImage(logo, "PNG", chipX - 36, 26, 28, 28);
    } catch {
      /* logo invalida */
    }
  }

  const tipos = data.tipos.filter((t) => t.ativo);
  const cardX = margin;
  const cardW = pageW - margin * 2;
  const tableTop = 84;

  doc.setFillColor(...card);
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
    body: body.length
      ? body
      : [["Nenhuma pessoa neste recorte", "", ...data.dias.map(() => "")]],
    theme: "plain",
    styles: {
      font,
      fontSize: 6.4,
      cellPadding: { top: 5, bottom: 5, left: 1.5, right: 1.5 },
      textColor: ink,
      halign: "center",
      valign: "middle",
      minCellHeight: 22,
      overflow: "ellipsize",
    },
    headStyles: {
      fillColor: card,
      textColor: muted,
      fontStyle: "bold",
      fontSize: 5.6,
      halign: "center",
      minCellHeight: 22,
    },
    columnStyles: {
      0: {
        halign: "left",
        cellWidth: 138,
        cellPadding: { left: 32, right: 4, top: 5, bottom: 5 },
        fontStyle: "bold",
        fontSize: 7.4,
        textColor: ink,
      },
      1: {
        halign: "left",
        cellWidth: 52,
        textColor: muted,
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
        doc.setFont(font, "bold");
        doc.setFontSize(5.6);
        doc.setTextColor(...WHITE);
        doc.text(presencaInitials(user.nome) || "?", cx, cy + 1.8, {
          align: "center",
        });
        return;
      }
      if (hook.column.index < 2) return;
      const user = data.usuarios[hook.row.index];
      const day = data.dias[hook.column.index - 2];
      drawMark(
        doc,
        font,
        hook.cell.x + hook.cell.width / 2,
        hook.cell.y + hook.cell.height / 2,
        user?.dias[day],
        line,
      );
    },
  });

  const tableBottom =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 120;

  doc.setFillColor(...card);
  doc.roundedRect(cardX, tableBottom, cardW, 36, 0, 0, "F");
  doc.setFillColor(...card);
  doc.roundedRect(cardX, tableBottom + 12, cardW, 36, 14, 14, "F");
  drawLegend(doc, font, tipos, margin + 18, tableBottom + 30, pageW / 2 - 30);
  doc.setFont(font, "normal");
  doc.setFontSize(7);
  doc.setTextColor(...muted);
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
  drawKpis(doc, font, data, kpiY, pageW, margin, {
    success,
    accent,
    info,
    danger,
    muted,
    ink,
  });

  const obsY = kpiY + 78;
  if (obsY + 40 < pageH - 22) {
    doc.setFillColor(...card);
    doc.roundedRect(margin, obsY, pageW - margin * 2, 36, 10, 10, "F");
    doc.setFillColor(...accent);
    doc.circle(margin + 16, obsY + 18, 6, "F");
    doc.setFont(font, "bold");
    doc.setFontSize(8);
    doc.setTextColor(...WHITE);
    doc.text("i", margin + 16, obsY + 20.5, { align: "center" });
    doc.setTextColor(...ink);
    doc.text("Observações", margin + 28, obsY + 14);
    doc.setFont(font, "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...muted);
    doc.text(
      "Os dados de frequência são atualizados diariamente e podem sofrer pequenas variações conforme o fechamento do ponto.",
      margin + 28,
      obsY + 26,
    );
    doc.setDrawColor(...accent);
    doc.setLineWidth(1.4);
    doc.line(pageW - margin - 168, obsY + 28, pageW - margin - 132, obsY + 28);
    doc.setFontSize(7);
    doc.setTextColor(...muted);
    doc.text("Gestão eficiente, melhores resultados.", pageW - margin - 14, obsY + 26, {
      align: "right",
    });
  }

  const filtro = brand?.filtroLabel?.trim() || "Equipe completa";
  doc.addPage("a4", "landscape");
  paint();
  doc.setFont(font, "bold");
  doc.setFontSize(8);
  doc.setTextColor(...accent);
  doc.text("COMPARATIVO POR PESSOA", margin, 28);
  doc.setFontSize(18);
  doc.setTextColor(...ink);
  const mesAnt = MESES[data.resumoAnterior.mes - 1] ?? "";
  doc.text(`${mesNome} ${data.ano}  ×  ${mesAnt} ${data.resumoAnterior.ano}`, margin, 50);
  doc.setFont(font, "normal");
  doc.setFontSize(9);
  doc.setTextColor(...muted);
  doc.text(filtro, margin, 64);
  drawComparativo(doc, font, data, accent, line, ink, muted, margin, 78);

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setFont(font, "normal");
    doc.setFontSize(7);
    doc.setTextColor(...muted);
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
  font: string,
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
  const rgb = parseHex(cell.cor) ?? SUCCESS;
  const label = cell.sigla.slice(0, 3);
  doc.setFont(font, "bold");
  doc.setFontSize(6.2);
  const w = Math.max(12, doc.getTextWidth(label) + 6);
  doc.setFillColor(...mix(rgb, WHITE, 0.84));
  doc.roundedRect(x - w / 2, y - 6, w, 12, 3, 3, "F");
  doc.setTextColor(...rgb);
  doc.text(label, x, y + 2.2, { align: "center" });
}

function drawLegend(
  doc: jsPDF,
  font: string,
  tipos: PresencaTipo[],
  x: number,
  y: number,
  maxW: number,
) {
  let cursor = x;
  for (const tipo of tipos) {
    const rgb = parseHex(tipo.cor) ?? SUCCESS;
    doc.setFont(font, "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...rgb);
    const siglaW = doc.getTextWidth(tipo.sigla);
    doc.text(tipo.sigla, cursor, y + 1);
    doc.setFont(font, "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(...MUTED);
    doc.text(tipo.nome, cursor + siglaW + 4, y + 1);
    const w = siglaW + 4 + doc.getTextWidth(tipo.nome) + 12;
    if (cursor + w > x + maxW) break;
    cursor += w;
  }
}

function drawKpis(
  doc: jsPDF,
  font: string,
  data: PresencaMes,
  y: number,
  pageW: number,
  margin: number,
  theme: {
    success: Rgb;
    accent: Rgb;
    info: Rgb;
    danger: Rgb;
    muted: Rgb;
    ink: Rgb;
  },
) {
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
      wash: mix(theme.success, WHITE, 0.88),
      icon: theme.success,
      label: "Média de presentes/dia",
      value: num(data.resumo.mediaVieram),
      hint: `${signed(dVieram)} vs. mês anterior`,
      hintRgb: dVieram >= 0 ? theme.success : theme.danger,
    },
    {
      wash: mix(theme.accent, WHITE, 0.88),
      icon: theme.accent,
      label: "Equivalente (dias)",
      value: num(data.resumo.mediaEquivalente),
      hint: `${signed(dEq)} vs. mês anterior`,
      hintRgb: dEq >= 0 ? theme.success : theme.danger,
    },
    {
      wash: mix(theme.info, WHITE, 0.88),
      icon: theme.info,
      label: "Mês anterior",
      value: num(data.resumoAnterior.mediaVieram),
      hint: "média de presentes no recorte",
      hintRgb: theme.muted,
    },
    {
      wash: mix(theme.danger, WHITE, 0.88),
      icon: theme.danger,
      label: "Faltas no mês",
      value: String(faltas),
      hint: `${signed(dFalta)} vs. mês anterior`,
      hintRgb: dFalta > 0 ? theme.danger : theme.success,
    },
  ];
  const gap = 10;
  const width = (pageW - margin * 2 - gap * 3) / 4;
  cards.forEach((item, i) => {
    const cx = margin + i * (width + gap);
    doc.setFillColor(...item.wash);
    doc.roundedRect(cx, y, width, 68, 12, 12, "F");
    doc.setFillColor(...item.icon);
    doc.circle(cx + 22, y + 34, 13, "F");
    doc.setFillColor(...WHITE);
    doc.circle(cx + 22, y + 30, 4, "F");
    doc.circle(cx + 18, y + 38, 3.2, "F");
    doc.circle(cx + 26, y + 38, 3.2, "F");
    doc.setFont(font, "normal");
    doc.setFontSize(7.4);
    doc.setTextColor(...theme.muted);
    doc.text(item.label, cx + 44, y + 22);
    doc.setFont(font, "bold");
    doc.setFontSize(20);
    doc.setTextColor(...theme.ink);
    doc.text(item.value, cx + 44, y + 42);
    doc.setFont(font, "normal");
    doc.setFontSize(7);
    doc.setTextColor(...item.hintRgb);
    doc.text(item.hint, cx + 44, y + 56);
  });
}

function drawComparativo(
  doc: jsPDF,
  font: string,
  data: PresencaMes,
  accent: Rgb,
  line: Rgb,
  ink: Rgb,
  muted: Rgb,
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
      font,
      fontSize: 7.2,
      cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
      textColor: ink,
      halign: "center",
      valign: "middle",
      lineColor: line,
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: mix(accent, WHITE, 0.88),
      textColor: ink,
      fontStyle: "bold",
      fontSize: 6.4,
      halign: "center",
    },
    columnStyles: {
      0: { halign: "left", cellWidth: 118, fontStyle: "bold", textColor: ink },
      1: { halign: "left", cellWidth: 70, textColor: muted, fontStyle: "normal" },
    },
    alternateRowStyles: { fillColor: mix(PAPER, WHITE, 0.35) },
  });
}
