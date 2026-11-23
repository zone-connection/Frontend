import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { agenda, criarCompromisso, listCandidatos, listEquipe, type AgendaItem, type Candidato, type Corretor } from "@/lib/rh-api";

export const Route = createFileRoute("/_app/rh/agenda")({
  component: Page,
});

function Page() {
  const [itens, setItens] = useState<AgendaItem[]>([]);
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [equipe, setEquipe] = useState<Corretor[]>([]);

  function carregar() {
    void agenda().then(setItens);
  }

  useEffect(() => {
    carregar();
    void listCandidatos().then(setCandidatos);
    void listEquipe().then(setEquipe);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Agenda"
        description="Compromissos de RH gravados na agenda do CRM."
      />
      <form
        className="grid gap-2 rounded-xl border bg-card p-4 md:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const data = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
          if (!data.candidatoId) delete data.candidatoId;
          if (!data.userId) delete data.userId;
          void criarCompromisso(data).then(() => {
            form.reset();
            carregar();
          });
        }}
      >
        <Input name="titulo" placeholder="Título" required />
        <select name="tipo" className="h-10 rounded-lg border bg-background px-2 text-sm" defaultValue="entrevista">
          <option value="entrevista">Entrevista</option>
          <option value="retorno">Retorno</option>
          <option value="reuniao">Reunião</option>
          <option value="documentos">Entrega de documentos</option>
          <option value="assinatura">Assinatura</option>
          <option value="treinamento">Treinamento</option>
          <option value="avaliacao">Avaliação</option>
        </select>
        <Input name="startsAt" type="datetime-local" required />
        <select name="candidatoId" className="h-10 rounded-lg border bg-background px-2 text-sm">
          <option value="">Candidato</option>
          {candidatos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
        <select name="userId" className="h-10 rounded-lg border bg-background px-2 text-sm">
          <option value="">Corretor</option>
          {equipe.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Button type="submit" className="w-fit">
          Agendar
        </Button>
      </form>
      <ul className="space-y-2">
        {itens.map((item) => (
          <li key={item.id} className="rounded-xl border bg-card p-3 text-sm">
            <p className="font-medium">{item.titulo}</p>
            <p className="text-muted-foreground">
              {new Date(item.startsAt).toLocaleString("pt-BR")} · {item.rhTipo} · {item.status}
              {item.rhCandidato ? ` · ${item.rhCandidato.nome}` : ""}
              {item.rhUser ? ` · ${item.rhUser.name}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
