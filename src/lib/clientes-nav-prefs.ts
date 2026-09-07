import { useEffect, useState } from "react";
import { getSession } from "@/lib/auth";

const KEY_PREFIX = "clientes.hideFromSidebar";
export const CLIENTES_NAV_EVENT = "clientes-nav-pref";
export const ADMIN_VER_CLIENTES_CORRETOR_KEY = "adminVerClientesCorretor";
export const GERENTE_VER_LEADS_GERAIS_KEY = "gerenteVerLeadsGerais";

function storageKey() {
  const session = getSession();
  const tenantId = session?.tenant?.id ?? session?.tenantId ?? "default";
  const userId = session?.id ?? "anon";
  return `${KEY_PREFIX}.${tenantId}.${userId}`;
}

function readStoredFlag(key: string): boolean | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === "1" || raw === "true") return true;
    if (raw === "0" || raw === "false") return false;
    return null;
  } catch {
    return null;
  }
}

/** Ligado = some Clientes e Funil de Clientes do menu deste usuário. */
export function getHideClientesFromSidebar(): boolean {
  return readStoredFlag(storageKey()) === true;
}

export function setHideClientesFromSidebar(hide: boolean): void {
  try {
    localStorage.setItem(storageKey(), hide ? "1" : "0");
  } catch {
    // ignore quota / private mode
  }
  window.dispatchEvent(new Event(CLIENTES_NAV_EVENT));
}

export function useHideClientesFromSidebar() {
  const [hide, setHide] = useState(() => getHideClientesFromSidebar());

  useEffect(() => {
    const sync = () => setHide(getHideClientesFromSidebar());
    sync();
    window.addEventListener(CLIENTES_NAV_EVENT, sync);
    window.addEventListener("storage", sync);
    window.addEventListener("crm-session-updated", sync);
    return () => {
      window.removeEventListener(CLIENTES_NAV_EVENT, sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener("crm-session-updated", sync);
    };
  }, []);

  return hide;
}

/** Admin do tenant com a opção ligada nas configurações. */
export function getAdminVerClientesCorretor(): boolean {
  const session = getSession();
  if (session?.role !== "admin") return false;
  return session.tenant?.modules?.[ADMIN_VER_CLIENTES_CORRETOR_KEY] === true;
}

/** Admin ligou: gerentes veem outras equipes e o pool geral. */
export function getGerenteVerLeadsGerais(): boolean {
  const session = getSession();
  return session?.tenant?.modules?.[GERENTE_VER_LEADS_GERAIS_KEY] === true;
}
