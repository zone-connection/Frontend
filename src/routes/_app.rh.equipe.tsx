import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { PillTabs } from "@/components/operacao-ui";
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
      <PillTabs
        value={modo}
        onChange={(id) => setModo(id as typeof modo)}
        items={[
          { id: "ativos", label: "Ativos" },
          { id: "desligados", label: "Desligados" },
          { id: "desistentes", label: "Desistentes" },
          { id: "reprovados", label: "Reprovados" },
        ]}
      />
      {lista ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {lista.map((item) => (
            <Link
              key={item.id}
              to="/rh/equipe/$id"
              params={{ id: item.id }}
              className={
                modo === "desligados"
                  ? "rounded-2xl border border-[#F5B8C4] bg-gradient-to-br from-[#FFD6DE] to-[#FFF6F7] p-4"
                  : "rounded-2xl border border-[#8ED9B0] bg-gradient-to-br from-[#CFF6E0] to-[#F3FBF6] p-4"
              }
            >
              <p className="font-medium text-[#0B3148]">{item.name}</p>
              <p className="text-xs text-[#5C6B76]">
                {item.creci ? `CRECI ${item.creci} · ` : ""}
                desde {new Date(item.contratadoEm).toLocaleDateString("pt-BR")}
              </p>
              <p className="mt-2 text-sm font-semibold text-[#067647]">{item.vendasNoMes} venda(s) no mês</p>
              {item.desligamentoMotivo ? (
                <p className="mt-1 text-xs text-muted-foreground">{item.desligamentoMotivo}</p>
              ) : null}
            </Link>
          ))}
        </div>
      ) : (
        <ul className="space-y-2 text-sm">
          {(modo === "desistentes" ? hist?.desistentes : hist?.reprovados)?.map((item) => (
            <li
              key={item.id}
              className={
                modo === "reprovados"
                  ? "rounded-2xl border border-[#F5B8B8] bg-gradient-to-br from-[#FFD6D6] to-[#FFF5F5] p-3"
                  : "rounded-2xl border border-[#F5C48A] bg-gradient-to-br from-[#FFE4C4] to-[#FFF8F1] p-3"
              }
            >
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
