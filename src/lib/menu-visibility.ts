import { useEffect, useState } from "react";
import { getSession } from "@/lib/auth";

const KEY_PREFIX = "menu.ocultos";
export const MENU_VISIBILITY_EVENT = "menu-visibility-pref";

export const MENU_OCULTAVEIS = [
  {
    grupo: "Atendimento",
    items: [
      { to: "/lembretes", label: "Lembretes" },
      { to: "/leads", label: "Leads" },
      { to: "/whatsapp", label: "WhatsApp" },
      { to: "/caca-lead", label: "Caça-lead" },
      { to: "/triagem", label: "Triagem" },
      { to: "/funil", label: "Funil" },
      { to: "/leads-perdidos", label: "Leads perdidos" },
      { to: "/clientes", label: "Clientes" },
      { to: "/funil-clientes", label: "Funil de clientes" },
      { to: "/clientes-perdidos", label: "Clientes perdidos" },
    ],
  },
  {
    grupo: "Imóveis e vendas",
    items: [
      { to: "/construtoras", label: "Construtoras" },
      { to: "/imoveis", label: "Imóveis" },
      { to: "/documentacao", label: "Documentação" },
      { to: "/propostas", label: "Propostas" },
      { to: "/contratos", label: "Contratos" },
      { to: "/vendas", label: "Vendas" },
    ],
  },
  {
    grupo: "Captação",
    items: [
      { to: "/captacao/funil", label: "Funil de captação" },
      { to: "/captacao/proprietarios", label: "Proprietários" },
      { to: "/mural-chaves", label: "Mural de chaves" },
    ],
  },
  {
    grupo: "Financeiro",
    items: [
      { to: "/financeiro/visao-geral", label: "Visão geral" },
      { to: "/financeiro/movimentacao", label: "Movimentação financeira" },
      { to: "/financeiro/fluxo-caixa", label: "Fluxo de caixa" },
      { to: "/financeiro/contas-a-receber", label: "Contas a receber" },
      { to: "/financeiro/contas-a-pagar", label: "Contas a pagar" },
      { to: "/financeiro/despesas", label: "Despesas" },
      { to: "/financeiro/comissao", label: "Comissão" },
      { to: "/financeiro/clientes-fornecedores", label: "Clientes e fornecedores" },
    ],
  },
  {
    grupo: "Equipe",
    items: [
      { to: "/equipes", label: "Equipes" },
      { to: "/usuarios", label: "Usuários" },
      { to: "/permissoes", label: "Permissões" },
      { to: "/presenca", label: "Presença" },
      { to: "/corretores", label: "Ranking" },
      { to: "/metas", label: "Metas" },
      { to: "/financeiro/funcionarios", label: "Funcionários" },
    ],
  },
  {
    grupo: "Relatórios",
    items: [
      { to: "/resultado", label: "Análise" },
      { to: "/taxa-conversao", label: "Taxa de conversão" },
      { to: "/atrasos", label: "Atrasos" },
    ],
  },
  {
    grupo: "Treinamento",
    items: [
      { to: "/treinamento", label: "Treinamento" },
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
    return new Set(
      parsed.filter((value): value is string => ALLOWED.has(value)),
    );
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
