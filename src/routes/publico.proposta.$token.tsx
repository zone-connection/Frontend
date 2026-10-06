import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PublicoPropostaView } from "@/components/publico-proposta-view";
import { ApiError } from "@/lib/api";
import {
  fetchPropostaPublica,
  type PropostaPublicaResumo,
} from "@/lib/proposta-publica-api";
import { absoluteUrl } from "@/marketing/seo";

export const Route = createFileRoute("/publico/proposta/$token")({
  ssr: false,
  head: ({ params }) => ({
    meta: [
      { title: "Proposta — Zone Connection" },
      {
        name: "description",
        content: "Envie uma proposta comercial para este imóvel.",
      },
      {
        property: "og:url",
        content: absoluteUrl(`/publico/proposta/${params.token}`),
      },
    ],
  }),
  component: PublicoPropostaPage,
});

function PublicoPropostaPage() {
  const { token } = Route.useParams();
  const [item, setItem] = useState<PropostaPublicaResumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    void fetchPropostaPublica(token)
      .then(setItem)
      .catch((err) => {
        setError(
          err instanceof ApiError ? err.message : "Link inválido ou inativo.",
        );
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando…
      </div>
    );
  }
  if (error || !item) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center text-sm text-slate-600">
        {error ?? "Não foi possível abrir esta proposta."}
      </div>
    );
  }
  return <PublicoPropostaView item={item} />;
}
