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
    id: "tarefas-substitui-agenda",
    title: "Tarefas vai substituir a Agenda",
    kicker: "Em desenvolvimento",
    publishedAt: "2026-10-09",
    summary:
      "Estamos migrando a Agenda para o módulo Tarefas. A mudança ainda está em desenvolvimento: os dois convivem, e a Agenda continua valendo para os compromissos de agora.",
    where:
      "No menu, Tarefas leva o selo Novo. A Agenda permanece no lugar até a migração terminar.",
    href: "/tarefas",
    hrefLabel: "Abrir Tarefas",
    status: "Migração em andamento",
    agora: [
      "Tarefas é o módulo que vai assumir a Agenda.",
      "A troca ainda não terminou. Continue usando a Agenda normalmente.",
      "Quando a migração acabar, avisamos aqui e a Agenda sai do menu.",
    ],
    navPaths: ["/tarefas"],
    pagePaths: ["/tarefas"],
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
