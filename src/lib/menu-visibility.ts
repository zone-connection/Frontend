import { useEffect, useState } from "react";
import { getSession } from "@/lib/auth";

const KEY_PREFIX = "menu.ocultos";
export const MENU_VISIBILITY_EVENT = "menu-visibility-pref";

export const MENU_OCULTAVEIS = [
  {
    grupo: "Dia",
    items: [
      { to: "/tarefas", label: "Tarefas" },
      { to: "/lembretes", label: "Lembretes" },
    ],
  },
  {
    grupo: "Comercial",
    items: [
      { to: "/leads", label: "Leads" },
      { to: "/whatsapp", label: "WhatsApp" },
      { to: "/triagem", label: "Triagem" },
      { to: "/funil", label: "Funil" },
      { to: "/caca-lead", label: "Caça-lead" },
      { to: "/leads-perdidos", label: "Leads perdidos" },
    ],
  },
  {
    grupo: "Carteira",
    items: [
      { to: "/clientes", label: "Clientes" },
      { to: "/funil-clientes", label: "Funil de Clientes" },
    ],
  },
  {
    grupo: "Perdas",
    items: [{ to: "/clientes-perdidos", label: "Clientes perdidos" }],
  },
  {
    grupo: "Imóveis",
    items: [
      { to: "/construtoras", label: "Construtoras" },
      { to: "/imoveis", label: "Imóveis" },
    ],
  },
  {
    grupo: "Fechamento",
    items: [
      { to: "/documentacao", label: "Documentação" },
      { to: "/propostas", label: "Propostas" },
      { to: "/contratos", label: "Contratos" },
      { to: "/vendas", label: "Vendas" },
    ],
  },
  {
    grupo: "Time",
    items: [
      { to: "/equipes", label: "Equipes" },
      { to: "/usuarios", label: "Usuários" },
      { to: "/permissoes", label: "Permissões" },
      { to: "/presenca", label: "Presença" },
      { to: "/corretores", label: "Ranking" },
    ],
  },
  {
    grupo: "Resultado",
    items: [
      { to: "/metas", label: "Metas" },
      { to: "/resultado", label: "Análise" },
      { to: "/taxa-conversao", label: "Taxa de conversão" },
      { to: "/atrasos", label: "Atrasos" },
    ],
  },
  {
    grupo: "Captação",
    items: [
      { to: "/captacao/funil", label: "Funil de captação" },
      { to: "/captacao/proprietarios", label: "Proprietários" },
      { to: "/mural-chaves", label: "Mural de Chaves" },
    ],
  },
  {
    grupo: "Caixa",
    items: [
      { to: "/financeiro/visao-geral", label: "Visão geral" },
      { to: "/financeiro/movimentacao", label: "Movimentação financeira" },
      { to: "/financeiro/fluxo-caixa", label: "Fluxo de caixa" },
    ],
  },
  {
    grupo: "Contas",
    items: [
      { to: "/financeiro/contas-a-receber", label: "Contas a receber" },
      { to: "/financeiro/contas-a-pagar", label: "Contas a pagar" },
      { to: "/financeiro/despesas", label: "Despesas" },
      { to: "/financeiro/comissao", label: "Comissão" },
    ],
  },
  {
    grupo: "Cadastros",
    items: [
      { to: "/financeiro/clientes-fornecedores", label: "Clientes e fornecedores" },
      { to: "/financeiro/funcionarios", label: "Funcionários" },
    ],
  },
  {
    grupo: "Apoio",
    items: [
      { to: "/treinamento", label: "Treinamento" },
      { to: "/novidades", label: "Novidades" },
      { to: "/guia-sistema", label: "Guia do sistema" },
    ],
  },
] as const;

const ALLOWED = new Set(
  MENU_OCULTAVEIS.flatMap((grupo) => grupo.items.map((item) => item.to)),
);

function storageKey() {
  const session = getSession();
  const tenantId = session?.tenant?.id ?? session?.tenantId ?? "default";
  const userId = session?.id ?? "anon";
  return `${KEY_PREFIX}.${tenantId}.${userId}`;
}

export function getHiddenMenuPaths(): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((value): value is string => ALLOWED.has(value)));
  } catch {
    return new Set();
  }
}

export function setMenuPathVisible(path: string, visible: boolean): void {
  if (!ALLOWED.has(path)) return;
  const next = getHiddenMenuPaths();
  if (visible) next.delete(path);
  else next.add(path);
  localStorage.setItem(storageKey(), JSON.stringify([...next]));
  window.dispatchEvent(new Event(MENU_VISIBILITY_EVENT));
}

export function useHiddenMenuPaths() {
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  useEffect(() => {
    const sync = () => setHidden(getHiddenMenuPaths());
    sync();
    window.addEventListener(MENU_VISIBILITY_EVENT, sync);
    window.addEventListener("storage", sync);
    window.addEventListener("crm-session-updated", sync);
    return () => {
      window.removeEventListener(MENU_VISIBILITY_EVENT, sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener("crm-session-updated", sync);
    };
  }, []);

  return hidden;
}
