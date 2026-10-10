import { useEffect, useRef, useState } from "react";

const SCRIPT_ID = "cf-turnstile-script";
const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export function turnstileSiteKey(): string {
  return (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim() ?? "";
}

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    const script = existing ?? document.createElement("script");
    const done = () => {
      if (window.turnstile) resolve(window.turnstile);
      else reject(new Error("Turnstile não carregou."));
    };
    script.addEventListener("load", done, { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Turnstile não carregou.")),
      { once: true },
    );
    if (!existing) {
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    } else if (window.turnstile) {
      done();
    }
  });
}

export function TurnstileWidget({
  resetKey,
  onToken,
}: {
  resetKey: number;
  onToken: (token: string | null) => void;
}) {
  const siteKey = turnstileSiteKey();
  const hostRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const [failed, setFailed] = useState(false);
  onTokenRef.current = onToken;

  useEffect(() => {
    if (!siteKey || !hostRef.current) return;
    let cancelled = false;
    setFailed(false);
    void loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !hostRef.current) return;
        if (widgetId.current) {
          turnstile.remove(widgetId.current);
          widgetId.current = null;
        }
        widgetId.current = turnstile.render(hostRef.current, {
          sitekey: siteKey,
          callback: (token) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => onTokenRef.current(null),
        });
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          onTokenRef.current(null);
        }
      });
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, [siteKey, resetKey]);

  if (!siteKey) return null;

  return (
    <div className="min-h-[65px]">
      <div ref={hostRef} />
      {failed ? (
        <p className="text-sm text-text-muted">
          Não foi possível carregar a verificação de segurança. Atualize a página.
        </p>
      ) : null}
    </div>
  );
}
