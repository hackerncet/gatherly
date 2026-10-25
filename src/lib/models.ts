import type { Model } from "./types";

export function normalizeModelPrice(value: string | undefined) {
  const price = value?.trim();
  return price && Number.isFinite(Number(price)) && Number(price) >= 0
    ? price
    : "unknown";
}

export function hasKnownPricing(
  model: Pick<Model, "inputPrice" | "outputPrice">,
) {
  return (
    normalizeModelPrice(model.inputPrice) !== "unknown" &&
    normalizeModelPrice(model.outputPrice) !== "unknown"
  );
}
