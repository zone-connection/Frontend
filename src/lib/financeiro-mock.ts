import { STATUS_CHIP_CLASS } from "@/lib/catalog-colors";

/** Tipos e utilitários do módulo Financeiro (sem dados mock). */

export type PeriodoFiltro = "mes" | "trimestre" | "ano" | "tudo";
export type StatusTitulo = "aberto" | "pago" | "atrasado" | "cancelado";
export type TipoParceiro = "cliente" | "fornecedor" | "ambos";
export type TipoMovimento = "entrada" | "saida";

export type CategoriaFinanceiro = {
  id: string;
  nome: string;
  tipo: TipoMovimento;
  ativo: boolean;
  createdAt: string;
};

export function brl(n: number) {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function brlCompact(n: number) {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

/** Interpreta YYYY-MM-DD (ou ISO) ao meio-dia local — evita dia anterior em BRT. */
export function parseFinanceiroDay(
  iso: string | null | undefined,
): Date | null {
  if (!iso) return null;
  const day = String(iso).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const date = new Date(`${day}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(iso: string) {
  const date = parseFinanceiroDay(iso);
  return date ? date.toLocaleDateString("pt-BR") : "—";
}

export const COMISSAO_PAPEL_LABEL: Record<string, string> = {
  caixa: "Caixa da imobiliária",
  socios: "Sócios",
  corretor: "Corretor",
  gerente: "Gerente",
  tributos: "Tributos",
};

export const PERIODO_OPTIONS: { value: PeriodoFiltro; label: string }[] = [
  { value: "mes", label: "Mês atual" },
  { value: "trimestre", label: "Trimestre" },
  { value: "ano", label: "Ano" },
  { value: "tudo", label: "Todo o período" },
];

export const STATUS_OPTIONS: {
  value: StatusTitulo | "todos";
  label: string;
}[] = [
  { value: "todos", label: "Todos os status" },
  { value: "aberto", label: "Aberto" },
  { value: "pago", label: "Pago" },
  { value: "atrasado", label: "Atrasado" },
  { value: "cancelado", label: "Cancelado" },
];

export interface ParceiroFinanceiro {
  id: string;
  nome: string;
  documento: string;
  tipo: TipoParceiro;
  email: string;
  telefone: string;
  cidade: string;
  imobiliaria: string;
  saldoAberto: number;
  ativo: boolean;
}

export interface MovimentoFinanceiro {
  id: string;
  data: string;
  descricao: string;
  parceiroId?: string | null;
  parceiro: string;
  categoria: string;
  centro: string;
  tipo: TipoMovimento;
  valor: number;
  status: StatusTitulo;
  formaPagamento: string;
  tituloId?: string | null;
  natureza?: NaturezaDespesa | null;
}

export interface TituloFinanceiro {
  id: string;
  tipo: "receber" | "pagar";
  descricao: string;
  parceiroId: string | null;
  parceiro: string;
  categoria: string;
  centro: string;
  vencimento: string;
  dataPagamento: string | null;
  valor: number;
  status: StatusTitulo;
  diasAtraso?: number;
  multa?: number;
  juros?: number;
  valorAtraso?: number;
  valorAtualizado?: number;
  parcela: string;
  grupoParcelasId?: string | null;
  recorrenciaIndeterminada?: boolean;
  platformContratoId?: string | null;
  comissaoId?: string | null;
  comissaoPapel?: string | null;
  natureza?: NaturezaDespesa | null;
  formaPagamento?: string;
}

export interface ComissaoItem {
  id: string;
  corretor: string;
  equipe: string;
  empreendimento: string;
  cliente: string;
  dataVenda: string;
  vgv: number;
  percentual: number;
  valor: number;
  status: "pendente" | "liberada" | "paga";
}

export type FluxoGranularidade = "dia" | "semana" | "mes" | "trimestre";

export interface FluxoBucket {
  chave: string;
  label: string;
  inicio: string;
  fim: string;
  entradasRealizadas: number;
  saidasRealizadas: number;
  entradasPrevistas: number;
  saidasPrevistas: number;
  saldoRealizado: number;
  saldoProjetado: number;
  /** Compat / totais consolidados */
  dia: string;
  entradas: number;
  saidas: number;
  saldo: number;
}

/** @deprecated Use FluxoBucket */
export type FluxoDia = FluxoBucket;

export interface FluxoItem {
  data: string;
  tipo: "entrada" | "saida";
  valor: number;
  natureza: "realizado" | "previsto";
  origem: "titulo" | "movimento" | "comissao";
  id: string;
  descricao: string;
  parceiro: string;
  categoria: string;
  centro: string;
  status: string;
  contrato?: boolean;
}

export const FLUXO_ORIGEM_LABEL: Record<FluxoItem["origem"], string> = {
  titulo: "Título",
  movimento: "Movimento",
  comissao: "Comissão",
};

export const FLUXO_GRANULARIDADE_OPTIONS: {
  value: FluxoGranularidade;
  label: string;
}[] = [
  { value: "dia", label: "Diário" },
  { value: "semana", label: "Semanal" },
  { value: "mes", label: "Mensal" },
  { value: "trimestre", label: "Trimestral" },
];

export interface MesResumo {
  mes: string;
  receitas: number;
  despesas: number;
  variaveis?: number;
  fixas?: number;
  comissoesAReceber?: number;
  aReceber?: number;
  aPagar?: number;
}

export type DespesaPipelineItem = {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  centro: string;
  parceiro: string;
  status: StatusTitulo;
  comissaoId?: string | null;
};

export type NaturezaDespesa = "fixa" | "fixa_variavel" | "variavel";

export function despesaNaturezaLabel(
  natureza?: NaturezaDespesa | null,
): string | null {
  if (natureza === "fixa") return "Fixa";
  if (natureza === "variavel" || natureza === "fixa_variavel") return "Variável";
  return null;
}

export interface CentroDespesaResumo {
  centro: string;
  natureza?: NaturezaDespesa | null;
  orcado: number;
  realizado: number;
  percentual: number;
}

export interface DespesaTipo {
  id: string;
  nome: string;
  natureza: NaturezaDespesa;
  orcadoMensal: number;
  realizado: number;
  qtdDespesas: number;
  ativo: boolean;
  createdAt: string;
}

export interface DespesaLancamento {
  id: string;
  tipoId: string;
  tipoNome: string;
  natureza: NaturezaDespesa;
  descricao: string;
  valor: number;
  data: string;
  competencia: string;
  recorrente: boolean;
  origemId: string | null;
  observacao: string;
  ativo: boolean;
  createdAt: string;
}

/** Alias do centro de recebimentos (mesmo shape do centro de despesas). */
export type CentroRecebimentoResumo = CentroDespesaResumo;
export type RecebimentoTipo = DespesaTipo & { qtdRecebimentos?: number };
export type RecebimentoLancamento = DespesaLancamento;

/** Coleções vazias até a API do financeiro existir. */
export const MOCK_PARCEIROS: ParceiroFinanceiro[] = [];
export const MOCK_MOVIMENTOS: MovimentoFinanceiro[] = [];
export const MOCK_A_RECEBER: TituloFinanceiro[] = [];
export const MOCK_A_PAGAR: TituloFinanceiro[] = [];
export const MOCK_COMISSOES: ComissaoItem[] = [];
export const MOCK_FLUXO_CAIXA: FluxoDia[] = [];
export const MOCK_MESES_RESUMO: MesResumo[] = [];
export const MOCK_CENTROS: CentroDespesaResumo[] = [];

export const VISAO_GERAL_KPIS = {
  saldoAtual: 0,
  receitasMes: 0,
  despesasMes: 0,
  aReceber: 0,
  aPagar: 0,
  resultadoMes: 0,
  evolucaoReceitas: null as number | null,
  evolucaoDespesas: null as number | null,
  evolucaoResultado: null as number | null,
};

export function statusBadgeClass(
  status: StatusTitulo | ComissaoItem["status"],
) {
  const size = STATUS_CHIP_CLASS;
  switch (status) {
    case "pago":
    case "paga":
      return `${size} border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300`;
    case "aberto":
    case "pendente":
      return `${size} border-transparent bg-sky-500/15 text-sky-700 dark:text-sky-300`;
    case "atrasado":
      return `${size} border-transparent bg-destructive/15 text-destructive`;
    case "liberada":
      return `${size} border-transparent bg-amber-500/15 text-amber-800 dark:text-amber-300`;
    case "cancelado":
      return `${size} border-transparent bg-muted text-muted-foreground`;
    default:
      return `${size} border-transparent bg-secondary text-secondary-foreground`;
  }
}

export function statusLabel(status: StatusTitulo | ComissaoItem["status"]) {
  const map: Record<string, string> = {
    aberto: "Aberto",
    pago: "Pago",
    atrasado: "Atrasado",
    cancelado: "Cancelado",
    pendente: "Pendente",
    liberada: "Liberada",
    paga: "Paga",
  };
  return map[status] ?? status;
}

export function filterByPeriodo<
  T extends { data?: string; vencimento?: string; dataVenda?: string },
>(
  items: T[],
  periodo: PeriodoFiltro,
  dateKey: keyof T = "data" as keyof T,
): T[] {
  if (periodo === "tudo") return items;
  const now = new Date();
  return items.filter((item) => {
    const d = parseFinanceiroDay(String(item[dateKey] ?? ""));
    if (!d) return true;
    if (periodo === "mes") {
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    }
    if (periodo === "trimestre") {
      const q = Math.floor(now.getMonth() / 3);
      return (
        Math.floor(d.getMonth() / 3) === q &&
        d.getFullYear() === now.getFullYear()
      );
    }
    return d.getFullYear() === now.getFullYear();
  });
}

/** True se a data cai no filtro de período (mês/trimestre/ano/tudo). */
export function matchesPeriodoFiltro(
  iso: string | null | undefined,
  periodo: PeriodoFiltro,
  now = new Date(),
): boolean {
  if (periodo === "tudo") return true;
  const d = parseFinanceiroDay(iso);
  if (!d) return true;
  if (periodo === "mes") {
    return (
      d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    );
  }
  if (periodo === "trimestre") {
    return (
      Math.floor(d.getMonth() / 3) === Math.floor(now.getMonth() / 3) &&
      d.getFullYear() === now.getFullYear()
    );
  }
  return d.getFullYear() === now.getFullYear();
}

function startOfPeriodo(periodo: PeriodoFiltro, now: Date): Date | null {
  if (periodo === "tudo") return null;
  const y = now.getFullYear();
  const m = now.getMonth();
  if (periodo === "mes") return new Date(y, m, 1);
  if (periodo === "trimestre") return new Date(y, Math.floor(m / 3) * 3, 1);
  return new Date(y, 0, 1);
}

/**
 * Mês/trimestre/ano: vence no intervalo, ou ainda está em aberto/atrasado
 * de períodos anteriores. Pagos entram pela data da baixa.
 */
export function tituloVisivelNoPeriodo(
  titulo: {
    status: StatusTitulo;
    vencimento: string;
    dataPagamento?: string | null;
  },
  periodo: PeriodoFiltro,
  now = new Date(),
): boolean {
  if (periodo === "tudo") return true;
  if (titulo.status === "pago") {
    return matchesPeriodoFiltro(
      titulo.dataPagamento || titulo.vencimento,
      periodo,
      now,
    );
  }
  if (titulo.status === "cancelado") {
    return matchesPeriodoFiltro(titulo.vencimento, periodo, now);
  }
  if (matchesPeriodoFiltro(titulo.vencimento, periodo, now)) return true;
  const venc = parseFinanceiroDay(titulo.vencimento);
  const start = startOfPeriodo(periodo, now);
  if (!venc || !start) return true;
  return venc < start;
}
