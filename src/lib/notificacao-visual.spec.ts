import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { visualNotificacao } from "./notificacao-visual.ts";

describe("visualNotificacao", () => {
  it("usa ícone e cor distintos por família", () => {
    const analise = visualNotificacao("analise_resultado");
    const agenda = visualNotificacao("agenda_solicitacao");
    const lead = visualNotificacao("lead_atribuido");
    const proposta = visualNotificacao("proposta_publica_recebida");
    const chave = visualNotificacao("chave_retirada");
    const tarefa = visualNotificacao("tarefa_atrasada");

    assert.notEqual(analise.wrap, agenda.wrap);
    assert.notEqual(lead.wrap, proposta.wrap);
    assert.notEqual(chave.wrap, tarefa.wrap);
    assert.notEqual(analise.icon, agenda.icon);
    assert.notEqual(lead.icon, chave.icon);
  });
});
