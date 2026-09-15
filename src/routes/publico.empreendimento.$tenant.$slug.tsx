import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PublicoEmpreendimentoView } from "@/components/publico-empreendimento-view";
import { ApiError } from "@/lib/api";
import {
  fetchEmpreendimentoPublico,
  type EmpreendimentoPublico,
} from "@/lib/empreendimentos-api";
import { absoluteUrl } from "@/marketing/seo";

export const Route = createFileRoute("/publico/empreendimento/$tenant/$slug")({
  ssr: false,
  head: ({ params }) => ({
    meta: [
      { title: "Empreendimento — Zone Connection" },
      {
        name: "description",
        content: "Galeria do empreendimento compartilhado pela imobiliária.",
      },
      {
        property: "og:url",
        content: absoluteUrl(
          `/publico/empreendimento/${params.tenant}/${params.slug}`,
        ),
      },
    ],
  }),
  component: PublicoEmpreendimentoSlugPage,
});

function PublicoEmpreendimentoSlugPage() {
  const { tenant, slug } = Route.useParams();
  const [item, setItem] = useState<EmpreendimentoPublico | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    void fetchEmpreendimentoPublico(tenant, slug)
      .then(setItem)
      .catch((err) => {
        setItem(null);
        setError(
          err instanceof ApiError
            ? err.message
            : "Não foi possível abrir este empreendimento.",
        );
      })
      .finally(() => setLoading(false));
  }, [tenant, slug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-center text-white">
        <p className="text-sm text-zinc-400">{error}</p>
      </div>
    );
  }

  return <PublicoEmpreendimentoView item={item} />;
}
