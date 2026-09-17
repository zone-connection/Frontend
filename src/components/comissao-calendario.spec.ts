import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Comissao } from "@/lib/financeiro-api";
import { filterComissoesCalendario } from "./comissao-calendario";

function item(partial: Partial<Comissao> & Pick<Comissao, "id">): Comissao {
  return {
    documentacaoId: "d1",
    dataVenda: "2026-09-01",
    vgv: 100,
    status: "pendente",
    createdAt: "2026-09-01",
    updatedAt: "2026-09-01",
    ...partial,
  };
}

describe("filterComissoesCalendario", () => {
  const rows = [
    item({
      id: "1",
      status: "pendente",
      cliente: "Ana",
      equipe: "Alpha",
      dataPrevistaRecebimento: "2026-09-10",
    }),
    item({
      id: "2",
      status: "paga",
      cliente: "Bruno",
      equipe: "Beta",
      dataPrevistaRecebimento: "2026-09-12",
    }),
  ];

  it("mantém todas no filtro padrão", () => {
    assert.equal(
      filterComissoesCalendario(rows, {
        search: "",
        recebimento: "todos",
        equipe: "todos",
      }).length,
      2,
    );
  });

  it("separa recebidas e não recebidas como a lista antiga", () => {
    assert.deepEqual(
      filterComissoesCalendario(rows, {
        search: "",
        recebimento: "nao_recebidas",
        equipe: "todos",
      }).map((row) => row.id),
      ["1"],
    );
    assert.deepEqual(
      filterComissoesCalendario(rows, {
        search: "",
        recebimento: "recebidas",
        equipe: "todos",
      }).map((row) => row.id),
      ["2"],
    );
  });

  it("filtra equipe e busca sem esconder o restante do recorte", () => {
    assert.equal(
      filterComissoesCalendario(rows, {
        search: "bruno",
        recebimento: "todos",
        equipe: "todos",
      }).length,
      1,
    );
    assert.equal(
      filterComissoesCalendario(rows, {
        search: "",
        recebimento: "todos",
        equipe: "Alpha",
      })[0]?.id,
      "1",
    );
  });
});
