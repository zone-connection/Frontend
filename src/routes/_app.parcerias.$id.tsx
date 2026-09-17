import { createFileRoute, Link } from "@tanstack/react-router";
import { type FormEvent, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import {
  criarRepasseParceria,
  fetchParceria,
  updateParceria,
} from "@/lib/parcerias-api";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/parcerias/$id")({
  component: ParceriaDetalhePage,
});

function ParceriaDetalhePage() {
  const { id } = Route.useParams();
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchParceria>> | null>(null);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");

  async function load() {
    try {
      setData(await fetchParceria(id));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar.");
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function onRepasse(e: FormEvent) {
    e.preventDefault();
    try {
      await criarRepasseParceria(id, {
        descricao,
        valor: Number(valor.replace(",", ".")),
        status: "devida",
      });
      setDescricao("");
      setValor("");
      toast.success("Repasse registrado.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Falha ao registrar.");
    }
  }

  if (!data) return <Loader2 className="h-4 w-4 animate-spin" />;

  return (
    <div className="space-y-6 p-1">
      <Link to="/parcerias/visao-geral" className="text-sm text-primary hover:underline">
        ← Parcerias
      </Link>
      <div>
        <h1 className="text-xl font-semibold">{data.parceiro.nome}</h1>
        <p className="text-sm text-muted-foreground">
          {data.parceiro.email} · CRECI {data.parceiro.creci || "—"} · {data.status}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {data.status === "convite" ? (
          <Button size="sm" onClick={() => void updateParceria(id, { status: "ativa" }).then(load)}>
            Ativar
          </Button>
        ) : null}
        {data.status === "ativa" ? (
          <Button size="sm" variant="outline" onClick={() => void updateParceria(id, { status: "suspensa" }).then(load)}>
            Suspender
          </Button>
        ) : null}
        {data.status !== "encerrada" ? (
          <Button size="sm" variant="destructive" onClick={() => void updateParceria(id, { status: "encerrada" }).then(load)}>
            Encerrar
          </Button>
        ) : null}
      </div>
      <section>
        <h2 className="mb-2 font-medium">Interesses nos imóveis</h2>
        {data.interesses.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum interesse ainda.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {data.interesses.map((item) => (
              <li key={item.id}>
                {item.imovel.logradouro} · {item.imovel.bairro} — {item.mensagem || "sem recado"}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="mb-2 font-medium">Oportunidades (leads)</h2>
        {data.participacoes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Compartilhe um lead pela API ou cadastre o ID depois; o parceiro vê só o essencial até aceitar.
          </p>
        ) : (
          <ul className="space-y-1 text-sm">
            {data.participacoes.map((item) => (
              <li key={item.id}>
                {item.lead.nome} · {item.lead.stage} · {item.status}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="mb-2 font-medium">Repasses</h2>
        <form onSubmit={(e) => void onRepasse(e)} className="mb-3 flex flex-wrap gap-2">
          <div>
            <Label className="sr-only">Descrição</Label>
            <Input placeholder="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} required />
          </div>
          <div>
            <Label className="sr-only">Valor</Label>
            <Input placeholder="Valor" value={valor} onChange={(e) => setValor(e.target.value)} required />
          </div>
          <Button type="submit">Registrar</Button>
        </form>
        <ul className="space-y-1 text-sm">
          {data.repasses.map((item) => (
            <li key={item.id}>
              {item.descricao} · {Number(item.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} · {item.status}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="mb-2 font-medium">Histórico</h2>
        <ol className="space-y-1 text-sm text-muted-foreground">
          {data.eventos.map((item) => (
            <li key={item.id}>
              {new Date(item.createdAt).toLocaleString("pt-BR")} — {item.texto}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
