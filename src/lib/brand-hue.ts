/** Cor de marca da logo / imobiliária para botões, tabelas e KPIs. */

export const FALLBACK_BRAND_HEX = "#079ed4";

/** Ordem claro → escuro no mesmo tom da logo (ciano/navy). */
const SECTION_STEP: Record<string, number> = {
  operacao: 0,
  fechamento: 1,
  catalogo: 2,
  gestao: 3,
  financeiro: 4,
  conta: 5,
  "guia-sistema": 6,
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function parseHexRgb(hex: string): [number, number, number] | null {
  const raw = hex.trim().replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [
    Number.parseInt(full.slice(0, 2), 16),
    Number.parseInt(full.slice(2, 4), 16),
    Number.parseInt(full.slice(4, 6), 16),
  ];
}

function rgbToHsl(r: number, g: number, b: number) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function toHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

/**
 * Acento do módulo no aside navy: faixa + ícone no tom da logo (claro → escuro).
 * Sem preenchimento de fundo.
 */
export function navBlockSolid(brandHex: string, sectionId: string) {
  const rgb = parseHexRgb(brandHex) ?? parseHexRgb(FALLBACK_BRAND_HEX)!;
  const hsl = rgbToHsl(...rgb);
  const step = SECTION_STEP[sectionId] ?? 3;
  const t = step / 6;
  const hue = hsl.h;
  const sat = clamp(hsl.s * 0.7 + 0.32, 0.52, 0.82);
  const light = 0.62 - t * 0.28;
  const accent = toHex(...hslToRgb(hue, sat, light));
  return {
    accent,
    borderLeft: `3px solid ${accent}`,
  } as const;
}

/** @deprecated use navBlockSolid */
export function navBlockGradient(brandHex: string, sectionId: string) {
  return navBlockSolid(brandHex, sectionId);
}

/**
 * Cores medidas na logo Zone Connection (ciano, teal e azul).
 * Usadas até a imagem terminar de carregar.
 */
export const LOGO_PALETTE_FALLBACK = [
  "#02b3ee",
  "#019098",
  "#017e9d",
  "#2fa1d6",
  "#027dc2",
  "#014a7a",
] as const;

const SECTION_ORDER = [
  "operacao",
  "fechamento",
  "catalogo",
  "gestao",
  "financeiro",
  "conta",
  "novidades",
  "guia-sistema",
] as const;

function mixHex(a: string, b: string, t: number): string {
  const left = parseHexRgb(a);
  const right = parseHexRgb(b);
  if (!left || !right) return a;
  return toHex(
    left[0] + (right[0] - left[0]) * t,
    left[1] + (right[1] - left[1]) * t,
    left[2] + (right[2] - left[2]) * t,
  );
}

function colorAt(colors: string[], t: number): string {
  if (colors.length <= 1) return colors[0] ?? FALLBACK_BRAND_HEX;
  const x = clamp(t, 0, 1) * (colors.length - 1);
  const index = Math.min(Math.floor(x), colors.length - 2);
  return mixHex(colors[index]!, colors[index + 1]!, x - index);
}

function paint(hex: string, light: number, minSat = 0.42): string {
  const rgb = parseHexRgb(hex) ?? parseHexRgb(FALLBACK_BRAND_HEX)!;
  const hsl = rgbToHsl(...rgb);
  return toHex(
    ...hslToRgb(hsl.h, clamp(Math.max(hsl.s, minSat), minSat, 0.88), light),
  );
}

/** Mantém o tom da logo e deixa o branco do texto legível. */
function readableBand(hex: string): string {
  const rgb = parseHexRgb(hex) ?? parseHexRgb(FALLBACK_BRAND_HEX)!;
  const hsl = rgbToHsl(...rgb);
  const light =
    hsl.l < 0.34 ? 0.38 : hsl.l > 0.58 ? 0.5 : clamp(hsl.l, 0.36, 0.52);
  return paint(hex, light, 0.5);
}

let logoChromePalette: string[] = [...LOGO_PALETTE_FALLBACK];

/** Mesmo tom do sidebar, para todo tenant. */
const SIDEBAR_BUTTON_FROM = "#0a3a5c";
const SIDEBAR_BUTTON_TO = "#02152d";
const SIDEBAR_BUTTON_FROM_DARK = "#16527a";
const SIDEBAR_BUTTON_TO_DARK = "#0a3a5c";

/** Pinta tabelas e KPIs com a logo. Botões ficam no tom do sidebar. */
export function applyLogoChrome(colors: string[]) {
  logoChromePalette = colors.length ? colors.slice(0, 6) : [...LOGO_PALETTE_FALLBACK];
  if (typeof document === "undefined") return;
  const palette = logoChromePalette;
  const bright = palette[0] ?? "#02b3ee";
  const mid = palette[Math.min(3, palette.length - 1)] ?? "#027dc2";
  const deep = palette[palette.length - 1] ?? "#014a7a";
  const root = document.documentElement;
  const dark = root.classList.contains("dark");
  const buttonFrom = dark ? SIDEBAR_BUTTON_FROM_DARK : SIDEBAR_BUTTON_FROM;
  const buttonTo = dark ? SIDEBAR_BUTTON_TO_DARK : SIDEBAR_BUTTON_TO;
  const cta = `linear-gradient(135deg, ${buttonFrom} 0%, ${buttonTo} 100%)`;
  root.style.setProperty("--primary", buttonTo);
  root.style.setProperty("--primary-foreground", "#ffffff");
  root.style.setProperty("--ring", buttonFrom);
  root.style.setProperty("--brand-accent", bright);
  root.style.setProperty("--info", bright);
  root.style.setProperty("--module-title", deep);
  root.style.setProperty("--btn-gradient-from", buttonFrom);
  root.style.setProperty("--btn-gradient-to", buttonTo);
  root.style.setProperty("--btn-gradient-fg", "#ffffff");
  root.style.setProperty("--background-image-brand-cta", cta);
  root.style.setProperty(
    "--background-image-brand-text",
    `linear-gradient(to right, ${bright}, ${deep})`,
  );
  root.style.setProperty(
    "--table-head-gradient",
    `linear-gradient(90deg, ${bright} 0%, ${mid} 58%, ${deep} 100%)`,
  );
  root.style.setProperty("--table-head-end", deep);
  root.style.setProperty(
    "--logo-wash",
    `color-mix(in srgb, ${mid} 12%, transparent)`,
  );
  const kpiBands = [
    "operacao",
    "fechamento",
    "catalogo",
    "gestao",
    "financeiro",
    "conta",
  ];
  kpiBands.forEach((id, step) => {
    const index = Math.max(0, SECTION_ORDER.indexOf(id));
    const t =
      SECTION_ORDER.length === 1 ? 0 : index / (SECTION_ORDER.length - 1);
    root.style.setProperty(
      `--kpi-seq-${step + 1}`,
      readableBand(colorAt(palette, t)),
    );
  });
  if (!root.classList.contains("dark")) {
    root.style.setProperty("--card", "#ffffff");
    root.style.setProperty(
      "--accent",
      `color-mix(in srgb, ${bright} 16%, white)`,
    );
    root.style.setProperty("--accent-foreground", deep);
    root.style.setProperty(
      "--secondary",
      `color-mix(in srgb, ${mid} 10%, white)`,
    );
    root.style.setProperty("--secondary-foreground", deep);
  }
}

/** Reaplica a paleta da logo depois que a aparência sobrescreve as variáveis. */
export function reapplyLogoChrome() {
  applyLogoChrome(logoChromePalette);
}

type LogoBucket = {
  score: number;
  r: number;
  g: number;
  b: number;
  weight: number;
  h: number;
  l: number;
};

/** Separa as cores que de fato compõem a logo, do ciano ao azul escuro. */
export function extractLogoPalette(
  data: Uint8ClampedArray,
  maxColors = 6,
): string[] {
  const buckets = new Map<string, LogoBucket>();
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    const a = data[i + 3] ?? 0;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max ? (max - min) / max : 0;
    const lum = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
    if (a < 80 || sat < 0.18 || lum < 0.07 || lum > 0.92) continue;
    const { h, l } = rgbToHsl(r, g, b);
    const key = `${Math.round(h / 10) * 10}-${Math.round(l * 8)}`;
    const score = sat * (a / 255);
    const bucket = buckets.get(key) ?? {
      score: 0,
      r: 0,
      g: 0,
      b: 0,
      weight: 0,
      h,
      l,
    };
    bucket.score += score;
    bucket.r += r * score;
    bucket.g += g * score;
    bucket.b += b * score;
    bucket.weight += score;
    buckets.set(key, bucket);
  }

  const ranked = [...buckets.values()]
    .filter((bucket) => bucket.weight > 0)
    .sort((a, b) => b.score - a.score);
  const picked: LogoBucket[] = [];
  for (const bucket of ranked) {
    const close = picked.some((item) => {
      const hueGap = Math.min(
        Math.abs(item.h - bucket.h),
        360 - Math.abs(item.h - bucket.h),
      );
      return hueGap < 8 && Math.abs(item.l - bucket.l) < 0.08;
    });
    if (close) continue;
    picked.push(bucket);
    if (picked.length >= maxColors) break;
  }
  picked.sort((a, b) => a.h - b.h || b.l - a.l);
  return picked.map((bucket) =>
    toHex(
      bucket.r / bucket.weight,
      bucket.g / bucket.weight,
      bucket.b / bucket.weight,
    ),
  );
}

/** Amostra a cor dominante da logo (CORS pode falhar em URL externa). */
export async function sampleLogoBrandHex(src: string): Promise<string | null> {
  if (typeof window === "undefined" || !src.trim()) return null;
  const url = src.startsWith("http") || src.startsWith("data:")
    ? src
    : new URL(src, window.location.origin).href;
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("logo"));
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
    const palette = extractLogoPalette(ctx.getImageData(0, 0, w, h).data);
    return palette[0] ?? null;
  } catch {
    return null;
  }
}

/** Lê todas as cores da logo para montar o menu. */
export async function sampleLogoPalette(src: string): Promise<string[]> {
  if (typeof window === "undefined" || !src.trim()) return [];
  const url =
    src.startsWith("http") || src.startsWith("data:")
      ? src
      : new URL(src, window.location.origin).href;
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("logo"));
      image.src = url;
    });
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return [];
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return [];
    ctx.drawImage(img, 0, 0);
    return extractLogoPalette(ctx.getImageData(0, 0, w, h).data);
  } catch {
    return [];
  }
}
