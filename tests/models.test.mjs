import test from "node:test";
import assert from "node:assert/strict";
import { normalizeModelPrice, hasKnownPricing } from "../src/lib/models.ts";

test("unknown and variable price markers cannot become negative charges or free pricing", () => {
  for (const value of [
    undefined,
    "",
    " ",
    "unknown",
    "-1",
    "Infinity",
    "NaN",
    "1e999",
  ])
    assert.equal(normalizeModelPrice(value), "unknown");
  assert.equal(normalizeModelPrice("0"), "0");
  assert.equal(normalizeModelPrice(" 0.0000001 "), "0.0000001");
  assert.equal(hasKnownPricing({ inputPrice: "-1", outputPrice: "0" }), false);
  assert.equal(
    hasKnownPricing({ inputPrice: "0", outputPrice: "unknown" }),
    false,
  );
  assert.equal(
    hasKnownPricing({ inputPrice: "0.0000001", outputPrice: "0.0000004" }),
    true,
  );
});
