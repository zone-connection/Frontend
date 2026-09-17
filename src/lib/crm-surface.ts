import { clearAppearanceOverrides, initAppearance } from "@/lib/appearance";
import { applyTheme, initTheme } from "@/lib/theme";

const PUBLIC_EXACT = new Set([
  "/",
  "/login",
  "/demonstracao",
  "/termos",
  "/privacidade",
]);

/** Marketing, login e páginas públicas — sem tema/cores do CRM. */
export function isPublicSurfacePath(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  if (pathname.startsWith("/produtos/")) return true;
  if (pathname.startsWith("/portal")) return true;
  if (pathname.startsWith("/parceiros")) return true;
  if (pathname.startsWith("/publico")) return true;
  return false;
}

/** Aplica tema claro/escuro + aparência salvos do painel. */
export function activateCrmSurface() {
  initTheme();
  initAppearance();
}

/** Restaura visual padrão do site (marketing/login). */
export function activatePublicSurface() {
  clearAppearanceOverrides();
  if (typeof document === "undefined") return;
  // Não grava no localStorage — só tira o tema do CRM da superfície pública.
  applyTheme("light");
}

export function syncSurfaceForPath(pathname: string) {
  if (isPublicSurfacePath(pathname)) {
    activatePublicSurface();
  } else {
    activateCrmSurface();
  }
}
