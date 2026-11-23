import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { ApiError } from "@/lib/api";
import {
  concluirCadencia,
  desfazerCadencia,
  fetchAtendimentoLead,
  marcarChecklist,
  type AtendimentoPainel,
} from "@/lib/atendimento-api";

export function LeadAtendimentoPanel({ leadId }: { leadId: string }) {
  const [painel, setPainel] = useState<AtendimentoPainel | null>(null);

  useEffect(() => {
    let ativo = true;
    void fetchAtendimentoLead(leadId)
      .then((dados) => {
        if (ativo) setPainel(dados);
      })
      .catch(() => {
        if (ativo) setPainel(null);
      });
    return () => {
      ativo = false;
    };
  }, [leadId]);

  async function atualizar(task: () => Promise<AtendimentoPainel>) {
    try {
      setPainel(await task());
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível atualizar o atendimento.");
    }
  }

  if (!painel || (!painel.cadenciaAtiva && !painel.checklistAtivo)) {
    return <p className="text-sm text-muted-foreground">Cadência e checklist estão desativados nesta imobiliária.</p>;
  }

  return (
    <div className="space-y-5">
      {painel.cadenciaAtiva && painel.cadencia ? (
        <section>
          <h3 className="text-sm font-semibold">Cadência</h3>
          <ul className="mt-2 space-y-2">
            {painel.cadencia.etapas.map((etapa) => (
              <li key={etapa.id} className="flex items-start gap-2 rounded-xl border px-3 py-2">
                <Checkbox
                  checked={etapa.status === "concluida"}
                  onCheckedChange={(valor) => void atualizar(() => (
                    valor
                      ? concluirCadencia(leadId, etapa.id)
                      : desfazerCadencia(leadId, etapa.id)
                  ))}
                />
                <div>
                  <p className="text-sm font-medium">Dia {etapa.dia} — {etapa.acao}</p>
                  {etapa.descricao ? <p className="text-xs text-muted-foreground">{etapa.descricao}</p> : null}
                  <p className="text-xs text-muted-foreground">
                    {etapa.status === "concluida" ? "Concluída" : etapa.status === "atrasada" ? "Atrasada" : "Pendente"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          {painel.cadencia.historico.length > 0 ? (
            <div className="mt-3">
              <p className="text-xs font-medium text-muted-foreground">Ações de etapas que já foram removidas da configuração</p>
              <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                {painel.cadencia.historico.map((item) => (
                  <li key={item.id}>Dia {item.dia} — {item.acao}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
      {painel.checklistAtivo && painel.checklist ? (
        <section>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Checklist</h3>
            {painel.checklist.completo ? (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">Atendimento completo</span>
            ) : null}
          </div>
          {painel.checklist.modelos.map((modelo) => (
            <div key={modelo.id} className="mt-2">
              <p className="text-xs font-medium text-muted-foreground">{modelo.nome}</p>
              <ul className="mt-1 space-y-1">
                {modelo.itens.map((item) => (
                  <li key={item.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={Boolean(item.feito)}
                      onCheckedChange={(valor) => void atualizar(() => marcarChecklist(leadId, item.id, valor === true))}
                    />
                    <span>{item.texto}{item.obrigatorio ? " *" : ""}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}

export function SlaAtendimentoFaixa() {
  const [resumo, setResumo] = useState<Awaited<ReturnType<typeof import("@/lib/atendimento-api").fetchSlaResumo>> | null>(null);
  useEffect(() => {
    void import("@/lib/atendimento-api").then(({ fetchSlaResumo }) => fetchSlaResumo().then(setResumo).catch(() => undefined));
  }, []);
  if (!resumo) return null;
  const media = resumo.porCorretor.length
    ? Math.round(resumo.porCorretor.reduce((soma, item) => soma + item.tempoMedioHoras, 0) / resumo.porCorretor.length)
    : 0;
  return (
    <div className="mb-4 grid gap-2 sm:grid-cols-4">
      <Indicador titulo="Dentro do prazo" valor={resumo.dentroDoPrazo} />
      <Indicador titulo="SLA vencido" valor={resumo.slaVencido} />
      <Indicador titulo="Redistribuições" valor={resumo.redistribuicoes} />
      <Indicador titulo="Tempo médio na etapa" valor={`${media} h`} />
    </div>
  );
}

function Indicador({ titulo, valor }: { titulo: string; valor: number | string }) {
  return (
    <div className="rounded-xl border bg-card px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{titulo}</p>
      <p className="text-lg font-semibold">{valor}</p>
    </div>
  );
}
