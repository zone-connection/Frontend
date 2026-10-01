/** Degradê de botões/CTAs — acompanha a aparência do usuário. */
export const BRAND_GRADIENT_STYLE = {
  backgroundImage:
    "var(--background-image-brand-cta, linear-gradient(135deg, #079ed4 0%, #075a82 100%))",
  color: "var(--btn-gradient-fg, #ffffff)",
} as const;

export const BRAND_GRADIENT_BTN =
  "border-0 bg-transparent shadow-sm hover:bg-transparent hover:brightness-110 disabled:opacity-50";
