import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { fetchEmpreendimento, type Empreendimento } from "@/lib/empreendimentos-api";
import { fetchOruloComercial, type OruloComercial } from "@/lib/orulo-api";
import { EmpreendimentoDetalhe } from "@/components/empreendimento-detalhe";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/imoveis_/$id")({
  head: () => ({ meta: [{ title: "Imóvel — Zone Connection" }] }),
  component: EmpreendimentoDetalhePage,
});

function EmpreendimentoDetalhePage() {
  const { id } = Route.useParams();
  const [item, setItem] = useState<Empreendimento | null>(null);
  const [comercial, setComercial] = useState<OruloComercial | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void fetchEmpreendimento(id)
      .then((next) => {
        setItem(next);
        if (next.oruloBuildingId) {
          void fetchOruloComercial(next.id)
            .then(setComercial)
            .catch(() => setComercial(null));
        } else {
          setComercial(null);
        }
      })
      .catch((err) => {
        setItem(null);
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Não foi possível carregar o imóvel.",
        );
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando ficha…
      </div>
    );
  }

  if (!item) {
    return (
      <div className="space-y-3 py-16">
        <p className="text-sm text-muted-foreground">
          Não foi possível abrir este imóvel.
        </p>
        <Button asChild variant="outline" size="sm" className="rounded-full">
          <Link to="/imoveis">Voltar ao catálogo</Link>
        </Button>
      </div>
    );
  }

  return <EmpreendimentoDetalhe item={item} comercial={comercial} />;
}
