import { createFileRoute } from "@tanstack/react-router";
import { type FormEvent, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import {
  fetchVitrineParceiro,
  indicarClienteParceiro,
  registrarInteresseParceiro,
} from "@/lib/parceiros-api";
import { toast } from "sonner";

export const Route = createFileRoute("/parceiros/imoveis")({
  ssr: false,
  component: ParceiroImoveisPage,
});

function ParceiroImoveisPage() {
  const [items, setItems] = useState<Awaited<ReturnType<typeof fetchVitrineParceiro>>>([]);
  const [loading, setLoading] = useState(true);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [imovelId, setImovelId] = useState("");

  useEffect(() => {
    void fetchVitrineParceiro()
      .then(setItems)
      .catch((err) => {
        toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar.");
      })
      .finally(() => setLoading(false));
  }, []);

  async function onIndicar(e: FormEvent) {
    e.preventDefault();
    try {
      await indicarClienteParceiro({
        nome,
        telefone,
        imovelId: imovelId || undefined,
      });
      toast.success("Indicação enviada à imobiliária.");
      setNome("");
      setTelefone("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível indicar.");
    }
  }

  if (loading) return <Loader2 className="h-4 w-4 animate-spin" />;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Imóveis liberados</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <article key={item.id} className="overflow-hidden rounded-2xl border bg-white">
            {item.fotoUrl ? (
              <img src={item.fotoUrl} alt="" className="h-40 w-full object-cover" />
            ) : (
              <div className="h-40 bg-slate-200" />
            )}
            <div className="space-y-2 p-4">
              <p className="text-xs text-slate-400">{item.imobiliaria}</p>
              <p className="font-medium">{item.endereco || item.tipo}</p>
              <p className="text-sm text-slate-500">
                {item.bairro} · {item.cidade}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setImovelId(item.id);
                  void registrarInteresseParceiro(item.id).then(() =>
                    toast.success("Interesse registrado."),
                  );
                }}
              >
                Tenho interesse
              </Button>
            </div>
          </article>
        ))}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum imóvel liberado nas suas parcerias ativas.</p>
      ) : null}
      <form onSubmit={(e) => void onIndicar(e)} className="max-w-md space-y-2 rounded-2xl border bg-white p-4">
        <p className="font-medium">Indicar cliente</p>
        <Input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        <Input placeholder="Telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} required />
        <Button type="submit">Enviar indicação</Button>
      </form>
    </div>
  );
}
