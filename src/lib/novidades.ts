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
