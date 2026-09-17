import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import {
  aceitarOportunidadeParceiro,
  fetchOportunidadesParceiro,
} from "@/lib/parceiros-api";
import { toast } from "sonner";

export const Route = createFileRoute("/parceiros/oportunidades")({
  ssr: false,
  component: ParceiroOportunidadesPage,
});

function ParceiroOportunidadesPage() {
  const [items, setItems] = useState<Awaited<ReturnType<typeof fetchOportunidadesParceiro>>>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setItems(await fetchOportunidadesParceiro());
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
      <h1 className="text-xl font-semibold">Oportunidades</h1>
      {items.map((item) => (
        <div key={item.id} className="rounded-2xl border bg-white p-4">
          <p className="text-xs text-slate-400">{item.imobiliaria}</p>
          <p className="font-medium">{item.lead.nome}</p>
          <p className="text-sm text-slate-500">
            {item.lead.cidade} · {item.status}
            {item.lead.telefone ? ` · ${item.lead.telefone}` : " · contato após aceitar"}
          </p>
          {item.status === "pendente" ? (
            <Button className="mt-2" size="sm" onClick={() => void aceitarOportunidadeParceiro(item.id).then(load)}>
              Aceitar e ver contato
            </Button>
          ) : null}
        </div>
      ))}
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhuma oportunidade compartilhada ainda.</p>
      ) : null}
    </div>
  );
}
