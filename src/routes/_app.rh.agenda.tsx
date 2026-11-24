import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { TarefasAgendaPainel } from "@/components/tarefas-agenda-painel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { criarCompromisso, listCandidatos, listEquipe, type Candidato, type Corretor } from "@/lib/rh-api";

export const Route = createFileRoute("/_app/rh/agenda")({
  component: Page,
});

function dataHoraLocal(day: Date, hour?: number) {
  const d = new Date(day);
  if (hour != null) d.setHours(hour, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Page() {
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [equipe, setEquipe] = useState<Corretor[]>([]);
  const [aberto, setAberto] = useState(false);
  const [quando, setQuando] = useState("");
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    void listCandidatos().then(setCandidatos);
    void listEquipe().then(setEquipe);
  }, []);

  function abrir(day: Date, hour?: number) {
    setQuando(dataHoraLocal(day, hour));
    setAberto(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Agenda"
        description="O mesmo calendário dos lembretes, só com os compromissos de RH."
      />
      <TarefasAgendaPainel
        compacto
        somenteRh
        visaoInicial="mes"
        reloadKey={versao}
        onCreateAt={abrir}
      />
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo compromisso de RH</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const data = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
              if (!data.candidatoId) delete data.candidatoId;
              if (!data.userId) delete data.userId;
              void criarCompromisso(data).then(() => {
                form.reset();
                setAberto(false);
                setVersao((v) => v + 1);
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
            <Input name="startsAt" type="datetime-local" required value={quando} onChange={(e) => setQuando(e.target.value)} />
            <select name="candidatoId" className="h-10 rounded-lg border bg-background px-2 text-sm">
              <option value="">Candidato</option>
              {candidatos.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
            <select name="userId" className="h-10 rounded-lg border bg-background px-2 text-sm">
              <option value="">Corretor</option>
              {equipe.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <Button type="submit" className="w-fit">Agendar</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
