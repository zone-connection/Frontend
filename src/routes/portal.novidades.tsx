import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PortalEmpty, PortalPageTitle } from "@/components/portal-ui";
import { ApiError } from "@/lib/api";
import {
  countNovidadesNaoLidas,
  fetchPortalNovidades,
  marcarPortalNovidadesLidas,
  type PortalNovidade,
} from "@/lib/portal-api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/novidades")({
  ssr: false,
  component: PortalNovidadesPage,
});

function PortalNovidadesPage() {
  const [items, setItems] = useState<PortalNovidade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchPortalNovidades()
      .then(setItems)
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
          title="Novidades"
          subtitle="O que aconteceu nos seus imóveis nos últimos 14 dias."
          actions={
            countNovidadesNaoLidas(items) > 0 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void marcarPortalNovidadesLidas()
                    .then(setItems)
                    .catch((err) => {
                      toast.error(
                        err instanceof ApiError
                          ? err.message
                          : "Não foi possível marcar como lidas.",
                      );
                    });
                }}
              >
                Marcar como lidas
              </Button>
            ) : undefined
          }
        />
      {items.length === 0 ? (
        <PortalEmpty>Nenhuma novidade no período.</PortalEmpty>
      ) : (
        <ol className="space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                to="/portal/imoveis/$id"
                params={{ id: item.imovelId }}
                className="block rounded-xl border bg-card p-4 hover:border-primary/30"
              >
                <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  {item.lida !== true ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  ) : null}
                  {new Date(item.createdAt).toLocaleDateString("pt-BR")} · {item.identificacao}
                </p>
                <p className="mt-1 text-sm">{item.texto}</p>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
