import {
  fetchParceiroMe,
  parceiroLogin,
  parceiroLogout,
  parceiroSessionCache,
  storeParceiroCsrf,
  type PortalParceiro,
} from "@/lib/parceiros-api";

export async function ensureParceiroSession(): Promise<PortalParceiro | null> {
  try {
    const me = await fetchParceiroMe();
    parceiroSessionCache.set(me);
    return me;
  } catch {
    parceiroSessionCache.clear();
    return null;
  }
}

export async function signInParceiro(email: string, password: string) {
  const result = await parceiroLogin(email, password);
  storeParceiroCsrf(result.csrfToken);
  parceiroSessionCache.set(result.parceiro);
  return result.parceiro;
}

export async function signOutParceiro() {
  try {
    await parceiroLogout();
  } finally {
    parceiroSessionCache.clear();
  }
}
