import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MOTION } from "./motion.ts";

describe("MOTION", () => {
  it("mantém transições no intervalo 150–250 ms", () => {
    assert.ok(MOTION.durationMs >= 150 && MOTION.durationMs <= 250);
    assert.ok(MOTION.durationSlowMs >= 150 && MOTION.durationSlowMs <= 250);
  });

  it("atrasa o skeleton o suficiente para evitar flash", () => {
    assert.ok(MOTION.loadingDelayMs >= 100);
    assert.ok(MOTION.loadingDelayMs < MOTION.durationSlowMs + 50);
  });
});
