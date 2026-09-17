import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useLayoutEffect, type ReactNode } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/sonner";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { GoogleAnalytics } from "@/components/google-analytics";

import "../styles.css";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { syncSurfaceForPath } from "../lib/crm-surface";
import {
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_HEIGHT,
  DEFAULT_OG_IMAGE_WIDTH,
  SITE_NAME,
  absoluteUrl,
} from "@/marketing/seo";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Página não encontrada
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Ir para o início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Esta página não carregou
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo deu errado. Tente novamente ou volte para o início.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Ir para o início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    pendingMs: 0,
    pendingMinMs: 0,
    head: () => {
      const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
      let apiOrigin = "";
      try {
        if (apiUrl && /^https?:\/\//i.test(apiUrl)) {
          apiOrigin = new URL(apiUrl).origin;
        }
      } catch {
        // ignore invalid VITE_API_URL
      }

      const connectSrc = [
        "'self'",
        "http://127.0.0.1:3333",
        "http://localhost:3333",
        "https://backend-wbxw.onrender.com",
        ...(apiOrigin ? [apiOrigin] : []),
        "https://www.google-analytics.com",
        "https://analytics.google.com",
        "https://www.googletagmanager.com",
        "https://region1.google-analytics.com",
        "https://stats.g.doubleclick.net",
        "https://www.google.com",
        "https://www.google.com.br",
        "https://www.googleadservices.com",
        "ws://localhost:8080",
        "ws://127.0.0.1:8080",
        "wss:",
      ].join(" ");

      return {
        links: [
          { rel: "preconnect", href: "https://fonts.googleapis.com" },
          {
            rel: "preconnect",
            href: "https://fonts.gstatic.com",
            crossOrigin: "anonymous",
          },
          {
            rel: "preconnect",
            href: "https://www.googletagmanager.com",
          },
          {
            rel: "stylesheet",
            href: "https://fonts.googleapis.com/css2?family=Blinker:wght@300;400;600;700;800&display=swap",
          },
          {
            rel: "icon",
            href: "/favicon-96x96.png?v=11",
            type: "image/png",
            sizes: "96x96",
          },
          { rel: "icon", href: "/favicon.svg?v=11", type: "image/svg+xml" },
          { rel: "icon", href: "/favicon.ico?v=11", sizes: "any" },
          {
            rel: "apple-touch-icon",
            href: "/apple-touch-icon.png?v=11",
            sizes: "180x180",
          },
          { rel: "manifest", href: "/site.webmanifest" },
        ],
        // CSP do frontend: bloqueia scripts/iframes de terceiros (mitigação XSS).
        // 'unsafe-inline' no script-src só cobre o bootstrap de tema acima — sem eval.
        meta: [
          { charSet: "utf-8" },
          { name: "viewport", content: "width=device-width, initial-scale=1" },
          {
            title:
              "Zone Connection | CRM, IA no WhatsApp e Sites para Imobiliárias",
          },
          {
            name: "description",
            content:
              "Ecossistema Zone Connection: CRM imobiliário, IA para WhatsApp e sites/landing pages — gestão, atendimento e captação no mesmo lugar.",
          },
          { name: "author", content: "Zone Connection" },
          {
            name: "google-site-verification",
            content: "yift0QDya_7v9ye-6ucfkaKQIRZxrnOhPWxpNSkb83k",
          },
          {
            property: "og:title",
            content:
              "Zone Connection | CRM, IA no WhatsApp e Sites para Imobiliárias",
          },
          {
            property: "og:description",
            content:
              "Ecossistema Zone Connection: CRM imobiliário, IA para WhatsApp e sites/landing pages — gestão, atendimento e captação no mesmo lugar.",
          },
          { property: "og:type", content: "website" },
          { property: "og:image", content: absoluteUrl(DEFAULT_OG_IMAGE) },
          {
            property: "og:image:secure_url",
            content: absoluteUrl(DEFAULT_OG_IMAGE),
          },
          { property: "og:image:type", content: "image/png" },
          { property: "og:image:width", content: DEFAULT_OG_IMAGE_WIDTH },
          { property: "og:image:height", content: DEFAULT_OG_IMAGE_HEIGHT },
          { property: "og:image:alt", content: SITE_NAME },
          { name: "twitter:card", content: "summary_large_image" },
          { name: "twitter:image", content: absoluteUrl(DEFAULT_OG_IMAGE) },
          {
            // frame-ancestors NÃO funciona em <meta> — só em header HTTP (ver server.ts).
            httpEquiv: "Content-Security-Policy",
            content: [
              "default-src 'self'",
              "base-uri 'self'",
              "object-src 'none'",
              "form-action 'self'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' https://fonts.gstatic.com data:",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com",
              `connect-src ${connectSrc}`,
            ].join("; "),
          },
        ],
      };
    },
    shellComponent: RootShell,
    component: RootComponent,
    notFoundComponent: NotFoundComponent,
    errorComponent: ErrorComponent,
  },
);

function RootShell({ children }: { children: ReactNode }) {
  return (
    // suppressHydrationWarning: o script inline de tema abaixo pode adicionar
    // class="dark" e style.colorScheme antes do React hidratar — mismatch esperado.
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <HeadContent />
        <link
          rel="icon"
          type="image/png"
          href="/favicon-96x96.png?v=11"
          sizes="96x96"
        />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg?v=11" />
        <link rel="icon" href="/favicon.ico?v=11" sizes="any" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=location.pathname;var pub=p==="/"||p==="/login"||p==="/demonstracao"||p==="/termos"||p==="/privacidade"||p.indexOf("/produtos/")===0||p.indexOf("/portal")===0||p.indexOf("/parceiros")===0;if(pub){document.documentElement.classList.remove("dark");document.documentElement.style.colorScheme="light";return}var m=localStorage.getItem("crm_theme_zone_light_v1");if(!m){localStorage.setItem("crm_theme_zone_light_v1","1");localStorage.setItem("crm_theme","light")}var t=localStorage.getItem("crm_theme");if(t==="dark"){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark"}else{document.documentElement.classList.remove("dark");document.documentElement.style.colorScheme="light"}}catch(e){}})();`,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useLayoutEffect(() => {
    syncSurfaceForPath(pathname);
  }, [pathname]);

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <GoogleAnalytics />
        <Outlet />
        <CookieConsentBanner />
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </HelmetProvider>
  );
}
