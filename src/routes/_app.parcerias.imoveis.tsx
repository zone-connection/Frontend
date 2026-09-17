import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { ApiError } from "@/lib/api";
import { fetchParceriaImoveis, setImovelParceria } from "@/lib/parcerias-api";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/parcerias/imoveis")({
  component: ParceriaImoveisPage,
});

function ParceriaImoveisPage() {
  const [items, setItems] = useState<Awaited<ReturnType<typeof fetchParceriaImoveis>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchParceriaImoveis()
      .then(setItems)
      .catch((err) => {
        toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar.");
      })
      .finally(() => setLoading(false));
  }, []);

  async function toggle(id: string, liberado: boolean) {
    try {
      const saved = await setImovelParceria(id, liberado);
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, liberadoParaParceria: saved.liberadoParaParceria } : item,
        ),
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível atualizar.");
    }
  }

  if (loading) return <Loader2 className="h-4 w-4 animate-spin" />;

  return (
    <div className="space-y-4 p-1">
      <div>
        <h1 className="text-xl font-semibold">Vitrine para parceiros</h1>
        <p className="text-sm text-muted-foreground">
          Imóveis liberados aparecem no portal sem dados do proprietário.
        </p>
      </div>
      <div className="divide-y rounded-xl border">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-sm font-medium">
                {item.logradouro} {item.numero} · {item.bairro}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.cidade} · {item._count.interessesParceria} interesse(s)
              </p>
            </div>
            <Switch
              checked={item.liberadoParaParceria}
              onCheckedChange={(v) => void toggle(item.id, v)}
            />
          </div>
        ))}
        {items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Cadastre imóveis na captação para liberar na vitrine.
          </p>
        ) : null}
      </div>
    </div>
  );
}
