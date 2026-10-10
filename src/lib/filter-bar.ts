import { SOFT_SURFACE } from "@/lib/soft-surface";

/** Barras de filtro no mesmo recorte do dashboard: card branco, controles em pílula. */
export const FILTER_BAR_SURFACE = `${SOFT_SURFACE} p-4`;

export const FILTER_BAR_SHELL = `mb-4 flex flex-col gap-3 ${FILTER_BAR_SURFACE} sm:flex-row sm:flex-wrap sm:items-center`;

export const FILTER_BAR_STACK = `mb-4 space-y-3 ${FILTER_BAR_SURFACE}`;

export const FILTER_LABEL = "mb-1.5 block text-xs font-medium text-[#5C6B76]";

/** Campo de filtro: mesmo recorte da identidade (8px, borda fria, foco ciano). */
export const FILTER_CONTROL =
  "h-9 rounded-lg border-[#E2E8EC] bg-white text-[13px] text-[#0B3148] shadow-none placeholder:text-[#8B98A3] focus:border-[#079ED4] focus:bg-white focus:ring-2 focus:ring-[#D3EBF5] focus-visible:border-[#079ED4] focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#D3EBF5] md:text-[13px]";

/** Select nativo com a mesma caixa do campo de filtro. */
export const FILTER_NATIVE =
  "h-9 w-full cursor-pointer appearance-none rounded-lg border border-[#E2E8EC] bg-white pl-3 pr-8 text-[13px] text-[#0B3148] shadow-none outline-none focus:border-[#079ED4] focus:ring-2 focus:ring-[#D3EBF5]";

export const FILTER_SEARCH_ICON =
  "pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8B98A3]";

export const FILTER_CLEAR_BTN =
  "text-[13px] font-medium text-[#05749E] hover:bg-[#F3FAFD] hover:text-[#079ED4]";

export const FILTER_VISTA_WRAP =
  "inline-flex h-9 rounded-lg border border-[#E2E8EC] bg-[#F4F7F8] p-0.5";

export const FILTER_VISTA_BTN =
  "h-8 rounded-lg px-3 text-[13px] text-[#5C6B76] hover:bg-white hover:text-[#0B3148]";

export const FILTER_VISTA_BTN_ACTIVE =
  "rounded-lg bg-white text-[#0B3148] shadow-sm hover:bg-white hover:text-[#0B3148]";

/** Lista no mesmo card claro do restante da tela. */
export const TABLE_SHELL =
  "overflow-hidden rounded-2xl border border-black/5 bg-card text-card-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_20px_rgba(15,23,42,0.05)]";

export const TABLE_LUX =
  "[&_th]:px-4 [&_td]:px-4 [&_th]:text-[11px] [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-muted-foreground";
