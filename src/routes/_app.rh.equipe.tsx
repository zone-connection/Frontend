import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { encerrados, listEquipe, type Candidato, type Corretor } from "@/lib/rh-api";

export const Route = createFileRoute("/_app/rh/equipe")({
  component: Page,
});

function Page() {
  const [modo, setModo] = useState<"ativos" | "desligados" | "desistentes" | "reprovados">("ativos");
  const [equipe, setEquipe] = useState<Corretor[]>([]);
  const [hist, setHist] = useState<{ desistentes: Candidato[]; reprovados: Candidato[] } | null>(null);

  useEffect(() => {
    void listEquipe(modo === "desligados" ? "desligados" : undefined).then(setEquipe);
    void encerrados().then(setHist);
  }, [modo]);

  const lista =
    modo === "desistentes" ? null : modo === "reprovados" ? null : equipe;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Equipe" description="Corretores, documentos e histórico de encerramento." />
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["ativos", "Ativos"],
            ["desligados", "Desligados"],
            ["desistentes", "Desistentes"],
            ["reprovados", "Reprovados"],
          ] as const
        ).map(([id, label]) => (
          <Button key={id} type="button" variant={modo === id ? "default" : "outline"} onClick={() => setModo(id)}>
            {label}
          </Button>
        ))}
      </div>
      {lista ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {lista.map((item) => (
            <Link key={item.id} to="/rh/equipe/$id" params={{ id: item.id }} className="rounded-xl border bg-card p-4">
              <p className="font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground">
                {item.creci ? `CRECI ${item.creci} · ` : ""}
                desde {new Date(item.contratadoEm).toLocaleDateString("pt-BR")}
              </p>
              <p className="mt-2 text-sm">{item.vendasNoMes} venda(s) no mês</p>
              {item.desligamentoMotivo ? (
                <p className="mt-1 text-xs text-muted-foreground">{item.desligamentoMotivo}</p>
              ) : null}
            </Link>
          ))}
        </div>
      ) : (
        <ul className="space-y-2 text-sm">
          {(modo === "desistentes" ? hist?.desistentes : hist?.reprovados)?.map((item) => (
            <li key={item.id} className="rounded-xl border bg-card p-3">
              <p className="font-medium">{item.nome}</p>
              <p className="text-xs text-muted-foreground">
                {item.encerradoEm ? new Date(item.encerradoEm).toLocaleDateString("pt-BR") : ""} ·{" "}
                {item.motivoEncerramento}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
