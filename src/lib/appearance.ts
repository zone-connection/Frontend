import { reapplyLogoChrome } from "@/lib/brand-hue";

const STORAGE_KEY = "crm_appearance_v1";

export type AppearanceSlot = "aside" | "primary" | "background" | "gradient";

export type AppearanceColor = {
  id: string;
  name: string;
  value: string;
  /** Quando presente, o círculo da opção mostra este degradê. */
  gradient?: string;
};

export type AppearanceGradient = {
  id: string;
  name: string;
  from: string;
  to: string;
  css: string;
};

/** Cores padrão já usadas no tema Zone Connection. */
export const ASIDE_COLORS: AppearanceColor[] = [
  { id: "navy-aside", name: "Navy aside", value: "#032b43" },
  { id: "escuro", name: "Escuro", value: "#0f141b" },
];

export const PRIMARY_COLORS: AppearanceColor[] = [
  { id: "ciano", name: "Ciano", value: "#079ed4" },
  { id: "navy", name: "Navy", value: "#053647" },
  { id: "teal", name: "Teal", value: "#0e6f8a" },
  { id: "dourado", name: "Dourado", value: "#c9a227" },
];

export const BACKGROUND_COLORS: AppearanceColor[] = [
  { id: "cinza-claro", name: "Cinza claro", value: "#f8fafc" },
  { id: "branco", name: "Branco", value: "#ffffff" },
  { id: "muted", name: "Muted", value: "#f1f5f9" },
  { id: "escuro", name: "Escuro", value: "#0b0f14" },
];

export const GRADIENTS: AppearanceGradient[] = [
  {
    id: "padrao",
    name: "Padrão",
    from: "#0e6f8a",
    to: "#079ed4",
    css: "linear-gradient(135deg, #0e6f8a 0%, #079ed4 100%)",
  },
  {
    id: "amarelo",
    name: "Amarelo",
    from: "#b8860b",
    to: "#f0d060",
    css: "linear-gradient(135deg, #b8860b 0%, #f0d060 100%)",
  },
];

/** Opções de degradê no formato das bolinhas de cor. */
export const GRADIENT_COLORS: AppearanceColor[] = GRADIENTS.map((g) => ({
  id: g.id,
  name: g.name,
  value: g.from,
  gradient: g.css,
}));

export type AppearancePrefs = {
  asideId: string;
  primaryId: string;
  backgroundId: string;
  gradientId: string;
};

export const DEFAULT_APPEARANCE: AppearancePrefs = {
  asideId: "navy-aside",
  primaryId: "ciano",
  backgroundId: "cinza-claro",
  gradientId: "padrao",
};

function findColor(
  list: AppearanceColor[],
  id: string,
  fallbackId: string,
): AppearanceColor {
  return (
    list.find((c) => c.id === id) ??
    list.find((c) => c.id === fallbackId) ??
    list[0]
  );
}

export function getAppearanceColor(
  slot: Exclude<AppearanceSlot, "gradient">,
  id: string,
): AppearanceColor {
  if (slot === "aside") {
    return findColor(ASIDE_COLORS, id, DEFAULT_APPEARANCE.asideId);
  }
  if (slot === "primary") {
    return findColor(PRIMARY_COLORS, id, DEFAULT_APPEARANCE.primaryId);
  }
  return findColor(BACKGROUND_COLORS, id, DEFAULT_APPEARANCE.backgroundId);
}

export function getAppearanceGradient(id: string): AppearanceGradient {
  return (
    GRADIENTS.find((g) => g.id === id) ??
    GRADIENTS.find((g) => g.id === DEFAULT_APPEARANCE.gradientId) ??
    GRADIENTS[0]
  );
}

export function getAppearancePrefs(): AppearancePrefs {
  if (typeof window === "undefined") return DEFAULT_APPEARANCE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_APPEARANCE;
    const parsed = JSON.parse(raw) as Partial<AppearancePrefs>;
    return {
      asideId:
        typeof parsed.asideId === "string"
          ? parsed.asideId
          : DEFAULT_APPEARANCE.asideId,
      primaryId:
        typeof parsed.primaryId === "string"
          ? parsed.primaryId
          : DEFAULT_APPEARANCE.primaryId,
      backgroundId:
        typeof parsed.backgroundId === "string"
          ? parsed.backgroundId
          : DEFAULT_APPEARANCE.backgroundId,
      gradientId:
        typeof parsed.gradientId === "string"
          ? parsed.gradientId
          : DEFAULT_APPEARANCE.gradientId,
    };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

function mixToward(hex: string, target: string, amount: number): string {
  const parse = (value: string) => ({
    r: Number.parseInt(value.slice(1, 3), 16),
    g: Number.parseInt(value.slice(3, 5), 16),
    b: Number.parseInt(value.slice(5, 7), 16),
  });
  const a = parse(hex);
  const b = parse(target);
  const channel = (from: number, to: number) =>
    Math.round(from + (to - from) * amount)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(a.r, b.r)}${channel(a.g, b.g)}${channel(a.b, b.b)}`;
}

function textOn(hex: string): string {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#111827" : "#ffffff";
}

function relativeLuminance(hex: string): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const r = channel(Number.parseInt(hex.slice(1, 3), 16));
  const g = channel(Number.parseInt(hex.slice(3, 5), 16));
  const b = channel(Number.parseInt(hex.slice(5, 7), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function isDarkMode(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

/** Fundo "Escuro" liga o mesmo visual do modo escuro. */
function syncThemeWithBackground(prefs: AppearancePrefs) {
  if (typeof document === "undefined") return;
  const wantDark = prefs.backgroundId === "escuro";
  const root = document.documentElement;
  root.classList.toggle("dark", wantDark);
  root.style.colorScheme = wantDark ? "dark" : "light";
  try {
    window.localStorage.setItem("crm_theme", wantDark ? "dark" : "light");
  } catch {
    /* ignore */
  }
}

/**
 * Ajusta a cor principal para contraste no tema claro/escuro.
 * Navy fica ilegível no escuro; dourado precisa clarear/escurecer conforme o fundo.
 */
function themeAwarePrimary(base: string, id: string, dark: boolean): string {
  if (dark) {
    if (id === "navy") return "#38bdf8";
    if (id === "teal") return "#2dd4bf";
    if (id === "ciano") return "#38bdf8";
    if (id === "dourado") return "#e8c547";
    if (relativeLuminance(base) < 0.18) {
      return mixToward(base, "#7dd3fc", 0.55);
    }
    if (relativeLuminance(base) >= 0.18 && relativeLuminance(base) < 0.45) {
      return mixToward(base, "#ffffff", 0.28);
    }
    return base;
  }

  // Claro: dourado um pouco mais fechado para texto/botões soft
  if (id === "dourado") return "#b8860b";
  return base;
}

function themeAwareGradient(
  gradient: AppearanceGradient,
  dark: boolean,
): AppearanceGradient {
  if (gradient.id === "amarelo") {
    if (dark) {
      const from = "#c9a227";
      const to = "#f5e08a";
      return {
        ...gradient,
        from,
        to,
        css: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
      };
    }
    const from = "#9a7209";
    const to = "#d4a017";
    return {
      ...gradient,
      from,
      to,
      css: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
    };
  }

  if (gradient.id === "padrao" && dark) {
    const from = "#0e7490";
    const to = "#38bdf8";
    return {
      ...gradient,
      from,
      to,
      css: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
    };
  }

  return gradient;
}

/** Aside e destaque ativos do tema padrão (como no design Zone). */
const CANONICAL_ASIDE = "#032b43";
const CANONICAL_ASIDE_ACTIVE = "#075a82";

/** Garante contraste do item ativo do aside com o fundo do menu. */
function asideActiveColor(primary: string, aside: string): string {
  const l1 = relativeLuminance(primary);
  const l2 = relativeLuminance(aside);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  if (ratio >= 2.2) return primary;
  return relativeLuminance(aside) < 0.25
    ? mixToward(primary, "#ffffff", 0.35)
    : mixToward(primary, "#000000", 0.25);
}

function resolveAsideActive(
  prefs: AppearancePrefs,
  primary: string,
  aside: string,
): string {
  // Ciano/Navy (tema padrão): azul do menu (#075a82).
  // Demais principais: o próprio tom escolhido (com contraste no fundo do aside).
  const accent =
    prefs.primaryId === "navy" || prefs.primaryId === "ciano"
      ? CANONICAL_ASIDE_ACTIVE
      : primary;
  return asideActiveColor(accent, aside);
}

/** Cor do item ativo do aside (para preview / UI). */
export function getAsideActiveColor(prefs: AppearancePrefs): string {
  const aside = getAppearanceColor("aside", prefs.asideId).value;
  const primaryBase = getAppearanceColor("primary", prefs.primaryId).value;
  const dark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");
  const primary = themeAwarePrimary(primaryBase, prefs.primaryId, dark);
  return resolveAsideActive(prefs, primary, aside);
}

/** Escala sequencial original dos KPIs (ciano Zone). */
const CANONICAL_KPI_SEQ = [
  "#5bc4e8",
  "#079ed4",
  "#0689bd",
  "#057aa8",
  "#04648a",
  "#034e6e",
] as const;

/** Gera escala claro→escuro a partir da cor principal. */
function buildKpiSequence(primaryId: string, primary: string): string[] {
  // Ciano (padrão) e Navy → mantém a sequência ciano original.
  if (primaryId === "ciano" || primaryId === "navy") return [...CANONICAL_KPI_SEQ];
  return [
    mixToward(primary, "#ffffff", 0.38),
    mixToward(primary, "#ffffff", 0.12),
    primary,
    mixToward(primary, "#000000", 0.15),
    mixToward(primary, "#000000", 0.3),
    mixToward(primary, "#000000", 0.45),
  ];
}

/** Título do módulo: navy no padrão; tom fechado da cor principal quando customizado. */
function resolveModuleTitle(
  primaryId: string,
  primaryBase: string,
  primary: string,
  dark: boolean,
): string {
  if (primaryId === "ciano") {
    return dark ? "#f8fafc" : "#053647";
  }
  if (dark) {
    return mixToward(primary, "#ffffff", 0.22);
  }
  return mixToward(primaryBase, "#000000", 0.4);
}

export function applyAppearance(prefs: AppearancePrefs) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const dark = prefs.backgroundId === "escuro" || isDarkMode();
  const aside = getAppearanceColor("aside", prefs.asideId).value;
  const primaryBase = getAppearanceColor("primary", prefs.primaryId).value;
  const primary = themeAwarePrimary(primaryBase, prefs.primaryId, dark);
  const background = getAppearanceColor("background", prefs.backgroundId).value;
  const gradient = themeAwareGradient(
    getAppearanceGradient(prefs.gradientId),
    dark,
  );
  const sidebarActive = resolveAsideActive(prefs, primary, aside);
  const gradientMid = mixToward(gradient.from, gradient.to, 0.5);
  const gradientFg = textOn(gradientMid);
  const kpiSeq = buildKpiSequence(prefs.primaryId, primary);
  const moduleTitle = resolveModuleTitle(
    prefs.primaryId,
    primaryBase,
    primary,
    dark,
  );
  const defaultAsideLook =
    prefs.asideId === "navy-aside" &&
    (prefs.primaryId === "ciano" || prefs.primaryId === "navy");

  root.style.setProperty(
    "--sidebar",
    defaultAsideLook ? CANONICAL_ASIDE : aside,
  );
  root.style.setProperty("--sidebar-accent", sidebarActive);
  root.style.setProperty("--sidebar-foreground", "#f8fafc");
  root.style.setProperty("--sidebar-accent-foreground", "#f8fafc");
  root.style.setProperty("--sidebar-primary", sidebarActive);
  root.style.setProperty("--sidebar-primary-foreground", "#ffffff");
  root.style.setProperty("--sidebar-ring", primary);

  root.style.setProperty("--primary", primary);
  root.style.setProperty("--primary-foreground", textOn(primary));
  root.style.setProperty("--module-title", moduleTitle);
  root.style.setProperty("--ring", primary);
  root.style.setProperty("--brand-accent", primary);
  root.style.setProperty("--info", primary);

  root.style.setProperty("--btn-gradient-from", gradient.from);
  root.style.setProperty("--btn-gradient-to", gradient.to);
  root.style.setProperty("--btn-gradient-fg", gradientFg);
  root.style.setProperty("--background-image-brand-cta", gradient.css);

  root.style.setProperty("--kpi-seq-1", kpiSeq[0]);
  root.style.setProperty("--kpi-seq-2", kpiSeq[1]);
  root.style.setProperty("--kpi-seq-3", kpiSeq[2]);
  root.style.setProperty("--kpi-seq-4", kpiSeq[3]);
  root.style.setProperty("--kpi-seq-5", kpiSeq[4]);
  root.style.setProperty("--kpi-seq-6", kpiSeq[5]);

  // Soft buttons / superfícies claras derivadas da principal
  root.style.setProperty(
    "--primary-soft-bg",
    dark
      ? `color-mix(in srgb, ${primary} 18%, transparent)`
      : `color-mix(in srgb, ${primary} 10%, transparent)`,
  );
  root.style.setProperty(
    "--primary-soft-border",
    dark
      ? `color-mix(in srgb, ${primary} 40%, transparent)`
      : `color-mix(in srgb, ${primary} 22%, transparent)`,
  );

  if (dark) {
    // Igual ao modo escuro (.dark)
    root.style.setProperty("--background", "#0b0f14");
    root.style.setProperty("--foreground", "#f8fafc");
    root.style.setProperty("--card", "#141a22");
    root.style.setProperty("--card-foreground", "#f8fafc");
    root.style.setProperty("--muted", "#1c2430");
    root.style.setProperty("--muted-foreground", "#94a3b8");
    root.style.setProperty("--secondary", "#1c2430");
    root.style.setProperty("--secondary-foreground", "#f8fafc");
    root.style.setProperty("--accent", "#1c2430");
    root.style.setProperty("--accent-foreground", "#f8fafc");
    root.style.setProperty("--border", "rgba(255, 255, 255, 0.1)");
    root.style.setProperty("--input", "rgba(255, 255, 255, 0.12)");
    root.style.setProperty("--popover", "#141a22");
    root.style.setProperty("--popover-foreground", "#f8fafc");
  } else {
    root.style.setProperty("--background", background);
    root.style.setProperty("--foreground", "#053647");
    root.style.setProperty("--card", "#ffffff");
    root.style.setProperty("--card-foreground", "#053647");
    root.style.setProperty(
      "--muted",
      mixToward(background, "#053647", 0.04),
    );
    root.style.setProperty("--muted-foreground", "#64748b");
    for (const key of [
      "--secondary",
      "--secondary-foreground",
      "--accent",
      "--accent-foreground",
      "--border",
      "--input",
      "--popover",
      "--popover-foreground",
    ] as const) {
      root.style.removeProperty(key);
    }
  }
  reapplyLogoChrome();
}

export function setAppearancePrefs(prefs: AppearancePrefs) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  syncThemeWithBackground(prefs);
  applyAppearance(prefs);
}

export function initAppearance() {
  const prefs = getAppearancePrefs();
  // Alinha fundo Escuro ↔ modo escuro (fonte: backgroundId, ou dark legado).
  let next = prefs;
  if (prefs.backgroundId === "escuro") {
    syncThemeWithBackground(prefs);
  } else if (getThemeFromStorage() === "dark") {
    next = { ...prefs, backgroundId: "escuro" };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    syncThemeWithBackground(next);
  } else {
    syncThemeWithBackground(prefs);
  }
  applyAppearance(next);
}

function getThemeFromStorage(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  const t = window.localStorage.getItem("crm_theme");
  return t === "dark" ? "dark" : "light";
}

/** Quando o toggle de tema muda, sincroniza o fundo Escuro. */
export function syncBackgroundWithTheme(theme: "light" | "dark") {
  if (typeof window === "undefined") return;
  const prefs = getAppearancePrefs();
  const next: AppearancePrefs =
    theme === "dark"
      ? { ...prefs, backgroundId: "escuro" }
      : prefs.backgroundId === "escuro"
        ? { ...prefs, backgroundId: DEFAULT_APPEARANCE.backgroundId }
        : prefs;
  if (next.backgroundId !== prefs.backgroundId) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
}

/** Remove preferências salvas e volta às cores padrão da aparência. */
export function resetAppearance() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  clearAppearanceOverrides();
  syncThemeWithBackground(DEFAULT_APPEARANCE);
  applyAppearance(DEFAULT_APPEARANCE);
}

export function clearAppearanceOverrides() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const key of [
    "--sidebar",
    "--sidebar-accent",
    "--sidebar-foreground",
    "--sidebar-accent-foreground",
    "--sidebar-primary",
    "--sidebar-primary-foreground",
    "--sidebar-ring",
    "--primary",
    "--primary-foreground",
    "--module-title",
    "--ring",
    "--brand-accent",
    "--info",
    "--btn-gradient-from",
    "--btn-gradient-to",
    "--btn-gradient-fg",
    "--background-image-brand-cta",
    "--kpi-seq-1",
    "--kpi-seq-2",
    "--kpi-seq-3",
    "--kpi-seq-4",
    "--kpi-seq-5",
    "--kpi-seq-6",
    "--primary-soft-bg",
    "--primary-soft-border",
    "--background",
    "--foreground",
    "--card",
    "--card-foreground",
    "--muted",
    "--muted-foreground",
    "--secondary",
    "--secondary-foreground",
    "--accent",
    "--accent-foreground",
    "--border",
    "--input",
    "--popover",
    "--popover-foreground",
  ] as const) {
    root.style.removeProperty(key);
  }
}
