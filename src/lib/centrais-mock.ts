import type { MelhoriaDetalhe } from "@/lib/melhorias-api";
import type { OnboardingDetalhe } from "@/lib/onboarding-api";
import type { SuporteDetalhe } from "@/lib/suporte-api";

const agora = "2026-10-28T14:00:00.000Z";

export const MOCK_SUPORTES: SuporteDetalhe[] = [
  chamado("1", "SUP-1042", "Aurora Imóveis", "Não consigo entrar no aplicativo", "alta", "aberto", "acesso", null, false),
  chamado("2", "SUP-1041", "Litoral Prime", "Pagamento recusado e o saldo baixou", "alta", "aberto", "financeiro", null, false),
  chamado("3", "SUP-1038", "Serra Verde", "Atualização dos termos de uso", "alta", "em_atendimento", "contrato", "Ana Souza", false),
  chamado("4", "SUP-1033", "Norte House", "Aplicativo fecha ao enviar arquivo", "alta", "aguardando_cliente", "anexo", null, true),
  chamado("5", "SUP-1028", "Centro Sul", "Teste de cobrança pela API", "normal", "aguardando_equipe", "integracao", null, false),
  chamado("6", "SUP-1021", "Vista Mar", "Pedido entregue no endereço errado", "normal", "aguardando_equipe", "operacao", "Carlos Lima", false),
  chamado("7", "SUP-1014", "Planalto", "Conta suspensa sem motivo", "baixa", "resolvido", "conta", "Marina Dias", false),
  chamado("8", "SUP-1009", "Beira Rio", "Segunda via da fatura do mês passado", "baixa", "resolvido", "financeiro", "Marina Dias", false),
  chamado("9", "SUP-1002", "Atlântica", "Pedido de tema escuro", "baixa", "fechado", "produto", "Ana Souza", false),
];

export const MOCK_MELHORIAS: MelhoriaDetalhe[] = [
  ideia("1", "MEL-88", "Aurora Imóveis", "Campo de renda no filtro de imóveis", "usabilidade", "alta", "em_avaliacao"),
  ideia("2", "MEL-84", "Litoral Prime", "Link do site principal no rodapé", "melhoria_existente", "normal", "planejada"),
  ideia("3", "MEL-79", "Serra Verde", "Ocultar imóvel da busca pública", "funcionalidade_nova", "alta", "recebida"),
  ideia("4", "MEL-71", "Norte House", "Imagem no card do funil", "usabilidade", "normal", "planejada"),
  ideia("5", "MEL-66", "Centro Sul", "Resumo automático do chamado", "integracao", "normal", "em_desenvolvimento"),
  ideia("6", "MEL-58", "Vista Mar", "Integração com a agenda do corretor", "integracao", "baixa", "aprovada"),
];

export const MOCK_ONBOARDINGS: OnboardingDetalhe[] = [
  impl("1", "Aurora Imóveis", "em_andamento", 40, false, "abertas"),
  impl("2", "Litoral Prime", "aguardando_cliente", 25, true, "atrasadas"),
  impl("3", "Serra Verde", "em_andamento", 60, false, "abertas"),
  impl("4", "Norte House", "nao_iniciado", 0, true, "atrasadas"),
  impl("5", "Vista Mar", "concluido", 100, false, "concluidas"),
  impl("6", "Planalto", "em_andamento", 75, false, "abertas"),
];

export function suportesMock(filtro: {
  q?: string;
  status?: string;
  prioridade?: string;
  categoria?: string;
}) {
  return MOCK_SUPORTES.filter((item) => {
    if (filtro.status && item.status !== filtro.status) return false;
    if (filtro.prioridade && item.prioridade !== filtro.prioridade) return false;
    if (filtro.categoria && !item.categoria.toLowerCase().includes(filtro.categoria.toLowerCase())) return false;
    if (filtro.q) {
      const texto = `${item.titulo} ${item.codigo} ${item.tenantNome}`.toLowerCase();
      if (!texto.includes(filtro.q.toLowerCase())) return false;
    }
    return true;
  });
}

export function melhoriasMock(filtro: { q?: string; status?: string; prioridade?: string; categoria?: string }) {
  return MOCK_MELHORIAS.filter((item) => {
    if (filtro.status && item.status !== filtro.status) return false;
    if (filtro.prioridade && item.prioridade !== filtro.prioridade) return false;
    if (filtro.categoria && item.categoria !== filtro.categoria) return false;
    if (filtro.q) {
      const texto = `${item.titulo} ${item.codigo} ${item.tenantNome}`.toLowerCase();
      if (!texto.includes(filtro.q.toLowerCase())) return false;
    }
    return true;
  });
}

export function onboardingsMock(situacao: string) {
  if (situacao === "todas") return MOCK_ONBOARDINGS;
  if (situacao === "atrasadas") return MOCK_ONBOARDINGS.filter((item) => item.atrasado);
  if (situacao === "concluidas") return MOCK_ONBOARDINGS.filter((item) => item.status === "concluido");
  return MOCK_ONBOARDINGS.filter((item) => item.status !== "concluido" && item.status !== "cancelado" && !item.atrasado);
}

export function isMockId(id: string) {
  return id.startsWith("mock-");
}

function chamado(
  n: string,
  codigo: string,
  tenantNome: string,
  titulo: string,
  prioridade: string,
  status: string,
  categoria: string,
  responsavelNome: string | null,
  atrasado: boolean,
): SuporteDetalhe {
  return {
    id: `mock-sup-${n}`,
    codigo,
    tenantId: `mock-tenant-${n}`,
    tenantNome,
    titulo,
    descricao: `${titulo}. Registro de exemplo para visualizar a central de suporte.`,
    categoria,
    prioridade,
    status,
    responsavelNome,
    prazoEm: atrasado ? "2026-10-20T00:00:00.000Z" : "2026-11-12T00:00:00.000Z",
    atrasado,
    createdAt: agora,
    mensagens: [
      { id: `mock-msg-${n}`, texto: "Conseguem confirmar se o acesso já foi liberado?", interna: false, createdAt: agora, autorNome: tenantNome },
    ],
    historico: [
      { id: `mock-hist-${n}`, acao: "abertura", detalhe: "Chamado de exemplo", createdAt: agora, autorNome: "Sistema" },
    ],
  };
}

function ideia(
  n: string,
  codigo: string,
  tenantNome: string,
  titulo: string,
  categoria: string,
  prioridade: string,
  status: string,
): MelhoriaDetalhe {
  return {
    id: `mock-mel-${n}`,
    codigo,
    tenantId: `mock-tenant-${n}`,
    tenantNome,
    titulo,
    descricao: `${titulo}. Sugestão de exemplo, sem prazo prometido ao cliente.`,
    categoria,
    prioridade,
    status,
    responsavelNome: status === "em_desenvolvimento" ? "Ana Souza" : null,
    justificativaDecisao: "",
    recente: n === "1",
    updatedAt: agora,
    comentarios: [],
    historico: [],
  };
}

function impl(
  n: string,
  tenantNome: string,
  status: string,
  progresso: number,
  atrasado: boolean,
  _grupo: string,
): OnboardingDetalhe {
  const etapasBase = [
    "Confirmar dados da imobiliária",
    "Confirmar plano e condições contratadas",
    "Validar os acessos e a configuração inicial",
    "Configurar os módulos contratados",
    "Configurar integrações aplicáveis",
    "Realizar treinamento",
    "Validar o funcionamento com a imobiliária",
    "Confirmar a conclusão da implantação",
  ];
  const feitas = Math.round((progresso / 100) * etapasBase.length);
  const etapas = etapasBase.map((titulo, index) => ({
    id: `mock-etapa-${n}-${index}`,
    ordem: index + 1,
    titulo,
    obrigatoria: true,
    status: index < feitas ? "concluida" as const : "pendente" as const,
    pendencia: "",
    observacao: "",
    concluidaEm: null,
  }));
  return {
    id: `mock-onb-${n}`,
    tenantId: `mock-tenant-${n}`,
    tenantNome,
    tenantPlano: "Profissional",
    contratoCodigo: `CTR-20${n}`,
    contratoStatus: "ativo",
    responsavelNome: "Ana Souza",
    inicio: "2026-10-01T00:00:00.000Z",
    prazoPrevisto: atrasado ? "2026-10-15T00:00:00.000Z" : "2026-11-20T00:00:00.000Z",
    status,
    observacao: "",
    progresso,
    atrasado,
    etapas,
    historico: [],
  };
}
