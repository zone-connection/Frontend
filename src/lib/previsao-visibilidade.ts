import { useEffect, useState } from "react";
import { getSession } from "@/lib/auth";

/** Admin e super admin sempre veem. Os demais seguem a configuração do tenant. */
export function mostrarDatasPrevisao(): boolean {
  const session = getSession();
  if (!session) return true;
  if (session.role === "admin" || session.role === "super_admin") return true;
  return session.tenant?.exibirPrevisaoSubordinados !== false;
}

export function useMostrarDatasPrevisao(): boolean {
  const [visivel, setVisivel] = useState(mostrarDatasPrevisao);
  useEffect(() => {
    const sync = () => setVisivel(mostrarDatasPrevisao());
    sync();
    window.addEventListener("crm-session-updated", sync);
    return () => window.removeEventListener("crm-session-updated", sync);
  }, []);
  return visivel;
}
