import { useCallback, useEffect, useState } from "react";
import { apiJson, healthSchema } from "./api.ts";

export function useServiceStatus() {
  const [refresh, setRefresh] = useState(0);
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("Checking the planning service…");
  const retry = useCallback(() => {
    setMessage("Checking the planning service…");
    setRefresh((n) => n + 1);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void apiJson("/api/health", healthSchema, { signal: controller.signal })
      .then((health) => {
        if (controller.signal.aborted) return;
        setEnabled(health.aiEnabled);
        if (health.aiEnabled)
          setMessage(
            "Live AI is configured. Enter the private access code and agree to share your brief.",
          );
        else if (health.ai?.keyConfigured && !health.ai.accessConfigured)
          setMessage(
            "Starter mode: the server key is configured, but the owner must set a private AI_ACCESS_CODE of at least 16 characters in Render and deploy.",
          );
        else if (health.ai && !health.ai.keyConfigured)
          setMessage(
            "Starter mode: the owner must configure a real OPENROUTER_API_KEY and a private AI_ACCESS_CODE in Render, then deploy.",
          );
        else
          setMessage(
            "Starter mode is ready. The owner must complete the server key and private access-code setup for live AI.",
          );
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setEnabled(false);
          setMessage(
            "The planning service could not be reached. Local starter plans still work. Retry the connection before using live AI.",
          );
        }
      });
    return () => controller.abort();
  }, [refresh]);
  return { enabled, message, retry };
}
