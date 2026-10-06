import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PortalEmpty, PortalImovelCard, PortalPageTitle } from "@/components/portal-ui";
import { ApiError } from "@/lib/api";
import { fetchPortalDashboard, type PortalImovelListItem } from "@/lib/portal-api";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/negociacoes")({
  ssr: false,
  component: PortalNegociacoesPage,
});

function PortalNegociacoesPage() {
  const [items, setItems] = useState<PortalImovelListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchPortalDashboard()
      .then((data) =>
        setItems(data.imoveis.filter((imovel) => imovel.situacao === "negociacao")),
      )
      .catch((err) => {
        toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PortalPageTitle
        title="Negociações"
        subtitle="Imóveis com proposta ou reserva em andamento."
      />
      {items.length === 0 ? (
        <PortalEmpty>Nenhuma negociação aberta agora.</PortalEmpty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((imovel) => (
            <PortalImovelCard key={imovel.id} imovel={imovel} compact />
          ))}
        </div>
      )}
    </div>
  );
}
