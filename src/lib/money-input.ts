/** Helpers de máscara monetária BRL (dígitos → centavos). */

/** Converte texto mascarado ("1.234,56") em número. */
export function parseMoneyInput(raw: string): number {
  const normalized = raw
    .trim()
    .replace(/\s/g, "")
    .replace(/R\$/gi, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
}

/** Igual a parseMoneyInput, mas retorna null se vazio/inválido. */
export function parseOptionalMoneyInput(raw: string): number | null {
  if (!raw.trim()) return null;
  const n = parseMoneyInput(raw);
  return Number.isFinite(n) ? n : null;
}

/** Formata número para exibição no input (pt-BR com 2 casas). */
export function formatMoneyInput(n: number): string {
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Máscara enquanto digita: cada dígito é centavo.
 * Ex.: "76779" → "767,79" | "7677900" → "76.779,00"
 */
export function maskMoneyInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 15);
  if (!digits) return "";
  const cents = Number(digits);
  if (!Number.isFinite(cents) || cents === 0) return "";
  return formatMoneyInput(cents / 100);
}

/** Máscara de reais inteiros: "250000" → "250.000". Não usa centavos. */
export function maskReaisInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 13);
  if (!digits) return "";
  const value = Number(digits);
  if (!Number.isFinite(value)) return "";
  return value.toLocaleString("pt-BR");
}
