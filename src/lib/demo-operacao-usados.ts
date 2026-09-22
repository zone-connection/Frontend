import { useSyncExternalStore } from "react";

export type EstoqueStatus = "disponivel" | "reservado" | "vendido";
export type VisitaStatus =
  | "agendada"
  | "confirmada"
  | "realizada"
  | "nao_compareceu"
  | "cancelada";
export type VisitaInteresse =
  | "muito_interessado"
  | "interessado"
  | "pouco_interessado"
  | "sem_interesse";
export type PropostaFila =
  | "aguardando_proprietario"
  | "aguardando_comprador"
  | "em_analise"
  | "aceita"
  | "recusada";
export type ChaveStatus =
  | "imobiliaria"
  | "retirada"
  | "portaria"
  | "entregue"
  | "sem_chave";

export type ImovelDemo = {
  id: string;
  titulo: string;
  tipo: "Apartamento" | "Casa" | "Cobertura" | "Sala" | "Terreno";
  bairro: string;
  cidade: string;
  status: EstoqueStatus;
  preco: number;
  avaliacao: number;
  diasNoMercado: number;
  quartos: number;
  area: number;
  responsavel: string;
  proprietario: string;
  entrouRecente: boolean;
};

export type PerfilDemo = {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  cidade: string;
  bairros: string;
  tipo: ImovelDemo["tipo"];
  precoMin: number;
  precoMax: number;
  quartosMin: number;
  corretor: string;
};

export type VisitaDemo = {
  id: string;
  imovelId: string;
  interessadoId: string;
  quando: "hoje" | "semana";
  diaLabel: string;
  hora: string;
  corretor: string;
  status: VisitaStatus;
  interesse?: VisitaInteresse;
  feedback?: string;
};

export type PropostaDemo = {
  id: string;
  imovelId: string;
  interessadoId: string;
  valor: number;
  pedido: number;
  fila: PropostaFila;
  diasParada: number;
  corretor: string;
  nota: string;
};

export type CaptacaoParada = {
  id: string;
  imovel: string;
  proprietario: string;
  etapa: string;
  diasSemMovimento: number;
  pretendido: number;
  avaliacao: number;
  responsavel: string;
  ultimoContato: string;
};

export type PortalItem = {
  id: string;
  tipo: "sugerido" | "cancelado";
  imovel: string;
  proprietario: string;
  quando: string;
  detalhe: string;
  desfecho: "aberto" | "negociacao" | "perda";
};

export type ExclusividadeItem = {
  id: string;
  imovel: string;
  proprietario: string;
  venceEmDias: number;
  valor: number;
  responsavel: string;
};

export type ChaveDemo = {
  imovelId: string;
  status: ChaveStatus;
  detalhe: string;
};

export type PosVendaDemo = {
  imovelId: string;
  titulo: string;
  atrasada: boolean;
  concluida: boolean;
};

export const IMOVEIS_DEMO: ImovelDemo[] = [
  {
    id: "apto-centro",
    titulo: "Apartamento 82 m²",
    tipo: "Apartamento",
    bairro: "Centro",
    cidade: "Curitiba",
    status: "disponivel",
    preco: 420000,
    avaliacao: 405000,
    diasNoMercado: 18,
    quartos: 2,
    area: 82,
    responsavel: "Marina Alves",
    proprietario: "Helena Duarte",
    entrouRecente: false,
  },
  {
    id: "apto-batel",
    titulo: "Apartamento 90 m²",
    tipo: "Apartamento",
    bairro: "Batel",
    cidade: "Curitiba",
    status: "disponivel",
    preco: 510000,
    avaliacao: 490000,
    diasNoMercado: 22,
    quartos: 2,
    area: 90,
    responsavel: "Marina Alves",
    proprietario: "Ricardo Pacheco",
    entrouRecente: false,
  },
  {
    id: "casa-boa-viagem",
    titulo: "Casa 3 quartos",
    tipo: "Casa",
    bairro: "Boa Viagem",
    cidade: "Recife",
    status: "reservado",
    preco: 890000,
    avaliacao: 860000,
    diasNoMercado: 41,
    quartos: 3,
    area: 180,
    responsavel: "Rafael Costa",
    proprietario: "João Batista",
    entrouRecente: false,
  },
  {
    id: "cobertura-jardins",
    titulo: "Cobertura Jardins",
    tipo: "Cobertura",
    bairro: "Jardins",
    cidade: "São Paulo",
    status: "disponivel",
    preco: 1850000,
    avaliacao: 1790000,
    diasNoMercado: 7,
    quartos: 3,
    area: 210,
    responsavel: "Marina Alves",
    proprietario: "Clara Nogueira",
    entrouRecente: true,
  },
  {
    id: "sala-batel",
    titulo: "Sala comercial",
    tipo: "Sala",
    bairro: "Batel",
    cidade: "Curitiba",
    status: "vendido",
    preco: 610000,
    avaliacao: 590000,
    diasNoMercado: 63,
    quartos: 0,
    area: 48,
    responsavel: "Pedro Lima",
    proprietario: "Ótica Central",
    entrouRecente: false,
  },
  {
    id: "terreno-sjp",
    titulo: "Terreno 360 m²",
    tipo: "Terreno",
    bairro: "Afonso Pena",
    cidade: "São José dos Pinhais",
    status: "disponivel",
    preco: 310000,
    avaliacao: 275000,
    diasNoMercado: 92,
    quartos: 0,
    area: 360,
    responsavel: "Pedro Lima",
    proprietario: "Sérgio Klein",
    entrouRecente: false,
  },
  {
    id: "apto-moinhos",
    titulo: "Apartamento 2 quartos",
    tipo: "Apartamento",
    bairro: "Moinhos de Vento",
    cidade: "Porto Alegre",
    status: "reservado",
    preco: 540000,
    avaliacao: 530000,
    diasNoMercado: 12,
    quartos: 2,
    area: 74,
    responsavel: "Marina Alves",
    proprietario: "Lúcia Ferreira",
    entrouRecente: false,
  },
];

export const PERFIS_DEMO: PerfilDemo[] = [
  {
    id: "ana",
    nome: "Ana Souza",
    telefone: "(41) 98810-2201",
    email: "ana.souza@email.com",
    cidade: "Curitiba",
    bairros: "Centro, Batel",
    tipo: "Apartamento",
    precoMin: 350000,
    precoMax: 450000,
    quartosMin: 2,
    corretor: "Marina Alves",
  },
  {
    id: "carlos",
    nome: "Carlos Mendes",
    telefone: "(81) 99720-4410",
    email: "carlos.mendes@email.com",
    cidade: "Recife",
    bairros: "Boa Viagem",
    tipo: "Casa",
    precoMin: 700000,
    precoMax: 950000,
    quartosMin: 3,
    corretor: "Rafael Costa",
  },
  {
    id: "juliana",
    nome: "Juliana Prado",
    telefone: "(11) 98111-9033",
    email: "juliana.prado@email.com",
    cidade: "São Paulo",
    bairros: "Jardins, Pinheiros",
    tipo: "Apartamento",
    precoMin: 1500000,
    precoMax: 2200000,
    quartosMin: 3,
    corretor: "Marina Alves",
  },
  {
    id: "fernanda",
    nome: "Fernanda Reis",
    telefone: "(51) 99200-1188",
    email: "fernanda.reis@email.com",
    cidade: "Porto Alegre",
    bairros: "Moinhos de Vento",
    tipo: "Apartamento",
    precoMin: 480000,
    precoMax: 600000,
    quartosMin: 2,
    corretor: "Marina Alves",
  },
  {
    id: "bruno",
    nome: "Bruno Dias",
    telefone: "(41) 98400-7721",
    email: "bruno.dias@email.com",
    cidade: "São José dos Pinhais",
    bairros: "Afonso Pena",
    tipo: "Terreno",
    precoMin: 200000,
    precoMax: 350000,
    quartosMin: 0,
    corretor: "Pedro Lima",
  },
];

const TIPO_EQUIV: Record<string, string[]> = {
  Apartamento: ["Apartamento", "Cobertura"],
  Cobertura: ["Apartamento", "Cobertura"],
  Casa: ["Casa"],
  Sala: ["Sala"],
  Terreno: ["Terreno"],
};

export type MatchNivel = "alto" | "fora";

export function matchImovel(imovel: ImovelDemo, perfil: PerfilDemo) {
  if (imovel.status === "vendido") return null;
  const tipos = TIPO_EQUIV[perfil.tipo] ?? [perfil.tipo];
  if (!tipos.includes(imovel.tipo)) return null;
  if (imovel.cidade !== perfil.cidade) return null;
  const motivos = [imovel.cidade, imovel.tipo];
  const precoOk = imovel.preco >= perfil.precoMin && imovel.preco <= perfil.precoMax;
  const quartosOk =
    imovel.tipo === "Terreno" ||
    imovel.tipo === "Sala" ||
    imovel.quartos >= perfil.quartosMin;
  if (quartosOk && imovel.quartos > 0) motivos.push(`${imovel.quartos} quartos`);
  if (precoOk && quartosOk) {
    return { nivel: "alto" as const, motivos };
  }
  if (!precoOk && quartosOk) {
    return {
      nivel: "fora" as const,
      motivos: [
        ...motivos,
        imovel.preco > perfil.precoMax ? "acima da faixa" : "abaixo da faixa",
      ],
    };
  }
  return null;
}

export function imovelById(id: string) {
  return IMOVEIS_DEMO.find((item) => item.id === id);
}

export function perfilById(id: string) {
  return PERFIS_DEMO.find((item) => item.id === id);
}

type DemoState = {
  visitas: VisitaDemo[];
  propostas: PropostaDemo[];
  paradas: CaptacaoParada[];
  portal: PortalItem[];
  exclusividades: ExclusividadeItem[];
  chaves: ChaveDemo[];
  posVenda: PosVendaDemo[];
  vinculos: string[];
  alertasDispensados: string[];
};

function initialState(): DemoState {
  return {
    visitas: [
      {
        id: "v1",
        imovelId: "apto-centro",
        interessadoId: "ana",
        quando: "hoje",
        diaLabel: "Hoje",
        hora: "09:30",
        corretor: "Marina Alves",
        status: "confirmada",
      },
      {
        id: "v2",
        imovelId: "casa-boa-viagem",
        interessadoId: "carlos",
        quando: "hoje",
        diaLabel: "Hoje",
        hora: "14:00",
        corretor: "Rafael Costa",
        status: "agendada",
      },
      {
        id: "v3",
        imovelId: "cobertura-jardins",
        interessadoId: "juliana",
        quando: "hoje",
        diaLabel: "Hoje",
        hora: "16:30",
        corretor: "Marina Alves",
        status: "agendada",
      },
      {
        id: "v4",
        imovelId: "terreno-sjp",
        interessadoId: "bruno",
        quando: "semana",
        diaLabel: "Quarta",
        hora: "10:00",
        corretor: "Pedro Lima",
        status: "agendada",
      },
      {
        id: "v5",
        imovelId: "apto-moinhos",
        interessadoId: "fernanda",
        quando: "semana",
        diaLabel: "Quinta",
        hora: "11:00",
        corretor: "Marina Alves",
        status: "confirmada",
      },
      {
        id: "v6",
        imovelId: "casa-boa-viagem",
        interessadoId: "carlos",
        quando: "semana",
        diaLabel: "Sexta",
        hora: "15:00",
        corretor: "Rafael Costa",
        status: "agendada",
      },
      {
        id: "v7",
        imovelId: "apto-centro",
        interessadoId: "ana",
        quando: "hoje",
        diaLabel: "Ontem",
        hora: "17:00",
        corretor: "Marina Alves",
        status: "realizada",
        interesse: "muito_interessado",
        feedback: "Quer ver de novo com o marido no fim de semana.",
      },
    ],
    propostas: [
      {
        id: "p1",
        imovelId: "casa-boa-viagem",
        interessadoId: "carlos",
        valor: 850000,
        pedido: 890000,
        fila: "aguardando_proprietario",
        diasParada: 3,
        corretor: "Rafael Costa",
        nota: "Proposta enviada ao proprietário. Sem retorno.",
      },
      {
        id: "p2",
        imovelId: "apto-centro",
        interessadoId: "ana",
        valor: 415000,
        pedido: 420000,
        fila: "aguardando_comprador",
        diasParada: 1,
        corretor: "Marina Alves",
        nota: "Contraproposta do proprietário: R$ 415 mil.",
      },
      {
        id: "p3",
        imovelId: "cobertura-jardins",
        interessadoId: "juliana",
        valor: 1780000,
        pedido: 1850000,
        fila: "em_analise",
        diasParada: 5,
        corretor: "Marina Alves",
        nota: "Compradora pediu prazo para o banco.",
      },
      {
        id: "p4",
        imovelId: "apto-moinhos",
        interessadoId: "fernanda",
        valor: 530000,
        pedido: 540000,
        fila: "aceita",
        diasParada: 0,
        corretor: "Marina Alves",
        nota: "Aceite das duas partes. Reserva feita.",
      },
      {
        id: "p5",
        imovelId: "terreno-sjp",
        interessadoId: "bruno",
        valor: 280000,
        pedido: 310000,
        fila: "recusada",
        diasParada: 0,
        corretor: "Pedro Lima",
        nota: "Proprietário não aceita abaixo de R$ 300 mil.",
      },
    ],
    paradas: [
      {
        id: "c1",
        imovel: "Casa no Cajuru",
        proprietario: "Paulo Ribeiro",
        etapa: "Avaliação",
        diasSemMovimento: 21,
        pretendido: 480000,
        avaliacao: 420000,
        responsavel: "Marina Alves",
        ultimoContato: "há 21 dias",
      },
      {
        id: "c2",
        imovel: "Apartamento na Água Verde",
        proprietario: "Helena Duarte",
        etapa: "Documentos",
        diasSemMovimento: 14,
        pretendido: 620000,
        avaliacao: 600000,
        responsavel: "Rafael Costa",
        ultimoContato: "há 14 dias",
      },
      {
        id: "c3",
        imovel: "Sala no Centro",
        proprietario: "Ótica Central",
        etapa: "Visita técnica",
        diasSemMovimento: 9,
        pretendido: 250000,
        avaliacao: 240000,
        responsavel: "Pedro Lima",
        ultimoContato: "há 9 dias",
      },
    ],
    portal: [
      {
        id: "o1",
        tipo: "sugerido",
        imovel: "Casa em Santa Felicidade",
        proprietario: "Paulo Ribeiro",
        quando: "Ontem",
        detalhe: "Enviou fotos e pediu avaliação pelo portal.",
        desfecho: "aberto",
      },
      {
        id: "o2",
        tipo: "cancelado",
        imovel: "Apartamento no Bacacheri",
        proprietario: "Lúcia Ferreira",
        quando: "Hoje",
        detalhe: "Desistiu de anunciar. Pediu para encerrar.",
        desfecho: "aberto",
      },
    ],
    exclusividades: [
      {
        id: "e1",
        imovel: "Casa em Boa Viagem",
        proprietario: "João Batista",
        venceEmDias: 6,
        valor: 890000,
        responsavel: "Rafael Costa",
      },
      {
        id: "e2",
        imovel: "Cobertura Jardins",
        proprietario: "Clara Nogueira",
        venceEmDias: 18,
        valor: 1850000,
        responsavel: "Marina Alves",
      },
      {
        id: "e3",
        imovel: "Apartamento no Centro",
        proprietario: "Helena Duarte",
        venceEmDias: 45,
        valor: 420000,
        responsavel: "Marina Alves",
      },
    ],
    chaves: [
      { imovelId: "apto-centro", status: "imobiliaria", detalhe: "Chave na caixa da imobiliária." },
      { imovelId: "apto-batel", status: "portaria", detalhe: "Retirar na portaria com aviso." },
      { imovelId: "casa-boa-viagem", status: "retirada", detalhe: "Com Marina Alves desde hoje de manhã." },
      { imovelId: "cobertura-jardins", status: "imobiliaria", detalhe: "Chave principal na caixa." },
      { imovelId: "sala-batel", status: "entregue", detalhe: "Entregue ao comprador na assinatura." },
      { imovelId: "terreno-sjp", status: "sem_chave", detalhe: "Terreno sem chave. Acesso pelo portão." },
      { imovelId: "apto-moinhos", status: "portaria", detalhe: "Portaria do condomínio, avisar o zelador." },
    ],
    posVenda: [
      {
        imovelId: "sala-batel",
        titulo: "Registrar escritura",
        atrasada: true,
        concluida: false,
      },
    ],
    vinculos: ["ana:apto-centro", "carlos:casa-boa-viagem", "fernanda:apto-moinhos"],
    alertasDispensados: [],
  };
}

let state = initialState();
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function patch<K extends keyof DemoState>(key: K, value: DemoState[K]) {
  state = { ...state, [key]: value };
  emit();
}

export function subscribeDemo(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDemoState() {
  return state;
}

export function useDemoOperacao() {
  return useSyncExternalStore(subscribeDemo, getDemoState, getDemoState);
}

export function patchVisita(id: string, partial: Partial<VisitaDemo>) {
  patch(
    "visitas",
    state.visitas.map((item) => (item.id === id ? { ...item, ...partial } : item)),
  );
}

export function patchProposta(id: string, partial: Partial<PropostaDemo>) {
  patch(
    "propostas",
    state.propostas.map((item) => (item.id === id ? { ...item, ...partial } : item)),
  );
}

export function patchParada(id: string, partial: Partial<CaptacaoParada>) {
  patch(
    "paradas",
    state.paradas.map((item) => (item.id === id ? { ...item, ...partial } : item)),
  );
}

export function patchPortal(id: string, partial: Partial<PortalItem>) {
  patch(
    "portal",
    state.portal.map((item) => (item.id === id ? { ...item, ...partial } : item)),
  );
}

export function patchExclusividade(id: string, partial: Partial<ExclusividadeItem>) {
  patch(
    "exclusividades",
    state.exclusividades.map((item) =>
      item.id === id ? { ...item, ...partial } : item,
    ),
  );
}

export function patchChave(imovelId: string, partial: Partial<ChaveDemo>) {
  patch(
    "chaves",
    state.chaves.map((item) =>
      item.imovelId === imovelId ? { ...item, ...partial } : item,
    ),
  );
}

export function concluirPosVenda(imovelId: string) {
  patch(
    "posVenda",
    state.posVenda.map((item) =>
      item.imovelId === imovelId
        ? { ...item, concluida: true, atrasada: false }
        : item,
    ),
  );
}

export function vincularInteressado(interessadoId: string, imovelId: string) {
  const key = `${interessadoId}:${imovelId}`;
  if (state.vinculos.includes(key)) return;
  patch("vinculos", [...state.vinculos, key]);
}

export function dispensarAlerta(interessadoId: string, imovelId: string) {
  const key = `${interessadoId}:${imovelId}`;
  if (state.alertasDispensados.includes(key)) return;
  patch("alertasDispensados", [...state.alertasDispensados, key]);
}

export const ESTOQUE_STATUS_LABEL: Record<EstoqueStatus, string> = {
  disponivel: "Disponível",
  reservado: "Reservado",
  vendido: "Vendido",
};

export const VISITA_STATUS_LABEL: Record<VisitaStatus, string> = {
  agendada: "Agendada",
  confirmada: "Confirmada",
  realizada: "Realizada",
  nao_compareceu: "Não compareceu",
  cancelada: "Cancelada",
};

export const INTERESSE_LABEL: Record<VisitaInteresse, string> = {
  muito_interessado: "Muito interessado",
  interessado: "Interessado",
  pouco_interessado: "Pouco interessado",
  sem_interesse: "Sem interesse",
};

export const PROPOSTA_FILA_LABEL: Record<PropostaFila, string> = {
  aguardando_proprietario: "Aguardando proprietário",
  aguardando_comprador: "Aguardando comprador",
  em_analise: "Em análise",
  aceita: "Aceita",
  recusada: "Recusada",
};

export const CHAVE_STATUS_LABEL: Record<ChaveStatus, string> = {
  imobiliaria: "Na imobiliária",
  retirada: "Retirada",
  portaria: "Na portaria",
  entregue: "Entregue",
  sem_chave: "Sem chave",
};
