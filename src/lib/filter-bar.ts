import { SOFT_SURFACE } from "@/lib/soft-surface";

/** Barras de filtro no mesmo recorte do dashboard: card branco, controles em pílula. */
export const FILTER_BAR_SURFACE = `${SOFT_SURFACE} p-4`;

export const FILTER_BAR_SHELL = `mb-4 flex flex-col gap-3 ${FILTER_BAR_SURFACE} sm:flex-row sm:flex-wrap sm:items-center`;

export const FILTER_BAR_STACK = `mb-4 space-y-3 ${FILTER_BAR_SURFACE}`;

export const FILTER_LABEL = "mb-1.5 block text-xs font-medium text-muted-foreground";

export const FILTER_CONTROL =
  "h-8 rounded-full border-black/10 bg-background";

export const FILTER_SEARCH_ICON =
  "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground";

export const FILTER_CLEAR_BTN =
  "text-muted-foreground hover:bg-muted hover:text-foreground";

export const FILTER_VISTA_WRAP =
  "inline-flex h-8 rounded-full border border-black/10 bg-muted/40 p-0.5";

export const FILTER_VISTA_BTN =
  "h-7 rounded-full px-3 text-muted-foreground hover:bg-background hover:text-foreground";

export const FILTER_VISTA_BTN_ACTIVE =
  "rounded-full bg-background text-foreground shadow-sm hover:bg-background hover:text-foreground";

/** Card da lista no estilo Leads Perdidos. */
export const TABLE_SHELL =
  "overflow-hidden rounded-2xl border border-black/5 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_20px_rgba(15,23,42,0.05)]";

export const TABLE_LUX =
  "[&_th]:px-4 [&_td]:px-4 [&_th]:text-[11px] [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-muted-foreground";
