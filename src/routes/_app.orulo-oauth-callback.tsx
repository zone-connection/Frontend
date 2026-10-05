import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ApiError } from "@/lib/api";
import { completeOruloOAuth } from "@/lib/orulo-api";
import { toast } from "sonner";

type CallbackSearch = {
  code?: string;
  state?: string;
  error?: string;
};

export const Route = createFileRoute("/_app/orulo-oauth-callback")({
  validateSearch: (search: Record<string, unknown>): CallbackSearch => ({
    code: typeof search.code === "string" ? search.code : undefined,
    state: typeof search.state === "string" ? search.state : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
  }),
  head: () => ({ meta: [{ title: "Órulo — Zone Connection" }] }),
  component: OruloOAuthCallbackPage,
});

function OruloOAuthCallbackPage() {
  const { code, state, error } = Route.useSearch();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Concluindo autorização da Órulo…");

  useEffect(() => {
    if (error) {
      toast.error("A autorização da Órulo foi recusada.");
      void navigate({ to: "/imoveis", replace: true });
      return;
    }
    if (!code) {
      setMessage("Código de autorização ausente.");
      void navigate({ to: "/imoveis", replace: true });
      return;
    }
    let cancelled = false;
    void completeOruloOAuth(code, state)
      .then((result) => {
        if (cancelled) return;
        toast.success(
          "Órulo autorizada. Dados comerciais abrem ao vivo na ficha.",
        );
        const target = result.returnTo?.startsWith("/")
          ? result.returnTo
          : "/imoveis";
        window.location.replace(target);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Não foi possível concluir a autorização Órulo.",
        );
        void navigate({ to: "/imoveis", replace: true });
      });
    return () => {
      cancelled = true;
    };
  }, [code, state, error, navigate]);

  return (
    <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {message}
    </div>
  );
}
