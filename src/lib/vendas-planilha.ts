import * as XLSX from "xlsx";

const COLUNAS = ["Lead", "Corretor", "Equipe", "Data de venda", "Construtora", "Empreendimento", "VGV"] as const;

export type LinhaVendaPlanilha = {
  lead: string;
  corretor: string;
  equipe: string;
  dataVenda: string;
  construtora: string;
  empreendimento: string;
  vgv: number;
};

function norm(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function dataIso(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    epoch.setUTCDate(epoch.getUTCDate() + Math.floor(value));
    return epoch.toISOString().slice(0, 10);
  }
  const raw = String(value ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const br = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!br) return "";
  const ano = br[3].length === 2 ? `20${br[3]}` : br[3];
  return `${ano}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
}

function vgvInteiro(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  const limpo = String(value ?? "").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(limpo);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

export function baixarModeloVendas() {
  const sheet = XLSX.utils.aoa_to_sheet([
    [...COLUNAS],
    ["Eduardo Cliente", "Marina Alves", "Equipe Centro", "24/11/2026", "Construtora Alfa", "Residencial Vida", 250000],
  ]);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Vendas");
  XLSX.writeFile(book, "modelo-importacao-vendas.xlsx");
}

export async function lerPlanilhaVendas(file: File): Promise<LinhaVendaPlanilha[]> {
  const data = await file.arrayBuffer();
  const book = XLSX.read(data, { type: "array" });
  const sheet = book.Sheets[book.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  return rows
    .map((row) => {
      const by = new Map<string, unknown>();
      for (const [key, value] of Object.entries(row)) by.set(norm(key), value);
      return {
        lead: String(by.get("lead") ?? by.get("cliente") ?? "").trim(),
        corretor: String(by.get("corretor") ?? "").trim(),
        equipe: String(by.get("equipe") ?? "").trim(),
        dataVenda: dataIso(by.get("data de venda") ?? by.get("data venda")),
        construtora: String(by.get("construtora") ?? "").trim(),
        empreendimento: String(by.get("empreendimento") ?? "").trim(),
        vgv: vgvInteiro(by.get("vgv")),
      };
    })
    .filter((row) => row.lead || row.corretor || row.empreendimento || row.vgv);
}
