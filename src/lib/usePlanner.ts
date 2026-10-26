import { useEffect, useRef, useState } from "react";
import { eventFromPlan } from "./events.ts";
import { starterPlan } from "./templates.ts";
import { apiJson, planResponseSchema } from "./api.ts";
import type { Brief, Event, Plan } from "./types";

export interface PlanPreviewData {
  plan: Plan;
  source: "ai" | "template";
  model: string | null;
  brief: Brief;
}

function initialPrompt() {
  try {
    return sessionStorage.getItem("gatherly.prompt") ?? "";
  } catch {
    return "";
  }
}

/** Requests own their brief and cancellation; catalog refreshes cannot cancel generation. */
export function usePlanner(
  event: Event,
  aiEnabled: boolean,
  notify: (message: string) => void,
) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [code, setCode] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<PlanPreviewData | null>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    try {
      sessionStorage.removeItem("gatherly.prompt");
    } catch {
      /* Optional navigation hint. */
    }
    return () => {
      request.current?.abort();
      request.current = null;
    };
  }, []);
  const brief: Brief = {
    title: event.title,
    type: event.type,
    date: event.date,
    location: event.location,
    guests: event.guests,
    budget: event.budget,
    currency: event.currency,
    preferences: event.preferences,
  };
  function template() {
    request.current?.abort();
    request.current = null;
    setLoading(false);
    setError("");
    const context = {
      ...brief,
      preferences: [brief.preferences, prompt]
        .filter(Boolean)
        .join(" ")
        .slice(0, 1600),
    };
    setPreview({
      plan: starterPlan(context),
      source: "template",
      model: null,
      brief: context,
    });
    notify("Starter plan ready to review.");
  }
  function cancel() {
    request.current?.abort();
    request.current = null;
    setLoading(false);
    setError(
      "Generation stopped. You can try another model or use a starter plan.",
    );
  }
  async function generate(model: string) {
    if (!aiEnabled) {
      template();
      return;
    }
    if (!consent) {
      setError(
        "Please agree to share your event brief with OpenRouter to continue.",
      );
      return;
    }
    if (!code.trim()) {
      setError("Enter the private AI access code to use live generation.");
      return;
    }
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");
    setPreview(null);
    try {
      const data = await apiJson("/api/plan", planResponseSchema, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-ai-access-code": code,
        },
        body: JSON.stringify({ brief, model, prompt, consent }),
        signal: controller.signal,
      });
      if (controller.signal.aborted || request.current !== controller) return;
      setPreview({ ...data, brief });
      notify(
        data.source === "ai"
          ? "Your AI plan is ready to review."
          : "Your starter plan is ready to review.",
      );
    } catch (failure) {
      if (controller.signal.aborted || request.current !== controller) return;
      setError(
        failure instanceof Error &&
          ["AbortError", "TimeoutError"].includes(failure.name)
          ? "Generation took too long. Try another model or use a starter plan."
          : failure instanceof Error
            ? failure.message
            : "Something went wrong. Please try again.",
      );
    } finally {
      if (request.current === controller) {
        request.current = null;
        setLoading(false);
      }
    }
  }
  function createEvent() {
    if (!preview || loading) return null;
    const copy = eventFromPlan(
      {
        ...preview.brief,
        title: `${preview.brief.title.slice(0, 85)} · new plan`,
      },
      preview.plan,
    );
    copy.notes = preview.plan.summary;
    copy.provenance = {
      source: preview.source,
      model: preview.model,
      createdAt: new Date().toISOString(),
    };
    return copy;
  }
  return {
    prompt,
    setPrompt,
    code,
    setCode,
    consent,
    setConsent,
    loading,
    error,
    preview,
    template,
    generate,
    cancel,
    createEvent,
  };
}
