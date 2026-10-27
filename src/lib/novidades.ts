/**
 * Aviso em andamento. Vira a matéria de /novidades, o selo Novo no menu
 * e o diálogo exibido ao entrar no CRM.
 */

export type Novidade = {
  id: string;
  title: string;
  kicker: string;
  publishedAt: string;
  summary: string;
  where: string;
  href: string;
  hrefLabel: string;
  status: string;
  /** Texto de apoio no destaque visual do anúncio de login. */
  dropHint?: string;
  agora: string[];
  /** Prefixo de rota do menu que recebe o selo Novo. */
  navPaths: string[];
  /** Prefixo da página (título) que recebe o selo. */
  pagePaths: string[];
  /** Subitens de Configurações (ex.: automacoes). */
  configItems?: string[];
};

const ANUNCIO_STORAGE_KEY = "crm-novidade-anuncio-vista";

export const NOVIDADES: Novidade[] = [
  {
    id: "pos-venda-card",
    title: "Card do pós-venda com a venda completa",
    kicker: "Novidade",
    publishedAt: "2026-10-26",
    summary:
      "Cada card do funil de pós-venda mostra os dados da venda. Dá para anexar imagens e documentos, escrever observações e criar tags que aparecem no quadro.",
    where: "Imóveis → Funil de pós-venda. Clique no card.",
    href: "/imoveis-usados/pos-venda",
    hrefLabel: "Abrir pós-venda",
    status: "Disponível no funil de pós-venda",
    agora: [
      "Valor, corretor, proprietário e data da venda no card.",
      "Upload de imagens e de documentos na venda.",
      "Observações salvas no processo.",
      "Tags criadas pela imobiliária ficam visíveis no card.",
    ],
    navPaths: ["/imoveis-usados/pos-venda"],
    pagePaths: ["/imoveis-usados/pos-venda"],
  },
  {
    id: "pos-venda-incluir",
    title: "Incluir uma venda já concluída no pós-venda",
    kicker: "Novidade",
    publishedAt: "2026-10-26",
    summary:
      "O sistema entrega um funil padrão de pós-venda. Quem vê a equipe inclui uma venda de usado já concluída e pode editar ou excluir o funil que criou.",
    where: "Funil de pós-venda → Incluir venda e Editar funil.",
    href: "/imoveis-usados/pos-venda",
    hrefLabel: "Abrir pós-venda",
    status: "Disponível para quem vê a equipe",
    agora: [
      "A lista traz só vendas de usados com status vendido.",
      "O funil padrão já vem com as etapas do pós-venda.",
      "Dá para criar outro funil, ajustar etapas e excluir o que não está em uso.",
    ],
    navPaths: [],
    pagePaths: [],
  },
  {
    id: "dashboard-modulos",
    title: "Cards do dashboard abrem o módulo",
    kicker: "Novidade",
    publishedAt: "2026-10-26",
    summary:
      "Novos leads e VGV vendido levam direto para Leads e Vendas. A entrada do dashboard não abre mais uma tabela embaixo do card.",
    where: "Dashboard, nos cards de entrada do mês.",
    href: "/dashboard",
    hrefLabel: "Abrir dashboard",
    status: "Disponível no dashboard",
    agora: [
      "Leads do mês, de hoje e da semana abrem a lista de leads.",
      "VGV vendido abre Vendas.",
      "O esqueleto de carregamento do dashboard saiu.",
    ],
    navPaths: [],
    pagePaths: [],
  },
  {
    id: "fila-prazo",
    title: "Prazo da roleta de leads",
    kicker: "Novidade",
    publishedAt: "2026-10-26",
    summary:
      "A fila rotativa mostra o prazo configurado. Se o lead não for atualizado a tempo, volta a ser redistribuído.",
    where: "Leads → Distribuir e na fila.",
    href: "/leads",
    hrefLabel: "Abrir leads",
    status: "Disponível na distribuição",
    agora: [
      "O prazo aparece no diálogo de distribuir e na fila.",
      "O lead redistribuído fica marcado.",
      "A seleção da lista vale só para a página atual.",
    ],
    navPaths: [],
    pagePaths: [],
  },
  {
    id: "lembretes-pessoais",
    title: "Lembretes no início do dia",
    kicker: "Novidade",
    publishedAt: "2026-10-25",
    summary:
      "Ao entrar no CRM, os lembretes pessoais aparecem com recorrência. Dá para reconhecer, repetir e acompanhar as atividades próximas.",
    where: "Abra Lembretes no menu ou confira o aviso depois do login.",
    href: "/lembretes",
    hrefLabel: "Abrir lembretes",
    status: "Disponível no login e em Lembretes",
    agora: [
      "Recorrência: sempre, diária, semanal, mensal ou uma vez.",
      "O aviso no login lista o que está pendente.",
      "Atividades próximas também entram no mesmo fluxo.",
    ],
    navPaths: ["/lembretes"],
    pagePaths: ["/lembretes"],
  },
  {
    id: "menu-outubro-25",
    title: "Menu reorganizado",
    kicker: "Novidade",
    publishedAt: "2026-10-25",
    summary:
      "O menu lateral agora agrupa o dia a dia: Atendimento, Imóveis e vendas, Captação, Financeiro, Equipe, Relatórios e Treinamento.",
    where: "Use a barra à esquerda. Dashboard e Tarefas ficam soltos no topo.",
    href: "/dashboard",
    hrefLabel: "Abrir dashboard",
    status: "Já vale para toda a imobiliária",
    agora: [
      "Atendimento reúne leads, funil, WhatsApp, carteira e perdas.",
      "Imóveis, documentação, propostas, contratos e vendas ficam juntos.",
      "Caça-lead some do menu quando a automação não está ligada.",
    ],
    navPaths: [],
    pagePaths: [],
  },
  {
    id: "pos-venda-funil",
    title: "Funil de pós-venda",
    kicker: "Novidade",
    publishedAt: "2026-10-24",
    summary:
      "Depois da venda, gerente ou admin confirma, recusa ou encaminha depois para o funil de pós-venda, com kanban e etapas configuráveis.",
    where: "Na ficha da venda de usados e em Imóveis usados → Pós-venda.",
    href: "/imoveis-usados/pos-venda",
    hrefLabel: "Abrir pós-venda",
    status: "Disponível na venda de usados",
    agora: [
      "O processo não nasce sozinho: alguém confirma o encaminhamento.",
      "Dá para recusar e encaminhar depois.",
      "O funil de pós-venda se configura em Automações.",
    ],
    navPaths: ["/imoveis-usados/pos-venda"],
    pagePaths: ["/imoveis-usados/pos-venda"],
  },
  {
    id: "desvincular-leads",
    title: "Desvincular leads do corretor",
    kicker: "Novidade",
    publishedAt: "2026-10-22",
    summary:
      "Na lista de leads, selecione vários e tire o corretor de uma vez, sem tratar ficha por ficha.",
    where: "Abra Leads, marque as linhas e use a ação em lote.",
    href: "/leads",
    hrefLabel: "Abrir leads",
    status: "Disponível para admin e gerente",
    agora: [
      "Ação em lote na lista.",
      "O lead volta a ficar disponível para nova distribuição.",
    ],
    navPaths: [],
    pagePaths: [],
  },
  {
    id: "dashboard-atalhos",
    title: "Dashboard abre as listas",
    kicker: "Novidade",
    publishedAt: "2026-10-22",
    summary:
      "Os cards de leads e de vendas no dashboard levam direto para a lista filtrada.",
    where: "Abra o Dashboard e clique no card.",
    href: "/dashboard",
    hrefLabel: "Abrir dashboard",
    status: "Disponível no Dashboard",
    agora: [
      "Card de leads abre a lista de leads.",
      "Card de vendas abre a tela de vendas.",
    ],
    navPaths: [],
    pagePaths: [],
  },
  {
    id: "ocultar-menu",
    title: "Ocultar itens do menu",
    kicker: "Novidade",
    publishedAt: "2026-10-22",
    summary:
      "Em Configurações, cada pessoa esconde o que não usa no menu lateral. A tela continua no endereço; os outros usuários não são afetados.",
    where: "Configurações → Menu lateral.",
    href: "/configuracoes",
    hrefLabel: "Abrir configurações",
    status: "Preferência só sua",
    agora: [
      "Ligue ou desligue módulos internos.",
      "Configurações permanece sempre visível.",
    ],
    navPaths: [],
    pagePaths: ["/configuracoes"],
    configItems: ["menu"],
  },
  {
    id: "senha-usuario",
    title: "Definir a senha do usuário",
    kicker: "Novidade",
    publishedAt: "2026-10-20",
    summary:
      "Na criação ou redefinição, dá para escolher a senha em vez de receber só uma gerada pelo sistema.",
    where: "Usuários, ao cadastrar ou redefinir acesso.",
    href: "/usuarios",
    hrefLabel: "Abrir usuários",
    status: "Disponível para admin",
    agora: [
      "Informe a senha na hora do cadastro.",
      "Também vale ao redefinir o admin do cliente na plataforma.",
    ],
    navPaths: [],
    pagePaths: [],
  },
  {
    id: "treinamento-arquivos",
    title: "Arquivos no Treinamento",
    kicker: "Novidade",
    publishedAt: "2026-10-20",
    summary:
      "Envie arquivo, foto, vídeo e PDF nas seções de treinamento e abra o conteúdo dentro do CRM.",
    where: "Menu → Treinamento.",
    href: "/treinamento",
    hrefLabel: "Abrir treinamento",
    status: "Disponível no módulo Treinamento",
    agora: [
      "Upload de arquivo, foto e vídeo.",
      "PDFs e mídias abrem no próprio sistema.",
    ],
    navPaths: ["/treinamento"],
    pagePaths: ["/treinamento"],
  },
  {
    id: "esqueci-senha",
    title: "Esqueci a senha pelo WhatsApp",
    kicker: "Novidade",
    publishedAt: "2026-10-20",
    summary:
      "Na tela de login, esqueci a senha abre o WhatsApp da Zone Connection para pedir a redefinição.",
    where: "Tela de login.",
    href: "/login",
    hrefLabel: "Ir para o login",
    status: "Disponível no login",
    agora: ["O pedido sai para o WhatsApp de suporte da plataforma."],
    navPaths: [],
    pagePaths: [],
  },
  {
    id: "perda-cliente",
    title: "Perda de cliente na carteira",
    kicker: "Novidade",
    publishedAt: "2026-10-20",
    summary:
      "A perda de cliente aparece só na carteira do corretor responsável, sem misturar com o restante da imobiliária.",
    where: "Perda de cliente.",
    href: "/clientes-perdidos",
    hrefLabel: "Abrir perdas",
    status: "Disponível na carteira",
    agora: ["O corretor vê apenas os clientes da própria carteira."],
    navPaths: [],
    pagePaths: [],
  },
  {
    id: "funil-arraste",
    title: "Arrastar o card do funil para o lado",
    kicker: "Novidade",
    publishedAt: "2026-10-20",
    summary:
      "O quadro rola enquanto o card é arrastado. A etapa também pode ser escolhida pela ficha.",
    where: "Funil comercial e funis de operação.",
    href: "/funil",
    hrefLabel: "Abrir funil",
    status: "Disponível nos funis",
    agora: [
      "Arraste em qualquer direção.",
      "Troque a etapa sem sair da ficha.",
    ],
    navPaths: [],
    pagePaths: [],
  },
  {
    id: "dashboard-operacao",
    title: "Dashboard por operação",
    kicker: "Novidade",
    publishedAt: "2026-10-19",
    summary:
      "Filtre o painel por lançamentos ou venda de usados. VGV, ranking e comissão acompanham a visão escolhida. Captações também entram nos totais.",
    where: "Dashboard, nos botões de operação.",
    href: "/dashboard",
    hrefLabel: "Abrir dashboard",
    status: "Disponível no Dashboard",
    agora: [
      "Visão de lançamentos, geral ou usados.",
      "VGV, ranking e comissão de usados no mesmo painel.",
      "Captações contabilizadas no resumo.",
    ],
    navPaths: [],
    pagePaths: [],
  },
  {
    id: "canal-lead-funil",
    title: "Origem no card do funil",
    kicker: "Novidade",
    publishedAt: "2026-10-19",
    summary:
      "O card mostra se o lead veio do Facebook, Instagram ou OLX. Novos leads desses canais entram na etapa Novo lead do funil da imobiliária dona do canal.",
    where: "Funil comercial.",
    href: "/funil",
    hrefLabel: "Abrir funil",
    status: "Disponível no funil",
    agora: [
      "Canal visível no card.",
      "Meta e OLX entram no funil existente, sem misturar imobiliárias.",
    ],
    navPaths: [],
    pagePaths: [],
  },
  {
    id: "catalogo-usados-captacao",
    title: "Catálogo com usados e captação",
    kicker: "Novidade",
    publishedAt: "2026-10-19",
    summary:
      "Imóveis de captação e estoque de usados aparecem no catálogo. Vendas de lançamentos, usados e locação ficam na mesma tela.",
    where: "Imóveis e Vendas.",
    href: "/imoveis",
    hrefLabel: "Abrir imóveis",
    status: "Disponível no catálogo e em Vendas",
    agora: [
      "Estoque de usados e captação no catálogo.",
      "Uma tela de vendas para as três operações.",
    ],
    navPaths: [],
    pagePaths: [],
  },
  {
    id: "propostas-usados-unificadas",
    title: "Propostas de usados na mesma ficha",
    kicker: "Novidade",
    publishedAt: "2026-10-19",
    summary:
      "A proposta de imóvel usado abre com a mesma ficha das de lançamento. Documentação de usados entra com origem própria.",
    where: "Propostas e Documentação.",
    href: "/propostas",
    hrefLabel: "Abrir propostas",
    status: "Disponível em Propostas e Documentação",
    agora: [
      "Ficha única para lançamento e usado.",
      "Origem, proprietário, interessado e matrícula na documentação de usados.",
    ],
    navPaths: [],
    pagePaths: [],
  },
  {
    id: "vendas-unificadas",
    title: "Vendas de lançamento, usados e locação",
    kicker: "Novidade",
    publishedAt: "2026-10-19",
    summary:
      "A tela de vendas reúne lançamentos, imóveis usados e locação. O dashboard filtra a operação em Lançamentos, Geral ou Usados.",
    where: "Vendas e Dashboard.",
    href: "/vendas",
    hrefLabel: "Abrir vendas",
    status: "Disponível em Vendas",
    agora: [
      "VGV, ranking e comissão acompanham a operação escolhida.",
      "Captações entram no resumo do dashboard.",
    ],
    navPaths: [],
    pagePaths: [],
  },
  {
    id: "banco-oportunidades",
    title: "Banco de oportunidades",
    kicker: "Novidade",
    publishedAt: "2026-10-17",
    summary:
      "Oportunidades de captação ganharam cards com foto, valor e características. Dá para cadastrar o imóvel na captação e mandar ao estoque de usados.",
    where: "Captação → Funil de captação e banco de oportunidades.",
    href: "/captacao/funil",
    hrefLabel: "Abrir captação",
    status: "Disponível na captação",
    agora: [
      "Ficha com fotos e todos os campos cadastrados.",
      "Cadastro de captação e usado no mesmo assistente.",
      "Ao marcar como captado, o imóvel vai ao estoque.",
    ],
    navPaths: ["/captacao/funil"],
    pagePaths: ["/captacao/funil"],
  },
  {
    id: "fila-leads",
    title: "Fila rotativa de leads",
    kicker: "Novidade",
    publishedAt: "2026-10-15",
    summary:
      "Novos leads entram numa fila e a distribuição segue a ordem da equipe. Também dá para enviar book em PDF e comprovante de pagamento.",
    where: "Leads → Distribuir leads.",
    href: "/leads",
    hrefLabel: "Abrir leads",
    status: "Disponível na distribuição",
    agora: [
      "Fila rotativa para leads novos.",
      "Distribuição limitada à quantidade pedida.",
      "Book em PDF e comprovante de pagamento.",
    ],
    navPaths: [],
    pagePaths: [],
  },
  {
    id: "tarefas-modulo",
    title: "Módulo de Tarefas",
    kicker: "Novidade",
    publishedAt: "2026-10-15",
    summary:
      "Agenda e tarefas viraram um módulo só, com dia, semana e mês. Visitas, chaves e captação aparecem na lista. Anexos e a documentação do lead ficam na ficha da tarefa.",
    where: "Menu → Tarefas.",
    href: "/lembretes",
    hrefLabel: "Abrir tarefas",
    status: "Nos planos Prata e Ouro e quando o extra estiver ligado",
    agora: [
      "Calendário de dia, semana e mês.",
      "Visitas, retiradas de chave e captação na mesma lista.",
      "Etiqueta, anexos e documentos do lead ou cliente.",
      "Admin e gerente veem e atribuem tarefas da equipe.",
    ],
    navPaths: ["/lembretes"],
    pagePaths: ["/lembretes"],
  },
  {
    id: "documentos-no-lead",
    title: "Envie documentos no lead",
    kicker: "Novidade",
    publishedAt: "2026-10-14",
    summary:
      "Agora dá para anexar arquivos direto no lead e no cliente. PDF e imagem ficam na ficha, em Documentações.",
    where: "Abra um lead ou cliente e vá em Documentações.",
    href: "/leads",
    hrefLabel: "Abrir leads",
    status: "Disponível da ficha do lead e do cliente",
    dropHint:
      "Arraste e solte seus arquivos aqui ou clique para selecionar. PDF, JPG, PNG e outros formatos.",
    agora: [
      "Envie PDF ou imagem de até 5 MB.",
      "O histórico registra quem enviou, visualizou, baixou ou compartilhou.",
      "A mesma ficha vale para lead e cliente.",
    ],
    navPaths: ["/leads"],
    pagePaths: ["/leads"],
  },
  {
    id: "processos",
    title: "Processos com pendência e retorno",
    kicker: "Novidade",
    publishedAt: "2026-10-13",
    summary:
      "O módulo de processos guarda a ficha, os documentos, o retorno do gerente, a pendência documental e o histórico de etapas.",
    where: "Processos, a partir da operação de lançamentos.",
    href: "/processos",
    hrefLabel: "Abrir processos",
    status: "Disponível em Processos",
    agora: [
      "Rascunho, envio, aprovação e reprovação.",
      "O corretor exclui processo em rascunho ou reprovado.",
      "PDF fica armazenado com o processo.",
    ],
    navPaths: [],
    pagePaths: [],
  },
  {
    id: "ficha-lead",
    title: "Ficha de lead e cliente reorganizada",
    kicker: "Novidade",
    publishedAt: "2026-10-13",
    summary:
      "A ficha abre no layout de negócio: triagem no lugar das anotações, funil com a cor da marca e chat do WhatsApp na lateral.",
    where: "Leads e Clientes.",
    href: "/leads",
    hrefLabel: "Abrir leads",
    status: "Disponível na ficha",
    agora: [
      "Triagem registrada na própria ficha.",
      "Tags do WhatsApp podem ser editadas, coloridas e excluídas.",
    ],
    navPaths: [],
    pagePaths: [],
  },
  {
    id: "arquivos-tags",
    title: "Arquivos com tags e compartilhamento",
    kicker: "Novidade",
    publishedAt: "2026-10-13",
    summary:
      "PDFs e imagens ficam na área de arquivos, com tags, histórico de envio e link para compartilhar.",
    where: "Arquivos do lead, da tarefa e da documentação.",
    href: "/leads",
    hrefLabel: "Abrir leads",
    status: "Disponível nos anexos",
    agora: [
      "Tags nos documentos.",
      "Histórico de quem enviou, baixou ou compartilhou.",
      "Download em ZIP dos arquivos selecionados.",
    ],
    navPaths: [],
    pagePaths: [],
  },
  {
    id: "whatsapp-inbox",
    title: "WhatsApp da imobiliária",
    kicker: "Novidade",
    publishedAt: "2026-10-12",
    summary:
      "O inbox de WhatsApp entra no CRM: lista de conversas, chat em tela cheia, áudio, transcrição e pausa da IA ao assumir o atendimento.",
    where: "Menu → Atendimento → WhatsApp, se a imobiliária tiver OZap.",
    href: "/whatsapp",
    hrefLabel: "Abrir WhatsApp",
    status: "Disponível com OZap conectado",
    agora: [
      "Conversas da carteira, com filtro de equipe e corretor.",
      "Envio pela equipe, tags pessoais e chat na ficha do lead.",
      "Áudio, transcrição e histórico da IA.",
    ],
    navPaths: ["/whatsapp"],
    pagePaths: ["/whatsapp"],
  },
  {
    id: "empreendimento-no-site",
    title: "Exibir empreendimento no site",
    kicker: "Novidade",
    publishedAt: "2026-10-10",
    summary:
      "O admin liga ou desliga se o empreendimento aparece no site. O catálogo público lista os imóveis vinculados.",
    where: "Na ficha do empreendimento.",
    href: "/imoveis",
    hrefLabel: "Abrir imóveis",
    status: "Disponível para o admin da imobiliária",
    agora: [
      "Chave Exibir no site.",
      "Catálogo público de empreendimentos e imóveis.",
    ],
    navPaths: [],
    pagePaths: [],
  },
  {
    id: "documentacao-opcional",
    title: "Documentação sem criar contato",
    kicker: "Novidade",
    publishedAt: "2026-10-09",
    summary:
      "Dá para vincular lead ou cliente à documentação só se quiser. Comissão de cliente não cadastrado lança sem criar venda na documentação.",
    where: "Documentação e Comissão.",
    href: "/documentacao",
    hrefLabel: "Abrir documentação",
    status: "Disponível em Documentação e Comissão",
    agora: [
      "Vínculo opcional com lead ou cliente.",
      "Comissão avulsa sem criar venda.",
    ],
    navPaths: [],
    pagePaths: [],
  },
  {
    id: "proposta-publica",
    title: "Proposta pública com link e aceite",
    kicker: "Novidade",
    publishedAt: "2026-10-05",
    summary:
      "Gere o link da proposta em zoneconnection.com.br, copie no CRM, envie recibo e receba o aceite no portal. Vale para lançamento, captação e usados.",
    where: "Na ficha da proposta.",
    href: "/propostas",
    hrefLabel: "Abrir propostas",
    status: "Disponível em Propostas e no portal",
    agora: [
      "Link público, histórico e aceite no portal.",
      "Recibo e cópia do link no CRM.",
      "Captação e usados no mesmo fluxo.",
    ],
    navPaths: ["/propostas"],
    pagePaths: ["/propostas"],
  },
  {
    id: "contrato-intermediacao",
    title: "Contrato com o modelo da imobiliária",
    kicker: "Novidade",
    publishedAt: "2026-10-05",
    summary:
      "Envie o PDF ou Word da imobiliária, o sistema lê os dados e preenche o contrato de intermediação no layout de vocês.",
    where: "Contratos → intermediação.",
    href: "/contratos",
    hrefLabel: "Abrir contratos",
    status: "Disponível em Contratos",
    agora: [
      "Análise do arquivo enviado.",
      "Word e PDF preenchíveis com os dados da ficha.",
      "Dados bancários da imobiliária no modelo.",
    ],
    navPaths: [],
    pagePaths: [],
  },
  {
    id: "metas-vgv",
    title: "Metas com título, tipo e ciclo anterior",
    kicker: "Novidade",
    publishedAt: "2026-10-05",
    summary:
      "Edite título e tipo da meta, compare com o ciclo anterior e veja o VGV no dashboard, inclusive de gerentes.",
    where: "Metas e Dashboard.",
    href: "/metas",
    hrefLabel: "Abrir metas",
    status: "Disponível em Metas",
    agora: [
      "Título, tipo e exclusão pelo diálogo.",
      "Progresso comparado ao período anterior.",
      "VGV de gerentes no ranking.",
    ],
    navPaths: [],
    pagePaths: [],
  },
  {
    id: "proposta-vinculo-imovel",
    title: "Vínculo de imóvel na proposta",
    kicker: "Novidade",
    publishedAt: "2026-10-04",
    summary:
      "Escolha captação, usados ou lançamentos na proposta e no catálogo. O vínculo do imóvel entra nas ações, junto de PDF e compartilhar.",
    where: "Propostas → ações da ficha.",
    href: "/propostas",
    hrefLabel: "Abrir propostas",
    status: "Disponível em Propostas",
    agora: [
      "Captação, usados e lançamentos no mesmo vínculo.",
      "Atalho nas ações da proposta.",
    ],
    navPaths: [],
    pagePaths: [],
  },
  {
    id: "captacao-real",
    title: "Captação e usados com dados reais",
    kicker: "Novidade",
    publishedAt: "2026-10-16",
    summary:
      "Captação e venda de usados deixaram o exemplo e passam a usar o cadastro da imobiliária, com fotos, documentos e capa no card.",
    where: "Captação e Imóveis usados.",
    href: "/captacao",
    hrefLabel: "Abrir captação",
    status: "Disponível na captação e nos usados",
    agora: [
      "O mesmo assistente cadastra captação e usado e já envia ao estoque.",
      "Imóvel captado pode ir para o funil de usados.",
      "O mural mostra quem retirou a chave.",
      "Visitas, chaves e tarefas da operação aparecem na agenda.",
    ],
    navPaths: [],
    pagePaths: [],
  },
  {
    id: "book-comprovante",
    title: "Book em PDF e comprovante",
    kicker: "Novidade",
    publishedAt: "2026-10-15",
    summary:
      "A distribuição de leads aceita o book em PDF. O comprovante de pagamento pode ser guardado junto da operação.",
    where: "Leads → Distribuir e na ficha financeira da venda.",
    href: "/leads",
    hrefLabel: "Abrir leads",
    status: "Disponível na distribuição",
    agora: [
      "Fila rotativa dentro de Distribuir leads.",
      "Book em PDF no fluxo de distribuição.",
    ],
    navPaths: [],
    pagePaths: [],
  },
  {
    id: "ranking-portal",
    title: "Ranking por categoria e portal do proprietário",
    kicker: "Novidade",
    publishedAt: "2026-10-04",
    summary:
      "O ranking de corretores separa a categoria e o período. O proprietário consulta propostas vinculadas no portal.",
    where: "Ranking e portal do proprietário.",
    href: "/corretores",
    hrefLabel: "Abrir ranking",
    status: "Disponível no ranking e no portal",
    agora: [
      "Ranking além de lançamentos.",
      "Acompanhamento de captação com exclusividade e próximos passos.",
      "Propostas da captação e dos usados no portal do dono.",
    ],
    navPaths: [],
    pagePaths: [],
  },
  {
    id: "canais-entrada",
    title: "Leads do Facebook, Instagram, OLX e Órulo",
    kicker: "Novidade",
    publishedAt: "2026-10-10",
    summary:
      "A imobiliária conecta Facebook Lead Ads, recebe lead da OLX e o corretor conclui o acesso à Órulo. O empreendimento pode ser publicado no site.",
    where: "Configurações da imobiliária e funil.",
    href: "/configuracoes",
    hrefLabel: "Abrir configurações",
    status: "Disponível quando o canal está ligado",
    agora: [
      "Lead Ads entra no funil como novo lead.",
      "OLX e Meta ficam isolados na imobiliária dona do canal.",
      "Chave para exibir o empreendimento no site.",
      "Login protegido por verificação anti-robô.",
    ],
    navPaths: [],
    pagePaths: [],
  },
  {
    id: "financeiro-periodo",
    title: "Financeiro por período e comissão avulsa",
    kicker: "Novidade",
    publishedAt: "2026-10-09",
    summary:
      "Contas a pagar, a receber e despesas filtram por mês ou por intervalo. Dá para lançar comissão de cliente que ainda não está cadastrado, sem criar venda na documentação.",
    where: "Financeiro.",
    href: "/financeiro",
    hrefLabel: "Abrir financeiro",
    status: "Disponível no financeiro",
    agora: [
      "Filtro por intervalo de datas.",
      "Comissão sem ficha de documentação, só quando alguém pede.",
    ],
    navPaths: [],
    pagePaths: [],
  },
  {
    id: "interesses-captacao",
    title: "Interesse em vários empreendimentos",
    kicker: "Novidade",
    publishedAt: "2026-10-03",
    summary:
      "Lead e cliente podem ter vários empreendimentos de interesse, inclusive imóvel de captação, com histórico.",
    where: "Na ficha do lead ou cliente.",
    href: "/leads",
    hrefLabel: "Abrir leads",
    status: "Disponível na ficha",
    agora: [
      "Vários empreendimentos por contato.",
      "Interesse em captação no matching.",
    ],
    navPaths: [],
    pagePaths: [],
  },
  {
    id: "contratos-historico",
    title: "Rascunhos e histórico de contratos",
    kicker: "Novidade",
    publishedAt: "2026-10-02",
    summary:
      "Contratos ficam em catálogo, rascunhos e baixados. Dá para ver, editar e apagar o que foi gerado.",
    where: "Contratos.",
    href: "/contratos",
    hrefLabel: "Abrir contratos",
    status: "Disponível em Contratos",
    agora: [
      "Catálogo, rascunhos e baixados.",
      "Histórico dos contratos preenchidos.",
    ],
    navPaths: ["/contratos"],
    pagePaths: ["/contratos"],
  },
  {
    id: "analise-conversao",
    title: "Análise e taxa de conversão",
    kicker: "Novidade",
    publishedAt: "2026-10-02",
    summary:
      "Filtre análise por mês e corretor. A taxa de conversão compara documentações, aprovações e vendas.",
    where: "Análise e Taxa de conversão.",
    href: "/resultado",
    hrefLabel: "Abrir análise",
    status: "Disponível em Relatórios",
    agora: [
      "Filtro por mês e corretor.",
      "Duas taxas: sobre documentações e sobre aprovações.",
    ],
    navPaths: [],
    pagePaths: [],
  },
  {
    id: "distribuir-marcados",
    title: "Distribuir só os leads marcados",
    kicker: "Novidade",
    publishedAt: "2026-10-02",
    summary:
      "Admin e gerente escolhem o corretor e enviam apenas os leads selecionados. Também dá para excluir lead de vez, sem mandar para Leads perdidos.",
    where: "Lista de leads.",
    href: "/leads",
    hrefLabel: "Abrir leads",
    status: "Disponível para admin e gerente",
    agora: [
      "Distribuição só dos marcados.",
      "Exclusão definitiva de leads ativos.",
      "Aprovado na documentação não volta à entrada do funil.",
    ],
    navPaths: [],
    pagePaths: [],
  },
  {
    id: "visita-reserva",
    title: "Visita com horário e chave",
    kicker: "Novidade",
    publishedAt: "2026-10-01",
    summary:
      "Ao agendar visita, o imóvel ou empreendimento fica reservado. A agenda mostra horários ocupados, tolerância de 2 horas e a chave livre já vinculada.",
    where: "Tarefas e agenda da operação.",
    href: "/lembretes",
    hrefLabel: "Abrir tarefas",
    status: "Disponível no agendamento de visita",
    agora: [
      "Reserva de horário sem sobreposição.",
      "Tolerância de 2 horas visível na agenda.",
      "Chave livre entra vinculada na visita.",
    ],
    navPaths: [],
    pagePaths: [],
  },
  {
    id: "documentacao-ficha",
    title: "Documentação direto na ficha",
    kicker: "Novidade",
    publishedAt: "2026-10-01",
    summary:
      "A documentação abre na ficha, sem puxar nem mover o funil. Quem a documentação aprovar permanece no funil de lançamentos.",
    where: "Documentação e ficha do lead.",
    href: "/documentacao",
    hrefLabel: "Abrir documentação",
    status: "Disponível na ficha e em Documentação",
    agora: [
      "Ficha existe sem card de funil.",
      "Aprovado continua no funil de lançamentos.",
      "Presença fechada para o corretor; cliente vendido sai do atraso.",
    ],
    navPaths: [],
    pagePaths: [],
  },
];

export function anuncioNovidadeAtual(): Novidade | null {
  return NOVIDADES[0] ?? null;
}

export function novidadeAnuncioPendente(): boolean {
  const item = anuncioNovidadeAtual();
  if (!item || typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(ANUNCIO_STORAGE_KEY) !== item.id;
  } catch {
    return true;
  }
}

export function marcarNovidadeAnuncioVista(): void {
  const item = anuncioNovidadeAtual();
  if (!item) return;
  try {
    sessionStorage.setItem(ANUNCIO_STORAGE_KEY, item.id);
  } catch {
    // armazenamento indisponível: o aviso só não persiste
  }
}

/** Próxima entrada no CRM volta a exibir o aviso. */
export function reiniciarNovidadeAnuncio(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(ANUNCIO_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function isNavPathNovo(to: string): boolean {
  const path = to.split("?")[0];
  return NOVIDADES.some((item) =>
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
    if (n.configItems?.length) {
      if (path === "/configuracoes" || path.startsWith("/configuracoes/")) {
        return item ? n.configItems.includes(item) : false;
      }
    }
    return n.pagePaths.some((route) => path === route || path.startsWith(`${route}/`));
  });
}

export function isConfigItemNovo(id: string): boolean {
  return NOVIDADES.some((n) => n.configItems?.includes(id));
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
