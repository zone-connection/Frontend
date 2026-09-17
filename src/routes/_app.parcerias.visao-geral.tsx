import { createFileRoute, Link } from "@tanstack/react-router";
import { type FormEvent, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import {
  convidarParceiro,
  fetchParcerias,
  updateParceria,
  type ParceriaListItem,
} from "@/lib/parcerias-api";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/parcerias/visao-geral")({
  component: ParceriasPage,
});

const STATUS: Record<string, string> = {
  convite: "Convite",
  ativa: "Ativa",
  suspensa: "Suspensa",
  encerrada: "Encerrada",
};

function ParceriasPage() {
  const [items, setItems] = useState<ParceriaListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [creci, setCreci] = useState("");
  const [busy, setBusy] = useState(false);
  const [senha, setSenha] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setItems(await fetchParcerias());
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onInvite(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const created = await convidarParceiro({ email, nome, creci: creci || undefined });
      setSenha(created.senhaTemporaria ?? null);
      toast.success("Convite enviado.");
      setEmail("");
      setNome("");
      setCreci("");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível convidar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 p-1">
      <div>
        <h1 className="text-xl font-semibold">Corretores parceiros</h1>
        <p className="text-sm text-muted-foreground">
          Convide pelo e-mail. O corretor entra em /parceiros/login — sem acesso ao CRM.
        </p>
      </div>
      <form onSubmit={(e) => void onInvite(e)} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-4">
        <div className="space-y-1">
          <Label>Nome</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label>E-mail</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label>CRECI</Label>
          <Input value={creci} onChange={(e) => setCreci(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Convidar"}
          </Button>
        </div>
      </form>
      {senha ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
          Senha temporária (entregue agora): <span className="font-mono font-semibold">{senha}</span>
        </p>
      ) : null}
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2">Parceiro</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Split</th>
                <th className="px-3 py-2">Interesses</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-3 py-2">
                    <p className="font-medium">{item.parceiro.nome}</p>
                    <p className="text-xs text-muted-foreground">{item.parceiro.email}</p>
                  </td>
                  <td className="px-3 py-2">{STATUS[item.status] ?? item.status}</td>
                  <td className="px-3 py-2">{Number(item.percentualParceiro)}%</td>
                  <td className="px-3 py-2">{item._count.interesses}</td>
                  <td className="px-3 py-2 text-right">
                    <Link to="/parcerias/$id" params={{ id: item.id }} className="text-primary hover:underline">
                      Abrir
                    </Link>
                    {item.status === "ativa" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2"
                        onClick={() => {
                          void updateParceria(item.id, { status: "suspensa" }).then(load);
                        }}
                      >
                        Suspender
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                    Nenhuma parceria ainda.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
