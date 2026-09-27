import * as XLSX from "xlsx";
import type { Role } from "@/lib/auth";

export const USER_IO_COLUMNS = [
  "Nome",
  "CRECI",
  "Email",
  "Senha",
  "Acesso",
] as const;

export type ParsedImportUser = {
  name: string;
  creci: string;
  email: string;
  password: string;
  role: Role | "";
  error?: string;
};

const ROLE_ALIASES: Record<string, Role> = {
  corretor: "corretor",
  corretora: "corretor",
  broker: "corretor",
  gerente: "gerente",
  manager: "gerente",
  admin: "admin",
  administrador: "admin",
  administradora: "admin",
  analista: "analista",
  treinee: "treinee",
  trainee: "treinee",
  financeiro: "financeiro",
  assistente: "assistente",
};

function cell(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function parseRole(value: string): Role | "" {
  const key = normalizeHeader(value).replace(/\s+/g, "");
  return ROLE_ALIASES[key] ?? "";
}

function isStrongPassword(value: string) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value);
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

const HEADER_ALIASES: Record<string, keyof ParsedImportUser | "skip"> = {
  nome: "name",
  name: "name",
  creci: "creci",
  cresi: "creci",
  cresci: "creci",
  email: "email",
  "e mail": "email",
  senha: "password",
  password: "password",
  acesso: "role",
  perfil: "role",
  role: "role",
  cargo: "skip",
};

function mapHeader(value: string): keyof ParsedImportUser | "skip" | null {
  return HEADER_ALIASES[normalizeHeader(value)] ?? null;
}

function rowError(
  row: Omit<ParsedImportUser, "error">,
  allowedRoles: Role[],
  seenEmails: Set<string>,
): string | undefined {
  if (row.name.length < 2) return "Informe o nome.";
  if (!row.email) return "Informe o e-mail.";
  if (!isEmail(row.email)) return "E-mail inválido.";
  if (seenEmails.has(row.email)) return "E-mail repetido nesta planilha.";
  if (!row.password) return "Informe a senha.";
  if (!isStrongPassword(row.password)) {
    return "Senha fraca. Use 8+ caracteres, com maiúscula, minúscula e número.";
  }
  if (!row.role) {
    return "Acesso inválido. Use corretor, gerente, administrador, analista, trainee ou financeiro.";
  }
  if (!allowedRoles.includes(row.role)) {
    return `Você não pode importar o acesso "${row.role}".`;
  }
  return undefined;
}

function rowsFromMatrix(
  matrix: unknown[][],
  allowedRoles: Role[],
): ParsedImportUser[] {
  if (matrix.length < 2) return [];
  const headerRow = (matrix[0] ?? []).map((item) => mapHeader(cell(item)));
  const hasMapped = headerRow.some((item) => item && item !== "skip");
  const start = hasMapped ? 1 : 0;
  const fallback: Array<keyof ParsedImportUser> = [
    "name",
    "creci",
    "email",
    "password",
    "role",
  ];
  const seenEmails = new Set<string>();
  const rows: ParsedImportUser[] = [];

  for (let i = start; i < matrix.length; i++) {
    const line = matrix[i] ?? [];
    const raw: Omit<ParsedImportUser, "error"> = {
      name: "",
      creci: "",
      email: "",
      password: "",
      role: "",
    };
    line.forEach((value, index) => {
      const key = hasMapped
        ? headerRow[index]
        : (fallback[index] as keyof ParsedImportUser | undefined);
      if (!key || key === "skip") return;
      const text = cell(value);
      if (key === "role") raw.role = parseRole(text);
      else if (key === "email") raw.email = text.toLowerCase();
      else raw[key] = text;
    });
    if (!raw.name && !raw.email && !raw.password) continue;
    const error = rowError(raw, allowedRoles, seenEmails);
    if (!error && raw.email) seenEmails.add(raw.email);
    rows.push({ ...raw, error });
  }
  return rows;
}

export function parseUsersFromExcel(
  buffer: ArrayBuffer,
  allowedRoles: Role[],
): ParsedImportUser[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0] ?? ""];
  if (!sheet) return [];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: false,
    defval: "",
  });
  return rowsFromMatrix(matrix, allowedRoles);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadUsersImportTemplate(
  filename = "modelo-importacao-usuarios.xlsx",
) {
  const workbook = XLSX.utils.book_new();
  const rows = [
    Array.from(USER_IO_COLUMNS),
    [
      "Marina Alves",
      "51209-F",
      "marina@imob.com",
      "Senha@123",
      "Corretor",
    ],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1");
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const current = sheet[addr];
      if (!current) continue;
      sheet[addr] = { t: "s", v: String(current.v ?? "") };
    }
  }
  sheet["!cols"] = USER_IO_COLUMNS.map(() => ({ wch: 22 }));
  XLSX.utils.book_append_sheet(workbook, sheet, "Usuários");
  const data = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  downloadBlob(
    new Blob([data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename,
  );
}
