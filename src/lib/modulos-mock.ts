import type { ChecklistItem, OportunidadeCaptacao } from "@/lib/captacao-api";
import type { CaptacaoRelatorio } from "@/lib/captacao-api";

export const OPORTUNIDADES_MOCK: OportunidadeCaptacao[] = [
  {
    id: "mock-op-1",
    localizacao: "Meireles, Fortaleza",
    proprietarioNome: "Helena Dias",
    telefone: "(85) 98811-2040",
    tipo: "apartamento",
    valorPretendido: 890000,
    origem: "Indicação",
    responsavelId: "mock",
    responsavel: { id: "mock", name: "Marina Alves" },
    proximaAcao: "Ligar para marcar visita",
    proximaAcaoEm: "2026-10-20",
    status: "aberta",
    motivoPerda: "",
    captacaoId: null,
  },
  {
    id: "mock-op-2",
    localizacao: "Aldeota, rua Silva Jatahy",
    proprietarioNome: "Carlos Bezerra",
    telefone: "(85) 99920-1188",
    tipo: "sala_comercial",
    valorPretendido: 1250000,
    origem: "Portaria",
    responsavelId: "mock",
    responsavel: { id: "mock", name: "Marino Alves" },
    proximaAcao: "Enviar avaliação preliminar",
    proximaAcaoEm: "2026-10-18",
    status: "aberta",
    motivoPerda: "",
    captacaoId: null,
  },
  {
    id: "mock-op-3",
    localizacao: "Cocó, casa na Av. Padre Antônio Tomás",
    proprietarioNome: "Rita Alencar",
    telefone: "(85) 98700-4412",
    tipo: "casa",
    valorPretendido: 1650000,
    origem: "Placa",
    responsavelId: "mock",
    responsavel: { id: "mock", name: "Marina Alves" },
    proximaAcao: "",
    proximaAcaoEm: null,
    status: "perdida",
    motivoPerda: "Preço incompatível",
    captacaoId: null,
  },
];

export const AVALIACOES_MOCK = [
  {
    id: "mock-av-1",
    proprietario: "Otávio Lira",
    imovel: "Terreno — Rodovia CE-040, km 12",
    etapa: "Avaliação",
    responsavel: "Marino Alves",
  },
  {
    id: "mock-av-2",
    proprietario: "Sandra Pires",
    imovel: "Sala comercial — Av. Santos Dumont",
    etapa: "Primeiro contato",
    responsavel: "Marina Alves",
  },
];

const item = (chave: string, label: string, pronto: boolean): ChecklistItem => ({
  chave,
  label,
  pronto,
});

export const DOCUMENTACAO_MOCK: Array<{
  id: string;
  proprietario: string;
  etapa: string;
  itens: ChecklistItem[];
}> = [
  {
    id: "mock-doc-1",
    proprietario: "Lúcia Andrade",
    etapa: "Aguardando documentação",
    itens: [
      item("fotos", "Fotos e vídeos", true),
      item("documentacao", "Documentação do proprietário", false),
      item("proprietario", "Telefone do proprietário", true),
      item("valor", "Valor e condições", true),
      item("autorizacao", "Autorização para anunciar", false),
      item("portais", "Dados para os portais", true),
    ],
  },
  {
    id: "mock-doc-2",
    proprietario: "Eliane Costa",
    etapa: "Negociação",
    itens: [
      item("fotos", "Fotos e vídeos", true),
      item("documentacao", "Documentação do proprietário", true),
      item("proprietario", "Telefone do proprietário", true),
      item("valor", "Valor e condições", true),
      item("autorizacao", "Autorização para anunciar", true),
      item("portais", "Dados para os portais", false),
    ],
  },
];

export const RELATORIO_MOCK: CaptacaoRelatorio = {
  corretores: [
    {
      responsavelId: "mock-1",
      nome: "Marina Alves",
      abertas: 6,
      concluidas: 3,
      visitas: 8,
      tempoMedioDias: 18,
    },
    {
      responsavelId: "mock-2",
      nome: "Marino Alves",
      abertas: 4,
      concluidas: 2,
      visitas: 5,
      tempoMedioDias: 24,
    },
  ],
  motivos: [
    { motivo: "Preço incompatível", total: 4 },
    { motivo: "Ausência de retorno", total: 2 },
    { motivo: "Imóvel já negociado", total: 1 },
  ],
};

export type LocacaoMock = {
  id: string;
  nome: string;
  imovel: string;
  bairro: string;
  telefone: string;
  email: string;
  aluguel: string;
  etapa: string;
  corretor: string;
  status: string;
};

export const LOCACOES_MOCK: LocacaoMock[] = [
  {
    id: "mock-loc-1",
    nome: "Ana Beatriz Nogueira",
    imovel: "Apartamento 3 quartos — Meireles",
    bairro: "Meireles",
    telefone: "(85) 98840-2201",
    email: "ana.nogueira@example.com",
    aluguel: "R$ 4.200",
    etapa: "Visita realizada",
    corretor: "Marina Alves",
    status: "Em dia",
  },
  {
    id: "mock-loc-2",
    nome: "Paulo Henrique Lima",
    imovel: "Casa — Aldeota",
    bairro: "Aldeota",
    telefone: "(85) 99910-7733",
    email: "paulo.lima@example.com",
    aluguel: "R$ 7.800",
    etapa: "Proposta",
    corretor: "Marino Alves",
    status: "Prazo próximo",
  },
  {
    id: "mock-loc-3",
    nome: "Comércio Boa Vista Ltda",
    imovel: "Sala comercial — Papicu",
    bairro: "Papicu",
    telefone: "(85) 98765-0144",
    email: "contato@boavista.example.com",
    aluguel: "R$ 5.500",
    etapa: "Contrato",
    corretor: "Marina Alves",
    status: "Em dia",
  },
];
