import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ApiError } from "@/lib/api";
import { fetchRepassesParceiro } from "@/lib/parceiros-api";
import { toast } from "sonner";

export const Route = createFileRoute("/parceiros/repasses")({
  ssr: false,
  component: ParceiroRepassesPage,
});

function ParceiroRepassesPage() {
  const [items, setItems] = useState<Awaited<ReturnType<typeof fetchRepassesParceiro>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchRepassesParceiro()
      .then(setItems)
      .catch((err) => {
        toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader2 className="h-4 w-4 animate-spin" />;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Seus repasses</h1>
      {items.map((item) => (
        <div key={item.id} className="flex justify-between rounded-2xl border bg-white p-4 text-sm">
          <div>
            <p className="font-medium">{item.descricao}</p>
            <p className="text-slate-500">{item.parceria.tenant.name} · {item.status}</p>
          </div>
          <p className="font-semibold">
            {Number(item.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        </div>
      ))}
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum repasse lançado ainda.</p>
      ) : null}
    </div>
  );
}
