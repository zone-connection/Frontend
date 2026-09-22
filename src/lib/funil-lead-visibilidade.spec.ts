import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { leadVisivelNoFunilEmUso } from "./funil-lead-visibilidade.ts";

describe("leadVisivelNoFunilEmUso", () => {
  it("mantém no quadro o lead do funil em uso", () => {
    assert.equal(leadVisivelNoFunilEmUso("funil-a", "funil-a"), true);
  });

  it("não esconde lead antigo que ainda não tem funil gravado", () => {
    assert.equal(leadVisivelNoFunilEmUso(null, "funil-a"), true);
    assert.equal(leadVisivelNoFunilEmUso(undefined, "funil-a"), true);
    assert.equal(leadVisivelNoFunilEmUso("", "funil-a"), true);
  });

  it("não mistura lead de outro funil neste quadro", () => {
    assert.equal(leadVisivelNoFunilEmUso("funil-b", "funil-a"), false);
  });
});
