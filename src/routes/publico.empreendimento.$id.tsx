import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ApiError } from "@/lib/api";
import { fetchEmpreendimentoPublicoById } from "@/lib/empreendimentos-api";

export const Route = createFileRoute("/publico/empreendimento/$id")({
  ssr: false,
  component: PublicoEmpreendimentoIdRedirect,
});

function PublicoEmpreendimentoIdRedirect() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchEmpreendimentoPublicoById(id)
      .then((item) => {
        void navigate({
          to: "/publico/empreendimento/$tenant/$slug",
          params: { tenant: item.tenantSlug, slug: item.slug },
          replace: true,
        });
      })
      .catch((err) => {
        setError(
          err instanceof ApiError
            ? err.message
            : "Não foi possível abrir este empreendimento.",
        );
      });
  }, [id, navigate]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-center text-white">
        <p className="text-sm text-zinc-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
      <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
    </div>
  );
}
