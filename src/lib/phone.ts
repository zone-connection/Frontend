/** Utilitários de telefone brasileiro (com DDD). */

/** Só dígitos, no máximo 11 (DDD + número). */
export function phoneDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11);
}

/**
 * Máscara visual progressiva:
 * - (81
 * - (81) 9
 * - (81) 9999-9999   (fixo, 10 dígitos)
 * - (81) 99999-9999  (celular, 11 dígitos)
 */
export function formatPhone(value: string): string {
  const d = phoneDigits(value);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/**
 * Aceita fixo (10) ou celular (11, terceiro dígito = 9), DDD 11–99.
 */
export function isValidPhone(value: string): boolean {
  const d = phoneDigits(value);
  if (d.length < 10 || d.length > 11) return false;
  const ddd = Number(d.slice(0, 2));
  if (ddd < 11 || ddd > 99) return false;
  if (d.length === 11 && d[2] !== "9") return false;
  return true;
}

/** Número com + que não é o DDI 55 do Brasil. E.164: 8 a 15 dígitos. */
export function isInternationalPhone(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed.startsWith("+")) return false;
  const digits = trimmed.replace(/\D/g, "");
  if (!/^[1-9]\d{7,14}$/.test(digits)) return false;
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return false;
  }
  return true;
}

export function isAcceptedLeadPhone(value: string): boolean {
  return isValidPhone(value) || isInternationalPhone(value);
}

/** Mantém a máscara brasileira. Com +, grava o E.164. +55 volta ao formato nacional. */
export function formatLeadPhone(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.startsWith("+") && !value.startsWith("+")) return formatPhone(value);
  const digits = value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 15);
  if (!digits) return "+";
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return formatPhone(digits.slice(2));
  }
  return `+${digits}`;
}

/** Dígitos para wa.me. Número com + não recebe o DDI 55. */
export function whatsAppDigits(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("+")) return trimmed.replace(/\D/g, "").slice(0, 15);
  const digits = phoneDigits(value);
  if (digits.length < 10) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

export const PHONE_PLACEHOLDER = "(81) 99999-9999";

export const PHONE_INVALID_MESSAGE =
  "Informe um telefone válido com DDD, ex.: (81) 99999-9999.";
