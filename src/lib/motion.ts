/** Tokens de movimento do CRM. Manter alinhado a `styles.css`. */
export const MOTION = {
  durationMs: 180,
  durationSlowMs: 240,
  /** Esconde spinner/skeleton em respostas rápidas (evita flash). */
  loadingDelayMs: 160,
  ease: "cubic-bezier(0.22, 1, 0.36, 1)",
} as const;
