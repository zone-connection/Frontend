import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { tipologiasVisiveis } from "./empreendimento-tipologias";

describe("tipologiasVisiveis", () => {
  it("usa os blocos novos quando já existem", () => {
    const rows = tipologiasVisiveis({
      areaM2: 50,
      quartos: 1,
      banheiros: null,
      vagas: null,
      valorReferencia: 100000,
      vitrine: {
        tipologias: [
          {
            nome: "Garden",
            areaM2: 90,
            quartos: 3,
            suites: 1,
            banheiros: 2,
            vagas: 2,
            valor: 610000,
            pavimento: null,
          },
        ],
      },
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].nome, "Garden");
    assert.equal(rows[0].valor, 610000);
  });

  it("mostra metragem, quartos e valor antigos quando não há tipologias", () => {
    const rows = tipologiasVisiveis({
      areaM2: 68,
      quartos: 2,
      banheiros: 1,
      vagas: 1,
      valorReferencia: 420000,
      vitrine: {
        suites: 1,
        andares: 12,
        tiposUnidade: ["Com varanda"],
        tipologias: [],
      },
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].nome, "Com varanda");
    assert.equal(rows[0].areaM2, 68);
    assert.equal(rows[0].quartos, 2);
    assert.equal(rows[0].banheiros, 1);
    assert.equal(rows[0].vagas, 1);
    assert.equal(rows[0].valor, 420000);
    assert.equal(rows[0].suites, 1);
    assert.equal(rows[0].pavimento, "12");
  });

  it("não inventa bloco se o cadastro antigo estava vazio", () => {
    assert.deepEqual(
      tipologiasVisiveis({
        areaM2: null,
        quartos: null,
        banheiros: null,
        vagas: null,
        valorReferencia: null,
        vitrine: null,
      }),
      [],
    );
  });
});
