import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { aceitarParceria, fetchMinhasParcerias } from "@/lib/parceiros-api";
import { toast } from "sonner";

export const Route = createFileRoute("/parceiros/")({
  ssr: false,
  component: ParceirosHomePage,
});

function ParceirosHomePage() {
  const [items, setItems] = useState<Awaited<ReturnType<typeof fetchMinhasParcerias>>>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setItems(await fetchMinhasParcerias());
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (loading) return <Loader2 className="h-4 w-4 animate-spin" />;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-[#12343d]">Suas parcerias</h1>
      {items.map((item) => (
        <div key={item.id} className="rounded-2xl border bg-white p-4">
          <p className="font-medium">{item.tenant.name}</p>
          <p className="text-sm text-slate-500">
            Status: {item.status} · split {Number(item.percentualParceiro)}%
          </p>
          {item.status === "convite" ? (
            <Button className="mt-3" size="sm" onClick={() => void aceitarParceria(item.id).then(load)}>
              Aceitar convite
            </Button>
          ) : null}
        </div>
      ))}
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum convite ainda. Peça à imobiliária para te convidar.</p>
      ) : null}
      <Link to="/parceiros/imoveis" className="text-sm text-[#0d7a8c] hover:underline">
        Ver imóveis liberados →
      </Link>
    </div>
  );
}
