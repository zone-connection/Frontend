import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { leadEntraNoFunil } from "../src/lib/funil-tipo-filtro.ts";

describe("funil de clientes", () => {
  it("não mostra lead na carteira do corretor, mesmo com flag de admin", () => {
    assert.equal(
      leadEntraNoFunil({
        tipo: "lead",
        tipoFiltro: "cliente",
        isClientesFunil: true,
        adminVeClientesCorretor: true,
      }),
      false,
    );
  });

  it("mantém cliente na carteira e fora do funil de leads", () => {
    const cliente = {
      tipo: "cliente",
      adminVeClientesCorretor: false,
    };
    assert.equal(
      leadEntraNoFunil({
        ...cliente,
        tipoFiltro: "cliente",
        isClientesFunil: true,
      }),
      true,
    );
    assert.equal(
      leadEntraNoFunil({
        ...cliente,
        tipoFiltro: "lead",
        isClientesFunil: false,
      }),
      false,
    );
  });

  it("não coloca aprovado da documentação na entrada do funil de leads", () => {
    assert.equal(
      leadEntraNoFunil({
        tipo: "lead",
        tipoFiltro: "lead",
        isClientesFunil: false,
        adminVeClientesCorretor: false,
        aprovadoNaEntrada: true,
      }),
      false,
    );
  });

  it("mantém lead comum no funil de lançamentos", () => {
    assert.equal(
      leadEntraNoFunil({
        tipo: "lead",
        tipoFiltro: "lead",
        isClientesFunil: false,
        adminVeClientesCorretor: false,
      }),
      true,
    );
  });
});
