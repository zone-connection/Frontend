import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { leadEntraNoFunil } from "../src/lib/funil-tipo-filtro.ts";

describe("funil de clientes", () => {
  it("não mostra lead na carteira do corretor, mesmo com ficha ou flag de admin", () => {
    for (const fichaDeLancamento of [false, true]) {
      assert.equal(
        leadEntraNoFunil({
          tipo: "lead",
          tipoFiltro: "cliente",
          isClientesFunil: true,
          fichaDeLancamento,
          adminVeClientesCorretor: true,
        }),
        false,
      );
    }
  });

  it("tira da carteira quem tem ficha de lançamento e mostra no funil de leads", () => {
    const ficha = {
      tipo: "cliente",
      fichaDeLancamento: true,
      adminVeClientesCorretor: false,
    };
    assert.equal(
      leadEntraNoFunil({
        ...ficha,
        tipoFiltro: "cliente",
        isClientesFunil: true,
      }),
      false,
    );
    assert.equal(
      leadEntraNoFunil({
        ...ficha,
        tipoFiltro: "lead",
        isClientesFunil: false,
      }),
      true,
    );
  });

  it("mantém cliente sem ficha na carteira e lead comum no funil de lançamentos", () => {
    assert.equal(
      leadEntraNoFunil({
        tipo: "cliente",
        tipoFiltro: "cliente",
        isClientesFunil: true,
        fichaDeLancamento: false,
        adminVeClientesCorretor: false,
      }),
      true,
    );
    assert.equal(
      leadEntraNoFunil({
        tipo: "lead",
        tipoFiltro: "lead",
        isClientesFunil: false,
        fichaDeLancamento: false,
        adminVeClientesCorretor: false,
      }),
      true,
    );
  });
});
