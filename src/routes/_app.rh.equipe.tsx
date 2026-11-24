import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LayoutGrid, LayoutList } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { PillTabs } from "@/components/operacao-ui";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FILTER_VISTA_BTN, FILTER_VISTA_BTN_ACTIVE, FILTER_VISTA_WRAP, TABLE_LUX, TABLE_SHELL } from "@/lib/filter-bar";
import { encerrados, listEquipe, type Candidato, type Corretor } from "@/lib/rh-api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/rh/equipe")({
  component: Page,
});

function iniciais(nome: string) {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");
}

function Page() {
  const [modo, setModo] = useState<"ativos" | "desligados" | "desistentes" | "reprovados">("ativos");
  const [equipe, setEquipe] = useState<Corretor[]>([]);
  const [hist, setHist] = useState<{ desistentes: Candidato[]; reprovados: Candidato[] } | null>(null);
  const [vista, setVista] = useState<"cards" | "tabela">("cards");

  useEffect(() => {
    void listEquipe(modo === "desligados" ? "desligados" : undefined).then(setEquipe);
    void encerrados().then(setHist);
  }, [modo]);

  const pessoas = modo === "desistentes" || modo === "reprovados" ? null : equipe;
  const encerradosLista = modo === "desistentes" ? hist?.desistentes : hist?.reprovados;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Equipe" description="Corretores, documentos e histórico de encerramento." />
      <div className="flex flex-wrap items-center justify-between gap-3">
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
        <div className={FILTER_VISTA_WRAP} role="group" aria-label="Tipo de visualização">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(FILTER_VISTA_BTN, vista === "cards" && FILTER_VISTA_BTN_ACTIVE)}
            onClick={() => setVista("cards")}
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="ml-1.5">Cards</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(FILTER_VISTA_BTN, vista === "tabela" && FILTER_VISTA_BTN_ACTIVE)}
            onClick={() => setVista("tabela")}
          >
            <LayoutList className="h-4 w-4" />
            <span className="ml-1.5">Tabela</span>
          </Button>
        </div>
      </div>
      {vista === "tabela" ? (
        <Tabela modo={modo} pessoas={pessoas} encerradosLista={encerradosLista} />
      ) : pessoas ? (
        pessoas.length === 0 ? (
          <Vazio texto={modo === "desligados" ? "Nenhum corretor desligado." : "Nenhum corretor ativo."} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {pessoas.map((item) => (
              <Link
                key={item.id}
                to="/rh/equipe/$id"
                params={{ id: item.id }}
                className="flex items-center gap-3 rounded-2xl border border-[#E6EEF3] bg-white p-4 shadow-[0_8px_24px_rgba(11,49,72,0.04)] transition-shadow hover:shadow-[0_12px_28px_rgba(11,49,72,0.08)]"
              >
                <Avatar className="size-11">
                  {item.avatar ? <AvatarImage src={item.avatar} alt="" /> : null}
                  <AvatarFallback className="bg-[#E7F4FA] text-sm font-semibold text-[#0B3148]">
                    {iniciais(item.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[#0B3148]">{item.name}</p>
                  <p className="truncate text-xs text-[#5C6B76]">
                    {item.creci ? `CRECI ${item.creci} · ` : ""}
                    desde {new Date(item.contratadoEm).toLocaleDateString("pt-BR")}
                  </p>
                  <p className="mt-1 text-xs font-medium text-[#1570C8]">
                    {item.vendasNoMes} venda(s) no mês
                  </p>
                  {item.desligamentoMotivo ? (
                    <p className="mt-1 truncate text-xs text-[#5C6B76]">{item.desligamentoMotivo}</p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        )
      ) : encerradosLista && encerradosLista.length > 0 ? (
        <ul className="space-y-2">
          {encerradosLista.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl border border-[#E6EEF3] bg-white px-4 py-3 shadow-[0_8px_24px_rgba(11,49,72,0.04)]"
            >
              <p className="font-medium text-[#0B3148]">{item.nome}</p>
              <p className="text-xs text-[#5C6B76]">
                {item.encerradoEm ? new Date(item.encerradoEm).toLocaleDateString("pt-BR") : ""}
                {item.motivoEncerramento ? ` · ${item.motivoEncerramento}` : ""}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <Vazio texto={modo === "reprovados" ? "Nenhum candidato reprovado." : "Nenhum candidato desistente."} />
      )}
    </div>
  );
}

function Tabela({
  modo,
  pessoas,
  encerradosLista,
}: {
  modo: "ativos" | "desligados" | "desistentes" | "reprovados";
  pessoas: Corretor[] | null;
  encerradosLista: Candidato[] | undefined;
}) {
  if (pessoas) {
    if (pessoas.length === 0) {
      return <Vazio texto={modo === "desligados" ? "Nenhum corretor desligado." : "Nenhum corretor ativo."} />;
    }
    return (
      <div className={TABLE_SHELL}>
        <Table className={TABLE_LUX}>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CRECI</TableHead>
              <TableHead>Desde</TableHead>
              <TableHead>Vendas no mês</TableHead>
              {modo === "desligados" ? <TableHead>Motivo</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pessoas.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Link to="/rh/equipe/$id" params={{ id: item.id }} className="font-medium text-[#079ED4]">
                    {item.name}
                  </Link>
                </TableCell>
                <TableCell>{item.creci || "—"}</TableCell>
                <TableCell>{new Date(item.contratadoEm).toLocaleDateString("pt-BR")}</TableCell>
                <TableCell>{item.vendasNoMes}</TableCell>
                {modo === "desligados" ? <TableCell>{item.desligamentoMotivo || "—"}</TableCell> : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }
  if (!encerradosLista || encerradosLista.length === 0) {
    return <Vazio texto={modo === "reprovados" ? "Nenhum candidato reprovado." : "Nenhum candidato desistente."} />;
  }
  return (
    <div className={TABLE_SHELL}>
      <Table className={TABLE_LUX}>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Motivo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {encerradosLista.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.nome}</TableCell>
              <TableCell>{item.encerradoEm ? new Date(item.encerradoEm).toLocaleDateString("pt-BR") : "—"}</TableCell>
              <TableCell>{item.motivoEncerramento || "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function Vazio({ texto }: { texto: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-[#E2E8EC] bg-white px-3 py-10 text-center text-sm text-[#5C6B76]">
      {texto}
    </p>
  );
}
