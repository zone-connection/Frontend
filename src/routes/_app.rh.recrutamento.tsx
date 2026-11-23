import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api";
import {
  converterCandidato,
  criarCandidato,
  ETAPAS,
  ETAPA_LABEL,
  getCandidato,
  listCandidatos,
  moverCandidato,
  type Candidato,
  type RhEtapa,
} from "@/lib/rh-api";

export const Route = createFileRoute("/_app/rh/recrutamento")({
  component: Page,
});

function Page() {
  const [itens, setItens] = useState<Candidato[]>([]);
  const [erro, setErro] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);
  const [ficha, setFicha] = useState<Awaited<ReturnType<typeof getCandidato>> | null>(null);
  const [senha, setSenha] = useState("");
  const [motivo, setMotivo] = useState("");

  async function carregar() {
    try {
      setItens(await listCandidatos());
      setErro("");
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : "Falha ao carregar candidatos.");
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  async function abrir(id: string) {
    setAberto(id);
    setFicha(await getCandidato(id));
  }

  async function soltar(etapa: RhEtapa, id: string) {
    await moverCandidato(id, etapa);
    await carregar();
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Recrutamento" description="Arraste o candidato entre as etapas." />
      {erro ? <p className="text-sm text-destructive">{erro}</p> : null}
      <form
        className="grid gap-2 rounded-xl border bg-card p-4 md:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const data = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
          void criarCandidato(data).then(() => {
            form.reset();
            return carregar();
          });
        }}
      >
        <Input name="nome" placeholder="Nome completo" required />
        <Input name="telefone" placeholder="Telefone" />
        <Input name="email" placeholder="E-mail" type="email" />
        <Input name="creci" placeholder="CRECI (opcional)" />
        <Input name="entradaEm" type="date" />
        <Textarea name="experiencia" placeholder="Experiência" className="md:col-span-2" />
        <Textarea name="observacoes" placeholder="Observações" />
        <Button type="submit" className="md:col-span-3 w-fit">
          Cadastrar candidato
        </Button>
      </form>
      <div className="grid gap-3 xl:grid-cols-6">
        {ETAPAS.map((coluna) => (
          <div
            key={coluna.id}
            className="min-h-40 rounded-xl border bg-muted/40 p-2"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const id = e.dataTransfer.getData("text/plain");
              if (id) void soltar(coluna.id, id);
            }}
          >
            <p className="mb-2 text-xs font-semibold">{coluna.label}</p>
            {itens
              .filter((item) => item.etapa === coluna.id)
              .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", item.id)}
                  onClick={() => void abrir(item.id)}
                  className="mb-2 w-full rounded-lg border bg-card p-2 text-left text-sm"
                >
                  <span className="font-medium">{item.nome}</span>
                  <span className="block text-xs text-muted-foreground">{item.telefone || item.email}</span>
                </button>
              ))}
          </div>
        ))}
      </div>
      {ficha && aberto ? (
        <section className="rounded-xl border bg-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">{ficha.nome}</h2>
            <Button type="button" variant="outline" onClick={() => setAberto(null)}>
              Fechar
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {ETAPA_LABEL[ficha.etapa]} · {ficha.email} · {ficha.telefone}
            {ficha.creci ? ` · CRECI ${ficha.creci}` : ""}
          </p>
          <p className="mt-2 text-sm">{ficha.experiencia}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void moverCandidato(ficha.id, "desistente", motivo || "Desistência").then(() =>
                  abrir(ficha.id).then(carregar),
                )
              }
            >
              Desistente
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void moverCandidato(ficha.id, "reprovado", motivo || "Reprovado").then(() =>
                  abrir(ficha.id).then(carregar),
                )
              }
            >
              Reprovado
            </Button>
            <Input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Motivo do encerramento"
              className="max-w-xs"
            />
          </div>
          {!ficha.userId ? (
            <form
              className="mt-3 flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                void converterCandidato(ficha.id, senha, ficha.email || undefined).then(() =>
                  abrir(ficha.id).then(carregar),
                );
              }}
            >
              <Input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Senha inicial do usuário"
                required
                minLength={8}
                className="max-w-xs"
              />
              <Button type="submit">Converter em usuário</Button>
            </form>
          ) : (
            <p className="mt-3 text-sm">Vinculado ao usuário {ficha.user?.name}.</p>
          )}
          <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
            {ficha.historico.map((h) => (
              <li key={h.id}>
                {new Date(h.createdAt).toLocaleString("pt-BR")} · {ETAPA_LABEL[h.paraEtapa]}
                {h.motivo ? ` · ${h.motivo}` : ""}
                {h.autor ? ` · ${h.autor.name}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
