/** Cor de marca da logo / imobiliária e degradês por bloco do menu. */

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

function extractLogoHexFromImageData(
  data: Uint8ClampedArray,
): string | null {
  const buckets = new Map<
    string,
    { score: number; r: number; g: number; b: number; count: number }
  >();
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    const a = data[i + 3] ?? 0;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max ? (max - min) / max : 0;
    const lum = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
    if (a < 96 || sat < 0.22 || lum < 0.12 || lum > 0.94) continue;
    const key = [r, g, b].map((v) => Math.round(v / 24) * 24).join("-");
    const score = sat * (a / 255);
    const bucket = buckets.get(key) ?? {
      score: 0,
      r: 0,
      g: 0,
      b: 0,
      count: 0,
    };
    bucket.score += score;
    bucket.r += r * score;
    bucket.g += g * score;
    bucket.b += b * score;
    bucket.count += score;
    buckets.set(key, bucket);
  }
  const primary = [...buckets.values()].sort((a, b) => b.score - a.score)[0];
  if (!primary?.count) return null;
  return toHex(
    primary.r / primary.count,
    primary.g / primary.count,
    primary.b / primary.count,
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
    return extractLogoHexFromImageData(ctx.getImageData(0, 0, w, h).data);
  } catch {
    return null;
  }
}
