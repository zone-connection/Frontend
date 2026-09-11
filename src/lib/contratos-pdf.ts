import { jsPDF } from "jspdf";
import type { ContratoTemplateId } from "@/lib/contratos-templates";

type Values = Record<string, string>;

function v(values: Values, key: string) {
  return (values[key] ?? "").trim() || "____________";
}

function formatDateBr(iso: string) {
  if (!iso) return "____/____/________";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function formatCartaDate(values: Values) {
  if (values.data?.trim()) {
    const [year, month, day] = values.data.slice(0, 10).split("-");
    const monthIndex = Number(month) - 1;
    const months = [
      "JANEIRO",
      "FEVEREIRO",
      "MARÇO",
      "ABRIL",
      "MAIO",
      "JUNHO",
      "JULHO",
      "AGOSTO",
      "SETEMBRO",
      "OUTUBRO",
      "NOVEMBRO",
      "DEZEMBRO",
    ];
    if (year && day && Number.isInteger(monthIndex) && months[monthIndex]) {
      return `${day} DE ${months[monthIndex]} DE ${year}`;
    }
  }
  return `${v(values, "dia")} DE ${v(values, "mes").toUpperCase()} DE 20${v(values, "ano")}`;
}

function safeName(raw: string) {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.-]+/g, "_")
    .slice(0, 40);
}

type LoadedLogo = {
  dataUrl: string;
  format: "PNG" | "JPEG";
  width: number;
  height: number;
  /** HEX predominante obtido dos pixels da própria logo. */
  primaryHex: string | null;
};

type Rgb = [number, number, number];

const TITLE_BLACK: Rgb = [20, 20, 20];
/** Corpo do modelo (texto fixo). */
const BODY_COLOR: Rgb = [30, 30, 30];
/** Dados preenchidos pelo usuário. */
const FILL_BLACK: Rgb = [0, 0, 0];

function parseHexColor(value?: string | null): Rgb | null {
  const hex = value?.trim().replace(/^#/, "");
  if (!hex || !/^[\da-f]{6}$/i.test(hex)) return null;
  return [
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  ];
}

function rgbToHex([r, g, b]: Rgb) {
  return `#${[r, g, b]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

/**
 * Ignora transparência, branco/preto e tons pouco saturados para encontrar
 * a cor de identidade visual predominante da imagem da logo.
 */
function extractLogoPrimaryHex(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const data = ctx.getImageData(0, 0, width, height).data;
  const buckets = new Map<
    string,
    { score: number; red: number; green: number; blue: number; count: number }
  >();

  for (let index = 0; index < data.length; index += 4) {
    const red = data[index] ?? 0;
    const green = data[index + 1] ?? 0;
    const blue = data[index + 2] ?? 0;
    const alpha = data[index + 3] ?? 0;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const saturation = max ? (max - min) / max : 0;
    const luminance = (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255;

    if (
      alpha < 96 ||
      saturation < 0.22 ||
      luminance < 0.12 ||
      luminance > 0.94
    ) {
      continue;
    }

    const key = [red, green, blue]
      .map((value) => Math.round(value / 24) * 24)
      .join("-");
    const score = saturation * (alpha / 255);
    const bucket = buckets.get(key) ?? {
      score: 0,
      red: 0,
      green: 0,
      blue: 0,
      count: 0,
    };
    bucket.score += score;
    bucket.red += red * score;
    bucket.green += green * score;
    bucket.blue += blue * score;
    bucket.count += score;
    buckets.set(key, bucket);
  }

  const primary = [...buckets.values()].sort((a, b) => b.score - a.score)[0];
  if (!primary || !primary.count) return null;
  return rgbToHex([
    Math.round(primary.red / primary.count),
    Math.round(primary.green / primary.count),
    Math.round(primary.blue / primary.count),
  ]);
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

/** Carrega a logo do tenant para embutir no PDF (best-effort; CORS pode bloquear URLs externas). */
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
    const primaryHex = extractLogoPrimaryHex(ctx, w, h);
    const jpeg =
      /\.jpe?g($|\?)/i.test(url) || url.startsWith("data:image/jpeg");
    return {
      dataUrl: canvas.toDataURL(jpeg ? "image/jpeg" : "image/png"),
      format: jpeg ? "JPEG" : "PNG",
      width: w,
      height: h,
      primaryHex,
    };
  } catch {
    return null;
  }
}

export async function resolveContratoBrandHex(
  logoUrl?: string | null,
  fallback?: string | null,
): Promise<string> {
  const logo = logoUrl?.trim() ? await loadLogoForPdf(logoUrl) : null;
  return logo?.primaryHex ?? fallback ?? "#079ED4";
}

function writeLogo(
  doc: jsPDF,
  logo: LoadedLogo,
  y: number,
  compact = false,
) {
  const pageW = doc.internal.pageSize.getWidth();
  const maxW = compact ? 96 : 130;
  const maxH = compact ? 36 : 52;
  const scale = Math.min(maxW / logo.width, maxH / logo.height, 1);
  const w = Math.max(24, logo.width * scale);
  const h = Math.max(16, logo.height * scale);
  doc.addImage(logo.dataUrl, logo.format, (pageW - w) / 2, y, w, h);
  return y + h + (compact ? 8 : 14);
}

function writeTitle(
  doc: jsPDF,
  title: string,
  y: number,
  color: Rgb = [20, 20, 20],
) {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(title, pageW - 96);
  doc.text(lines, pageW / 2, y, { align: "center" });
  return y + lines.length * 16 + 10;
}

function writeCenteredRich(
  doc: jsPDF,
  parts: Array<string | { b: string }>,
  startY: number,
) {
  const pageW = doc.internal.pageSize.getWidth();
  const maxW = pageW - 132;
  const lineH = 19;
  const tokens: Array<{
    text: string;
    bold: boolean;
    width: number;
  }> = [];

  for (const part of parts) {
    const bold = typeof part !== "string";
    const content = typeof part === "string" ? part : String(part.b ?? "");
    for (const word of content.split(/(\s+)/)) {
      if (!word) continue;
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(11);
      tokens.push({
        text: word,
        bold,
        width: doc.getTextWidth(word),
      });
    }
  }

  let y = startY;
  let line: typeof tokens = [];
  let lineW = 0;
  const flush = () => {
    if (!line.length) return;
    let x = (pageW - lineW) / 2;
    for (const token of line) {
      doc.setFont("helvetica", token.bold ? "bold" : "normal");
      if (token.bold) {
        doc.setTextColor(0);
      } else {
        doc.setTextColor(...BODY_COLOR);
      }
      doc.text(token.text, x, y);
      x += token.width;
    }
    y += lineH;
    line = [];
    lineW = 0;
  };

  for (const token of tokens) {
    if (lineW + token.width > maxW && !/^\s+$/.test(token.text)) flush();
    if (/^\s+$/.test(token.text) && !line.length) continue;
    line.push(token);
    lineW += token.width;
  }
  flush();
  return y + 4;
}

function drawOrnament(doc: jsPDF, y: number, color: Rgb) {
  const pageW = doc.internal.pageSize.getWidth();
  const center = pageW / 2;
  doc.setDrawColor(...color);
  doc.setFillColor(...color);
  doc.setLineWidth(0.7);
  doc.line(center - 105, y, center - 13, y);
  doc.line(center + 13, y, center + 105, y);
  doc.circle(center - 8, y, 2, "F");
  doc.circle(center + 8, y, 2, "F");
  doc.triangle(center, y - 5, center + 5, y, center, y + 5, "F");
  doc.triangle(center, y - 5, center - 5, y, center, y + 5, "F");
}

async function startBrandedDocument(
  doc: jsPDF,
  title: string,
  opts?: { logoUrl?: string | null; compact?: boolean },
) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const logo = opts?.logoUrl?.trim()
    ? await loadLogoForPdf(opts.logoUrl)
    : null;
  const color = parseHexColor(logo?.primaryHex) ?? [30, 30, 30];
  doc.setDrawColor(...color);
  doc.setLineWidth(1.3);
  doc.rect(16, 16, pageW - 32, pageH - 32);
  doc.setLineWidth(0.55);
  doc.rect(23, 23, pageW - 46, pageH - 46);

  const compact = Boolean(opts?.compact);
  let y = compact ? 32 : 40;
  if (logo) y = writeLogo(doc, logo, y, compact);
  y = writeTitle(doc, title, compact ? y + 2 : y + 6, color);
  drawOrnament(doc, y, color);
  return { y: y + (compact ? 16 : 28), color };
}

function ensureSpace(doc: jsPDF, y: number, need: number) {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + need > pageH - 48) {
    doc.addPage();
    return 48;
  }
  return y;
}

/** Texto com trechos em negrito intercalados: ["normal ", {b:"valor"}, " resto"] */
function writeRich(
  doc: jsPDF,
  parts: Array<string | { b: string }>,
  startY: number,
  opts?: {
    fontSize?: number;
    lineH?: number;
    margin?: number;
    maxW?: number;
    noPageBreak?: boolean;
  },
) {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = opts?.margin ?? 48;
  const maxW = opts?.maxW ?? pageW - margin * 2;
  const fontSize = opts?.fontSize ?? 10;
  const lineH = opts?.lineH ?? 14;
  let y = startY;
  let x = margin;

  doc.setFontSize(fontSize);
  doc.setTextColor(...BODY_COLOR);

  const tokens: Array<{ text: string; bold: boolean }> = [];
  for (const part of parts) {
    const bold = typeof part !== "string";
    const content = typeof part === "string" ? part : String(part.b ?? "");
    for (const word of content.split(/(\s+)/)) {
      if (!word) continue;
      tokens.push({ text: word, bold });
    }
  }

  for (const token of tokens) {
    const text = String(token.text ?? "");
    if (!text) continue;
    doc.setFont("helvetica", token.bold ? "bold" : "normal");
    doc.setTextColor(...(token.bold ? FILL_BLACK : BODY_COLOR));
    const w = doc.getTextWidth(text);
    if (x + w > margin + maxW && !/^\s+$/.test(text)) {
      y += lineH;
      if (!opts?.noPageBreak) y = ensureSpace(doc, y, lineH);
      x = margin;
    }
    if (/^\s+$/.test(text) && x === margin) continue;
    doc.text(text, x, y);
    x += w;
  }

  return y + lineH + 4;
}

/** Parágrafo justificado (última linha à esquerda), com trechos em negrito. */
function writeJustifiedRich(
  doc: jsPDF,
  parts: Array<string | { b: string }>,
  startY: number,
  opts: {
    fontSize: number;
    lineH: number;
    x: number;
    maxW: number;
  },
) {
  const { fontSize, lineH, x: left, maxW } = opts;
  doc.setFontSize(fontSize);
  doc.setTextColor(...BODY_COLOR);

  const words: Array<{ text: string; bold: boolean; width: number }> = [];
  for (const part of parts) {
    const bold = typeof part !== "string";
    const content = typeof part === "string" ? part : String(part.b ?? "");
    for (const word of content.split(/\s+/)) {
      if (!word) continue;
      doc.setFont("helvetica", bold ? "bold" : "normal");
      const pieces =
        doc.getTextWidth(word) <= maxW
          ? [word]
          : (doc.splitTextToSize(word, maxW) as string[]);
      for (const piece of pieces) {
        doc.setFont("helvetica", bold ? "bold" : "normal");
        words.push({
          text: piece,
          bold,
          width: doc.getTextWidth(piece),
        });
      }
    }
  }

  const lines: Array<typeof words> = [];
  let current: typeof words = [];
  let lineW = 0;
  const spaceW = (() => {
    doc.setFont("helvetica", "normal");
    return doc.getTextWidth(" ");
  })();

  for (const word of words) {
    const extra = current.length ? spaceW : 0;
    if (current.length && lineW + extra + word.width > maxW) {
      lines.push(current);
      current = [word];
      lineW = word.width;
      continue;
    }
    current.push(word);
    lineW += extra + word.width;
  }
  if (current.length) lines.push(current);

  let y = startY;
  lines.forEach((line, index) => {
    const isLast = index === lines.length - 1;
    const textW = line.reduce((sum, word) => sum + word.width, 0);
    const gaps = Math.max(line.length - 1, 0);
    const gapW =
      !isLast && gaps > 0
        ? (maxW - textW) / gaps
        : spaceW;
    let x = left;
    for (const word of line) {
      doc.setFont("helvetica", word.bold ? "bold" : "normal");
      doc.setTextColor(...(word.bold ? FILL_BLACK : BODY_COLOR));
      doc.text(word.text, x, y);
      x += word.width + gapW;
    }
    y += lineH;
  });

  return y + 4;
}

function writeParagraph(doc: jsPDF, y: number, text: string, bold = false) {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(10);
  doc.setTextColor(...BODY_COLOR);
  const lines = doc.splitTextToSize(String(text ?? ""), pageW - margin * 2);
  for (const line of lines) {
    y = ensureSpace(doc, y, 14);
    doc.text(String(line), margin, y);
    y += 14;
  }
  return y + 6;
}

function writeSignature(
  doc: jsPDF,
  y: number,
  label: string,
  name?: string,
  extra?: string,
  color: Rgb = [40, 40, 40],
) {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  y = ensureSpace(doc, y, 56);
  y += 10;
  doc.setDrawColor(...color);
  doc.setLineWidth(0.6);
  const lineW = Math.min(260, pageW - margin * 2);
  doc.line(margin, y, margin + lineW, y);
  y += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(String(label), margin, y);
  y += 12;
  if (name) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...FILL_BLACK);
    doc.text(String(name), margin, y);
    y += 11;
  }
  if (extra) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...FILL_BLACK);
    doc.text(String(extra), margin, y);
    y += 11;
  }
  return y + 8;
}

function writeCenteredSignature(
  doc: jsPDF,
  y: number,
  label: string,
  name: string,
  color: Rgb,
) {
  const pageW = doc.internal.pageSize.getWidth();
  y = ensureSpace(doc, y, 76);
  y += 20;
  const lineW = 255;
  const x = (pageW - lineW) / 2;
  doc.setDrawColor(...color);
  doc.setLineWidth(0.7);
  doc.line(x, y, x + lineW, y);
  doc.setTextColor(...BODY_COLOR);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(label, pageW / 2, y + 13, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...FILL_BLACK);
  doc.text(name, pageW / 2, y + 26, { align: "center" });
  return y + 48;
}

function formatLongDatePt(iso: string) {
  if (!iso) return "____ de ________ de ________";
  const [year, month, day] = iso.slice(0, 10).split("-");
  const monthIndex = Number(month) - 1;
  const months = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ];
  if (!year || !day || !Number.isInteger(monthIndex) || !months[monthIndex]) {
    return iso;
  }
  return `${Number(day)} de ${months[monthIndex]} de ${year}`;
}

function moneyLabel(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return "R$ 0,00";
  return trimmed.startsWith("R$") ? trimmed : `R$ ${trimmed}`;
}

function drawReciboCopy(
  doc: jsPDF,
  values: Values,
  box: { x: number; y: number; w: number; h: number },
  logo: LoadedLogo | null,
  color: Rgb,
  viaLabel: string,
) {
  const pageW = doc.internal.pageSize.getWidth();
  const pad = 28;

  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(1);
  doc.roundedRect(box.x, box.y, box.w, box.h, 14, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(110, 110, 110);
  doc.text(viaLabel, box.x + pad, box.y + 16);

  let y = box.y + 18;
  if (logo) y = writeLogo(doc, logo, y, true);
  else y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text("Recibo de Pagamento", box.x + box.w / 2, y + 14, {
    align: "center",
  });

  const valorW = 118;
  const valorH = 28;
  const valorX = box.x + box.w - valorW - pad;
  const valorY = y + 22;
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.85);
  doc.roundedRect(valorX, valorY, valorW, valorH, 6, 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...FILL_BLACK);
  doc.text(moneyLabel(v(values, "valor")), valorX + valorW / 2, valorY + 18, {
    align: "center",
  });

  const textX = box.x + pad;
  const textMaxW = box.w - pad * 2;
  y = valorY + valorH + 28;
  y = writeJustifiedRich(
    doc,
    [
      "Recebi(emos) de ",
      { b: v(values, "pagadorNome") },
      " - CPF ",
      { b: v(values, "pagadorCpf") },
      ", a importância de ",
      { b: v(values, "valorExtenso") },
      ", referente à ",
      { b: v(values, "referente") },
      ".",
    ],
    y,
    { fontSize: 11, lineH: 17, x: textX, maxW: textMaxW },
  );

  y += 10;
  y = writeJustifiedRich(
    doc,
    [
      "Para maior clareza, firmo(amos) o presente recibo, que comprova o recebimento integral do valor mencionado, concedendo ",
      { b: "quitação plena, geral e irrevogável" },
      " pela quantia recebida.",
    ],
    y,
    { fontSize: 11, lineH: 17, x: textX, maxW: textMaxW },
  );

  const sigTop = box.y + box.h - 52;
  y = Math.min(y + 22, sigTop - 18);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...FILL_BLACK);
  doc.text(
    `${v(values, "cidade")}, ${formatLongDatePt(values.data ?? "")}`,
    box.x + box.w - pad,
    y,
    { align: "right" },
  );

  const lineW = 230;
  const lineX = (pageW - lineW) / 2;
  const lineY = box.y + box.h - 42;
  doc.setDrawColor(...color);
  doc.setLineWidth(0.7);
  doc.line(lineX, lineY, lineX + lineW, lineY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...FILL_BLACK);
  doc.text(v(values, "empresaNome").toUpperCase(), pageW / 2, lineY + 13, {
    align: "center",
  });
  if (values.empresaTelefone?.trim()) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(values.empresaTelefone.trim(), pageW / 2, lineY + 25, {
      align: "center",
    });
  }
}

async function pdfReciboPagamento(
  values: Values,
  opts?: { logoUrl?: string | null; primaryColor?: string | null },
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const logo = opts?.logoUrl?.trim()
    ? await loadLogoForPdf(opts.logoUrl)
    : null;
  const color =
    parseHexColor(logo?.primaryHex) ??
    parseHexColor(opts?.primaryColor) ??
    [20, 20, 20];

  const outerX = 28;
  const outerY = 20;
  const gap = 20;
  const copyW = pageW - outerX * 2;
  const copyH = (pageH - outerY * 2 - gap) / 2;

  drawReciboCopy(
    doc,
    values,
    { x: outerX, y: outerY, w: copyW, h: copyH },
    logo,
    color,
    "1ª via",
  );

  const cutY = outerY + copyH + gap / 2;
  doc.setDrawColor(160, 160, 160);
  doc.setLineWidth(0.6);
  doc.setLineDashPattern([3, 3], 0);
  doc.line(outerX, cutY, pageW - outerX, cutY);
  doc.setLineDashPattern([], 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(140, 140, 140);
  doc.text("recorte", pageW / 2, cutY - 4, { align: "center" });

  drawReciboCopy(
    doc,
    values,
    { x: outerX, y: outerY + copyH + gap, w: copyW, h: copyH },
    logo,
    color,
    "2ª via",
  );

  doc.save(`recibo-pagamento-${safeName(v(values, "pagadorNome"))}.pdf`);
}

function dash(raw: string) {
  return raw.trim() || "----";
}

function isOn(values: Values, key: string) {
  const raw = (values[key] ?? "").trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "sim";
}

function yesNoValue(values: Values, key: string): "sim" | "nao" | "" {
  const raw = (values[key] ?? "").trim().toLowerCase();
  if (raw === "sim" || raw === "true" || raw === "1") return "sim";
  if (raw === "nao" || raw === "não" || raw === "false" || raw === "0") {
    return "nao";
  }
  return "";
}

function writeSectionTitle(doc: jsPDF, y: number, title: string, color: Rgb) {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...TITLE_BLACK);
  doc.text(title.toUpperCase(), margin, y);
  y += 6;
  doc.setDrawColor(...color);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  return y + 10;
}

function writeField(
  doc: jsPDF,
  y: number,
  label: string,
  value: string,
  color: Rgb,
) {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  const labelText = `${label.toUpperCase()}:  `;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...color);
  doc.text(labelText, margin, y);
  const labelW = doc.getTextWidth(labelText);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...FILL_BLACK);
  const lines = doc.splitTextToSize(value, pageW - margin * 2 - labelW);
  doc.text(String(lines[0] ?? ""), margin + labelW, y);
  y += 11;
  for (const line of lines.slice(1)) {
    doc.text(String(line), margin + labelW, y);
    y += 11;
  }
  return y + 2;
}

function writeYesNo(
  doc: jsPDF,
  y: number,
  label: string,
  value: "sim" | "nao" | "",
  color: Rgb,
) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 30, 30);
  doc.text(label, 48, y);
  const labelW = doc.getTextWidth(label);
  writeCheckbox(doc, 56 + labelW, y, value === "sim", "Sim", color);
  writeCheckbox(doc, 108 + labelW, y, value === "nao", "Não", color);
  return y + 14;
}

function writeCheckbox(
  doc: jsPDF,
  x: number,
  y: number,
  checked: boolean,
  label: string,
  color: Rgb,
) {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.8);
  doc.rect(x, y - 8, 9, 9);
  if (checked) {
    doc.setFillColor(...color);
    doc.rect(x + 1.6, y - 6.4, 5.8, 5.8, "F");
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30, 30, 30);
  doc.text(label, x + 14, y);
}

function writeCheckLine(
  doc: jsPDF,
  y: number,
  checked: boolean,
  label: string,
  color: Rgb,
) {
  writeCheckbox(doc, 48, y, checked, label, color);
  return y + 13;
}

async function pdfChecklistRenda(values: Values, logoUrl?: string | null) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const header = await startBrandedDocument(
    doc,
    "CHECKLIST RENDA INFORMAL / MISTA",
    { logoUrl, compact: true },
  );
  let y = header.y;
  const color = header.color;
  const pageH = doc.internal.pageSize.getHeight();

  y = writeSectionTitle(doc, y, "Dados do cliente", color);
  y = writeField(doc, y, "Nome", dash(v(values, "nome")), color);
  y = writeField(doc, y, "CPF", dash(v(values, "cpf")), color);
  y = writeField(
    doc,
    y,
    "Renda solicitada",
    v(values, "rendaSolicitada").trim()
      ? moneyLabel(v(values, "rendaSolicitada"))
      : "----",
    color,
  );
  y = writeField(doc, y, "Profissão exata", dash(v(values, "profissao")), color);
  y = writeField(
    doc,
    y,
    "Renda parcial apurada nos extratos",
    v(values, "rendaParcialExtratos").trim()
      ? moneyLabel(v(values, "rendaParcialExtratos"))
      : "----",
    color,
  );
  y = writeYesNo(
    doc,
    y,
    "Cliente possui Bolsa Família?",
    yesNoValue(values, "bolsaFamilia"),
    color,
  );
  y = writeField(
    doc,
    y,
    "Valor mensal do Bolsa Família",
    v(values, "bolsaFamiliaValor").trim()
      ? moneyLabel(v(values, "bolsaFamiliaValor"))
      : "----",
    color,
  );

  y = writeSectionTitle(doc, y, "Renda mista", color);
  y = writeYesNo(
    doc,
    y,
    "Possui vínculo empregatício?",
    yesNoValue(values, "vinculoEmpregaticio"),
    color,
  );
  y = writeField(doc, y, "Empresa", dash(v(values, "empresa")), color);
  y = writeField(
    doc,
    y,
    "Salário (conforme contracheque)",
    v(values, "salarioContracheque").trim()
      ? moneyLabel(v(values, "salarioContracheque"))
      : "----",
    color,
  );

  y = writeSectionTitle(doc, y, "Documentação anexada", color);
  y = writeCheckLine(
    doc,
    y,
    isOn(values, "docExtratos"),
    "Extratos bancários dos últimos 6 meses",
    color,
  );
  y = writeCheckLine(
    doc,
    y,
    isOn(values, "docContracheques"),
    "Contracheques (renda mista)",
    color,
  );
  y = writeCheckLine(
    doc,
    y,
    isOn(values, "docFgts"),
    "Extrato do FGTS com recolhimento do mesmo mês do contracheque",
    color,
  );
  y = writeCheckLine(
    doc,
    y,
    isOn(values, "docIdentidade"),
    "Documento de identificação",
    color,
  );
  y = writeCheckLine(
    doc,
    y,
    isOn(values, "docOutros"),
    values.docOutrosTexto?.trim()
      ? `Outros documentos: ${values.docOutrosTexto.trim()}`
      : "Outros documentos",
    color,
  );

  y = writeSectionTitle(doc, y, "Observações", color);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...FILL_BLACK);
  const notes = values.observacoes?.trim() || "—";
  const noteLines = doc.splitTextToSize(notes, doc.internal.pageSize.getWidth() - 96);
  for (const line of noteLines.slice(0, 3)) {
    doc.text(String(line), 48, y);
    y += 12;
  }
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...FILL_BLACK);
  doc.text(
    `${dash(v(values, "cidade"))}, ${formatDateBr(values.data ?? "")}`,
    doc.internal.pageSize.getWidth() / 2,
    y,
    { align: "center" },
  );
  y += 28;
  const lineW = 220;
  const lineX = (doc.internal.pageSize.getWidth() - lineW) / 2;
  doc.setDrawColor(...color);
  doc.setLineWidth(0.6);
  doc.line(lineX, y, lineX + lineW, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(30, 30, 30);
  doc.text("ASSINATURA", doc.internal.pageSize.getWidth() / 2, y + 12, {
    align: "center",
  });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...FILL_BLACK);
  doc.text(v(values, "nome"), doc.internal.pageSize.getWidth() / 2, y + 24, {
    align: "center",
  });
  drawOrnament(doc, pageH - 42, color);
  doc.save(`checklist-renda-${safeName(v(values, "nome"))}.pdf`);
}

async function pdfCartaCancelamento(
  values: Values,
  opts?: { logoUrl?: string | null; primaryColor?: string | null },
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const logo = opts?.logoUrl?.trim()
    ? await loadLogoForPdf(opts.logoUrl)
    : null;
  const color = parseHexColor(logo?.primaryHex) ?? [30, 30, 30];
  doc.setDrawColor(...color);
  doc.setLineWidth(1.3);
  doc.rect(16, 16, pageW - 32, pageH - 32);
  doc.setLineWidth(0.55);
  doc.rect(23, 23, pageW - 46, pageH - 46);

  let y = 40;
  if (logo) y = writeLogo(doc, logo, y);
  y = writeTitle(doc, "CARTA DE CANCELAMENTO", y + 6, color);
  drawOrnament(doc, y, color);
  y += 38;

  y = writeCenteredRich(
    doc,
    [
      "EU, ",
      { b: v(values, "nome").toUpperCase() },
      ", PORTADOR DO RG: ",
      { b: v(values, "rg") },
      " SDS/PE E CPF: ",
      { b: v(values, "cpf") },
      ", VENHO POR MEIO DESTA INFORMAR QUE SOLICITO O CANCELAMENTO DA AVALIAÇÃO HABITACIONAL, REALIZADA EM MEU NOME EM UMA CONSTRUTORA PARA DAR CONTINUIDADE EM OUTRA CONSTRUTORA.",
    ],
    y,
  );

  y += 18;
  drawOrnament(doc, y, color);
  y += 40;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...FILL_BLACK);
  doc.text(
    `${v(values, "cidade").toUpperCase()}, ${formatCartaDate(values)}`,
    pageW / 2,
    y,
    { align: "center" },
  );

  const signatureY = y + 72;
  doc.setDrawColor(...color);
  doc.setLineWidth(0.7);
  doc.line(pageW / 2 - 115, signatureY, pageW / 2 + 115, signatureY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30, 30, 30);
  doc.text("ASSINATURA", pageW / 2, signatureY + 14, { align: "center" });
  drawOrnament(doc, pageH - 50, color);
  doc.save(`carta-cancelamento-${safeName(v(values, "nome"))}.pdf`);
}

async function pdfParentescoSem(
  values: Values,
  opts?: { logoUrl?: string | null },
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const header = await startBrandedDocument(
    doc,
    "DECLARAÇÃO DE PARENTESCO, RESIDÊNCIA E AUSÊNCIA DE RENDIMENTOS",
    opts,
  );
  let y = header.y;

  y = writeRich(
    doc,
    [
      "Eu, ",
      { b: v(values, "nomeParente") },
      ", CPF ",
      { b: v(values, "cpfParente") },
      ", estado civil ",
      { b: v(values, "estadoCivil") },
      ", declaro que sou ",
      { b: v(values, "grauParentesco") },
      " do proponente ",
      { b: v(values, "nomeProponente") },
      ", CPF ",
      { b: v(values, "cpfProponente") },
      ", com quem resido no mesmo endereço há pelo menos 6 (seis) meses.",
    ],
    y,
  );

  y = writeRich(
    doc,
    [
      "Declaro ainda que não possuo nenhum tipo de rendimento, seja renda formal ou informal exceto os benefícios temporários de natureza indenizatória, assistencial ou previdenciária, como auxílio-doença, auxílio-acidente, seguro-desemprego, benefício de prestação continuada (BPC) e benefício do Programa Bolsa Família, ou outros que vierem a substituí-los de acordo com a Lei 14.620 de 13/07/2023 e dependo financeiramente do ",
      { b: v(values, "nomeProponente") },
      ", proponente acima qualificado.",
    ],
    y,
  );

  y = writeParagraph(
    doc,
    y,
    "Declaro ainda que não participo como dependente de nenhum outro contrato de financiamento habitacional e não possuo financiamento ativo no SFH.",
  );

  y = writeParagraph(
    doc,
    y,
    "RESPONSABILIDADE PELAS INFORMAÇÕES DECLARADAS",
    true,
  );
  y = writeParagraph(
    doc,
    y,
    "Responsabilizo-me pela exatidão e veracidade das informações declaradas e estou ciente de que, se falsas as declarações, ficarei sujeito às penas da lei, ficando, ainda, obrigado(a) a devolver os valores indevidamente sacados da conta vinculada do FGTS e/ou descontos concedidos pelo FGTS nos termos da Resolução do Conselho Curador do FGTS 702/12, suas alterações e aditamentos, acrescidos de correção monetária e juros sem prejuízo do vencimento antecipado da dívida decorrente do crédito concedido, com a consequente cobrança administrativa/judicial.",
  );

  y = writeRich(doc, ["Data: ", { b: formatDateBr(values.data) }], y);
  y = writeCenteredSignature(
    doc,
    y,
    "Assinatura do parente",
    v(values, "nomeParente"),
    header.color,
  );
  y = writeCenteredSignature(
    doc,
    y,
    "Assinatura do proponente",
    v(values, "nomeProponente"),
    header.color,
  );

  doc.save(`parentesco-sem-conjuge-${safeName(v(values, "nomeParente"))}.pdf`);
}

async function pdfParentescoCom(
  values: Values,
  opts?: { logoUrl?: string | null },
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const header = await startBrandedDocument(
    doc,
    "DECLARAÇÃO DE PARENTESCO, RESIDÊNCIA E AUSÊNCIA DE RENDIMENTOS",
    opts,
  );
  let y = header.y;

  y = writeRich(
    doc,
    [
      "Eu, ",
      { b: v(values, "nomeParente") },
      ", CPF ",
      { b: v(values, "cpfParente") },
      ", estado civil ",
      { b: v(values, "estadoCivil") },
      ", declaro, sob as penas da Lei n.º 7.115/1983, que sou ",
      { b: v(values, "grauParentesco") },
      " do proponente ",
      { b: v(values, "nomeProponente") },
      ", CPF ",
      { b: v(values, "cpfProponente") },
      ", com quem resido no ",
      { b: v(values, "endereco") },
      " há pelo menos 6 (seis) meses.",
    ],
    y,
  );

  y = writeRich(
    doc,
    [
      "Declaro ainda que não possuo nenhum tipo de rendimento, seja renda formal ou informal exceto os benefícios temporários de natureza indenizatória, assistencial ou previdenciária, como auxílio-doença, auxílio-acidente, seguro-desemprego, benefício de prestação continuada (BPC) e benefício do Programa Bolsa Família, ou outros que vierem a substituí-los de acordo com a Lei 14.620 de 13/07/2023 e dependo financeiramente do ",
      { b: v(values, "nomeProponente") },
      ", proponente acima qualificado. Declaro ainda que não participo como dependente de nenhum outro contrato de financiamento habitacional e não possuo financiamento ativo no SFH.",
    ],
    y,
  );

  y = writeRich(
    doc,
    [
      "Eu, ",
      { b: v(values, "nomeConjuge") },
      ", declaro que também não possuo nenhum tipo de rendimento, seja renda formal ou informal, exceto os benefícios temporários de natureza indenizatória, assistencial ou previdenciária, como auxílio-doença, auxílio-acidente, seguro-desemprego, benefício de prestação continuada (BPC) e benefício do Programa Bolsa Família, ou outros que vierem a substituí-los de acordo com a Lei 14.620 de 13/07/2023.",
    ],
    y,
  );

  y = writeParagraph(
    doc,
    y,
    "RESPONSABILIDADE PELAS INFORMAÇÕES DECLARADAS",
    true,
  );
  y = writeParagraph(
    doc,
    y,
    "Responsabilizo-me pela exatidão e veracidade das informações declaradas e estou ciente de que, se falsas as declarações, ficarei sujeito às penas da lei, ficando, ainda, obrigado(a) a devolver os valores indevidamente sacados da conta vinculada do FGTS e/ou descontos concedidos pelo FGTS nos termos da Resolução do Conselho Curador do FGTS 702/12, suas alterações e aditamentos, acrescidos de correção monetária e juros sem prejuízo do vencimento antecipado da dívida decorrente do crédito concedido, com a consequente cobrança administrativa/judicial.",
  );

  y = writeRich(doc, ["Data: ", { b: formatDateBr(values.data) }], y);
  y = writeCenteredSignature(
    doc,
    y,
    "Assinatura do parente",
    v(values, "nomeParente"),
    header.color,
  );
  y = writeCenteredSignature(
    doc,
    y,
    "Assinatura do cônjuge do parente",
    v(values, "nomeConjuge"),
    header.color,
  );
  y = writeCenteredSignature(
    doc,
    y,
    "Assinatura do proponente",
    v(values, "nomeProponente"),
    header.color,
  );

  doc.save(`parentesco-com-conjuge-${safeName(v(values, "nomeParente"))}.pdf`);
}

async function pdfIntermediacao(values: Values, logoUrl?: string | null) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  let y = 40;
  if (logoUrl?.trim()) {
    const logo = await loadLogoForPdf(logoUrl);
    if (logo) {
      y = writeLogo(doc, logo, y);
    }
  }
  y = writeTitle(
    doc,
    "CONTRATO DE INTERMEDIAÇÃO PARA COMPRA/VENDA DE IMÓVEL",
    y,
  );

  y = writeParagraph(
    doc,
    y,
    "Por este instrumento particular, as partes qualificadas na Cláusula 1ª resolvem, por livre e espontânea vontade, firmar o presente contrato de intermediação para fins de compra/venda de imóvel conforme os termos e condições estabelecidos nas cláusulas seguintes:",
  );

  y = writeParagraph(doc, y, "CLÁUSULA 1ª – DAS PARTES", true);
  y = writeParagraph(doc, y, "Denominado de CONTRATANTE(s):", true);
  y = writeRich(doc, ["Nome: ", { b: v(values, "contratanteNome") }], y);
  y = writeRich(
    doc,
    [
      "CPF: ",
      { b: v(values, "contratanteCpf") },
      "    RG: ",
      { b: v(values, "contratanteRg") },
    ],
    y,
  );
  y = writeRich(doc, ["Tel.: ", { b: v(values, "contratanteTel") }], y);
  y = writeRich(doc, ["E-mail: ", { b: v(values, "contratanteEmail") }], y);
  y = writeRich(
    doc,
    [
      "Endereço: ",
      { b: v(values, "contratanteEndereco") },
      "    CEP: ",
      { b: v(values, "contratanteCep") },
    ],
    y,
  );

  y = writeParagraph(doc, y, "Denominado PROPRIETÁRIO:", true);
  y = writeRich(doc, ["Nome: ", { b: v(values, "proprietarioNome") }], y);
  y = writeRich(doc, ["CNPJ/CPF: ", { b: v(values, "proprietarioCnpj") }], y);
  y = writeRich(doc, ["Endereço: ", { b: v(values, "proprietarioEndereco") }], y);
  y = writeRich(doc, ["Tel.: ", { b: v(values, "proprietarioTel") }], y);

  y = writeParagraph(doc, y, "Denominado CONTRATADA:", true);
  y = writeRich(doc, ["Nome: ", { b: v(values, "contratadaNome") }], y);
  y = writeRich(
    doc,
    [
      "CNPJ: ",
      { b: v(values, "contratadaCnpj") },
      "    CRECI: ",
      { b: v(values, "contratadaCreci") },
    ],
    y,
  );
  y = writeRich(doc, ["Endereço: ", { b: v(values, "contratadaEndereco") }], y);
  y = writeRich(doc, ["E-mail: ", { b: v(values, "contratadaEmail") }], y);

  y = writeParagraph(doc, y, "CLÁUSULA 2ª – OBJETO DO CONTRATO", true);
  y = writeParagraph(
    doc,
    y,
    "O presente contrato tem por finalidade a contratação dos serviços profissionais de corretagem da CONTRATADA pelo CONTRATANTE, nos moldes do artigo 726 do Código Civil, e será considerado concluído, quando da assinatura do contrato de promessa de compra e venda entre o CONTRATANTE e o PROPRIETÁRIO do imóvel comercializado.",
  );
  y = writeRich(doc, ["Construtora: ", { b: v(values, "construtora") }], y);
  y = writeRich(doc, ["Empreendimento: ", { b: v(values, "empreendimento") }], y);
  y = writeRich(doc, ["Unidade: ", { b: v(values, "unidade") }], y);
  y = writeRich(doc, ["Andar: ", { b: v(values, "andar") }], y);
  y = writeRich(
    doc,
    ["Descrição do Imóvel: ", { b: v(values, "descricaoImovel") }],
    y,
  );
  y = writeRich(
    doc,
    ["Preço do Imóvel: R$ ", { b: v(values, "precoImovel") }],
    y,
  );
  y = writeRich(
    doc,
    ["Valor da intermediação: R$ ", { b: v(values, "valorIntermediacao") }],
    y,
  );

  y = writeParagraph(
    doc,
    y,
    "CLÁUSULA 3ª – HONORÁRIOS DE CORRETAGEM – DO PAGAMENTO",
    true,
  );
  y = writeRich(
    doc,
    [
      "3.1 Para pagamento dos serviços de intermediação, o CONTRATANTE pagará à CONTRATADA, a título de honorários de corretagem, o valor de R$ ",
      { b: v(values, "valorIntermediacao") },
      " (",
      { b: v(values, "valorIntermediacaoExtenso") },
      ").",
    ],
    y,
  );
  y = writeParagraph(
    doc,
    y,
    "3.2 O pagamento dos honorários à CONTRATADA ocorrerá no momento em que o CONTRATANTE assinar o contrato de compra e venda com o PROPRIETÁRIO do imóvel em questão.",
  );
  y = writeRich(
    doc,
    [
      "3.3 O pagamento do CONTRATANTE à CONTRATADA será através de transferência bancária: Banco: ",
      { b: v(values, "banco") },
      " - Agência: ",
      { b: v(values, "agencia") },
      " - Conta: ",
      { b: v(values, "conta") },
      " - PIX: ",
      { b: v(values, "pix") },
      " Representante Legal: ",
      { b: v(values, "representanteLegal") },
      ".",
    ],
    y,
  );
  y = writeParagraph(
    doc,
    y,
    "3.4 Serão devidos os honorários de corretagem, independentemente do arrependimento do CONTRATANTE após a assinatura do contrato de compra e venda.",
  );

  y = writeParagraph(doc, y, "CLÁUSULA 4ª – DISPOSIÇÕES GERAIS", true);
  y = writeParagraph(
    doc,
    y,
    "4.1 Cumpre a CONTRATADA apresentar, ao oferecer o imóvel, dados rigorosamente certos, nunca omitindo detalhes que o depreciem, informando às partes dos riscos e demais circunstâncias que possam influenciar o negócio.",
  );
  y = writeParagraph(
    doc,
    y,
    "4.2 A CONTRATADA poderá firmar parcerias ou com outros corretores de imóveis com vistas à execução do presente contrato.",
  );

  y = writeParagraph(
    doc,
    y,
    "CLÁUSULA 5ª – DA IRREVOGABILIDADE E IRRETRATABILIDADE",
    true,
  );
  y = writeParagraph(
    doc,
    y,
    "As partes celebram o presente contrato de forma irrevogável e irretratável, relativo ao serviço de corretagem, ainda que o CONTRATANTE se arrependa e requeira o destrato de compra e venda do imóvel do PROPRIETÁRIO.",
  );

  y = writeParagraph(
    doc,
    y,
    "CLÁUSULA 6ª – DA PROTEÇÃO DOS DADOS PESSOAIS",
    true,
  );
  y = writeParagraph(
    doc,
    y,
    "6.1 A CONTRATADA se compromete a obedecer os preceitos da legislação que regula o tratamento de dados pessoais no Brasil, em especial a Lei 12.965/14 (Marco Civil da Internet) e Lei 13.709/2018 (Lei Geral de Proteção de Dados), mantendo o mais completo e absoluto sigilo sobre os dados pessoais que lhe foram confiados, não podendo sob qualquer fundamento ou pretexto divulgar, compartilhar, comercializar (no todo ou em parte) ou deles dar conhecimento a terceiros, sob as penas da lei e responsabilizando-se perante o CONTRATANTE, pelos prejuízos causados pela não observância desta cláusula.",
  );
  y = writeParagraph(
    doc,
    y,
    "6.2 Havendo indícios de descumprimento parcial ou total desta cláusula, os CONTRATADOS estarão sujeitos a responsabilização por danos materiais e morais/extra patrimoniais.",
  );

  y = writeParagraph(doc, y, "CLÁUSULA 7ª – DO FORO DE COMPETÊNCIA", true);
  y = writeParagraph(
    doc,
    y,
    "Fica eleito o Foro da Comarca de Recife, Estado de Pernambuco, que será o competente para dirimir quaisquer questões oriundas do presente acordo, renunciando as partes a qualquer outro, por mais privilegiado que seja.",
  );
  y = writeParagraph(
    doc,
    y,
    "E para maior de todo o conteúdo aqui exposto, assinam o presente contrato em 03 (três) vias.",
  );

  y = writeRich(
    doc,
    [
      { b: v(values, "cidade") },
      ", ",
      { b: formatDateBr(values.data) },
    ],
    y,
  );

  y = writeSignature(
    doc,
    y,
    "CONTRATANTE",
    v(values, "contratanteNome"),
    `CPF: ${v(values, "contratanteCpf")}`,
  );
  y = writeSignature(
    doc,
    y,
    "CONTRATADO",
    v(values, "contratadaNome"),
    [
      `CNPJ: ${v(values, "contratadaCnpj")}`,
      v(values, "contratadaCreci")
        ? `CRECI: ${v(values, "contratadaCreci")}`
        : "",
    ]
      .filter(Boolean)
      .join("  "),
  );
  y = writeSignature(
    doc,
    y,
    "TESTEMUNHA 1",
    values.testemunha1Nome?.trim() || undefined,
    values.testemunha1Cpf?.trim() ? `CPF: ${values.testemunha1Cpf}` : undefined,
  );
  y = writeSignature(
    doc,
    y,
    "TESTEMUNHA 2",
    values.testemunha2Nome?.trim() || undefined,
    values.testemunha2Cpf?.trim() ? `CPF: ${values.testemunha2Cpf}` : undefined,
  );

  doc.save(
    `contrato-intermediacao-${safeName(v(values, "contratanteNome"))}.pdf`,
  );
}

const SAAS_PLANOS: Record<
  "saas-ouro" | "saas-prata-admin" | "saas-prata-financeiro",
  {
    nome: string;
    titulo: string;
    usuarios: string;
    extra: string;
    mensalidade: string;
    implantacao: string;
    recursos: string;
  }
> = {
  "saas-ouro": {
    nome: "Ouro",
    titulo: "CONTRATO DE LICENÇA DE USO DE SOFTWARE (SaaS) – PLANO OURO",
    usuarios: "35 (trinta e cinco)",
    extra: "R$ 10,00 (dez reais) por usuário/mês",
    mensalidade: "R$ 699,99",
    implantacao: "R$ 569,99",
    recursos:
      "CRM Imobiliário, cadastro de clientes, cadastro de empreendimentos, cadastro de corretores e usuários, funil de vendas, agenda comercial, triagem de leads, relatórios de leads, gráfico do funil de vendas, painel gerencial, atualizações da plataforma, suporte técnico em horário comercial, visão geral do financeiro, cadastro de clientes e fornecedores, movimentação bancária, contas a pagar, contas a receber, fluxo de caixa, centro de despesas, gestão de comissionamento, sistema administrativo, gerenciamento de equipes, ranking de corretores, métricas de desempenho, análise de documentações, gestão de metas, gerenciamento de propostas e acompanhamento da taxa de conversão.",
  },
  "saas-prata-admin": {
    nome: "Prata Administrativo",
    titulo:
      "CONTRATO DE LICENÇA DE USO DE SOFTWARE (SaaS) – PLANO PRATA ADMINISTRATIVO",
    usuarios: "15 (quinze)",
    extra: "R$ 10,00 (dez reais) por usuário/mês",
    mensalidade: "R$ 489,99",
    implantacao: "R$ 459,99",
    recursos:
      "CRM Imobiliário, cadastro de clientes, cadastro de empreendimentos, cadastro de corretores e usuários, funil de vendas, agenda comercial, triagem de leads, relatórios de leads, gráfico do funil de vendas, painel gerencial, atualizações da plataforma, suporte técnico em horário comercial, sistema administrativo, gerenciamento de equipes, ranking de corretores, métricas de desempenho, análise de documentações, gestão de metas, gerenciamento de propostas e acompanhamento da taxa de conversão.",
  },
  "saas-prata-financeiro": {
    nome: "Prata Financeiro",
    titulo:
      "CONTRATO DE LICENÇA DE USO DE SOFTWARE (SaaS) – PLANO PRATA FINANCEIRO",
    usuarios: "15 (quinze)",
    extra: "R$ 10,00 (dez reais) por usuário/mês",
    mensalidade: "R$ 489,99",
    implantacao: "R$ 459,99",
    recursos:
      "CRM Imobiliário, cadastro de clientes, cadastro de empreendimentos, cadastro de corretores e usuários, funil de vendas, agenda comercial, triagem de leads, relatórios de leads, gráfico do funil de vendas, painel gerencial, atualizações da plataforma, suporte técnico em horário comercial, visão geral do financeiro, cadastro de clientes e fornecedores, movimentação bancária, contas a pagar, contas a receber, fluxo de caixa, centro de despesas e gestão de comissionamento.",
  },
};

async function pdfSaasLicenca(
  id: keyof typeof SAAS_PLANOS,
  values: Values,
  opts?: { logoUrl?: string | null; primaryColor?: string | null },
) {
  const plan = SAAS_PLANOS[id];
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const logo = opts?.logoUrl?.trim()
    ? await loadLogoForPdf(opts.logoUrl)
    : null;
  let y = logo ? writeLogo(doc, logo, 36) : 48;
  y = writeTitle(doc, plan.titulo, y);

  const contratada = v(values, "contratadaNome");
  const contratadaRep = v(values, "contratadaRepresentante");
  const contratadaCpf = v(values, "contratadaCpf");
  const contratadaCidade = v(values, "contratadaCidade");
  const contratante = v(values, "contratanteNome");
  const contratanteCnpj = v(values, "contratanteCnpj");
  const contratanteEnd = v(values, "contratanteEndereco");
  const contratanteRep = v(values, "contratanteRepresentante");
  const contratanteCargo = v(values, "contratanteCargo");
  const contratanteCpf = v(values, "contratanteCpf");
  const vencimento = v(values, "diaVencimento");
  const data = formatDateBr(values.data ?? "");

  const blocos = [
    "Pelo presente instrumento particular, as partes abaixo qualificadas:",
    `CONTRATADA\n${contratada}, representada por ${contratadaRep}, inscrito no CPF nº ${contratadaCpf}, com sede comercial na cidade de ${contratadaCidade}, doravante denominada simplesmente CONTRATADA.`,
    `CONTRATANTE\n${contratante}, pessoa jurídica de direito privado, inscrita no CNPJ nº ${contratanteCnpj}, com sede em ${contratanteEnd}, neste ato representada por seu ${contratanteCargo}, ${contratanteRep}, inscrito no CPF nº ${contratanteCpf}, doravante denominada simplesmente CONTRATANTE.`,
    "As partes acima identificadas resolvem celebrar o presente Contrato de Licença de Uso de Software (SaaS), que será regido pelas cláusulas e condições seguintes.",
    "CLÁUSULA PRIMEIRA – DO OBJETO",
    "1.1. O presente contrato tem por objeto a concessão de licença de uso da plataforma Zone Connection, disponibilizada na modalidade Software como Serviço (SaaS), destinada à gestão comercial, administrativa e operacional do CONTRATANTE.",
    `1.2. A contratação compreende a disponibilização da plataforma, implantação inicial, treinamento básico, suporte técnico e atualizações disponibilizadas pela CONTRATADA durante a vigência deste contrato, observadas as condições do Plano ${plan.nome}.`,
    "1.3. A licença concedida é pessoal, limitada, onerosa, intransferível, não exclusiva e válida exclusivamente durante a vigência deste contrato.",
    "1.4. O presente contrato não transfere ao CONTRATANTE qualquer direito de propriedade intelectual sobre a plataforma, seu código-fonte, banco de dados, identidade visual, funcionalidades ou demais componentes do sistema, que permanecem de propriedade exclusiva da CONTRATADA.",
    "CLÁUSULA SEGUNDA – DOS SERVIÇOS CONTRATADOS",
    `2.1. A CONTRATADA disponibilizará ao CONTRATANTE a plataforma Zone Connection, na modalidade Software como Serviço (SaaS), conforme os recursos e funcionalidades previstos para o Plano ${plan.nome}.`,
    `2.2. O Plano ${plan.nome} contempla os seguintes recursos e funcionalidades: ${plan.recursos}`,
    `2.3. O Plano ${plan.nome} contempla até ${plan.usuarios} usuários ativos.`,
    "2.4. Caso o CONTRATANTE necessite de usuários adicionais, estes poderão ser contratados mediante pagamento do valor vigente definido pela CONTRATADA.",
    "2.5. A CONTRATADA poderá desenvolver, alterar, aprimorar ou disponibilizar novas funcionalidades para a plataforma durante a vigência deste contrato, sem prejuízo das funcionalidades já contratadas.",
    "CLÁUSULA TERCEIRA – DA IMPLANTAÇÃO",
    "3.1. Após a confirmação da contratação e do pagamento inicial, quando aplicável, a CONTRATADA iniciará o processo de implantação da plataforma.",
    "3.2. A implantação poderá compreender: I – criação do ambiente da empresa; II – configuração inicial da plataforma; III – cadastro da empresa; IV – criação dos usuários contratados; V – treinamento inicial dos usuários; VI – orientações sobre utilização da plataforma.",
    "3.3. O treinamento inicial será realizado de forma remota, por videoconferência ou outro meio definido pela CONTRATADA.",
    "CLÁUSULA QUARTA – DA VIGÊNCIA E DA FIDELIDADE",
    "4.1. O presente contrato terá vigência de 12 (doze) meses, contados da data de ativação da plataforma.",
    "4.2. Durante esse período, o CONTRATANTE compromete-se a manter o contrato vigente, observando todas as obrigações assumidas neste instrumento.",
    "4.3. Em caso de solicitação de cancelamento antes do término da vigência contratual, o CONTRATANTE ficará sujeito ao pagamento de multa rescisória correspondente a 30% (trinta por cento) do valor das mensalidades vincendas, sem prejuízo da quitação dos valores eventualmente em aberto.",
    "4.4. Encerrado o período de vigência, a continuidade da utilização da plataforma dependerá da celebração de novo contrato ou da renovação mediante nova proposta comercial emitida pela CONTRATADA.",
    "CLÁUSULA QUINTA – DO PREÇO E DAS CONDIÇÕES DE PAGAMENTO",
    `5.1. Pela utilização da plataforma Zone Connection, o CONTRATANTE pagará à CONTRATADA a mensalidade correspondente ao Plano ${plan.nome}.\nPlano contratado: ${plan.nome}.\nValor da mensalidade: ${plan.mensalidade}.\nValor de implantação: ${plan.implantacao}.\nUsuários inclusos: ${plan.usuarios}.\nUsuário adicional: ${plan.extra}.\nData de vencimento: dia ${vencimento} de cada mês.\nForma de pagamento: PIX, boleto bancário, cartão de crédito ou outro meio disponibilizado pela CONTRATADA.`,
    "5.2. O acesso à plataforma poderá ser liberado após a confirmação do pagamento da primeira mensalidade e da taxa de implantação, quando esta for aplicável.",
    `5.3. Quaisquer serviços não previstos no Plano ${plan.nome} serão considerados serviços adicionais e dependerão de orçamento e contratação específica.`,
    "CLÁUSULA SEXTA – DAS OBRIGAÇÕES DA CONTRATADA",
    "6.1. Constituem obrigações da CONTRATADA: I – Disponibilizar ao CONTRATANTE o acesso à plataforma Zone Connection, de acordo com o plano contratado; II – Manter a plataforma em funcionamento, ressalvadas as interrupções necessárias para manutenção preventiva, corretiva, evolutiva ou decorrentes de caso fortuito, força maior ou falhas de serviços de terceiros; III – Realizar atualizações, melhorias e correções técnicas sempre que necessário; IV – Disponibilizar suporte técnico em horário comercial, por meio dos canais oficiais da CONTRATADA; V – Manter a confidencialidade das informações recebidas do CONTRATANTE; VI – Adotar medidas técnicas e administrativas razoáveis para proteger os dados armazenados.",
    "6.2. A CONTRATADA não garante que a plataforma estará livre de interrupções ou indisponibilidades ocasionadas por fatores externos, tais como falhas de internet, energia elétrica, provedores de hospedagem, serviços de terceiros ou eventos de força maior.",
    "CLÁUSULA SÉTIMA – DAS OBRIGAÇÕES DO CONTRATANTE",
    "7.1. Constituem obrigações do CONTRATANTE: I – Efetuar o pagamento das mensalidades e demais valores contratados nas datas de vencimento; II – Utilizar a plataforma exclusivamente para fins lícitos e relacionados às suas atividades empresariais; III – Manter atualizados os dados cadastrais; IV – Zelar pelo sigilo das credenciais de acesso; V – Comunicar imediatamente qualquer suspeita de acesso não autorizado; VI – Disponibilizar informações corretas para a implantação.",
    "7.2. É expressamente proibido ao CONTRATANTE: I – Compartilhar usuários ou senhas com terceiros não autorizados; II – Copiar, reproduzir, modificar, descompilar, realizar engenharia reversa ou tentar obter acesso ao código-fonte; III – Comercializar, sublicenciar, revender, alugar, ceder ou disponibilizar a plataforma a terceiros sem autorização; IV – Utilizar a plataforma para práticas ilícitas, fraudulentas ou que possam causar prejuízos.",
    "CLÁUSULA OITAVA – DO SUPORTE TÉCNICO",
    `8.1. O suporte técnico está incluído no Plano ${plan.nome} e será prestado em horário comercial, de segunda a sexta-feira, exceto feriados, por meio dos canais oficiais disponibilizados pela CONTRATADA.`,
    "8.2. O suporte compreende exclusivamente: I – Esclarecimento de dúvidas sobre a utilização da plataforma; II – Correção de falhas técnicas identificadas no sistema; III – Orientações relacionadas às funcionalidades contratadas.",
    "8.3. Não estão incluídos no suporte: I – Desenvolvimento de funcionalidades exclusivas; II – Personalizações específicas; III – Consultorias operacionais ou comerciais; IV – Treinamentos adicionais após a implantação inicial; V – Suporte a equipamentos, redes, internet ou sistemas de terceiros.",
    "CLÁUSULA NONA – DA INADIMPLÊNCIA",
    "9.1. O não pagamento de qualquer obrigação financeira prevista neste contrato acarretará multa moratória de 2% (dois por cento) sobre o valor devido, acrescida de juros de mora de 1% (um por cento) ao mês, calculados proporcionalmente aos dias de atraso.",
    "9.2. Permanecendo o débito em aberto por período superior a 05 (cinco) dias corridos, a CONTRATADA poderá suspender temporariamente o acesso do CONTRATANTE à plataforma, independentemente de notificação judicial ou extrajudicial.",
    "9.3. Persistindo a inadimplência por período superior a 30 (trinta) dias, a CONTRATADA poderá rescindir o presente contrato, sem prejuízo da cobrança dos valores vencidos, da multa contratual e das demais medidas legais cabíveis.",
    "CLÁUSULA DÉCIMA – DO CANCELAMENTO E DA RESCISÃO",
    "10.1. O presente contrato poderá ser rescindido por qualquer das partes ao término do prazo de vigência, mediante comunicação por escrito.",
    "10.2. Caso o CONTRATANTE solicite o cancelamento antes do término do período de fidelidade, será aplicada a multa prevista na Cláusula Quarta deste contrato.",
    "10.3. Encerrado o contrato, o acesso à plataforma será imediatamente desativado.",
    "10.4. Os dados do CONTRATANTE permanecerão armazenados pelo prazo de até 30 (trinta) dias após o encerramento do contrato, período em que poderá ser solicitada sua exportação, quando tecnicamente possível.",
    "10.5. Decorrido o prazo previsto no item anterior, a CONTRATADA poderá excluir definitivamente todas as informações armazenadas, não podendo ser responsabilizada por sua recuperação posterior.",
    "CLÁUSULA DÉCIMA PRIMEIRA – DAS DISPOSIÇÕES FINAIS",
    "11.1. A plataforma Zone Connection, incluindo seu código-fonte, banco de dados, identidade visual, funcionalidades, documentação e demais elementos que a compõem, constitui propriedade exclusiva da CONTRATADA.",
    "11.2. A CONTRATADA compromete-se a tratar os dados do CONTRATANTE em conformidade com a legislação vigente, especialmente a Lei nº 13.709/2018 (LGPD).",
    "11.3. As partes reconhecem como válida a assinatura eletrônica realizada por meio da plataforma Clicksign, produzindo todos os efeitos legais e jurídicos.",
    "11.4. Qualquer tolerância quanto ao descumprimento de obrigações previstas neste contrato será considerada mera liberalidade, não constituindo novação ou renúncia de direitos.",
    `ASSINATURAS\nLocal e data: ${contratadaCidade}, ${data}.`,
    `CONTRATADA\n${contratada}, representada por ${contratadaRep}\nCPF nº ${contratadaCpf}\n\nAssinatura: ________________________________\nData: ___ / ___ / _____`,
    `CONTRATANTE\n${contratante}, neste ato representada por ${contratanteRep}, inscrito no CPF nº ${contratanteCpf}.\n\nAssinatura: ________________________________\nData: ___ / ___ / _____`,
  ];

  for (const bloco of blocos) {
    const isClause = bloco.startsWith("CLÁUSULA") || bloco === "ASSINATURAS" || bloco.startsWith("ASSINATURAS");
    y = writeParagraph(doc, y, bloco, isClause && !bloco.includes("\n"));
  }

  doc.save(`contrato-saas-${safeName(plan.nome)}-${safeName(contratante)}.pdf`);
}

export async function downloadContratoPdf(
  id: ContratoTemplateId,
  values: Values,
  opts?: { logoUrl?: string | null; primaryColor?: string | null },
) {
  switch (id) {
    case "carta-cancelamento":
      await pdfCartaCancelamento(values, opts);
      break;
    case "parentesco-sem-conjuge":
      await pdfParentescoSem(values, opts);
      break;
    case "parentesco-com-conjuge":
      await pdfParentescoCom(values, opts);
      break;
    case "intermediacao":
      await pdfIntermediacao(values, opts?.logoUrl);
      break;
    case "recibo-pagamento":
      await pdfReciboPagamento(values, opts);
      break;
    case "checklist-renda-informal":
      await pdfChecklistRenda(values, opts?.logoUrl);
      break;
    case "saas-ouro":
    case "saas-prata-admin":
    case "saas-prata-financeiro":
      await pdfSaasLicenca(id, values, opts);
      break;
  }
}
