import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import { baixar, enviarArquivo, ETAPA_LABEL, modelos, painel, type Painel } from "@/lib/rh-api";

export const Route = createFileRoute("/_app/rh/")({
  component: Page,
});

function inicioMes() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function Page() {
  const [de, setDe] = useState(inicioMes);
  const [ate, setAte] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<Painel | null>(null);
  const [erro, setErro] = useState("");
  const [lista, setLista] = useState<{ id: string; tipo: string; nome: string }[]>([]);

  async function carregar() {
    try {
      setErro("");
      setData(await painel(de, ate));
      setLista(await modelos());
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Não foi possível carregar o painel.");
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  const k = data?.indicadores;
  const cards = k
    ? [
        ["Candidatos em processo", k.emProcesso],
        ["Entrevistas agendadas", k.entrevistas],
        ["Contratações no período", k.contratacoes],
        ["Corretores ativos", k.corretoresAtivos],
        ["Desistentes ou reprovados", k.encerrados],
        ["Vendas da equipe", k.vendas],
      ]
    : [];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Visão geral" description="Indicadores do recrutamento e da equipe." />
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-muted-foreground">
          De
          <Input type="date" value={de} onChange={(e) => setDe(e.target.value)} />
        </label>
        <label className="text-xs text-muted-foreground">
          Até
          <Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
        </label>
        <Button type="button" onClick={() => void carregar()}>
          Filtrar
        </Button>
      </div>
      {erro ? <p className="text-sm text-destructive">{erro}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Bloco titulo="Próximos compromissos">
          {data?.proximos.map((item) => (
            <li key={item.id}>
              {new Date(item.startsAt).toLocaleString("pt-BR")} — {item.titulo}
              {item.rhCandidato ? ` · ${item.rhCandidato.nome}` : ""}
              {item.rhUser ? ` · ${item.rhUser.name}` : ""}
            </li>
          ))}
        </Bloco>
        <Bloco titulo="Precisam de acompanhamento">
          {data?.parados.map((item) => (
            <li key={item.id}>
              {item.nome} · {ETAPA_LABEL[item.etapa]}
            </li>
          ))}
        </Bloco>
        <Bloco titulo="Contratações recentes">
          {data?.contratacoesRecentes.map((item) => (
            <li key={item.id}>{item.nome}</li>
          ))}
        </Bloco>
        <Bloco titulo="Desempenho da equipe no período">
          {data?.desempenho.map((item) => (
            <li key={item.userId}>
              {item.nome}: {item.vendas} venda(s)
            </li>
          ))}
        </Bloco>
      </div>
      <section className="rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">Modelos de contrato</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Valide o texto juridicamente antes de usar. Com CRECI e sem CRECI são modelos distintos.
        </p>
        <form
          className="mb-3 flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const arquivo = (form.elements.namedItem("arquivo") as HTMLInputElement).files?.[0];
            const nome = (form.elements.namedItem("nome") as HTMLInputElement).value;
            const tipo = (form.elements.namedItem("tipo") as HTMLSelectElement).value;
            if (!arquivo) return;
            void enviarArquivo("/rh/modelos", arquivo, { nome, tipo }).then(() => carregar());
            form.reset();
          }}
        >
          <Input name="nome" placeholder="Nome do modelo" required className="max-w-xs" />
          <select name="tipo" className="h-10 rounded-lg border bg-background px-2 text-sm">
            <option value="com_creci">Com CRECI</option>
            <option value="sem_creci">Sem CRECI</option>
          </select>
          <Input name="arquivo" type="file" accept=".pdf,.docx" required className="max-w-xs" />
          <Button type="submit">Enviar modelo</Button>
        </form>
        <ul className="space-y-1 text-sm">
          {lista.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="text-[#079ED4] underline"
                onClick={() =>
                  void baixar(`/rh/modelos/${item.id}`).then(({ blob, filename }) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = filename || item.nome;
                    a.click();
                    URL.revokeObjectURL(url);
                  })
                }
              >
                {item.nome}
              </button>
              <span className="text-muted-foreground"> · {item.tipo === "com_creci" ? "com CRECI" : "sem CRECI"}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-4">
      <h2 className="mb-2 text-sm font-semibold">{titulo}</h2>
      <ul className="space-y-1 text-sm text-muted-foreground">{children}</ul>
    </section>
  );
}
