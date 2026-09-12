import { useEffect, useState } from "react";
import { fetchFunilAtivo, type Funil } from "@/lib/funis-api";

export const ATRASO_LIBERACAO_NAV_EVENT = "atraso-liberacao-nav";

export function shouldHideCacaLeadNav(funil: {
  atrasoLiberacaoAtiva?: boolean;
  atrasoLiberacaoDestino?: string | null;
} | null): boolean {
  return (
    funil?.atrasoLiberacaoAtiva === true &&
    funil?.atrasoLiberacaoDestino === "retrabalho"
  );
}

export function notifyAtrasoLiberacaoNav(
  funil: Pick<Funil, "atrasoLiberacaoAtiva" | "atrasoLiberacaoDestino">,
) {
  window.dispatchEvent(
    new CustomEvent(ATRASO_LIBERACAO_NAV_EVENT, { detail: funil }),
  );
}

/** Caça-lead some do menu quando a automação está em Retrabalho. */
export function useHideCacaLeadNav() {
  const [hide, setHide] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchFunilAtivo("comercial")
      .then((funil) => {
        if (!cancelled) setHide(shouldHideCacaLeadNav(funil));
      })
      .catch(() => {
        if (!cancelled) setHide(false);
      });

    const onEvent = (event: Event) => {
      const detail = (event as CustomEvent<Funil>).detail;
      if (detail) setHide(shouldHideCacaLeadNav(detail));
    };
    window.addEventListener(ATRASO_LIBERACAO_NAV_EVENT, onEvent);
    return () => {
      cancelled = true;
      window.removeEventListener(ATRASO_LIBERACAO_NAV_EVENT, onEvent);
    };
  }, []);

  return hide;
}
