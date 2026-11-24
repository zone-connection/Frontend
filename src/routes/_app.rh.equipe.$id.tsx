import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  baixar,
  criarCompromisso,
  criarTreinamento,
  desligar,
  enviarArquivo,
  ETAPA_LABEL,
  getFicha,
  type Ficha,
} from "@/lib/rh-api";

export const Route = createFileRoute("/_app/rh/equipe/$id")({
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [motivo, setMotivo] = useState("");

  async function carregar() {
    setFicha(await getFicha(id));
  }

  useEffect(() => {
    void carregar();
  }, [id]);

  if (!ficha) return <p className="text-sm text-muted-foreground">Carregando ficha…</p>;
  const c = ficha.corretor;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={c.name} description={c.creci ? `CRECI ${c.creci}` : "Sem CRECI"} />
      <section className="rounded-2xl border border-[#9DCEF5] bg-gradient-to-br from-[#D3ECFE] to-[#F4F9FE] p-4 text-sm">
        <p>{c.email}</p>
        <p>{c.phone}</p>
        <p>Situação: {c.status}</p>
        {c.desligadoEm ? (
          <p>
            Desligado em {new Date(c.desligadoEm).toLocaleDateString("pt-BR")}: {c.desligamentoMotivo}
            {c.desligadoPor ? ` · ${c.desligadoPor.name}` : ""}
          </p>
        ) : (
          <form
            className="mt-2 flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void desligar(c.id, motivo).then(carregar);
            }}
          >
            <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo do desligamento" required />
            <Button type="submit" variant="outline">
              Desligar e desativar acesso
            </Button>
          </form>
        )}
      </section>
      <section className="rounded-2xl border border-[#D0BEF5] bg-gradient-to-br from-[#E6DBFF] to-[#F8F5FF] p-4">
        <h2 className="mb-2 text-sm font-semibold">Documentos</h2>
        <form
          className="mb-2 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const arquivo = (form.elements.namedItem("arquivo") as HTMLInputElement).files?.[0];
            const nome = (form.elements.namedItem("nome") as HTMLInputElement).value;
            if (!arquivo) return;
            void enviarArquivo("/rh/documentos", arquivo, { nome, userId: c.id }).then(() => {
              form.reset();
              return carregar();
            });
          }}
        >
          <Input name="nome" placeholder="Nome do documento" required className="max-w-xs" />
          <Input name="arquivo" type="file" accept=".pdf,.docx" required className="max-w-xs" />
          <Button type="submit">Anexar</Button>
        </form>
        <ul className="text-sm">
          {ficha.documentos.map((doc) => (
            <li key={doc.id}>
              <button
                type="button"
                className="text-[#079ED4] underline"
                onClick={() =>
                  void baixar(`/rh/documentos/${doc.id}`).then(({ blob, filename }) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = filename || doc.nomeArquivo;
                    a.click();
                    URL.revokeObjectURL(url);
                  })
                }
              >
                {doc.nome}
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border border-[#8ED9B0] bg-gradient-to-br from-[#CFF6E0] to-[#F3FBF6] p-4">
        <h2 className="mb-2 text-sm font-semibold">Treinamentos</h2>
        <form
          className="mb-2 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const titulo = (form.elements.namedItem("titulo") as HTMLInputElement).value;
            const data = (form.elements.namedItem("data") as HTMLInputElement).value;
            const observacoes = (form.elements.namedItem("observacoes") as HTMLInputElement).value;
            void criarTreinamento({ titulo, data, observacoes, userId: c.id }).then(() => {
              form.reset();
              return carregar();
            });
          }}
        >
          <Input name="titulo" placeholder="Treinamento" required className="max-w-xs" />
          <Input name="data" type="date" required />
          <Input name="observacoes" placeholder="Observações" className="max-w-xs" />
          <Button type="submit">Registrar</Button>
        </form>
        <ul className="text-sm text-muted-foreground">
          {ficha.treinamentos.map((t) => (
            <li key={t.id}>
              {new Date(t.data).toLocaleDateString("pt-BR")} · {t.titulo}
              {t.observacoes ? ` · ${t.observacoes}` : ""}
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl border border-[#F5C48A] bg-gradient-to-br from-[#FFE4C4] to-[#FFF8F1] p-4 text-sm">
        <h2 className="mb-2 font-semibold">Desempenho</h2>
        <p>{ficha.vendas.avulsas.length} venda(s) avulsa(s)</p>
        <ul>
          {ficha.vendas.avulsas.map((v) => (
            <li key={v.id}>
              {v.clienteNome} · {new Date(v.dataVenda).toLocaleDateString("pt-BR")}
            </li>
          ))}
        </ul>
        <p className="mt-2">{ficha.vendas.propostas.length} proposta(s)</p>
        <ul>
          {ficha.vendas.propostas.map((p) => (
            <li key={p.id}>
              {p.codigo} · {p.clienteNome} · {p.status}
            </li>
          ))}
        </ul>
        <p className="mt-2">{ficha.vendas.fechamentos.length} fechamento(s) de usado</p>
      </section>
      <section className="rounded-2xl border border-[#8FD9CF] bg-gradient-to-br from-[#C9F4EC] to-[#F3FBFA] p-4">
        <h2 className="mb-2 text-sm font-semibold">Agenda e histórico</h2>
        <form
          className="mb-2 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const titulo = (form.elements.namedItem("titulo") as HTMLInputElement).value;
            const tipo = (form.elements.namedItem("tipo") as HTMLSelectElement).value;
            const startsAt = (form.elements.namedItem("startsAt") as HTMLInputElement).value;
            void criarCompromisso({ titulo, tipo, startsAt, userId: c.id }).then(() => {
              form.reset();
              return carregar();
            });
          }}
        >
          <Input name="titulo" placeholder="Compromisso" required className="max-w-xs" />
          <select name="tipo" className="h-10 rounded-lg border bg-background px-2 text-sm">
            <option value="entrevista">Entrevista</option>
            <option value="retorno">Retorno</option>
            <option value="reuniao">Reunião</option>
            <option value="documentos">Documentos</option>
            <option value="assinatura">Assinatura</option>
            <option value="treinamento">Treinamento</option>
            <option value="avaliacao">Avaliação</option>
          </select>
          <Input name="startsAt" type="datetime-local" required />
          <Button type="submit">Agendar</Button>
        </form>
        <ul className="text-sm text-muted-foreground">
          {ficha.agenda.map((a) => (
            <li key={a.id}>
              {new Date(a.startsAt).toLocaleString("pt-BR")} · {a.titulo} · {a.rhTipo}
            </li>
          ))}
          {ficha.historico.map((h) => (
            <li key={h.id}>
              {new Date(h.createdAt).toLocaleString("pt-BR")} · {ETAPA_LABEL[h.paraEtapa]}
              {h.motivo ? ` · ${h.motivo}` : ""}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
