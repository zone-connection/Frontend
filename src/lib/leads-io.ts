import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import mammoth from "mammoth";
import type { Lead } from "@/lib/crm-types";
import { formatPhone, isValidPhone } from "@/lib/phone";
import { isPlaceholderEmail } from "@/lib/email";
import type { LeadProspeccao } from "@/lib/lead-prospeccao";
import { EMPTY_PROSPECCAO } from "@/lib/lead-prospeccao";

/** Formato único de import/export. */
export const LEAD_IO_COLUMNS = [
  "Nome",
  "Telefone",
  "Email",
  "Localidade de interesse",
  "Origem",
] as const;

/** Colunas da planilha de prospecção B2B (super tenant). */
export const LEAD_PROSPECCAO_IO_COLUMNS = [
  "Empresa",
  "Município",
  "Bairro/Região",
  "Endereço",
  "Telefone/WhatsApp",
  "Instagram",
  "Site",
  "LinkedIn",
  "Atuação / Serviços",
  "Lançamentos?",
  "Usados?",
  "Locação?",
  "Administração?",
  "CRM identificado",
  "Tecnologia identificada",
  "Sinais para prospecção",
  "Quem abordar",
  "Produto indicado",
  "Fit (0-10)",
  "Prioridade",
  "Motivo do fit",
  "Fonte",
] as const;

export type ParsedImportLead = {
  nome: string;
  telefone: string;
  email: string;
  origem: string;
  interesse: "Comprar";
  cidade: string;
  bairro: string;
  prioridade: "Alta" | "Média" | "Baixa";
  renda: number | null;
  prospeccao?: LeadProspeccao | null;
  /** Linha inválida: motivo. */
  error?: string;
};

type CellMap = Partial<Record<string, unknown>>;

const HEADER_ALIASES: Record<string, string> = {
  // formato unificado / Supremo
  "data captura": "data",
  data: "data",
  "hora captura": "hora",
  hora: "hora",
  "nome do cliente": "nome",
  nome: "nome",
  name: "nome",
  lead: "skip",
  "id do lead": "skip",
  "lead id": "skip",
  codigo: "skip",
  cliente: "nome",
  ddd: "ddd",
  telefone: "telefone",
  phone: "telefone",
  celular: "telefone",
  whatsapp: "telefone",
  fone: "telefone",
  email: "email",
  "e-mail": "email",
  mail: "email",
  origem: "origem",
  source: "origem",
  // ignorados — colunas de outros CRMs / exportações
  id: "skip",
  situacao: "skip",
  "situacao anterior": "skip",
  status: "skip",
  "imovel seminovo de interesse": "skip",
  "imóvel seminovo de interesse": "skip",
  "empreendimento de interesse": "skip",
  empreendimento: "skip",
  "mensagem inicial da captura do lead": "skip",
  mensagem: "skip",
  // legado nosso
  interesse: "skip",
  "localidade de interesse": "cidade",
  localidade: "cidade",
  cidade: "cidade",
  city: "cidade",
  bairro: "bairro",
  prioridade: "prioridade",
  priority: "prioridade",
  renda: "renda",
  income: "renda",
  etapa: "skip",
  corretor: "skip",
  atualizado: "skip",
  empresa: "nome",
  municipio: "cidade",
  "bairro/regiao": "bairro",
  "bairro / regiao": "bairro",
  endereco: "endereco",
  "telefone/whatsapp": "telefone",
  "telefone / whatsapp": "telefone",
  instagram: "instagram",
  site: "site",
  linkedin: "linkedin",
  "atuacao / servicos": "atuacao",
  "atuacao/servicos": "atuacao",
  atuacao: "atuacao",
  "lancamentos?": "lancamentos",
  lancamentos: "lancamentos",
  "usados?": "usados",
  usados: "usados",
  "locacao?": "locacao",
  locacao: "locacao",
  "administracao?": "administracao",
  administracao: "administracao",
  "crm identificado": "crmIdentificado",
  "tecnologia identificada": "tecnologia",
  "sinais para prospeccao": "sinais",
  "quem abordar": "quemAbordar",
  "produto indicado": "produtoIndicado",
  "fit (0-10)": "fit",
  fit: "fit",
  "motivo do fit": "motivoFit",
  fonte: "origem",
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

/** Dígitos nacionais: remove DDI 55 quando o número vem como +55... */
function nationalPhoneDigits(value: unknown): string {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) {
    digits = digits.slice(2);
  }
  return digits.slice(0, 11);
}

function extractFirstPhone(value: unknown): string {
  const text = String(value ?? "");
  const matches = text.match(/(?:\+?55\s*)?\(?\d{2}\)?\s*\d{4,5}[-\s]?\d{4}/g);
  const raw = matches?.[0] ?? text;
  return formatPhone(nationalPhoneDigits(raw));
}

function cellText(value: unknown): string {
  return String(value ?? "").trim();
}

function parseFit(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(String(value).replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return Math.min(10, Math.max(0, Math.round(n * 10) / 10));
}

function parsePrioridade(value: unknown): "Alta" | "Média" | "Baixa" {
  const n = normalizeHeader(value);
  if (n === "alta") return "Alta";
  if (n === "baixa") return "Baixa";
  return "Média";
}

function parseRenda(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return null;
  return Number(digits);
}

/** Remove hora colada no nome (ex.: "13:56 Fernando" → "Fernando"). */
function stripTimePrefix(nome: string): string {
  return nome.replace(/^\d{1,2}:\d{2}\s+/, "").trim();
}

function isNumericLabel(value: string): boolean {
  return /^\d{1,6}$/.test(value.trim());
}

function looksLikePersonName(value: string): boolean {
  const nome = stripTimePrefix(value);
  if (nome.length < 2) return false;
  if (isNumericLabel(nome)) return false;
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(nome)) return false;
  if (/@/.test(nome)) return false;
  if (/\d{8,}/.test(nome.replace(/\D/g, ""))) return false;
  return /[a-zA-ZÀ-ÿ]/.test(nome);
}

function pickBetterName(current: unknown, incoming: unknown): unknown {
  const next = stripTimePrefix(String(incoming ?? "").trim());
  const prev = stripTimePrefix(String(current ?? "").trim());
  if (!next) return current;
  if (!prev) return next;
  if (looksLikePersonName(next) && !looksLikePersonName(prev)) return next;
  if (!looksLikePersonName(next) && looksLikePersonName(prev)) return prev;
  if (looksLikePersonName(next) && looksLikePersonName(prev) && next.length > prev.length) {
    return next;
  }
  return current ?? next;
}

function findNameInRow(row: unknown[]): string {
  for (const cell of row) {
    const text = stripTimePrefix(String(cell ?? "").trim());
    if (looksLikePersonName(text)) return text;
  }
  return "";
}

/** Junta DDD + telefone em um único número formatado. */
function mergePhone(ddd: unknown, telefone: unknown): string {
  const fromCell = extractFirstPhone(telefone);
  if (isValidPhone(fromCell)) return fromCell;
  const dddDigits = String(ddd ?? "")
    .replace(/\D/g, "")
    .slice(0, 2);
  const phoneDigitsOnly = nationalPhoneDigits(telefone);
  if (phoneDigitsOnly.length >= 10) {
    return formatPhone(phoneDigitsOnly);
  }
  const combined = `${dddDigits}${phoneDigitsOnly}`;
  return combined ? formatPhone(combined) : "";
}

function buildLeadFromCells(
  cells: CellMap,
  defaults: { origem: string },
): ParsedImportLead {
  const nome = stripTimePrefix(String(cells.nome ?? "").trim());
  const telefone = mergePhone(cells.ddd, cells.telefone);
  const email = String(cells.email ?? "").trim();
  const origem = String(cells.origem ?? "").trim() || defaults.origem;
  const cidade = String(cells.cidade ?? "").trim();
  const bairro = String(cells.bairro ?? "").trim();
  const renda = parseRenda(cells.renda);
  const prospeccao: LeadProspeccao = {
    ...EMPTY_PROSPECCAO,
    endereco: cellText(cells.endereco) || "",
    instagram: cellText(cells.instagram) || "",
    site: cellText(cells.site) || "",
    linkedin: cellText(cells.linkedin) || "",
    atuacao: cellText(cells.atuacao) || "",
    lancamentos: cellText(cells.lancamentos) || "",
    usados: cellText(cells.usados) || "",
    locacao: cellText(cells.locacao) || "",
    administracao: cellText(cells.administracao) || "",
    crmIdentificado: cellText(cells.crmIdentificado) || "",
    tecnologia: cellText(cells.tecnologia) || "",
    sinais: cellText(cells.sinais) || "",
    quemAbordar: cellText(cells.quemAbordar) || "",
    produtoIndicado: cellText(cells.produtoIndicado) || "",
    fit: parseFit(cells.fit),
    motivoFit: cellText(cells.motivoFit) || "",
  };
  const hasProspeccao = Object.entries(prospeccao).some(
    ([k, v]) => k === "fit" ? v != null : Boolean(String(v ?? "").trim()),
  );

  return validateParsedImportLead({
    nome,
    telefone,
    email,
    origem,
    interesse: "Comprar",
    cidade,
    bairro,
    prioridade: cells.prioridade ? parsePrioridade(cells.prioridade) : "Média",
    renda,
    prospeccao: hasProspeccao ? prospeccao : undefined,
  });
}

/** Revalida nome, telefone e e-mail após edição na prévia da importação. */
export function validateParsedImportLead(
  row: ParsedImportLead,
): ParsedImportLead {
  const nome = row.nome.trim();
  const telefone = formatPhone(row.telefone);
  const email = row.email.trim();
  const next: ParsedImportLead = {
    ...row,
    nome,
    telefone,
    email,
  };
  delete next.error;
  if (nome.length < 2 || isNumericLabel(nome) || !looksLikePersonName(nome)) {
    next.error = "Nome inválido";
  }
  else if (!isValidPhone(telefone)) next.error = "Telefone inválido";
  else   if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    next.error = "E-mail inválido";
  }
  return next;
}

export type ImportExistingIndex = {
  phones: Record<string, string>;
  emails: Record<string, string>;
};

/** Marca linhas que já existem na base ou se repetem no arquivo. */
export function applyImportConflictErrors(
  rows: ParsedImportLead[],
  existing: ImportExistingIndex,
  kind: "lead" | "cliente",
): ParsedImportLead[] {
  const label = kind === "cliente" ? "cliente" : "lead";
  const seenPhone = new Set<string>();
  const seenEmail = new Set<string>();
  return rows.map((row) => {
    const next = validateParsedImportLead(row);
    if (next.error) return next;
    const phone = nationalPhoneDigits(next.telefone);
    if (phone && existing.phones[phone]) {
      next.error = `Já existe um ${label} na base com este telefone (${existing.phones[phone]})`;
      return next;
    }
    if (phone && seenPhone.has(phone)) {
      next.error = "Telefone repetido neste arquivo";
      return next;
    }
    if (phone) seenPhone.add(phone);
    const email = next.email.trim().toLowerCase();
    if (email && !isPlaceholderEmail(email) && existing.emails[email]) {
      next.error = `Já existe um ${label} na base com este e-mail (${existing.emails[email]})`;
      return next;
    }
    if (email && !isPlaceholderEmail(email) && seenEmail.has(email)) {
      next.error = "E-mail repetido neste arquivo";
      return next;
    }
    if (email && !isPlaceholderEmail(email)) seenEmail.add(email);
    return next;
  });
}

function mapHeaderKeys(headerRow: unknown[]): (string | null)[] {
  return headerRow.map((h) => {
    const key = HEADER_ALIASES[normalizeHeader(h)];
    if (!key || key === "skip") return null;
    return key;
  });
}

function rowsFromMatrix(
  matrix: unknown[][],
  defaults: { origem: string },
): ParsedImportLead[] {
  if (matrix.length === 0) return [];

  const mapped = mapHeaderKeys(matrix[0]);
  const hasHeaders = mapped.some(Boolean);

  const start = hasHeaders ? 1 : 0;
  const results: ParsedImportLead[] = [];

  for (let i = start; i < matrix.length; i++) {
    const row = matrix[i] ?? [];
    if (row.every((c) => String(c ?? "").trim() === "")) continue;

    const cells: CellMap = {};
    if (hasHeaders) {
      mapped.forEach((key, idx) => {
        if (!key) return;
        if (key === "nome") {
          cells.nome = pickBetterName(cells.nome, row[idx]);
          return;
        }
        if (cells[key] == null || String(cells[key] ?? "").trim() === "") {
          cells[key] = row[idx];
        }
      });
    } else {
      // Formato unificado sem cabeçalho:
      // Nome | Telefone | Email | Localidade de interesse | Origem
      cells.nome = looksLikePersonName(String(row[0] ?? ""))
        ? row[0]
        : findNameInRow(row) || row[0];
      cells.telefone = row[1];
      cells.email = row[2];
      cells.cidade = row[3];
      cells.origem = row[4];
    }

    if (!looksLikePersonName(String(cells.nome ?? ""))) {
      const found = findNameInRow(row);
      if (found) cells.nome = found;
    }

    // Fallback: achar telefone em qualquer célula
    if (
      !mergePhone(cells.ddd, cells.telefone) ||
      !isValidPhone(mergePhone(cells.ddd, cells.telefone))
    ) {
      for (const cell of row) {
        const formatted = mergePhone("", cell);
        if (isValidPhone(formatted)) {
          cells.telefone = formatted;
          cells.ddd = "";
          break;
        }
      }
    }

    results.push(buildLeadFromCells(cells, defaults));
  }

  return dedupeImportRows(results);
}

function dedupeImportRows(rows: ParsedImportLead[]): ParsedImportLead[] {
  return rows;
}

function matrixFromSheet(sheet: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];
}

function headerScore(headerRow: unknown[]): number {
  const mapped = mapHeaderKeys(headerRow);
  return mapped.filter(Boolean).length;
}

function pickImportSheet(workbook: XLSX.WorkBook): XLSX.WorkSheet | null {
  let best: { sheet: XLSX.WorkSheet; score: number } | null = null;
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;
    const matrix = matrixFromSheet(sheet);
    const score = headerScore(matrix[0] ?? []);
    const looksProspeccao = (matrix[0] ?? []).some((h) => {
      const n = normalizeHeader(h);
      return n === "empresa" || n.includes("produto indicado") || n === "fit (0-10)";
    });
    const boosted = score + (looksProspeccao ? 20 : 0);
    if (!best || boosted > best.score) best = { sheet, score: boosted };
  }
  return best?.sheet ?? null;
}

export function parseLeadsFromExcel(
  buffer: ArrayBuffer,
  defaults: { origem: string },
): ParsedImportLead[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = pickImportSheet(workbook);
  if (!sheet) return [];
  return rowsFromMatrix(matrixFromSheet(sheet), defaults);
}

function parseHtmlTables(
  html: string,
  defaults: { origem: string },
): ParsedImportLead[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const tables = [...doc.querySelectorAll("table")];
  const all: ParsedImportLead[] = [];
  for (const table of tables) {
    const matrix: unknown[][] = [];
    table.querySelectorAll("tr").forEach((tr) => {
      const cells = [...tr.querySelectorAll("th,td")].map((td) =>
        (td.textContent ?? "").trim(),
      );
      if (cells.length) matrix.push(cells);
    });
    all.push(...rowsFromMatrix(matrix, defaults));
  }
  return all;
}

/**
 * Parser do PDF SupremoCRM (e similares):
 * Data | (Hora+)Nome | Telefone(com DDD) | E-mail? | tags...
 */
function parseSupremoPdfLines(
  lines: string[],
  defaults: { origem: string },
): ParsedImportLead[] {
  const results: ParsedImportLead[] = [];
  const dateRe = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/;
  const emailRe = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  const phoneRe = /\b\d{2}\s*\d{4,5}[-\s]?\d{4}\b/;

  for (const line of lines) {
    const parts = line
      .split(/\s{2,}|\t|\|/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length < 2) continue;
    if (normalizeHeader(parts[0]).includes("data captura")) continue;

    let idx = 0;
    if (dateRe.test(parts[0])) idx = 1;
    if (idx >= parts.length) continue;

    const nome = stripTimePrefix(parts[idx] ?? "");
    idx += 1;

    let telefone = "";
    let email = "";
    for (; idx < parts.length; idx++) {
      const part = parts[idx];
      if (!telefone && phoneRe.test(part)) {
        telefone = formatPhone(part);
        continue;
      }
      if (!email && emailRe.test(part)) {
        email = part.match(emailRe)?.[0] ?? "";
        continue;
      }
    }

    if (!telefone) {
      const m = line.match(phoneRe);
      if (m) telefone = formatPhone(m[0]);
    }
    if (!email) {
      const m = line.match(emailRe);
      if (m) email = m[0];
    }

    if (nome.length < 2 || !isValidPhone(telefone)) continue;

    results.push(
      buildLeadFromCells(
        { nome, telefone, email, origem: defaults.origem },
        defaults,
      ),
    );
  }

  return dedupeImportRows(results);
}

function parseTextLines(
  text: string,
  defaults: { origem: string },
): ParsedImportLead[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const supremo = parseSupremoPdfLines(lines, defaults);
  if (supremo.length > 0) return supremo;

  // Fallback genérico: linhas com telefone
  const results: ParsedImportLead[] = [];
  const phoneRe = /(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?\d{4,5}[-\s]?\d{4}/g;
  const emailRe = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

  for (const line of lines) {
    const phones = line.match(phoneRe);
    if (!phones?.length) continue;
    const telefone = formatPhone(phones[0]);
    if (!isValidPhone(telefone)) continue;

    const emailMatch = line.match(emailRe);
    let nome = stripTimePrefix(
      line
        .replace(phones[0], " ")
        .replace(emailMatch?.[0] ?? "", " ")
        .replace(/[|,;]+/g, " ")
        .replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    );
    nome = nome
      .replace(/\b\d{2,}\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (nome.length < 2) continue;

    results.push(
      buildLeadFromCells(
        {
          nome,
          telefone,
          email: emailMatch?.[0] ?? "",
          origem: defaults.origem,
        },
        defaults,
      ),
    );
  }

  return dedupeImportRows(results);
}

export async function parseLeadsFromWord(
  buffer: ArrayBuffer,
  defaults: { origem: string },
): Promise<ParsedImportLead[]> {
  const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
  const fromTables = parseHtmlTables(result.value, defaults);
  if (fromTables.length > 0) return fromTables;

  const text = await mammoth.extractRawText({ arrayBuffer: buffer });
  return parseTextLines(text.value, defaults);
}

export async function parseLeadsFromPdf(
  buffer: ArrayBuffer,
  defaults: { origem: string },
): Promise<ParsedImportLead[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const lineBuckets: string[] = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const byY = new Map<number, Array<{ x: number; str: string }>>();

    for (const item of content.items) {
      if (!("str" in item) || !item.str?.trim()) continue;
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      const list = byY.get(y) ?? [];
      list.push({ x, str: item.str.trim() });
      byY.set(y, list);
    }

    const sortedYs = [...byY.keys()].sort((a, b) => b - a);
    for (const y of sortedYs) {
      const parts = (byY.get(y) ?? [])
        .sort((a, b) => a.x - b.x)
        .map((p) => p.str);
      lineBuckets.push(parts.join("  "));
    }
  }

  return parseTextLines(lineBuckets.join("\n"), defaults);
}

export async function parseLeadsFromFile(
  file: File,
  defaults: { origem: string },
): Promise<ParsedImportLead[]> {
  const buffer = await file.arrayBuffer();
  const name = file.name.toLowerCase();
  if (
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    name.endsWith(".csv")
  ) {
    return parseLeadsFromExcel(buffer, defaults);
  }
  if (name.endsWith(".docx") || name.endsWith(".doc")) {
    if (name.endsWith(".doc") && !name.endsWith(".docx")) {
      throw new Error(
        "Arquivos .doc antigos não são suportados. Salve como .docx ou Excel.",
      );
    }
    return parseLeadsFromWord(buffer, defaults);
  }
  if (name.endsWith(".pdf")) {
    return parseLeadsFromPdf(buffer, defaults);
  }
  throw new Error("Formato não suportado. Use Excel, PDF ou Word (.docx).");
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Monta planilha forçando texto (evita Excel/Sheets interpretar telefone como fórmula/número). */
function buildTextSheet(headers: readonly string[], rows: string[][]) {
  const aoa = [Array.from(headers), ...rows];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);

  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1");
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[addr];
      if (!cell) continue;
      const value = String(cell.v ?? "");
      sheet[addr] = { t: "s", v: value };
    }
  }

  sheet["!cols"] = headers.map((header, index) => {
    const maxLen = Math.max(
      header.length,
      ...rows.map((row) => String(row[index] ?? "").length),
      10,
    );
    return { wch: Math.min(maxLen + 2, 48) };
  });

  return sheet;
}

function buildLeadsSheet(rows: string[][]) {
  return buildTextSheet(LEAD_IO_COLUMNS, rows);
}

function leadsToSheetRows(leads: Lead[]): string[][] {
  return leads.map((l) => [
    l.nome || "",
    l.telefone || "",
    l.email || "",
    l.cidade || "",
    l.origem || "",
  ]);
}

export function exportLeadsToExcel(
  leads: Lead[],
  filename = "leads.xlsx",
  sheetName = "Leads",
) {
  const workbook = XLSX.utils.book_new();
  const sheet = buildLeadsSheet(leadsToSheetRows(leads));
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  const data = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
    cellStyles: false,
  });
  downloadBlob(
    new Blob([data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename,
  );
}

export function exportLeadsToPdf(
  leads: Lead[],
  filename = "leads.pdf",
  imobiliariaNome = "Imobiliária",
  entityLabel = "Leads",
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(14);
  doc.text(`${entityLabel} — ${imobiliariaNome}`, 40, 36);
  doc.setFontSize(9);
  doc.setTextColor(100);
  const unit =
    entityLabel.toLowerCase() === "clientes" ? "cliente(s)" : "lead(s)";
  doc.text(
    `Exportado em ${new Date().toLocaleDateString("pt-BR")} · ${leads.length} ${unit}`,
    40,
    52,
  );

  autoTable(doc, {
    startY: 64,
    head: [Array.from(LEAD_IO_COLUMNS)],
    body: leads.map((l) => [
      l.nome,
      l.telefone,
      l.email || "—",
      l.cidade || "—",
      l.origem || "—",
    ]),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [7, 158, 212] },
  });

  doc.save(filename);
}

export function downloadImportTemplate(
  filename = "modelo-importacao-leads.xlsx",
  opts?: { prospeccao?: boolean },
) {
  const workbook = XLSX.utils.book_new();
  const sheet = opts?.prospeccao
    ? buildTextSheet(LEAD_PROSPECCAO_IO_COLUMNS, [
        [
          "Âncora Imobiliária",
          "Recife",
          "Madalena",
          "R. Demócrito de Souza Filho, 95",
          "(81) 2123-3333",
          "",
          "https://ancoraimobiliaria.com.br/",
          "",
          "Venda; Locação; Administração",
          "Sim",
          "Sim",
          "Sim",
          "Sim",
          "Não identificado publicamente",
          "Não identificado publicamente",
          "Presença digital forte",
          "Dono/gestor comercial",
          "CRM + IA SDR + Landing",
          "9.5",
          "Alta",
          "Grande operação e atuação completa",
          "Google Maps + site oficial",
        ],
      ])
    : buildLeadsSheet([
        [
          "Maria Silva",
          "(81) 98888-7777",
          "maria@email.com",
          "Recife",
          "WhatsApp",
        ],
      ]);
  XLSX.utils.book_append_sheet(
    workbook,
    sheet,
    opts?.prospeccao ? "Leads RMR" : "Modelo",
  );
  const data = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
    cellStyles: false,
  });
  downloadBlob(
    new Blob([data], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename,
  );
}
