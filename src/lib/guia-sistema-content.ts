export type GuiaFormula = {
  title: string;
  expression: string;
  note?: string;
  example?: string;
};

export type GuiaAction = {
  title: string;
  detail: string;
};

export type GuiaTopic = {
  id: string;
  title: string;
  href?: string;
  who: string;
  summary: string;
  actions: GuiaAction[];
  how?: string[];
  formulas?: GuiaFormula[];
  tips?: string[];
};

export type GuiaGroup = {
  id: string;
  label: string;
  kicker: string;
  description: string;
  image: string;
  /** Se true, o índice mostra o grupo mesmo sem o módulo ligado no tenant. */
  alwaysShow?: boolean;
  topics: GuiaTopic[];
};

export const GUIA_GROUPS: GuiaGroup[] = [
  {
    id: "operacao",
    label: "Operação",
    kicker: "Dia a dia comercial",
    description:
      "Da chegada do lead até o acompanhamento na carteira. Aqui mora o atendimento.",
    image: "/guia/operacao.png",
    topics: [
      {
        id: "dashboard",
        title: "Dashboard",
        href: "/dashboard",
        who: "Admin e gerente veem o consolidado do time. Corretor e treinee veem a própria carteira, agenda do dia e comissão do papel deles.",
        summary:
          "Painel do mês corrente: entradas, funil, documentação, vendas, comissão, perdas e o que está parado. Cada KPI compara com o mês anterior e, na gestão, leva ao módulo correspondente.",
        actions: [
          {
            title: "Ler o mês e a evolução",
            detail:
              "Os cards mostram o valor atual, o do mês passado e a variação percentual. Clique no KPI para abrir a tela de origem (leads, documentação, vendas, comissão).",
          },
          {
            title: "Acompanhar o funil",
            detail:
              "O gráfico de barras replica as etapas do funil ativo. Serve para ver onde a carteira emperrou, não para mover card — isso é no Funil.",
          },
          {
            title: "Ver documentação e vendas",
            detail:
              "Aprovadas, reprovadas, em análise, VGV do pipeline e vendas do mês. Venda = ficha com Status 2 no grupo Vendido.",
          },
          {
            title: "Comissão do mês",
            detail:
              "Pendente, liberada, paga e a receber. Admin vê o consolidado; corretor/gerente veem a fatia do papel.",
          },
          {
            title: "Atenção operacional",
            detail:
              "Leads sem dono e parados (padrão: alguns dias sem atualização). Use para distribuir e retomar follow-up.",
          },
        ],
        formulas: [
          {
            title: "Evolução vs. mês anterior",
            expression: "(atual − anterior) ÷ anterior × 100",
            note: "Se o mês anterior for 0: mostra 0% quando o atual também é 0; senão +100%.",
            example: "12 vendas agora e 8 no mês passado → +50%.",
          },
          {
            title: "Taxa de conversão",
            expression: "vendas do mês ÷ documentações do mês × 100",
            note: "Não é lead → venda. É ficha criada no mês versus ficha vendida no mês. Sem documentação, a taxa fica zerada.",
          },
        ],
      },
      {
        id: "leads",
        title: "Leads",
        href: "/leads",
        who: "Admin vê todos. Gerente vê a equipe + pool do admin. Corretor e treinee veem os atribuídos a eles.",
        summary:
          "Captação: quem ainda não é carteira. Entram por cadastro, importação, Meta Ads ou distribuição do pool. Lead e Cliente são tipos diferentes — listas e funis separados.",
        actions: [
          {
            title: "Ver Chegaram (pool)",
            detail:
              "Aba/filtro Chegaram = sem equipe e sem corretor. É o estoque do admin para distribuir. Pool da equipe = já tem gerente, ainda sem corretor.",
          },
          {
            title: "Cadastrar um lead",
            detail:
              "Novo lead: nome, telefone, e-mail, origem, cidade, interesse, prioridade, renda, tags, CCA, construtora/empreendimento. Sem equipe = pool do admin. Para pool de equipe, escolha o gerente e a opção de pool.",
          },
          {
            title: "Importar planilha ou arquivo",
            detail:
              "Aceita Excel, CSV, PDF e Word. Confira o mapeamento, corrija inválidos e importe só os válidos. Origem e tags precisam existir em Configurações.",
          },
          {
            title: "Distribuir (admin e gerente)",
            detail:
              "Seleciona leads do pool e envia para corretor ou para o pool da equipe. Gerente distribui no recorte da própria equipe.",
          },
          {
            title: "Editar, filtrar e exportar",
            detail:
              "Filtros por corretor, equipe, origem, etapa, tag, cidade. Exporta a lista filtrada em Excel ou CSV. Na linha: ver, editar, atribuir, perder.",
          },
          {
            title: "Converter para cliente",
            detail:
              "Quando o atendimento vira carteira contínua, mude o tipo para Cliente. A ficha continua a mesma; passa a aparecer em Clientes e no Funil de Clientes.",
          },
          {
            title: "Marcar como perdido",
            detail:
              "Pede motivo (catálogo). O lead some da captação ativa e entra em Leads Perdidos.",
          },
        ],
        how: [
          "Lead novo cai em Chegaram ou já com dono, na etapa inicial do funil.",
          "Admin/gerente distribuem. Corretor atende no Funil e registra triagem.",
          "Se avançar, vira Cliente e/ou ganha ficha de Documentação.",
        ],
        tips: [
          "Origem, tags, CCA e motivos de perda se cadastram em Configurações — não digite solto se o catálogo já existe.",
          "Facebook Ads entra pelo Page ID do tenant. Página errada = lead no tenant errado.",
        ],
      },
      {
        id: "funil",
        title: "Funil",
        href: "/funil",
        who: "Todo o comercial. Gestão vê o time; corretor só os próprios leads.",
        summary:
          "Kanban da captação. As colunas são as etapas do funil ativo (Configurações → Funis), com papéis: inicial, análise, venda ou perdido.",
        actions: [
          {
            title: "Arrastar o card entre etapas",
            detail:
              "Cada coluna é uma etapa. O papel da etapa dispara regra: Análise abre documentação/fila do analista; Perdido pede motivo; Venda amarra o fechamento.",
          },
          {
            title: "Abrir o card",
            detail:
              "Ficha completa: dono, equipe, construtora, empreendimento, renda, tags, triagem, análise e atalhos para proposta/documentação.",
          },
          {
            title: "Filtrar o quadro",
            detail:
              "Por corretor, equipe, origem, prioridade, busca. Admin e gerente usam o recorte do time; corretor já nasce filtrado.",
          },
          {
            title: "Criar lead pelo funil",
            detail:
              "Dá para cadastrar já na etapa certa, sem passar pela lista.",
          },
          {
            title: "Consultar triagem no card",
            detail:
              "O botão Triagem abre os relatos em um modal, sem sair do quadro. Feche para voltar ao funil; use Ver detalhes se precisar da ficha completa.",
          },
          {
            title: "Abrir o WhatsApp do card",
            detail:
              "O ícone do WhatsApp ao lado do telefone abre a conversa com o lead (wa.me), sem sair do quadro nem abrir a ficha.",
          },
          {
            title: "Criar tarefa ao avançar etapa",
            detail:
              "Depois de mover o card, o sistema pergunta se deseja criar uma tarefa na agenda (título, data, início e término), já vinculada ao lead e à etapa.",
          },
        ],
        how: [
          "Etapas e cores: Configurações → Funis. Só um funil fica ativo.",
          "Papel Inicial = entrada padrão dos leads novos.",
          "Papel Análise = dispara o fluxo de crédito/documentação.",
          "Papel Perdido = motivo obrigatório e ida para Leads Perdidos.",
        ],
        tips: [
          "Colunas intermediárias não têm papel especial — só organizam o atendimento.",
          "O Funil de Clientes é o mesmo quadro, filtrado em tipo Cliente.",
          "Borda vermelha no card: prazo da etapa, inatividade ou tarefa atrasada. Some quando a tarefa é concluída.",
        ],
      },
      {
        id: "triagem",
        title: "Triagem",
        href: "/triagem",
        who: "Comercial. Gestão vê o time; corretor vê os próprios contatos.",
        summary:
          "Registro do primeiro contato (e dos seguintes): o que foi falado, origem do atendimento e para quem segue. É o diário do lead, não a análise de crédito.",
        actions: [
          {
            title: "Lançar um evento de triagem",
            detail:
              "Escolha o contato, a origem (ligação, WhatsApp, visita…) e escreva o relato (limite curto). O evento fica no histórico.",
          },
          {
            title: "Abrir a partir do Funil ou do lead",
            detail:
              "O atalho já traz o contato. Dá para avançar etapa do funil no mesmo fluxo, se a operação pedir.",
          },
          {
            title: "Editar um relato",
            detail:
              "Corrige texto e origem do evento. Não apaga o rastro — serve para manter o time alinhado.",
          },
          {
            title: "Filtrar o histórico",
            detail:
              "Por corretor, equipe e contato. Use para auditoria de follow-up, não para parecer de crédito.",
          },
        ],
        tips: [
          "Documentação e Análise cuidam de FGTS, renda e parecer. Triagem é conversa comercial.",
        ],
      },
      {
        id: "agenda",
        title: "Agenda",
        href: "/agenda",
        who: "Todo o comercial. Analista não usa este módulo. Admin vê o time; corretor vê o próprio + itens compartilhados da equipe.",
        summary:
          "Compromissos pessoais e de equipe: visita, ligação, tarefa. O sino avisa o que está perto (hoje, 2 h, 1 h).",
        actions: [
          {
            title: "Google Agenda",
            detail:
              "A conexão fica em Configurações → Conexões. Eventos do CRM (incluindo os de todas as equipes) vão para o Calendar de quem conectou.",
          },
          {
            title: "Criar compromisso",
            detail:
              "Título, tipo, data/hora, local, notas. Pode vincular a um lead/cliente. Tarefa pessoal pode existir sem contato.",
          },
          {
            title: "Pessoal vs compartilhado",
            detail:
              "Pessoal = só você. Compartilhado = equipe vê. Admin pode criar item visível para todos (informativo).",
          },
          {
            title: "Concluir ou cancelar",
            detail:
              "Na tabela do dia há ação rápida. Concluído sai dos pendentes; cancelado não conta como feito.",
          },
          {
            title: "Trocar a vista",
            detail:
              "Tabela do dia (padrão) ou calendário Dia/Semana/Mês. Filtros de equipe (admin) e tipo.",
          },
          {
            title: "Solicitações e lembretes",
            detail:
              "O badge da agenda no menu muda de cor conforme a urgência. No login, um card lista os próximos se ainda não foi visto na sessão.",
          },
        ],
      },
      {
        id: "clientes",
        title: "Clientes",
        href: "/clientes",
        who: "Corretor e treinee: a própria carteira. Gestão: o time. Não mistura com Leads.",
        summary:
          "Carteira: contatos já assumidos. Mesma ficha do lead, tipo “cliente”. Perda daqui vai para Perda de cliente.",
        actions: [
          {
            title: "Trabalhar a lista",
            detail:
              "Busca, filtros, edição da ficha, prioridade, construtora e empreendimento — igual ao lead, no recorte da carteira.",
          },
          {
            title: "Abrir o Funil de Clientes",
            detail:
              "Mesmo kanban, só tipo cliente. Use para nutrir quem já está na carteira sem misturar captação.",
          },
          {
            title: "Seguir para fechamento",
            detail:
              "Da ficha você sobe documentação, proposta e contrato. Venda continua sendo Status 2 na documentação.",
          },
          {
            title: "Marcar perda de cliente",
            detail:
              "Motivo obrigatório. Não mistura com Leads Perdidos.",
          },
        ],
      },
      {
        id: "funil-clientes",
        title: "Funil de Clientes",
        href: "/funil-clientes",
        who: "Mesmo recorte do Funil, só tipo Cliente.",
        summary:
          "Kanban da carteira. Etapas, cores e papéis são os do funil ativo. Perdido aqui vai para Perda de cliente.",
        actions: [
          {
            title: "Mover o cliente entre etapas",
            detail:
              "Igual ao Funil de leads. Papel Análise e Perdido valem da mesma forma.",
          },
          {
            title: "Abrir o card da carteira",
            detail:
              "Ficha, triagem, documentação e proposta sem voltar para a lista de captação.",
          },
        ],
        tips: [
          "Se o card “sumiu”, confira se o tipo ainda é cliente e se o filtro de corretor/equipe não está escondendo.",
        ],
      },
      {
        id: "leads-perdidos",
        title: "Leads Perdidos",
        href: "/leads-perdidos",
        who: "Gestão vê o consolidado; corretor vê os próprios.",
        summary:
          "Leads que saíram no funil com motivo de perda. Revisão de origem, motivo e volume — não é lixeira sem regra.",
        actions: [
          {
            title: "Filtrar por motivo, origem e período",
            detail:
              "Motivos vêm de Configurações. O dashboard do mês agrupa perdas por motivo.",
          },
          {
            title: "Reabrir ou só consultar",
            detail:
              "Use para entender por que a captação morre. Reativar depende do fluxo da imobiliária (voltar etapa no funil).",
          },
        ],
      },
      {
        id: "clientes-perdidos",
        title: "Perda de cliente",
        href: "/clientes-perdidos",
        who: "Corretor vê a própria carteira perdida; gestão vê o time.",
        summary:
          "Clientes da carteira marcados como perdidos — separado da captação para não misturar funil de entrada com abandono de carteira.",
        actions: [
          {
            title: "Auditar a carteira perdida",
            detail:
              "Motivo, corretor, data. Serve para coaching e para não reabrir lead novo quando já era cliente.",
          },
        ],
      },
      {
        id: "treinamento",
        title: "Treinamento",
        href: "/treinamento",
        who: "Todos leem. Admin, gerente, analista e treinee cadastram seções e links.",
        summary:
          "Biblioteca da imobiliária: pastas (até 4 níveis) e links para Drive, vídeo, PDF. Cada tenant monta a própria. Não é o Guia do sistema (este guia é da plataforma).",
        actions: [
          {
            title: "Criar seção e subseção",
            detail:
              "Pasta na raiz ou dentro de outra (máximo 4 níveis). Título livre; a ordem segue a criação e o sort.",
          },
          {
            title: "Adicionar link",
            detail:
              "Título + URL. Abre em nova aba. Edite ou apague sem afetar as outras pastas.",
          },
          {
            title: "Buscar material",
            detail:
              "A busca filtra pasta e link pelo título/URL.",
          },
        ],
      },
    ],
  },
  {
    id: "imoveis-terceiros",
    label: "Captação e usados",
    kicker: "Imóvel de proprietário",
    alwaysShow: true,
    description:
      "Outra operação, paralela ao CRM de lançamentos: captar imóvel usado, disponibilizar para venda e acompanhar até chaves e pós-venda. O proprietário pode ver o andamento no Portal.",
    image: "/guia/operacao.png",
    topics: [
      {
        id: "modulos-operacao",
        title: "Como aparecer no menu",
        href: "/configuracoes",
        who: "Só o admin da imobiliária liga ou desliga. Comercial, Captação e Usados são operações independentes.",
        summary:
          "Captação e Venda de Usados não entram no menu enquanto estiverem desligados. Isso não apaga dados: só esconde as pastas Operação → Captação e Operação → Venda de Usados. Locação ainda não tem telas.",
        actions: [
          {
            title: "Abrir Configurações → Módulos",
            detail:
              "Em Gestão → Configurações, escolha Módulos (operações imobiliárias). Comercial fica sempre ligado. Ative Captação de Imóveis e/ou Venda de Imóveis Usados e salve. Recarregue se o menu não atualizar na hora.",
          },
          {
            title: "Criar os funis certos",
            detail:
              "Em Configurações → Funis existem três tipos: Comercial (leads), Captação e Venda de usados. Cada tipo tem o próprio funil ativo. Sem funil ativo daquele tipo, o quadro fica vazio e o cadastro recusa a operação.",
          },
        ],
        tips: [
          "O guia desta pasta continua visível mesmo com o módulo desligado — para você saber o que liga.",
          "Permissões de usuário podem ocultar o módulo para um papel mesmo com a operação ligada no tenant.",
        ],
      },
      {
        id: "captacao-visao",
        title: "Captação — visão geral e funil",
        href: "/captacao/visao-geral",
        who: "Time comercial com a operação Captação ligada. Gestão vê o consolidado; corretor atende os processos.",
        summary:
          "Não é captação de lead. Aqui o processo é o imóvel de um proprietário: cadastro, avaliação, exclusividade e etapas até o imóvel estar captado e pronto para a venda de usados.",
        actions: [
          {
            title: "Ler os KPIs",
            detail:
              "Proprietários, imóveis, captações, captações ativas e imóveis já captados. Os cards abrem a lista correspondente. Ativas = etapas que não são perda nem venda.",
          },
          {
            title: "Ver volume por etapa",
            detail:
              "O gráfico de barras replica todas as etapas do funil de Captação ativo, inclusive as zeradas. Ver funil leva ao kanban.",
          },
          {
            title: "Trabalhar no funil",
            detail:
              "Em Captação → Funil, cada coluna é uma etapa. Arraste o card (imóvel + proprietário) para avançar. Clique para a ficha da captação.",
          },
        ],
        how: [
          "Cadastre o proprietário.",
          "Em Catálogo → Imóveis, cadastre a unidade ligada a ele.",
          "Abra uma captação (origem, valores, responsável, exclusividade).",
          "Ande no funil até captar. Aí o imóvel pode ir para Venda de Usados.",
        ],
      },
      {
        id: "captacao-cadastros",
        title: "Proprietários, imóveis e captações",
        href: "/captacao/captacoes",
        who: "Quem opera a captação. A ficha do proprietário também controla o Portal.",
        summary:
          "Proprietários e captações ficam em Captação. O cadastro físico do imóvel (endereço, tipo, áreas, anúncio e lazer) fica em Catálogo → Imóveis, na seção Captação e usados.",
        actions: [
          {
            title: "Ficha do imóvel",
            detail:
              "Em Catálogo → Imóveis, além de endereço e cômodos, cole a descrição de anúncio e marque o que a unidade e o condomínio têm. A mesma ficha aparece na venda de usados e no portal. Marque Disponibilizar na venda de usados para abrir o estoque.",
          },
          {
            title: "Nova captação",
            detail:
              "Escolha proprietário, imóvel, responsável, origem e valores pretendido/avaliação. A etapa inicial vem do funil de Captação ativo.",
          },
          {
            title: "Acesso ao Portal",
            detail:
              "Na ficha do proprietário, ative o acesso. Ele entra em /portal/login com o e-mail cadastrado. É só leitura: visitas, propostas, documentação, contrato e chaves — sem financeiro do CRM.",
          },
        ],
        tips: [
          "Um imóvel só entra em Venda de Usados se já tiver captação.",
        ],
      },
      {
        id: "usados-visao",
        title: "Venda de usados — visão geral e funil",
        href: "/imoveis-usados/visao-geral",
        who: "Time com a operação Venda de Imóveis Usados ligada.",
        summary:
          "Estoque (disponível, reservado, vendido), comercialização (visitas e propostas), fechamento, pós-venda e chaves. O funil próprio não mistura com o funil de leads.",
        actions: [
          {
            title: "Ler o painel",
            detail:
              "O gráfico por etapa usa o funil de Venda de usados. Abaixo vêm KPIs de estoque, visitas, propostas, documentação, contratos, pós-venda e chaves.",
          },
          {
            title: "Kanban da venda",
            detail:
              "Em Venda de Usados → Funil, arraste o imóvel entre etapas. O card mostra título, proprietário, status de estoque e preço.",
          },
          {
            title: "Disponibilizar um captado",
            detail:
              "Em Catálogo → Imóveis, edite a unidade captada e marque Disponibilizar na venda de usados: responsável, funil e preço (sugestão da avaliação).",
          },
        ],
        how: [
          "Captação concluída → disponibilizar na venda de usados.",
          "Interessados, visitas e propostas na ficha da venda.",
          "Fechamento: documentação, contrato, chaves e pós-venda.",
        ],
      },
      {
        id: "usados-interessados",
        title: "Interessados",
        href: "/imoveis-usados/interessados",
        who: "Comercial da venda de usados.",
        summary:
          "Compradores de usado (não são o lead de lançamento). Perfil de busca (tipo, cidade, faixa) e vínculo com imóveis da carteira.",
        actions: [
          {
            title: "Cadastrar interessado",
            detail:
              "Nome, contato e filtros de busca. Depois vincule a um ou mais imóveis em venda e registre o interesse.",
          },
        ],
      },
    ],
  },
  {
    id: "fechamento",
    label: "Fechamento",
    kicker: "Do processo à venda",
    description:
      "Documentação, proposta, contrato e o registro do que de fato vendeu.",
    image: "/guia/fechamento.png",
    topics: [
      {
        id: "documentacao",
        title: "Documentação",
        href: "/documentacao",
        who: "Comercial cria e acompanha. Analista trabalha o parecer na tela Análise; o Status 1 reflete aqui.",
        summary:
          "Ficha do processo: construtora, empreendimento, VGV, corretor e dois status independentes. É o coração do fechamento — ranking, meta, taxa e comissão bebem daqui.",
        actions: [
          {
            title: "Abrir ficha nova",
            detail:
              "Vincule o contato (dá para pesquisar pelo nome), construtora, empreendimento, VGV, fonte, FGTS/entrada e os dois status. Status 1 começa em análise/pré-análise conforme o catálogo.",
          },
          {
            title: "Status 1 — parecer",
            detail:
              "Pré-análise, em análise, aprovado (inclusive “c/ restrição”), reprovado. O analista assume e devolve o parecer em Análise; o comercial vê o resultado aqui e no aviso.",
          },
          {
            title: "Status 2 — andamento da venda",
            detail:
              "Andamento, Bacen, Vendido. Quando vira Vendido, a ficha entra em Vendas e conta VGV, ranking, meta e taxa.",
          },
          {
            title: "Filtrar o pipeline",
            detail:
              "Por status 1/2, corretor, equipe, construtora e período. Em Por mês, escolha o mês para ver quantas fichas subiram. O card No mês mostra o total da lista filtrada; aprovadas, reprovadas e em análise usam o Status 1.",
          },
          {
            title: "Anexos e parecer",
            detail:
              "Documentos da ficha e texto de parecer. Reprovado não some — fica para histórico.",
          },
        ],
        formulas: [
          {
            title: "O que conta como venda",
            expression: "documentação com Status 2 no grupo “Vendido”",
            note: "Aceita Vendido, vendida, venda etc. O VGV da ficha entra no ranking e nas metas de VGV.",
          },
        ],
        tips: [
          "Rótulos de status e fontes se editam em Configurações. Não invente um “Vendido” paralelo — o sistema agrupa por semântica.",
          "Aprovado c/ restrição ainda conta como aprovado nos cards.",
        ],
      },
      {
        id: "propostas",
        title: "Propostas",
        href: "/propostas",
        who: "Comercial cria e gera PDF. Gestão vê o time.",
        summary:
          "Simulação comercial em PDF com a identidade da imobiliária: valor, desconto e composição (sinal, parcelas, FGTS, financiamento…). A diferença precisa fechar.",
        actions: [
          {
            title: "Criar proposta",
            detail:
              "Vincule lead/cliente, construtora e empreendimento. Preencha valor do imóvel, desconto e as linhas da composição.",
          },
          {
            title: "Montar a composição",
            detail:
              "Sinal, apartado, pré-chaves, pós-chaves, intercaladas, FGTS, Mora Bem, MCMV, financiamento. Parcela Caixa é só informativa — não entra na soma.",
          },
          {
            title: "Fechar a diferença",
            detail:
              "Líquido (valor − desconto) tem que igualar a composição. Se sobrar ou faltar, o PDF mostra o furo.",
          },
          {
            title: "Gerar PDF e compartilhar",
            detail:
              "Logo e cor da imobiliária. Status: rascunho, enviada, negociação, aceita, recusada. Validade e observação entram no documento.",
          },
        ],
        how: [
          "Preencha valor e desconto.",
          "Some as linhas até a diferença zerar.",
          "Gere o PDF e envie. Aceita não substitui Status 2 Vendido na documentação.",
        ],
        formulas: [
          {
            title: "Valor líquido",
            expression: "valor do imóvel − desconto",
            example: "R$ 420.000 − R$ 20.000 = R$ 400.000",
          },
          {
            title: "Composição",
            expression:
              "sinal + apartado + pré-chaves + pós-chaves + intercaladas + FGTS + Mora Bem + MCMV + financiamento",
            note: "Parcela Caixa não entra na soma.",
          },
          {
            title: "Diferença (precisa ser zero)",
            expression: "valor líquido − composição",
          },
        ],
      },
      {
        id: "contratos",
        title: "Contratos",
        href: "/contratos",
        who: "Quem tem o módulo no plano. Gera PDF localmente com os dados preenchidos.",
        summary:
          "Modelos de contrato (intermediação e outros) em PDF: contratante, proprietário, imóvel, valores por extenso, logo e cor da imobiliária.",
        actions: [
          {
            title: "Escolher o modelo",
            detail:
              "Cada template pede blocos diferentes (contratante, proprietário, imóvel, valores, cláusulas).",
          },
          {
            title: "Preencher e baixar",
            detail:
              "CPF/CNPJ, telefone e valor em reais viram extenso automaticamente. Baixe o PDF — não substitui a ficha de Documentação nem a venda.",
          },
        ],
      },
      {
        id: "vendas",
        title: "Vendas",
        href: "/vendas",
        who: "Admin e gerente (visão de time). Não é cadastro avulso: lista fichas já vendidas.",
        summary:
          "Documentações com Status 2 Vendido no período. O VGV daqui é o mesmo do dashboard, ranking e metas de VGV.",
        actions: [
          {
            title: "Filtrar o período",
            detail:
              "Mês, equipe, corretor, construtora. KPIs de quantidade e VGV acompanham o filtro.",
          },
          {
            title: "Editar a venda",
            detail:
              "O lápis abre a mesma ficha de Documentação. Trocar corretor, gerente, data ou VGV atualiza os dois lugares — Vendas não é um cadastro separado.",
          },
        ],
        formulas: [
          {
            title: "VGV do período",
            expression: "soma do VGV das fichas vendidas no recorte",
          },
        ],
      },
    ],
  },
  {
    id: "catalogo",
    label: "Catálogo",
    kicker: "Consulta na hora de atender",
    description:
      "Construtoras, empreendimentos e unidades para montar proposta e documentação.",
    image: "/guia/catalogo.png",
    topics: [
      {
        id: "construtoras",
        title: "Construtoras",
        href: "/construtoras",
        who: "Cadastro liberado para o comercial conforme o papel. Ranking de vendas por parceira é de gestão.",
        summary:
          "Parceiras, cor no sistema, empreendimentos (cidade, tipo, status, tags, entrega) e, para gestão, vendas por construtora.",
        actions: [
          {
            title: "Cadastrar construtora",
            detail:
              "Nome, cor (badge em leads/propostas), dados de contato. A cor ajuda a reconhecer a parceira no funil.",
          },
          {
            title: "Cadastrar empreendimento",
            detail:
              "Cidade, tipo, status, tags, entrega, área, flags e observações. Tipos/status/tags vêm de Configurações.",
          },
          {
            title: "Usar no atendimento",
            detail:
              "Lead, proposta e documentação apontam para construtora + empreendimento daqui. Sem cadastro, a ficha fica solta.",
          },
        ],
      },
      {
        id: "imoveis",
        title: "Imóveis",
        href: "/imoveis",
        who: "Consulta no atendimento. Pode ser oculto do menu em Configurações se o time não usa tabela de unidades.",
        summary:
          "Lançamentos (empreendimentos) e unidades de captação/usados no mesmo catálogo. Construtoras continua no menu mesmo se Imóveis estiver oculto.",
        actions: [
          {
            title: "Consultar e cadastrar",
            detail:
              "Novo imóvel pergunta se é lançamento (construtora, torres, plantas) ou captação/usado (ficha do proprietário). A busca vale para os dois tipos.",
          },
          {
            title: "Ocultar do menu",
            detail:
              "Configurações → preferência de Imóveis no sidebar, se a operação não trabalha estoque de unidades.",
          },
        ],
      },
    ],
  },
  {
    id: "gestao",
    label: "Gestão",
    kicker: "Time, resultado e ajustes",
    description:
      "Quem vende, quanto converte, metas e a configuração que sustenta o comercial.",
    image: "/guia/gestao.png",
    topics: [
      {
        id: "ranking",
        title: "Ranking",
        href: "/corretores",
        who: "Só admin e gerente. Corretor não entra nesta tela.",
        summary:
          "Comparativo do período: vendas, VGV, documentações e progresso de meta. Filtre por mês, bimestre, trimestre, semestre ou ano. Admin também vê ranking entre gerentes/equipes e por construtora.",
        actions: [
          {
            title: "Ordenar o pódio",
            detail:
              "Troque o critério (vendas, VGV, docs). Clique no corretor para o resumo das vendas.",
          },
          {
            title: "Filtrar o período",
            detail:
              "Mensal, bimestre, trimestre, semestre ou anual. O recorte do gerente já é a própria equipe. Admin vê todas.",
          },
        ],
        formulas: [
          {
            title: "O que pontua",
            expression: "fichas vendidas (Status 2) e soma de VGV no recorte",
          },
        ],
      },
      {
        id: "atrasos",
        title: "Atrasos",
        href: "/atrasos",
        who: "Só admin e gerente. Admin vê o time todo; gerente vê a própria equipe.",
        summary:
          "Lista, por corretor, os leads parados, fora do prazo da etapa ou com tarefa vencida. Não depende do período do Ranking — é a foto de agora, para cobrar ação no dia.",
        actions: [
          {
            title: "Ler os indicadores",
            detail:
              "Sem movimentação usa o tempo de inatividade configurado no funil; fora do prazo é a etapa que passou do tempo; tarefas atrasadas são compromissos com prazo vencido.",
          },
          {
            title: "Abrir o lead",
            detail:
              "Clique no nome do lead para cair direto no card dele no Funil e movimentar ou reagendar.",
          },
          {
            title: "Buscar corretor ou lead",
            detail:
              "A busca filtra pelo nome do corretor ou de qualquer lead atrasado dele.",
          },
        ],
        tips: [
          "O Ranking mostra um aviso resumido com atalho para esta tela e marca em vermelho quem tem pendência.",
          "Os prazos de etapa e o tempo de inatividade ficam em Configurações → funil.",
        ],
      },
      {
        id: "metas",
        title: "Metas",
        href: "/metas",
        who: "Admin define imobiliária, gerente e corretor. Gerente define a equipe. Corretor acompanha (e pode ter meta pessoal).",
        summary:
          "Alvo de vendas, documentações ou VGV, em período diário até anual. O realizado sobe sozinho conforme as fichas do período.",
        actions: [
          {
            title: "Criar meta",
            detail:
              "Tipo (vendas / docs / VGV), período, valor, escopo (corretor, gerente/equipe, imobiliária).",
          },
          {
            title: "Acompanhar o progresso",
            detail:
              "Barra = realizado ÷ meta. Vendas e VGV usam Status 2 Vendido; documentações usam fichas criadas no período.",
          },
          {
            title: "Editar ou encerrar",
            detail:
              "Ajuste o valor. Apagar remove o alvo, não as vendas.",
          },
        ],
        formulas: [
          {
            title: "Progresso",
            expression: "realizado no período ÷ valor da meta × 100",
            example: "8 vendas / meta 10 → 80%.",
          },
        ],
      },
      {
        id: "analise",
        title: "Análise",
        href: "/resultado",
        who: "Analista é o operador da fila. Gestão acompanha. Corretor não decide parecer aqui — espera o Status 1 na documentação.",
        summary:
          "Fila de crédito: assumir ficha, escrever parecer, aprovar ou reprovar. O comercial é avisado (gerente inclusive em modal).",
        actions: [
          {
            title: "Assumir o processo",
            detail:
              "Tira da fila aberta e marca em análise no seu nome.",
          },
          {
            title: "Dar parecer",
            detail:
              "Texto + aprovado/reprovado. Isso grava o Status 1 da documentação. Aprovado c/ restrição continua no grupo aprovado.",
          },
          {
            title: "Ver resumo e ranking da fila",
            detail:
              "Volume por status e, se houver, ranking interno da análise — não substitui o Ranking de vendas.",
          },
        ],
        how: [
          "Comercial cria a documentação (Status 1 em análise).",
          "Analista assume, parecer, devolve.",
          "Comercial segue Status 2 até Vendido — ou trata a reprovação.",
        ],
      },
      {
        id: "taxa-conversao",
        title: "Taxa de conversão",
        href: "/taxa-conversao",
        who: "Admin e gerente.",
        summary:
          "Mesma regra do dashboard, por corretor e equipe: quem transforma documentação em venda. Não é conversão de lead.",
        actions: [
          {
            title: "Comparar corretores",
            detail:
              "Ordenar por taxa, vendas, docs ou VGV. Filtrar equipe (admin) e buscar nome.",
          },
          {
            title: "Ler o gráfico",
            detail:
              "Documentações vs vendas vs taxa dos primeiros colocados. Taxa alta com 2 fichas não é o mesmo que volume.",
          },
        ],
        formulas: [
          {
            title: "Taxa no mês",
            expression: "vendas ÷ documentações × 100",
            note: "Documentação = ficha criada no mês. Venda = ficha vendida no mês.",
            example: "10 fichas e 4 vendas → 40%.",
          },
        ],
      },
      {
        id: "equipes",
        title: "Equipes",
        href: "/equipes",
        who: "Admin monta. Gerente vê a própria.",
        summary:
          "Time com um gerente. Pool da equipe, recorte do gerente, ranking, metas e o funil de cada operação saem daqui.",
        actions: [
          {
            title: "Criar equipe",
            detail:
              "Nome + gerente. Encaixe corretores. Um corretor em uma equipe por vez, conforme a regra da imobiliária.",
          },
          {
            title: "Funis da equipe",
            detail:
              "Admin escolhe, por operação (Comercial, Captação, Venda de usados), qual funil ativo o time usa nas novas operações. Sem vínculo, vale o funil ativo da imobiliária. Operações antigas não mudam de funil.",
          },
          {
            title: "Kanban de equipes",
            detail:
              "Colunas por time para ver quem está onde. Credenciais temporárias (se o papel permitir) saem desta área.",
          },
        ],
      },
      {
        id: "usuarios",
        title: "Usuários",
        href: "/usuarios",
        who: "Admin cria. Gerente pode ver/gerar senha temporária da equipe, conforme permissão.",
        summary:
          "Contas e papéis: admin, gerente, corretor, analista, treinee e financeiro. O plano limita quantidade (Solo 1, Bronze 5, Prata 15, Ouro 35).",
        actions: [
          {
            title: "Criar usuário",
            detail:
              "Nome, e-mail, papel, equipe. Senha temporária copiável no primeiro acesso.",
          },
          {
            title: "Papéis",
            detail:
              "Admin = operação + gestão + financeiro (se o plano tiver). Gerente = time (não no Solo). Corretor = carteira. Analista = documentação/análise (não no Solo/Bronze). Treinee ≈ corretor com mais cadastro de catálogo. Financeiro = só o módulo Financeiro, com permissões de visualizar/criar/editar/excluir (não no Bronze).",
          },
        ],
        tips: [
          "Solo: CRM + fechamento + metas + financeiro enxuto. Bronze: CRM operacional. Prata: administrativo ou financeiro. Ouro: tudo.",
        ],
      },
      {
        id: "configuracoes",
        title: "Configurações",
        href: "/configuracoes",
        who: "Admin (e papéis com a rota). Define o que o resto do CRM usa.",
        summary:
          "Identidade da imobiliária, conexões (Google Agenda), funis, origens, tags, motivos, CCAs, status de documentação, tipos de empreendimento e preferências de menu/financeiro.",
        actions: [
          {
            title: "Conexões",
            detail:
              "Cada usuário conecta o próprio Google Agenda. Compromissos do CRM são enviados ao Calendar; dá para trocar de conta ou desconectar.",
          },
          {
            title: "Empresa",
            detail:
              "Nome, logo, cor, CRECI, contato. Entram em PDF de proposta e contrato.",
          },
          {
            title: "Funis",
            detail:
              "Três tipos: Comercial (leads), Captação e Venda de usados. Crie etapas, cores e papéis. Só um funil fica ativo por tipo. Em Equipes, o admin vincula cada time a um funil por operação. Sem o funil do tipo, Captação e Usados não andam.",
          },
          {
            title: "Módulos de operação",
            detail:
              "Captação de Imóveis e Venda de Imóveis Usados nascem desligados. Ligue em Configurações → Módulos para aparecerem no menu Operação. Locação ainda não tem telas.",
          },
          {
            title: "Catálogos",
            detail:
              "Origens, tags, motivos de perda, CCAs, fontes e status 1/2 da documentação, tipos/status/tags de empreendimento.",
          },
          {
            title: "Preferências",
            detail:
              "Ocultar Imóveis no menu; parcelas à vista no financeiro, se a operação usar.",
          },
        ],
      },
    ],
  },
  {
    id: "financeiro",
    label: "Financeiro",
    kicker: "Caixa da imobiliária",
    description:
      "Movimentos, títulos, fluxo e o rateio de comissão sobre o VGV.",
    image: "/guia/financeiro.png",
    topics: [
      {
        id: "fin-visao",
        title: "Visão geral",
        href: "/financeiro/visao-geral",
        who: "Admin, perfil Financeiro e super_admin na plataforma. Corretor não vê o caixa — só Comissão.",
        summary:
          "Saldo, receitas, despesas, a receber, a pagar e resultado do período, com gráficos por mês e por centro.",
        actions: [
          {
            title: "Ler os KPIs",
            detail:
              "Saldo atual, receitas e despesas do mês, títulos em aberto, resultado. Evolução vs período anterior.",
          },
          {
            title: "Filtrar o período",
            detail:
              "A barra de filtros vale para os gráficos. Clique num KPI para ir a contas ou movimentação.",
          },
        ],
        formulas: [
          {
            title: "Resultado do mês",
            expression: "receitas − despesas",
          },
        ],
      },
      {
        id: "fin-parceiros",
        title: "Clientes e fornecedores",
        href: "/financeiro/clientes-fornecedores",
        who: "Admin e perfil Financeiro.",
        summary:
          "Cadastro de quem paga e de quem recebe. Títulos e movimentação apontam para este cadastro.",
        actions: [
          {
            title: "Cadastrar parceiro",
            detail:
              "Pessoa/empresa, CPF/CNPJ, tipo (cliente ou fornecedor). Sem parceiro, o título fica solto.",
          },
        ],
      },
      {
        id: "fin-mov",
        title: "Movimentação financeira",
        href: "/financeiro/movimentacao",
        who: "Admin e perfil Financeiro.",
        summary:
          "Entradas e saídas já realizadas (caixa de fato). Título a receber/pagar só vira movimento quando é baixado.",
        actions: [
          {
            title: "Lançar movimento",
            detail:
              "Tipo (entrada/saída), valor, data, categoria, parceiro, centro. Edite ou exclua o lançamento.",
          },
          {
            title: "Filtrar e conferir",
            detail:
              "Período, tipo, status. É o extrato — o fluxo de caixa projeta o que ainda vai vencer.",
          },
        ],
      },
      {
        id: "fin-fluxo",
        title: "Fluxo de caixa",
        href: "/financeiro/fluxo-caixa",
        who: "Admin e perfil Financeiro.",
        summary:
          "Projeção por vencimento: o que entra, o que sai e o saldo no dia/semana/mês. Comissão pendente entra como previsão pelos títulos; ao baixar (aqui, em contas a receber ou na comissão), vira realizado. Dá para baixar título direto do quadro.",
        actions: [
          {
            title: "Navegar o período",
            detail:
              "Granularidade dia, semana ou mês. O saldo de cada faixa = saldo anterior + entradas − saídas.",
          },
          {
            title: "Baixar título no quadro",
            detail:
              "Marca como recebido/pago e gera o movimento. Evita lançar duas vezes. Comissão pendente aparece como título previsto — confirme aqui, em Contas a receber ou marcando a comissão como paga.",
          },
        ],
        formulas: [
          {
            title: "Saldo do intervalo",
            expression: "saldo anterior + entradas − saídas",
          },
        ],
      },
      {
        id: "fin-receber",
        title: "Contas a receber",
        href: "/financeiro/contas-a-receber",
        who: "Admin e perfil Financeiro.",
        summary:
          "Títulos de entrada (ex.: comissão da construtora). Em aberto até a baixa, que gera o movimento.",
        actions: [
          {
            title: "Criar título",
            detail:
              "Parceiro, valor, vencimento, categoria. Para comissão, use Lançar comissão — abre o mesmo cadastro da tela de Comissões.",
          },
          {
            title: "Baixar (receber)",
            detail:
              "Informa data/valor recebido. O título some do aberto e aparece na movimentação e no fluxo como realizado. Comissão lançada já gera aqui as fatias de caixa e sócios (abertas se pendente, baixadas se paga), identificadas e com atalho para a comissão.",
          },
        ],
      },
      {
        id: "fin-pagar",
        title: "Contas a pagar",
        href: "/financeiro/contas-a-pagar",
        who: "Admin e perfil Financeiro.",
        summary:
          "Títulos de saída. Mesma lógica de vencimento, baixa e centro que o a receber.",
        actions: [
          {
            title: "Criar e baixar",
            detail:
              "Fornecedor, valor, vencimento. Baixa = pago e vira movimento de saída. Comissão lançada já gera aqui corretor, gerente e tributos (só se o valor for maior que zero), com selo Comissão e atalho para a origem.",
          },
        ],
      },
      {
        id: "fin-despesas",
        title: "Despesas",
        href: "/financeiro/despesas",
        who: "Admin e perfil Financeiro. Tela de conferência das saídas classificadas.",
        summary:
          "Obrigações com fornecedores e centros de custo. Comissões não entram aqui — use Comissão para lançar e Contas a pagar para baixar as fatias.",
        actions: [
          {
            title: "Revisar despesas",
            detail:
              "Filtre período e tipo. Para lançar de fato, use movimentação ou contas a pagar.",
          },
        ],
      },
      {
        id: "fin-comissao",
        title: "Comissão",
        href: "/financeiro/comissao",
        who: "Admin e perfil Financeiro veem o consolidado. Gerente a da equipe. Corretor/treinee a fatia deles. Não exige o caixa inteiro no plano.",
        summary:
          "Rateio sobre o VGV da venda: bruta da imobiliária, tributos, líquida e split (corretor, gerente, caixa, sócios). Ao lançar, as fatias já aparecem em Contas a receber (caixa/sócios) e a pagar. Se estiver pendente, o fluxo de caixa projeta o recebimento na data prevista. Status: pendente → liberada → paga.",
        actions: [
          {
            title: "Lançar comissão",
            detail:
              "Pode partir de uma venda já cadastrada ou de um cliente ainda sem ficha: nome, valor, data da venda, corretor e, se quiser, construtora/empreendimento. Nesse caso a venda entra em Vendas e em Documentação. Informe também % da imobiliária, tributos, split da líquida e data prevista de recebimento. Os quatro pedaços da líquida precisam somar 100%. A premiação é um valor à parte: corretor, imposto, imobiliária e gerente, cada um sobre o saldo da etapa anterior — não entram no rateio da líquida. As fatias entram na hora em Contas a receber e a pagar, mesmo pendentes.",
          },
          {
            title: "Avançar o status",
            detail:
              "Pendente, liberada, paga. Enquanto pendente, as fatias de caixa e sócios ficam em aberto no fluxo (previsão). Ao marcar como paga aqui ou baixar em Contas a receber, os títulos são baixados e o fluxo registra como realizado. Cada título fica identificado como Comissão e abre a comissão de origem.",
          },
          {
            title: "Conferir o recorte",
            detail:
              "Corretor só vê a linha dele. Não edite percentual depois de paga sem acordo interno — o sistema recalcula na edição.",
          },
        ],
        formulas: [
          {
            title: "Comissão bruta",
            expression: "VGV × % da imobiliária",
            example: "R$ 400.000 × 5% = R$ 20.000",
          },
          {
            title: "Tributos",
            expression: "comissão bruta × % de tributos",
            example: "R$ 20.000 × 14,5% = R$ 2.900",
          },
          {
            title: "Comissão líquida",
            expression: "comissão bruta − tributos",
            example: "R$ 20.000 − R$ 2.900 = R$ 17.100",
          },
          {
            title: "Split da líquida",
            expression:
              "líquida × % corretor | gerente | caixa | sócios  (somam 100%)",
            note: "O valor dos sócios absorve o centavo de arredondamento.",
            example: "50% corretor de R$ 17.100 = R$ 8.550",
          },
        ],
      },
    ],
  },
  {
    id: "conta",
    label: "Conta",
    kicker: "Você no sistema",
    description: "Dados pessoais, senha e preferências da sessão.",
    image: "/guia/hero.png",
    topics: [
      {
        id: "perfil",
        title: "Perfil",
        href: "/perfil",
        who: "Todos os usuários.",
        summary:
          "Nome, contato e senha. A home inicial da imobiliária (se o admin configurou) só vale se o seu papel puder abrir aquela rota.",
        actions: [
          {
            title: "Atualizar dados",
            detail: "Nome e telefone usados em agenda, ranking e PDFs internos.",
          },
          {
            title: "Trocar senha",
            detail:
              "Depois do primeiro acesso com senha temporária, defina a definitiva aqui.",
          },
        ],
      },
    ],
  },
];

export const GUIA_JOURNEY = [
  { n: "1", title: "Chegou", text: "Lead entra no pool ou já com dono." },
  { n: "2", title: "Atende", text: "Funil, triagem e agenda." },
  { n: "3", title: "Analisa", text: "Documentação + parecer do analista." },
  { n: "4", title: "Propõe", text: "Proposta fecha a composição." },
  { n: "5", title: "Vende", text: "Status 2 Vendido → ranking, meta, comissão." },
] as const;

export const GUIA_JOURNEY_USADOS = [
  { n: "1", title: "Captar", text: "Proprietário, imóvel e funil de captação." },
  { n: "2", title: "Disponibilizar", text: "Imóvel captado entra na venda de usados." },
  { n: "3", title: "Negociar", text: "Interessados, visitas e propostas." },
  { n: "4", title: "Fechar", text: "Documentação, contrato e chaves." },
  { n: "5", title: "Pós-venda", text: "Pendências e portal do proprietário." },
] as const;

export function findGuiaTopic(id: string): {
  group: GuiaGroup;
  topic: GuiaTopic;
} | null {
  for (const group of GUIA_GROUPS) {
    const topic = group.topics.find((item) => item.id === id);
    if (topic) return { group, topic };
  }
  return null;
}

function pathMatchesHref(pathname: string, href: string) {
  const path = pathname.replace(/\/$/, "") || "/";
  return path === href || path.startsWith(`${href}/`);
}

export function findGuiaTopicByPath(pathname: string) {
  let best: { group: GuiaGroup; topic: GuiaTopic } | null = null;
  for (const group of GUIA_GROUPS) {
    for (const topic of group.topics) {
      if (!topic.href) continue;
      if (!pathMatchesHref(pathname, topic.href)) continue;
      if (!best || topic.href.length > (best.topic.href?.length ?? 0)) {
        best = { group, topic };
      }
    }
  }
  return best;
}
