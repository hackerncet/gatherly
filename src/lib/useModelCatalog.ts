import { useCallback, useEffect, useState } from "react";
import { apiJson, catalogSchema } from "./api.ts";
import type { Model } from "./types";

export const defaultModel: Model = {
  id: "openrouter/free",
  name: "OpenRouter · Free model router",
  free: true,
  contextLength: 0,
  inputPrice: "0",
  outputPrice: "0",
};

export function useModelCatalog() {
  const [refreshCount, setRefreshCount] = useState(0);
  const [catalog, setCatalog] = useState<{
    models: Model[];
    model: string;
    source: string;
  }>({ models: [defaultModel], model: defaultModel.id, source: "loading" });
  const refresh = useCallback(() => setRefreshCount((count) => count + 1), []);
  const select = useCallback(
    (model: string) =>
      setCatalog((current) =>
        current.models.some((entry) => entry.id === model)
          ? { ...current, model }
          : current,
      ),
    [],
  );
  useEffect(() => {
    const controller = new AbortController();
    setCatalog((current) => ({ ...current, source: "loading" }));
    void apiJson("/api/models", catalogSchema, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        const first = data.models[0];
        if (!first) return;
        setCatalog((current) => ({
          ...data,
          model: data.models.some((entry) => entry.id === current.model)
            ? current.model
            : first.id,
        }));
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setCatalog((current) => ({
            ...current,
            source:
              current.models.length === 1 &&
              current.models[0]?.id === defaultModel.id
                ? "fallback"
                : "cached",
          }));
      });
    return () => controller.abort();
  }, [refreshCount]);
  return {
    ...catalog,
    selected:
      catalog.models.find((entry) => entry.id === catalog.model) ??
      defaultModel,
    refresh,
    select,
  };
}
