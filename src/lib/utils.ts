import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** ID temporário: randomUUID some em HTTP na rede local (não é contexto seguro). */
export function createTempId(prefix = "temp"): string {
  const cryptoObj = typeof crypto !== "undefined" ? crypto : undefined;
  if (typeof cryptoObj?.randomUUID === "function") {
    return `${prefix}-${cryptoObj.randomUUID()}`;
  }
  if (typeof cryptoObj?.getRandomValues === "function") {
    const bytes = cryptoObj.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6]! & 0x0f) | 0x40;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
      "",
    );
    return `${prefix}-${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return `${prefix}-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}

/** Mensagem para a tela: traduz falhas técnicas e evita inglês cru. */
export function userFacingError(err: unknown, fallback: string): string {
  const raw =
    err instanceof Error ? err.message : typeof err === "string" ? err : "";
  if (/randomUUID is not a function/i.test(raw)) {
    return "Não foi possível gerar o identificador do cadastro neste navegador. Isso acontece ao abrir o app por HTTP no celular (pelo IP da rede). Use localhost no computador ou HTTPS e tente de novo.";
  }
  if (
    /is not a function|is not defined|Cannot read propert|undefined is not/i.test(
      raw,
    )
  ) {
    return fallback;
  }
  return raw.trim() || fallback;
}

/** Mantém só dígitos, com teto opcional (padrão 14 = CNPJ). */
export function digitsOnly(value: string, max = 14): string {
  return value.replace(/\D/g, "").slice(0, max);
}

/**
 * Máscara visual de CPF (11) ou CNPJ (14).
 * Até 11 dígitos: 000.000.000-00
 * Acima: 00.000.000/0000-00
 */
export function formatCep(value: string): string {
  const d = digitsOnly(value, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export function formatCpfCnpj(value: string): string {
  const d = digitsOnly(value, 14);
  if (d.length <= 11) {
    return d
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d{1,2})$/, "$1.$2.$3-$4");
  }
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d{1,2})$/, "$1.$2.$3/$4-$5");
}

/** Máscara visual de RG: 00.000.000-0 (até 9 caracteres; o dígito final pode ser X). */
export function formatRg(value: string): string {
  const chars: string[] = [];
  for (const ch of value.toUpperCase()) {
    if (chars.length >= 9) break;
    if (ch >= "0" && ch <= "9") {
      chars.push(ch);
      continue;
    }
    if (ch === "X" && chars.length === 8) chars.push("X");
  }
  const d = chars.join("");
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}-${d.slice(8)}`;
}
