import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { leadEntraNoFunil } from "../src/lib/funil-tipo-filtro.ts";

describe("funil de clientes", () => {
  it("esconde da carteira quem a documentação aprovou e mostra no funil de leads", () => {
    const aprovado = {
      tipo: "cliente",
      aprovadoNaDocumentacao: true,
      adminVeClientesCorretor: false,
    };
    assert.equal(
      leadEntraNoFunil({
        ...aprovado,
        tipoFiltro: "cliente",
        isClientesFunil: true,
      }),
      false,
    );
    assert.equal(
      leadEntraNoFunil({
        ...aprovado,
        tipoFiltro: "lead",
        isClientesFunil: false,
      }),
      true,
    );
  });

  it("mantém cliente sem aprovação na carteira e lead comum no funil de lançamentos", () => {
    assert.equal(
      leadEntraNoFunil({
        tipo: "cliente",
        tipoFiltro: "cliente",
        isClientesFunil: true,
        aprovadoNaDocumentacao: false,
        adminVeClientesCorretor: false,
      }),
      true,
    );
    assert.equal(
      leadEntraNoFunil({
        tipo: "lead",
        tipoFiltro: "cliente",
        isClientesFunil: true,
        aprovadoNaDocumentacao: false,
        adminVeClientesCorretor: false,
      }),
      false,
    );
    assert.equal(
      leadEntraNoFunil({
        tipo: "lead",
        tipoFiltro: "lead",
        isClientesFunil: false,
        aprovadoNaDocumentacao: false,
        adminVeClientesCorretor: false,
      }),
      true,
    );
  });
});
