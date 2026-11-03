import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import {
  fetchLeadAtribuicoes,
  type LeadAtribuicaoItem,
} from "@/lib/leads-api";
import { formatDateTimePt } from "@/lib/lead-monitoramento";

const ACAO: Record<string, string> = {
  entrada: "Entrou no sistema",
  distribuicao: "Distribuição",
  reatribuicao: "Reatribuição",
  troca_equipe: "Troca de equipe",
  roleta: "Fila automática",
  redistribuicao: "Redistribuição da fila",
  desvinculo: "Corretor desvinculado",
  caca: "Caça-lead",
};

function pessoa(de: string | null, para: string | null) {
  if (!de && !para) return null;
  if (de === para) return de;
  return `${de ?? "sem corretor"} → ${para ?? "sem corretor"}`;
}

function equipe(de: string | null, para: string | null) {
  if (!de && !para) return null;
  if (de === para) return de;
  return `${de ?? "sem equipe"} → ${para ?? "sem equipe"}`;
}

export function LeadAtribuicaoHistorico({ leadId }: { leadId: string }) {
  const [itens, setItens] = useState<LeadAtribuicaoItem[] | null>(null);
  const [cadastradoEm, setCadastradoEm] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    setItens(null);
    setErro(null);
    void fetchLeadAtribuicoes(leadId)
      .then((data) => {
        if (!ativo) return;
        setItens(data.itens);
        setCadastradoEm(data.cadastradoEm);
      })
      .catch((error) => {
        if (!ativo) return;
        setErro(
          error instanceof ApiError
            ? error.message
            : "Não foi possível carregar o histórico.",
        );
      });
    return () => {
      ativo = false;
    };
  }, [leadId]);

  if (erro) {
    return <p className="text-sm text-rose-600">{erro}</p>;
  }
  if (!itens) {
    return <p className="text-sm text-muted-foreground">Carregando histórico...</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Cadastro em {cadastradoEm ? formatDateTimePt(cadastradoEm) : "—"}. Cada
        linha mostra quem fez a ação, quem entregou e quem recebeu, inclusive
        quando o lead muda de equipe.
      </p>
      {itens.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma movimentação gravada ainda. As próximas distribuições e
          reatribuições aparecem aqui.
        </p>
      ) : (
        <ol className="space-y-2">
          {itens.map((item) => {
            const corretor = pessoa(item.deCorretor, item.paraCorretor);
            const time = equipe(item.deEquipe, item.paraEquipe);
            return (
              <li key={item.id} className="rounded-xl border border-border px-3 py-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold">
                    {ACAO[item.acao] ?? "Movimentação"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatDateTimePt(item.criadoEm)}
                  </p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.ator ? `Feito por ${item.ator}` : "Feito pela fila automática"}
                </p>
                {corretor ? (
                  <p className="mt-1 text-sm">Corretor: {corretor}</p>
                ) : null}
                {time ? <p className="text-sm">Equipe: {time}</p> : null}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
