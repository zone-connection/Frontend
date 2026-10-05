/**
 * Catálogo de funcionalidades novas. Cada item vira matéria em /novidades
 * e o selo "Novo" no menu/páginas. Inclua aqui qualquer feature recém-lançada.
 */

import { PLANO_LABELS, type TenantPlano } from "@/lib/tenant-modules";

export type Novidade = {
  id: string;
  title: string;
  kicker: string;
  publishedAt: string;
  summary: string;
  where: string;
  href: string;
  hrefLabel: string;
  who: string;
  /** Planos em que a funcionalidade entra. */
  planos: TenantPlano[];
  /** Extra: ex. Prata só com Administrativo ligado. */
  planoDetalhe?: string;
  activate: string[];
  how: string[];
  /** Prefixo de rota do menu que recebe o selo Novo. */
  navPaths: string[];
  /** Prefixo da página (título) que recebe o selo. */
  pagePaths: string[];
  /** Subitens de Configurações (ex.: automacoes). */
  configItems?: string[];
};

/** Só estas matérias levam o selo Novo no menu e no título da página. */
const NOVO_DESDE = "2026-10-02";

function planoCurto(plano: TenantPlano): string {
  return PLANO_LABELS[plano].split(" — ")[0] ?? plano;
}

export function formatNovidadePlanos(item: Novidade): string {
  const names = item.planos.map(planoCurto);
  if (names.length === 0) return item.planoDetalhe ?? "Consulte o plano da imobiliária.";
  let list = names[0] ?? "";
  if (names.length === 2) list = `${names[0]} e ${names[1]}`;
  else if (names.length > 2) {
    list = `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
  }
  return item.planoDetalhe ? `${list}. ${item.planoDetalhe}` : list;
}

export const NOVIDADES: Novidade[] = [
  {
    id: "rankings-categorias",
    title: "Rankings por captação, visita, documentação e usados",
    kicker: "Gestão",
    publishedAt: "2026-10-04",
    summary:
      "O ranking deixou de ser só lançamento. Escolha a categoria, o período (hoje, semana, mês, trimestre, ano ou intervalo) e veja posição e quantidade de cada corretor, recalculadas ao vivo.",
    where: "Gestão → Ranking. Use as pílulas de categoria no topo e o filtro de período.",
    href: "/corretores",
    hrefLabel: "Abrir Ranking",
    who: "Quem tem o módulo Ranking. Gerente vê a equipe. Admin vê a imobiliária e as regras de contabilização.",
    planos: ["prata", "ouro"],
    navPaths: ["/corretores"],
    pagePaths: ["/corretores"],
    activate: [
      "Abra Gestão → Ranking.",
      "Escolha Lançamentos, Documentações, Captações, Visitas, Vendas de usados ou Locações.",
    ],
    how: [
      "Lançamentos continuam com VGV, pódio e construtoras.",
      "Nas outras categorias a tabela mostra posição, corretor e o indicador do período.",
      "Excluir ou alterar o registro no CRM atualiza o ranking na hora.",
    ],
  },
  {
    id: "propostas-imoveis-periodo",
    title: "Proposta ligada a captação, usados e lançamentos",
    kicker: "Fechamento",
    publishedAt: "2026-10-04",
    summary:
      "A proposta agora escolhe o imóvel certo: captação, venda de usados ou empreendimento. O vínculo fica nas ações, junto de PDF e compartilhar, e a lista filtra por período.",
    where: "Fechamento → Propostas. Na ficha, aba Imóvel. Na lista, use Período e o menu de ações para Vincular.",
    href: "/propostas",
    hrefLabel: "Abrir Propostas",
    who: "Quem emite proposta comercial (admin, gerente, corretor, trainee, conforme permissão).",
    planos: ["solo", "bronze", "prata", "ouro"],
    planoDetalhe:
      "Vale nos planos com Fechamento → Propostas. Captação e usados só aparecem se esses módulos estiverem ligados.",
    navPaths: ["/propostas"],
    pagePaths: ["/propostas"],
    activate: [
      "Abra Fechamento → Propostas.",
      "O filtro de período (mês, trimestre, ano ou todo o período) vale pela data de criação.",
    ],
    how: [
      "Em Nova proposta → Imóvel, busque captação, usados ou empreendimento.",
      "Na lista, use Vincular para mandar a mesma proposta a vários imóveis; cada dono vê só o dele no portal.",
      "O relatório visual da proposta segue o layout de compra, com prévia ao preencher.",
    ],
  },
  {
    id: "captacao-acompanhamento-passos",
    title: "Acompanhamento de captação com próximos passos",
    kicker: "Captação",
    publishedAt: "2026-10-04",
    summary:
      "A fila mostra todas as captações ativas, não só as paradas. Exclusividade usa o mesmo card, dá para incluir, editar e apagar próximos passos e o contato agenda o próximo retorno.",
    where: "Captação → Acompanhamento. Detalhe também no Funil de captação.",
    href: "/captacao/fila",
    hrefLabel: "Abrir Acompanhamento",
    who: "Quem opera captação (admin, gerente e corretores com o módulo ligado).",
    planos: ["solo", "bronze", "prata", "ouro"],
    planoDetalhe:
      "Exige o módulo Captação de Imóveis. Continua oculto se a imobiliária desligar o módulo.",
    navPaths: ["/captacao/fila", "/captacao/funil", "/captacao/captacoes"],
    pagePaths: ["/captacao/fila", "/captacao/funil", "/captacao/captacoes"],
    activate: [
      "Ligue Captação de Imóveis em Configurações → Operação → Módulos, se ainda não estiver.",
      "Abra Captação → Acompanhamento.",
    ],
    how: [
      "Use as abas Paradas, Portal e Exclusividade. A lista de acompanhamento traz as captações ativas.",
      "No detalhe, adicione, edite ou apague próximos passos.",
      "Em Registrar contato, informe canal, interlocutor, resultado e próximo retorno: o CRM cria a tarefa na Agenda.",
      "Os cards mostram a foto de capa do imóvel.",
    ],
  },
  {
    id: "usados-cards-reais",
    title: "Usados com estoque, visitas e propostas em cards",
    kicker: "Usados",
    publishedAt: "2026-10-04",
    summary:
      "Estoque, visitas e propostas de imóveis usados saíram do mock: lista real, capa do imóvel e o mesmo visual de cards da captação.",
    where: "Venda de Usados → Estoque, Visitas e Propostas.",
    href: "/imoveis-usados/estoque",
    hrefLabel: "Abrir Estoque de usados",
    who: "Quem opera venda de usados, conforme permissão.",
    planos: ["solo", "bronze", "prata", "ouro"],
    planoDetalhe:
      "Exige o módulo Venda de Imóveis Usados.",
    navPaths: [
      "/imoveis-usados/estoque",
      "/imoveis-usados/visitas",
      "/imoveis-usados/propostas",
    ],
    pagePaths: [
      "/imoveis-usados/estoque",
      "/imoveis-usados/visitas",
      "/imoveis-usados/propostas",
    ],
    activate: [
      "Ligue Venda de Imóveis Usados em Configurações → Operação → Módulos.",
      "Abra Venda de Usados → Estoque.",
    ],
    how: [
      "Alterne cards e tabela no estoque.",
      "Visitas e propostas usam o mesmo tipo de card, com capa e dados do imóvel.",
    ],
  },
  {
    id: "portal-propostas-vinculadas",
    title: "Propostas no Portal do Proprietário",
    kicker: "Portal",
    publishedAt: "2026-10-04",
    summary:
      "O dono do imóvel consulta no portal só as propostas vinculadas ao que é dele. Cada vínculo avisa por e-mail quando o corretor liga a proposta ao imóvel.",
    where: "Portal do Proprietário → Propostas. No CRM, vincule em Fechamento → Propostas.",
    href: "/propostas",
    hrefLabel: "Vincular no CRM",
    who: "Corretor vincula no CRM. O proprietário com acesso ao portal consulta as propostas do próprio imóvel.",
    planos: ["solo", "bronze", "prata", "ouro"],
    planoDetalhe:
      "O portal entra com a captação. A carga demo já traz acessos de proprietário e corretores parceiros para treinar.",
    navPaths: ["/captacao/proprietarios"],
    pagePaths: ["/captacao/proprietarios"],
    activate: [
      "Em Captação → Proprietários, ative o acesso ao portal.",
      "Na proposta, use Vincular imóvel ou empreendimento.",
    ],
    how: [
      "Uma proposta pode ir para vários imóveis; cada dono vê somente o vínculo dele.",
      "O e-mail avisa o proprietário quando o vínculo é criado.",
    ],
  },
  {
    id: "catalogo-captacao-tipo",
    title: "Captação no catálogo de Imóveis",
    kicker: "Catálogo",
    publishedAt: "2026-10-03",
    summary:
      "O catálogo mistura lançamentos e imóveis de captação, sem duplicar o que já é empreendimento. Um filtro de tipo separa Lançamentos e Captações.",
    where: "Catálogo → Imóveis.",
    href: "/imoveis",
    hrefLabel: "Abrir Imóveis",
    who: "Quem acessa o catálogo (admin, gerente, corretor, trainee, analista, conforme permissão).",
    planos: ["solo", "bronze", "prata", "ouro"],
    navPaths: ["/imoveis"],
    pagePaths: ["/imoveis"],
    activate: [
      "O módulo Imóveis precisa estar visível no menu.",
      "Abra Catálogo → Imóveis e use o filtro Tipo.",
    ],
    how: [
      "Escolha Todos, Lançamentos ou Captações.",
      "Imóveis de captação que já viraram empreendimento não aparecem duas vezes.",
    ],
  },
  {
    id: "interesses-varios-empreendimentos",
    title: "Vários empreendimentos de interesse",
    kicker: "Comercial",
    publishedAt: "2026-10-03",
    summary:
      "Lead e cliente passam a guardar vários empreendimentos de interesse, com histórico de status — não só um lançamento na ficha.",
    where: "Leads e Clientes, na ficha, painel de empreendimentos de interesse.",
    href: "/leads",
    hrefLabel: "Abrir Leads",
    who: "Quem cadastra e atende lead ou cliente.",
    planos: ["solo", "bronze", "prata", "ouro"],
    navPaths: ["/leads", "/clientes"],
    pagePaths: ["/leads", "/clientes"],
    activate: [
      "Abra um lead ou um cliente aprovado.",
      "No painel de empreendimentos de interesse, adicione mais de um lançamento.",
    ],
    how: [
      "Inclua, altere o status ou remova cada interesse.",
      "O histórico fica na ficha para o time ver o que já foi apresentado.",
    ],
  },
  {
    id: "agenda-busca-imovel",
    title: "Agenda com busca de cliente e chave da visita",
    kicker: "Agenda",
    publishedAt: "2026-10-03",
    summary:
      "A agenda pesquisa lead e cliente, filtra por imóvel ou empreendimento e, na visita, já traz a chave livre vinculada. As pílulas do calendário usam as cores dos tipos de compromisso.",
    where: "Agenda.",
    href: "/agenda",
    hrefLabel: "Abrir Agenda",
    who: "Quem lança compromisso (corretor, gerente, admin).",
    planos: ["solo", "bronze", "prata", "ouro"],
    navPaths: ["/agenda"],
    pagePaths: ["/agenda"],
    activate: [
      "Abra Agenda. Os filtros de imóvel e empreendimento ficam na barra superior.",
    ],
    how: [
      "Ao criar compromisso, busque o lead ou o cliente pelo nome.",
      "Na visita, escolha o empreendimento ou o imóvel: se houver chave livre, ela já vem selecionada.",
      "Atribuir a só aparece quando o compromisso é uma tarefa.",
    ],
  },
  {
    id: "contratos-rascunhos-baixados",
    title: "Contratos em catálogo, rascunhos e baixados",
    kicker: "Fechamento",
    publishedAt: "2026-10-02",
    summary:
      "Contratos ganharam catálogo de modelos, rascunhos editáveis e histórico dos arquivos baixados, com as listas de documentos na mesma tela.",
    where: "Fechamento → Contratos.",
    href: "/contratos",
    hrefLabel: "Abrir Contratos",
    who: "Quem gera contrato (admin, gerente, analista, conforme permissão).",
    planos: ["solo", "bronze", "prata", "ouro"],
    planoDetalhe: "Exige o módulo Contratos.",
    navPaths: ["/contratos"],
    pagePaths: ["/contratos"],
    activate: [
      "Abra Fechamento → Contratos.",
      "Use as abas de catálogo, rascunhos e baixados.",
    ],
    how: [
      "Monte o contrato a partir do catálogo e salve rascunho para editar depois.",
      "Os downloads ficam no histórico para consultar ou apagar.",
      "As listas de documentos exigidos aparecem no painel da tela.",
    ],
  },
  {
    id: "conversao-analise-metas",
    title: "Conversão, análise e metas com o ciclo anterior",
    kicker: "Gestão",
    publishedAt: "2026-10-02",
    summary:
      "A taxa de conversão compara documentações, aprovações e vendas. A análise filtra por mês e corretor, com aprovador, reprovados e vendidos. As metas mostram o período anterior ao lado do ciclo atual.",
    where: "Gestão → Taxa de conversão, Análise e Metas.",
    href: "/taxa-conversao",
    hrefLabel: "Abrir Taxa de conversão",
    who: "Admin e gestores com o módulo de gestão comercial.",
    planos: ["solo", "bronze", "prata", "ouro"],
    navPaths: ["/taxa-conversao", "/resultado", "/metas"],
    pagePaths: ["/taxa-conversao", "/resultado", "/metas"],
    activate: [
      "Abra Taxa de conversão para o recorte de documentações e vendas.",
      "Em Análise, filtre mês e corretor.",
      "Em Metas, compare o progresso com o ciclo anterior.",
    ],
    how: [
      "As duas taxas separam o que entrou em documentação do que virou venda.",
      "A análise lista quem aprovou, quem reprovou e o que já vendeu.",
      "A meta do período anterior fica visível para não perder o ritmo.",
    ],
  },
  {
    id: "leads-distribuir-excluir",
    title: "Distribuir leads marcados e exclusão definitiva",
    kicker: "Comercial",
    publishedAt: "2026-10-02",
    summary:
      "Dá para distribuir só os leads marcados na lista. O administrador pode excluir de vez, sem mandar para Leads Perdidos. Quem a documentação já aprovou sai da entrada do funil; a ficha permanece se o lead for excluído da lista.",
    where: "Leads e Funil.",
    href: "/leads",
    hrefLabel: "Abrir Leads",
    who: "Gerente e admin distribuem. Só o administrador exclui de vez.",
    planos: ["solo", "bronze", "prata", "ouro"],
    navPaths: ["/leads", "/funil"],
    pagePaths: ["/leads", "/funil"],
    activate: [
      "Na lista de Leads, marque as linhas e use Distribuir.",
      "A exclusão definitiva aparece só para o administrador.",
    ],
    how: [
      "Escolha o corretor destino: só os marcados saem da carteira atual.",
      "Lead com documentação aprovada deixa a coluna de entrada do funil e segue no fechamento.",
    ],
  },
  {
    id: "mural-chaves",
    title: "Mural de Chaves",
    kicker: "Gestão",
    publishedAt: "2026-09-29",
    summary:
      "Controle de quem está com cada chave: retirada, previsão de devolução e confirmação do corretor.",
    where:
      "Gestão → Mural de Chaves. O item fica oculto até o admin da imobiliária ativar o módulo.",
    href: "/mural-chaves",
    hrefLabel: "Abrir Mural de Chaves",
    who: "Admin ativa o módulo. Admin e gerente gerenciam as chaves. Quem tem permissão registra retirada e devolução.",
    planos: ["solo", "prata", "ouro"],
    planoDetalhe:
      "Não entra no Bronze. No Prata, só com o pacote Administrativo. Continua oculto até o admin ligar em Configurações → Operação → Módulos.",
    navPaths: ["/mural-chaves"],
    pagePaths: ["/mural-chaves"],
    activate: [
      "Em Configurações, abra Operação e a aba Módulos.",
      "Ligue o Mural de Chaves. O item passa a aparecer em Gestão.",
      "Em Permissões, libere o mural para quem deve retirar ou gerenciar.",
    ],
    how: [
      "Cadastre a chave vinculada a um imóvel de captação ou de usados.",
      "Registre a retirada, com quem está e a previsão de devolução.",
      "Na devolução, o corretor confirma no próximo acesso.",
    ],
  },
  {
    id: "automacoes-distribuicao",
    title: "Automações: Caça-lead, Retrabalho e distribuição online",
    kicker: "Operação",
    publishedAt: "2026-09-20",
    summary:
      "O funil agora devolve leads parados e os redistribui sozinho para quem está trabalhando no CRM.",
    where: "Gestão → Configurações → Operação → Automações. Com Retrabalho ligado, o atalho Caça-lead some do menu: os atrasados ficam em Leads e no Funil, com a tag Retrabalho.",
    href: "/configuracoes?secao=operacao&item=automacoes",
    hrefLabel: "Abrir automações",
    who: "Admin liga e desliga. Gerente e admin redistribuem. Corretores e trainees recebem leads quando estão online.",
    planos: ["solo", "bronze", "prata", "ouro"],
    planoDetalhe:
      "Vale em qualquer plano com funil comercial. Bronze e Solo usam no CRM operacional; Prata e Ouro também, se o comercial estiver ligado.",
    navPaths: ["/configuracoes", "/caca-lead"],
    pagePaths: [],
    configItems: ["automacoes"],
    activate: [
      "Em Configurações, abra Operação e a aba Automações.",
      "Em Liberação após atraso, ligue o interruptor, escolha Caça-lead (lista quem atrasou, sem tirar do funil) ou Retrabalho (desvincula o corretor e devolve o lead ao pool).",
      "Defina quanto tempo depois do atraso a liberação acontece e salve.",
      "Em Distribuição para corretores online, ligue o interruptor se quiser que o pool (inclusive Retrabalho) vá sozinho para quem estiver logado, começando por quem tem menos leads na carteira.",
    ],
    how: [
      "Com Retrabalho, use Distribuir em Leads ou espere a distribuição automática.",
      "O lead redistribuído continua com a tag Retrabalho no funil e na lista.",
      "Atrasos mostra quantos leads cada corretor e cada equipe perderam para o retrabalho.",
    ],
  },
  {
    id: "presenca",
    title: "Presença",
    kicker: "Gestão",
    publishedAt: "2026-09-20",
    summary:
      "Controle diário de presença, meio período, falta e falta justificada, com comparação ao mês anterior e PDF.",
    where: "Gestão → Presença.",
    href: "/presenca",
    hrefLabel: "Abrir Presença",
    who: "Admin e gestores marcam o time. Cada perfil só vê o que a permissão de Presença permitir.",
    planos: ["solo", "prata", "ouro"],
    planoDetalhe:
      "Não entra no Bronze (CRM sem Administrativo). No Prata, só com o pacote Administrativo ligado. No Solo e no Ouro, o módulo já vem no recorte do plano.",
    navPaths: ["/presenca"],
    pagePaths: ["/presenca"],
    activate: [
      "O módulo Presença precisa estar ligado no plano da imobiliária (Administrativo).",
      "Em Permissões, libere Presença para quem deve lançar ou consultar.",
      "Abra Gestão → Presença e escolha o mês.",
    ],
    how: [
      "Lance o status de cada pessoa no calendário do mês.",
      "Cadastre tipos extras se a imobiliária usa códigos próprios.",
      "Exporte o PDF para conferência ou RH.",
    ],
  },
  {
    id: "funcionarios",
    title: "Funcionários",
    kicker: "Financeiro",
    publishedAt: "2026-09-20",
    summary:
      "Cadastro de salário, benefícios e descontos, com geração de contracheque em PDF na data do download.",
    where: "Financeiro → Funcionários.",
    href: "/financeiro/funcionarios",
    hrefLabel: "Abrir Funcionários",
    who: "Admin da imobiliária e perfil Financeiro.",
    planos: ["solo", "prata", "ouro"],
    planoDetalhe:
      "Exige o módulo Financeiro. Não entra no Bronze. No Prata, só se a imobiliária escolheu Financeiro (em vez de Administrativo). Solo e Ouro já incluem.",
    navPaths: ["/financeiro/funcionarios"],
    pagePaths: ["/financeiro/funcionarios"],
    activate: [
      "O módulo Financeiro precisa estar ligado no plano.",
      "Abra a pasta Financeiro no menu e entre em Funcionários.",
    ],
    how: [
      "Cadastre o colaborador uma vez: cargo, admissão, salário, benefícios e descontos.",
      "Ao baixar o contracheque, o PDF usa esses valores com a data de hoje.",
      "O histórico guarda os arquivos gerados.",
    ],
  },
  {
    id: "empreendimentos",
    title: "Nova visão de empreendimentos",
    kicker: "Catálogo",
    publishedAt: "2026-09-20",
    summary:
      "Ficha de lançamento no estilo marketplace: galeria, tipologias, planta, valor do m², book, tabela de valores e página pública para compartilhar.",
    where: "Catálogo → Imóveis. Abra um lançamento para a ficha nova. A página pública sai pelo link de compartilhar.",
    href: "/imoveis",
    hrefLabel: "Abrir Imóveis",
    who: "Quem acessa o catálogo de imóveis (admin, gerente, corretor, treinee, analista, conforme permissão).",
    planos: ["solo", "bronze", "prata", "ouro"],
    planoDetalhe:
      "A ficha nova vale em todos os planos que têm Catálogo → Imóveis (Solo, Bronze, Prata e Ouro).",
    navPaths: ["/imoveis"],
    pagePaths: ["/imoveis"],
    activate: [
      "O módulo Imóveis precisa estar visível no menu (não oculto em Configurações).",
      "Abra Catálogo → Imóveis e escolha um empreendimento.",
    ],
    how: [
      "Preencha tipologias com planta e valor do m², galeria (até 15 fotos), book e tabela de valores.",
      "Use o mapa e o link público para enviar a ficha ao cliente.",
      "A página compartilhada destaca os dados do imóvel, inclusive no celular.",
    ],
  },
];

export function isNovidadeComSelo(item: Novidade): boolean {
  return item.publishedAt >= NOVO_DESDE;
}

export function isNavPathNovo(to: string): boolean {
  const path = to.split("?")[0];
  return NOVIDADES.some(
    (item) =>
      isNovidadeComSelo(item) &&
      item.navPaths.some((route) => path === route || path.startsWith(`${route}/`)),
  );
}

export function isPageNovo(
  pathname: string,
  search?: Record<string, unknown> | null,
): boolean {
  const path = pathname.split("?")[0].replace(/\/$/, "") || "/";
  const item = typeof search?.item === "string" ? search.item : undefined;
  return NOVIDADES.some((n) => {
    if (!isNovidadeComSelo(n)) return false;
    if (n.configItems?.length) {
      if (path === "/configuracoes" || path.startsWith("/configuracoes/")) {
        return item ? n.configItems.includes(item) : false;
      }
    }
    return n.pagePaths.some((route) => path === route || path.startsWith(`${route}/`));
  });
}

export function isConfigItemNovo(id: string): boolean {
  return NOVIDADES.some(
    (n) => isNovidadeComSelo(n) && n.configItems?.includes(id),
  );
}

export function formatNovidadeDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
