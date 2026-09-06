import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
    .replace(
      /^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d{1,2})$/,
      "$1.$2.$3/$4-$5",
    );
}
