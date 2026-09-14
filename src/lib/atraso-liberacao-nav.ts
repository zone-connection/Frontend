import { useEffect, useState } from "react";
import { fetchFunilAtivo, type Funil } from "@/lib/funis-api";

export const ATRASO_LIBERACAO_NAV_EVENT = "atraso-liberacao-nav";

export function isCacaLeadEnabled(funil: {
  atrasoLiberacaoAtiva?: boolean;
  atrasoLiberacaoDestino?: string | null;
} | null): boolean {
  return (
    funil?.atrasoLiberacaoAtiva === true &&
    funil?.atrasoLiberacaoDestino === "caca_lead"
  );
}

/** Some do menu quando o admin desativa o Caça-lead nas automações. */
export function shouldHideCacaLeadNav(funil: {
  atrasoLiberacaoAtiva?: boolean;
  atrasoLiberacaoDestino?: string | null;
} | null): boolean {
  return !isCacaLeadEnabled(funil);
}

export function notifyAtrasoLiberacaoNav(
  funil: Pick<Funil, "atrasoLiberacaoAtiva" | "atrasoLiberacaoDestino">,
) {
  window.dispatchEvent(
    new CustomEvent(ATRASO_LIBERACAO_NAV_EVENT, { detail: funil }),
  );
}

/** Caça-lead some do menu para todo o tenant quando a automação não está em Caça-lead. */
export function useHideCacaLeadNav() {
  const [hide, setHide] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchFunilAtivo("comercial")
      .then((funil) => {
        if (!cancelled) {
          setHide(shouldHideCacaLeadNav(funil));
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHide(false);
          setReady(true);
        }
      });

    const onEvent = (event: Event) => {
      const detail = (event as CustomEvent<Funil>).detail;
      if (detail) {
        setHide(shouldHideCacaLeadNav(detail));
        setReady(true);
      }
    };
    window.addEventListener(ATRASO_LIBERACAO_NAV_EVENT, onEvent);
    const poll = window.setInterval(() => {
      void fetchFunilAtivo("comercial")
        .then((funil) => {
          if (!cancelled) {
            setHide(shouldHideCacaLeadNav(funil));
            setReady(true);
          }
        })
        .catch(() => {
          /* mantém o último estado conhecido */
        });
    }, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
      window.removeEventListener(ATRASO_LIBERACAO_NAV_EVENT, onEvent);
    };
  }, []);

  return { hide, ready };
}
