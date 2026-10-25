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
