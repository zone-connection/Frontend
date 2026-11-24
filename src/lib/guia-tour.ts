import { findGuiaTopic, type GuiaTopic } from "@/lib/guia-sistema-content";

const ID_KEY = "guia-tour-id";
const LIVE_KEY = "guia-tour-live";

export type GuiaTourStep = {
  title: string;
  body: string;
  selector?: string;
};

/** Selectors aligned with `topic.actions` (index 0 = first action). */
const ACTION_SELECTORS: Record<string, (string | undefined)[]> = {
  dashboard: [
    '[data-guia="dashboard-kpis"]',
    '[data-guia="dashboard-funil"]',
    '[data-guia="dashboard-kpis"]',
    '[data-guia="dashboard-comissao"]',
  ],
  leads: [
    '[data-guia="leads-chegaram"]',
    '[data-guia="leads-novo"]',
    '[data-guia="leads-importar"]',
    '[data-guia="leads-distribuir"]',
    '[data-guia="leads-exportar"]',
  ],
  funil: ['[data-guia="funil-board"]', '[data-guia="funil-board"]', '[data-guia="page-actions"]'],
  "funil-clientes": [
    '[data-guia="funil-board"]',
    '[data-guia="funil-board"]',
    '[data-guia="page-actions"]',
  ],
  rh: [
    '[data-guia="rh-visao"]',
    '[data-guia="rh-recrutamento"]',
    '[data-guia="rh-equipe"]',
    '[data-guia="rh-agenda"]',
    '[data-guia="rh-modelos"]',
  ],
  documentacao: [
    '[data-guia="doc-nova"]',
    undefined,
    undefined,
    '[data-guia="page-actions"]',
  ],
};

export function startGuiaTour(topicId: string, opts?: { live?: boolean }) {
  try {
    sessionStorage.setItem(ID_KEY, topicId);
    if (opts?.live) sessionStorage.setItem(LIVE_KEY, "1");
    else sessionStorage.removeItem(LIVE_KEY);
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent("guia-tour-start", { detail: topicId }));
}

export function stopGuiaTour() {
  try {
    sessionStorage.removeItem(ID_KEY);
    sessionStorage.removeItem(LIVE_KEY);
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event("guia-tour-stop"));
}

export function peekGuiaTourId() {
  try {
    return sessionStorage.getItem(ID_KEY);
  } catch {
    return null;
  }
}

export function peekGuiaTourLive() {
  try {
    return sessionStorage.getItem(LIVE_KEY) === "1";
  } catch {
    return false;
  }
}

export function pathMatchesHref(pathname: string, href: string) {
  const path = pathname.replace(/\/$/, "") || "/";
  return path === href || path.startsWith(`${href}/`);
}

function isGuiaPath(pathname: string) {
  return pathname === "/guia-sistema" || pathname.startsWith("/guia-sistema/");
}

export function buildGuiaTourSteps(
  topic: GuiaTopic,
  inGuide: boolean,
): GuiaTourStep[] {
  const pageSelectors = ACTION_SELECTORS[topic.id] ?? [];
  const intro: GuiaTourStep = {
    title: `Como usar ${topic.title}`,
    body: `${topic.summary} ${topic.who}`,
    selector: inGuide
      ? '[data-guia="guia-topic-header"]'
      : '[data-guia="page-header"]',
  };
  const actionSteps = topic.actions.map((action, index) => ({
    title: action.title,
    body: action.detail,
    selector: inGuide
      ? `[data-guia="guia-action-${index}"]`
      : pageSelectors[index],
  }));
  const howStep: GuiaTourStep | null = topic.how?.length
    ? {
        title: "Ordem típica",
        body: topic.how.join(" "),
        selector: inGuide ? '[data-guia="guia-how"]' : undefined,
      }
    : null;
  return howStep ? [intro, ...actionSteps, howStep] : [intro, ...actionSteps];
}

export function resolveGuiaTour(pathname: string, topicId?: string | null) {
  const id = topicId ?? peekGuiaTourId();
  if (!id) return null;
  const found = findGuiaTopic(id);
  if (!found) return null;

  const live = peekGuiaTourLive();
  const onGuide = isGuiaPath(pathname);

  if (live) {
    if (!found.topic.href) return null;
    if (onGuide) return null;
    if (!pathMatchesHref(pathname, found.topic.href)) return null;
    return {
      topic: found.topic,
      group: found.group,
      inGuide: false,
      steps: buildGuiaTourSteps(found.topic, false),
    };
  }

  if (!onGuide) return null;
  return {
    topic: found.topic,
    group: found.group,
    inGuide: true,
    steps: buildGuiaTourSteps(found.topic, true),
  };
}
