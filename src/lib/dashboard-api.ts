import { apiFetch } from "@/lib/api";
import type { AnaliseStatus } from "@/lib/analise-api";

export type DashboardMetric = {
  valor: number;
  valorMesAnterior: number;
  evolucaoPct: number | null;
};

/** Resumo de comissão do mês (valores já no papel do usuário). */
export type DashboardComissaoResumo = {
  total: number;
  aReceber: number;
  pendente: number;
  liberada: number;
  paga: number;
  vendas: number;
  vgv: number;
};

export type DashboardCorretor = {
  periodo: { inicio: string; fim: string };
  carteira: {
    leads: number;
    clientes: number;
    novosContatos: number;
  };
  funil: { etapa: string; total: number }[];
  conversaoEmAnalise: number;
  analises: { status: AnaliseStatus; total: number }[];
  documentacao: {
    registrados: number;
    vendidos: number;
    emAndamento: number;
    vgvVendidoMes: number;
  };
  comissao: DashboardComissaoResumo;
  agenda: {
    totalHoje: number;
    pendentesHoje: number;
    concluidosHoje: number;
    itens: {
      id: string;
      titulo: string;
      tipo: string;
      status: string;
      startsAt: string;
      contato: string | null;
      categoria: "pessoal" | "compartilhada";
    }[];
  };
};

export type DashboardAdmin = {
  periodo: {
    mesAtual: { inicio: string; fim: string };
    mesAnterior: { inicio: string; fim: string };
  };
  entradas: {
    hoje: number;
    semana: number;
    mes: DashboardMetric;
  };
  funil: { etapa: string; total: number }[];
  conversao: {
    /** Leads que entraram no mês. */
    entradas: DashboardMetric;
    /** Fichas de documentação criadas no mês. */
    documentacoes: DashboardMetric;
    /** Vendas do mês (documentação vendida). */
    vendas: DashboardMetric;
    /** Regra: vendas / documentações × 100. */
    taxa: DashboardMetric;
    vgv: DashboardMetric;
  };
  documentacaoPipeline: {
    aprovadas: DashboardMetric;
    reprovadas: DashboardMetric;
    emAnalise: DashboardMetric;
    vgv: DashboardMetric;
  };
  comissao: {
    total: DashboardMetric;
    aReceber: DashboardMetric;
    pendente: DashboardMetric;
    liberada: DashboardMetric;
    paga: DashboardMetric;
    vendas: DashboardMetric;
    vgv: DashboardMetric;
    papel: "gerente" | "admin" | "corretor";
  };
  atencao: {
    semDono: number;
    parados: number;
    diasParado: number;
  };
  perdidos: {
    mes: DashboardMetric;
    motivos: Array<{ motivo: string } & DashboardMetric>;
  };
  agenda: {
    totalHoje: number;
    pendentesHoje: number;
    concluidosHoje: number;
    atrasados: number;
    itens: {
      id: string;
      titulo: string;
      tipo: string;
      status: string;
      startsAt: string;
      contato: string | null;
    }[];
  };
  ranking: Array<{
    corretorId: string;
    nome: string;
    equipe: string | null;
    leads: number;
    visitas: number;
    vendas: DashboardMetric;
    vgv: DashboardMetric;
  }>;
  equipes: Array<{
    equipeId: string;
    nome: string;
    corretores: number;
    leads: number;
    clientes: number;
    total: number;
  }>;
  metas: {
    corretores: Array<{
      id: string;
      tipo: string;
      valor: number;
      atual: number;
      percentual: number;
      corretorId: string;
      corretorNome: string;
      equipeId: string | null;
      equipeNome: string | null;
    }>;
    equipes: Array<{
      equipeId: string;
      nome: string;
      meta: number;
      atual: number;
      percentual: number;
    }>;
    imobiliaria: {
      meta: number;
      atual: number;
      percentual: number;
    };
  };
};

export type PeriodoGranularidade =
  | "mes"
  | "bimestre"
  | "trimestre"
  | "semestre"
  | "anual";

export type DashboardFiltros = {
  /** Recorte do ranking. Omite = mês. */
  granularidade?: PeriodoGranularidade;
  /** Mês 1–12. Omite = mês atual. Alinha ao início do recorte. */
  mes?: number;
  /** Ano calendário. Omite = ano atual. */
  ano?: number;
  /** Origem do lead (catálogo). Omite = todas. */
  origem?: string;
};

function dashboardQuery(params?: DashboardFiltros): string {
  const qs = new URLSearchParams();
  if (params?.granularidade) qs.set("granularidade", params.granularidade);
  if (params?.mes != null) qs.set("mes", String(params.mes));
  if (params?.ano != null) qs.set("ano", String(params.ano));
  if (params?.origem) qs.set("origem", params.origem);
  const query = qs.toString();
  return query ? `?${query}` : "";
}

export async function fetchDashboardCorretor(): Promise<DashboardCorretor> {
  return apiFetch<DashboardCorretor>("/dashboard/corretor");
}

export async function fetchDashboardAdmin(
  params?: DashboardFiltros,
): Promise<DashboardAdmin> {
  return apiFetch<DashboardAdmin>(`/dashboard/admin${dashboardQuery(params)}`);
}

export type DashboardRankingMeta = {
  tipo: string;
  valor: number;
  atual: number;
  percentual: number;
};

export type DashboardRankingCorretor = {
  posicao: number;
  corretorId: string;
  nome: string;
  equipeId: string | null;
  equipe: string | null;
  gerenteId: string | null;
  gerente: string | null;
  leads: number;
  entradas: DashboardMetric;
  visitas: number;
  documentacoes: number;
  vendas: DashboardMetric;
  vgv: DashboardMetric;
  taxaConversao: DashboardMetric;
  perdidos: number;
  meta: DashboardRankingMeta | null;
};

export type DashboardRankingGerente = {
  posicao: number;
  gerenteId: string;
  nome: string;
  equipeId: string;
  equipe: string;
  corretores: number;
  leads: number;
  entradas: DashboardMetric;
  visitas: number;
  documentacoes: number;
  vendas: DashboardMetric;
  vgv: DashboardMetric;
  taxaConversao: DashboardMetric;
  perdidos: number;
};

export type DashboardRanking = {
  periodo: {
    mesAtual: { inicio: string; fim: string };
    mesAnterior: { inicio: string; fim: string };
  };
  totais: {
    entradas: number;
    documentacoes: number;
    vendas: number;
    vgv: number;
    visitas: number;
    perdidos: number;
    taxaConversao: number;
    corretores: number;
    gerentes: number;
  };
  corretores: DashboardRankingCorretor[];
  gerentes: DashboardRankingGerente[];
  construtoras: Array<{
    posicao: number;
    construtoraId: string;
    nome: string;
    vendas: number;
    vgv: number;
  }>;
};

export async function fetchDashboardRanking(
  params?: DashboardFiltros,
): Promise<DashboardRanking> {
  return apiFetch<DashboardRanking>(
    `/dashboard/ranking${dashboardQuery(params)}`,
  );
}

export type CorretorVendas = {
  corretor: { id: string; name: string; creci: string | null };
  totais: { vendas: number; vgv: number };
  items: Array<{
    id: string;
    corretorId: string | null;
    corretor: string;
    creci: string | null;
    gerente: string | null;
    construtora: string | null;
    empreendimento: string | null;
    vgv: number;
    cliente: string;
    clienteCpf: string | null;
    dataVenda: string | null;
  }>;
};

export async function fetchCorretorVendas(
  corretorId: string,
  params?: DashboardFiltros,
): Promise<CorretorVendas> {
  return apiFetch<CorretorVendas>(
    `/dashboard/corretor/${corretorId}/vendas${dashboardQuery(params)}`,
  );
}

export type DashboardEsteiraCorretor = {
  corretor: { id: string; name: string };
  periodo: { inicio: string; fim: string };
  indicadores: {
    vgv: number;
    conversao: number;
    vendas: number;
    contatos: number;
    maisAntigo: { id: string; nome: string; diasParado: number } | null;
  };
  etapas: Array<{
    id: string;
    slug: string;
    label: string;
    color: string;
    total: number;
    contatos: Array<{
      id: string;
      nome: string;
      stage: string;
      prioridade: string;
      createdAt: string;
      updatedAt: string;
      empreendimento: { id: string; nome: string } | null;
    }>;
  }>;
};

export async function fetchDashboardEsteiraCorretor(
  corretorId: string,
  params?: { mes?: number; ano?: number; origem?: string },
) {
  const query = new URLSearchParams();
  if (params?.mes) query.set("mes", String(params.mes));
  if (params?.ano) query.set("ano", String(params.ano));
  if (params?.origem) query.set("origem", params.origem);
  return apiFetch<DashboardEsteiraCorretor>(
    `/dashboard/corretor/${corretorId}/esteira${query.size ? `?${query}` : ""}`,
  );
}
