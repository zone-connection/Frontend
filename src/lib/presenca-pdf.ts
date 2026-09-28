import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { sampleLogoPalette } from "@/lib/brand-hue";
import type { PresencaMes, PresencaTipo } from "@/lib/presenca-api";

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

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  gerente: "Gerente",
  corretor: "Corretor",
  treinee: "Trainee",
  analista: "Analista",
  financeiro: "Financeiro",
  assistente: "Assistente",
  super_admin: "Plataforma",
};

type Rgb = [number, number, number];

const PAPER: Rgb = [248, 244, 238];
const INK: Rgb = [28, 25, 23];
const MUTED: Rgb = [120, 113, 108];
const LINE: Rgb = [214, 204, 191];
const WHITE: Rgb = [255, 255, 255];
const FALLBACK_ACCENT: Rgb = [180, 83, 9];

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
    [...fromLogo].sort((a, b) => lum(a) - lum(b))[0] ??
    mix(fallback, INK, 0.55);
  const accent =
    fromLogo.find((rgb) => lum(rgb) > 0.28 && lum(rgb) < 0.78) ??
    fromLogo.find((rgb) => rgb !== dark) ??
    fallback;
  const header = lum(dark) > 0.42 ? mix(dark, INK, 0.58) : dark;
  return {
    accent,
    header,
    paper: mix(PAPER, accent, 0.07),
    line: mix(LINE, accent, 0.16),
    rowAlt: mix(WHITE, accent, 0.06),
  };
}

function weekday(iso: string) {
  return ["D", "S", "T", "Q", "Q", "S", "S"][
    new Date(`${iso}T12:00:00`).getDay()
  ]!;
}

function num(n: number) {
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function delta(atual: number, anterior: number) {
  const d = atual - anterior;
  if (Math.abs(d) < 0.0005) return "sem variação";
  const sign = d > 0 ? "+" : "";
  return `${sign}${num(d)} vs. mês anterior`;
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
  const { accent, header, paper, line, rowAlt } = palette;

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 28;

  doc.setFillColor(...paper);
  doc.rect(0, 0, pageW, pageH, "F");
  doc.setFillColor(...accent);
  doc.rect(0, 0, 8, pageH, "F");

  const mesNome = MESES[data.mes - 1] ?? "";
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("RELATÓRIO DE FREQUÊNCIA", margin + 10, 28);

  doc.setTextColor(...INK);
  doc.setFontSize(22);
  doc.text(`${mesNome} ${data.ano}`, margin + 10, 50);

  const filtro = brand?.filtroLabel?.trim() || "Equipe completa";
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(
    `Folha de ponto · ${filtro} · comparação com ${MESES[data.resumoAnterior.mes - 1] ?? ""} ${data.resumoAnterior.ano}`,
    margin + 10,
    64,
  );

  if (logo) {
    try {
      doc.addImage(logo, "PNG", pageW - margin - 86, 22, 28, 28);
    } catch {
      /* logo inválida */
    }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text(company, pageW - margin, 38, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("Controle interno de presença", pageW - margin, 50, {
    align: "right",
  });

  const tipos = data.tipos.filter((t) => t.ativo);
  drawLegend(doc, tipos, margin + 10, 78, pageW - margin * 2 - 10);

  const head = [
    [
      "Pessoa",
      "Função",
      ...data.dias.map((d) => `${weekday(d)}\n${Number(d.slice(8))}`),
    ],
  ];
  const body = data.usuarios.map((u) => [
    u.nome,
    ROLE_LABEL[u.role] ?? u.role,
    ...data.dias.map((d) => u.dias[d]?.sigla ?? ""),
  ]);

  autoTable(doc, {
    startY: 100,
    margin: { left: margin + 6, right: margin, bottom: 92 },
    head,
    body,
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 6.4,
      cellPadding: { top: 3.5, bottom: 3.5, left: 2, right: 2 },
      textColor: INK,
      halign: "center",
      valign: "middle",
      lineColor: line,
      lineWidth: 0.3,
      minCellHeight: 16,
    },
    headStyles: {
      fillColor: header,
      textColor: WHITE,
      fontStyle: "bold",
      fontSize: 6,
      halign: "center",
    },
    columnStyles: {
      0: { halign: "left", cellWidth: 118, fontStyle: "bold" },
      1: { halign: "left", cellWidth: 54, textColor: MUTED, fontStyle: "normal" },
    },
    didParseCell: (hook) => {
      if (hook.section !== "body" || hook.column.index < 2) return;
      const user = data.usuarios[hook.row.index];
      const day = data.dias[hook.column.index - 2];
      const cell = user?.dias[day];
      if (!cell) {
        hook.cell.styles.textColor = [168, 162, 158];
        return;
      }
      const rgb = parseHex(cell.cor) ?? accent;
      hook.cell.styles.textColor = rgb;
      hook.cell.styles.fontStyle = "bold";
    },
    didDrawCell: (hook) => {
      if (hook.section !== "body" || hook.column.index < 2) return;
      const user = data.usuarios[hook.row.index];
      const day = data.dias[hook.column.index - 2];
      const cell = user?.dias[day];
      if (cell) return;
      const x = hook.cell.x + hook.cell.width / 2;
      const y = hook.cell.y + hook.cell.height / 2;
      doc.setDrawColor(...line);
      doc.setLineWidth(0.6);
      doc.line(x - 3, y, x + 3, y);
    },
    alternateRowStyles: { fillColor: rowAlt },
  });

  const tableBottom =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 110;

  drawKpis(doc, data, accent, margin + 6, Math.min(tableBottom + 14, pageH - 78), pageW);

  doc.addPage("a4", "landscape");
  doc.setFillColor(...paper);
  doc.rect(0, 0, pageW, pageH, "F");
  doc.setFillColor(...accent);
  doc.rect(0, 0, 8, pageH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("COMPARATIVO POR PESSOA", margin + 10, 28);
  doc.setFontSize(18);
  doc.setTextColor(...INK);
  doc.text(
    `${mesNome} ${data.ano}  ×  ${MESES[data.resumoAnterior.mes - 1] ?? ""} ${data.resumoAnterior.ano}`,
    margin + 10,
    50,
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(filtro, margin + 10, 64);
  drawComparativo(doc, data, header, line, rowAlt, margin + 6, 78);

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setFillColor(...accent);
    doc.rect(0, 0, 8, pageH, "F");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Gerado em ${new Date().toLocaleString("pt-BR")}  ·  ${company}  ·  ${i}/${pages}`,
      pageW / 2,
      pageH - 16,
      { align: "center" },
    );
  }

  doc.save(`presenca-${data.ano}-${String(data.mes).padStart(2, "0")}.pdf`);
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
  doc.setFontSize(7);
  for (const tipo of tipos) {
    const label = `${tipo.sigla}  ${tipo.nome}`;
    const w = doc.getTextWidth(label) + 18;
    if (cursor + w > x + maxW) break;
    const rgb = parseHex(tipo.cor) ?? FALLBACK_ACCENT;
    doc.setFillColor(...WHITE);
    doc.setDrawColor(...LINE);
    doc.roundedRect(cursor, y - 8, w, 14, 3, 3, "FD");
    doc.setFillColor(...rgb);
    doc.circle(cursor + 7, y - 1, 2.4, "F");
    doc.setTextColor(...INK);
    doc.text(label, cursor + 13, y + 1.5);
    cursor += w + 6;
  }
}

function signed(n: number) {
  if (Math.abs(n) < 0.005) return "0";
  return `${n > 0 ? "+" : ""}${num(n)}`;
}

function drawKpis(
  doc: jsPDF,
  data: PresencaMes,
  accent: Rgb,
  x: number,
  y: number,
  pageW: number,
) {
  const faltas = (data.comparativoUsuarios ?? []).reduce(
    (s, c) => s + c.atual.faltas,
    0,
  );
  const faltasAnt = (data.comparativoUsuarios ?? []).reduce(
    (s, c) => s + c.anterior.faltas,
    0,
  );
  const cards = [
    {
      label: "Média de presentes / dia",
      value: num(data.resumo.mediaVieram),
      hint: delta(data.resumo.mediaVieram, data.resumoAnterior.mediaVieram),
    },
    {
      label: "Equivalente (dias)",
      value: num(data.resumo.mediaEquivalente),
      hint: delta(
        data.resumo.mediaEquivalente,
        data.resumoAnterior.mediaEquivalente,
      ),
    },
    {
      label: `Mês anterior · ${MESES[data.resumoAnterior.mes - 1] ?? ""}`,
      value: num(data.resumoAnterior.mediaVieram),
      hint: "média de presentes no recorte",
    },
    {
      label: "Faltas no mês",
      value: String(faltas),
      hint: delta(faltas, faltasAnt),
    },
  ];
  const gap = 8;
  const width = (pageW - x - 28 - gap * 3) / 4;
  cards.forEach((card, i) => {
    const cx = x + i * (width + gap);
    doc.setFillColor(...WHITE);
    doc.setDrawColor(...LINE);
    doc.roundedRect(cx, y, width, 52, 6, 6, "FD");
    doc.setFillColor(...accent);
    doc.rect(cx, y, 4, 52, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(card.label.toUpperCase(), cx + 12, y + 14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...INK);
    doc.text(card.value, cx + 12, y + 32);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(card.hint, cx + 12, y + 44);
  });
}

function drawComparativo(
  doc: jsPDF,
  data: PresencaMes,
  header: Rgb,
  line: Rgb,
  rowAlt: Rgb,
  x: number,
  y: number,
) {
  const rows = (data.comparativoUsuarios ?? []).map((c) => [
    c.nome,
    c.equipe || ROLE_LABEL[c.role] || c.role,
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
    margin: { left: x, right: 28, bottom: 28 },
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
    body: rows.length ? rows : [["Nenhuma pessoa no recorte", "", "", "", "", "", "", "", "", "", "", "", ""]],
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 7.2,
      cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
      textColor: INK,
      halign: "center",
      valign: "middle",
      lineColor: line,
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: header,
      textColor: WHITE,
      fontStyle: "bold",
      fontSize: 6.4,
      halign: "center",
    },
    columnStyles: {
      0: { halign: "left", cellWidth: 118, fontStyle: "bold" },
      1: { halign: "left", cellWidth: 70, textColor: MUTED, fontStyle: "normal" },
    },
    alternateRowStyles: { fillColor: rowAlt },
  });
}
