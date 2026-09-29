import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  monitoramentoInformaTipo,
  somenteLeadsAtrasos,
  type CorretorMonitoramento,
} from "./lead-monitoramento.ts";

function corretor(
  leads: CorretorMonitoramento["leads"],
  extras: Partial<CorretorMonitoramento> = {},
): CorretorMonitoramento {
  return {
    id: "corretor-1",
    name: "Daniel",
    totalAtrasos: leads.length,
    semMovimentacao: leads.length,
    foraDoPrazo: 0,
    tarefasAtrasadas: leads.reduce(
      (sum, lead) => sum + (lead.tarefasAtrasadas?.length ?? 0),
      0,
    ),
    leads,
    ...extras,
  };
}

const parado = {
  problemas: [
    {
      tipo: "sem_movimentacao" as const,
      titulo: "Sem movimentação",
      detalhe: "há 2d",
    },
  ],
};

describe("somenteLeadsAtrasos", () => {
  it("remove cliente da carteira quando a API informa o tipo", () => {
    const rows = [
      corretor([
        { id: "a", nome: "Lead Ana", tipo: "lead", stage: "novo", ...parado },
        {
          id: "b",
          nome: "Cliente Bruno",
          tipo: "cliente",
          stage: "novo",
          ...parado,
        },
      ]),
    ];
    const out = somenteLeadsAtrasos(rows);
    assert.equal(out.length, 1);
    assert.deepEqual(
      out[0]?.leads.map((lead) => lead.id),
      ["a"],
    );
    assert.equal(out[0]?.totalAtrasos, 1);
    assert.equal(out[0]?.semMovimentacao, 1);
  });

  it("na API antiga, mantém só os ids do catálogo de leads", () => {
    const rows = [
      corretor([
        { id: "a", nome: "Lead Ana", stage: "novo", ...parado },
        { id: "b", nome: "Cliente Bruno", stage: "novo", ...parado },
      ]),
    ];
    const out = somenteLeadsAtrasos(rows, new Set(["a"]));
    assert.deepEqual(
      out[0]?.leads.map((lead) => lead.nome),
      ["Lead Ana"],
    );
    assert.equal(out[0]?.totalAtrasos, 1);
  });

  it("some com o corretor que só tinha clientes da carteira", () => {
    const rows = [
      corretor([{ id: "b", nome: "Cliente Bruno", stage: "novo", ...parado }]),
    ];
    assert.deepEqual(somenteLeadsAtrasos(rows, new Set(["a"])), []);
  });

  it("preserva o corretor que só tem perda na reatribuição", () => {
    const rows = [
      corretor([], { leadsPerdidosReatribuicao: 2, totalAtrasos: 0 }),
    ];
    const out = somenteLeadsAtrasos(rows, new Set());
    assert.equal(out.length, 1);
    assert.equal(out[0]?.leadsPerdidosReatribuicao, 2);
  });
});

describe("monitoramentoInformaTipo", () => {
  it("reconhece a resposta que já traz o tipo do contato", () => {
    assert.equal(
      monitoramentoInformaTipo([
        corretor([
          { id: "a", nome: "Ana", tipo: "lead", stage: "novo", ...parado },
        ]),
      ]),
      true,
    );
    assert.equal(
      monitoramentoInformaTipo([
        corretor([{ id: "a", nome: "Ana", stage: "novo", ...parado }]),
      ]),
      false,
    );
  });
});
