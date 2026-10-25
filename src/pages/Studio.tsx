import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleAlert,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { Botanical, Modal, PageHeading } from "../components/ui";
import { aiPlanSchema, eventFromPlan, starterPlan } from "../lib/domain.ts";
import { apiJson, catalogSchema, planResponseSchema } from "../lib/api.ts";
import { money } from "../lib/storage";
import type { Brief, Event, Model, Plan } from "../lib/types";
function initialPrompt() {
  try {
    const p = sessionStorage.getItem("gatherly.prompt") || "";
    sessionStorage.removeItem("gatherly.prompt");
    return p;
  } catch {
    return "";
  }
}
export function Studio({
  event,
  aiEnabled,
  serviceMessage,
  refreshStatus,
  onCreate,
  notify,
}: {
  event: Event;
  aiEnabled: boolean;
  serviceMessage: string;
  refreshStatus: () => void;
  onCreate: (e: Event) => void;
  notify: (s: string) => void;
}) {
  const [models, setModels] = useState<Model[]>([
    {
      id: "openrouter/free",
      name: "OpenRouter · Free model router",
      free: true,
      contextLength: 0,
      inputPrice: "0",
      outputPrice: "0",
    },
  ]);
  const [model, setModel] = useState("openrouter/free");
  const [catalogSource, setCatalogSource] = useState("loading");
  const [catalogRefresh, setCatalogRefresh] = useState(0);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [code, setCode] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{
    plan: Plan;
    source: "ai" | "template";
    model: string | null;
  } | null>(null);
  const [showModels, setShowModels] = useState(false);
  const [modelSearch, setModelSearch] = useState("");
  const [freeOnly, setFreeOnly] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setCatalogSource("loading");
    apiJson("/api/models", catalogSchema, { signal: controller.signal })
      .then((d) => {
        if (Array.isArray(d.models) && d.models.length) {
          setModels(d.models);
          setCatalogSource(d.source || "live");
        } else setCatalogSource("fallback");
      })
      .catch(() => {
        if (!controller.signal.aborted) setCatalogSource("fallback");
      });
    return () => {
      controller.abort();
      abortRef.current?.abort();
    };
  }, [catalogRefresh]);
  const selected = models.find((m) => m.id === model) || models[0];
  const filtered = models.filter(
    (m) =>
      (!freeOnly || m.free) &&
      `${m.name} ${m.id}`.toLowerCase().includes(modelSearch.toLowerCase()),
  );
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
    setError("");
    setPreview({
      plan: starterPlan({
        ...brief,
        preferences: [brief.preferences, prompt]
          .filter(Boolean)
          .join(" ")
          .slice(0, 1600),
      }) as Plan,
      source: "template",
      model: null,
    });
    notify("Starter plan ready to review.");
  }
  async function generate(e: FormEvent) {
    e.preventDefault();
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
    setLoading(true);
    setError("");
    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 55000);
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
      const plan = aiPlanSchema.parse(data.plan) as Plan;
      setPreview({ plan, source: data.source, model: data.model });
      notify(
        data.source === "ai"
          ? "Your AI plan is ready to review."
          : "Your starter plan is ready to review.",
      );
    } catch (err) {
      setError(
        err instanceof Error && err.name === "AbortError"
          ? "Generation stopped. You can try another model or use a starter plan."
          : err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.",
      );
    } finally {
      clearTimeout(timeout);
      setLoading(false);
      abortRef.current = null;
    }
  }
  function usePlan() {
    if (!preview) return;
    const copy = eventFromPlan(
      { ...brief, title: `${brief.title.slice(0, 85)} · new plan` },
      preview.plan,
    ) as Event;
    copy.notes = preview.plan.summary;
    copy.provenance = {
      source: preview.source === "ai" ? "ai" : "template",
      model: preview.model,
      createdAt: new Date().toISOString(),
    };
    onCreate(copy);
  }
  return (
    <>
      <PageHeading
        eyebrow="YOUR IDEAS, WITH A LITTLE EXTRA SPARK"
        title="Dream it. Let’s plan it."
        description="A thoughtful planning companion for the moments you can’t wait to celebrate."
      />
      <div className="studio-layout">
        <section className="panel studio-input">
          <div className="studio-intro">
            <span className="ai-orb">
              <WandSparkles size={25} />
            </span>
            <div>
              <h2>Let’s bring your vision to life.</h2>
              <p>
                Start with your event. Add the little things that make it yours.
              </p>
            </div>
          </div>
          <div className="brief-card">
            <div>
              <span className="eyebrow">YOUR EVENT BRIEF</span>
              <h3>{event.title}</h3>
            </div>
            <dl>
              <div>
                <dt>Celebration</dt>
                <dd className="capitalize">{event.type}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{event.location}</dd>
              </div>
              <div>
                <dt>Guests</dt>
                <dd>{event.guests}</dd>
              </div>
              <div>
                <dt>Budget</dt>
                <dd>{money(event.budget, event.currency)}</dd>
              </div>
            </dl>
            {event.preferences && <p>{event.preferences}</p>}
          </div>
          <div className="notice" role="status">
            <p>{serviceMessage}</p>
            <button
              type="button"
              className="text-link"
              onClick={refreshStatus}
              aria-label="Refresh AI service status"
            >
              <RefreshCw size={16} />
            </button>
          </div>
          <form onSubmit={generate} aria-busy={loading}>
            <label>
              What would make it special?
              <textarea
                rows={5}
                maxLength={1600}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="An intimate garden celebration, a relaxed timeline, thoughtful details on a modest budget…"
              />
            </label>
            <div className="prompt-chips">
              {[
                "Make it eco-friendly",
                "Keep it intimate",
                "Include everyone",
              ].map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() =>
                    setPrompt((p) => `${p}${p ? ". " : ""}${s}`.slice(0, 1600))
                  }
                >
                  <PlusSmall />
                  {s}
                </button>
              ))}
            </div>
            <div className="model-label">
              <label htmlFor="model-picker">Your AI model</label>
              <span>
                {catalogSource === "live"
                  ? `${models.length} text models`
                  : catalogSource === "loading"
                    ? "Loading catalog…"
                    : "Limited catalog"}
              </span>
            </div>
            <button
              type="button"
              className="model-picker"
              id="model-picker"
              aria-haspopup="dialog"
              onClick={() => setShowModels(true)}
            >
              <span className="model-icon">
                <Sparkles size={18} />
              </span>
              <span>
                <strong>{selected.name}</strong>
                <small>
                  {selected.free
                    ? "Free model · provider limits may apply"
                    : "Paid model · OpenRouter credits required"}
                </small>
              </span>
              <ChevronDown size={17} />
            </button>
            <p className="field-note">
              Select any text-capable model in OpenRouter’s live catalog.
              Availability and pricing depend on the provider.
            </p>
            {aiEnabled ? (
              <>
                <label className="access-code-label">
                  <LockKeyhole size={14} />
                  Private AI access code
                  <input
                    type="password"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    maxLength={200}
                    autoComplete="off"
                    placeholder="Ask the app owner for the access code"
                    required
                  />
                </label>
                <label className="checkbox-label consent">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    required
                  />
                  I agree to send this event brief and request to OpenRouter and
                  the selected model provider. Guest lists and vendor contacts
                  are excluded.
                </label>
              </>
            ) : (
              <div className="notice studio-notice">
                <LockKeyhole size={18} />
                <p>
                  <strong>Starter mode is ready.</strong> The owner can enable
                  live AI by adding the OpenRouter key and a private access code
                  in Render. Until then, use a curated, editable starter plan.
                </p>
              </div>
            )}
            {error && (
              <p className="form-error" role="alert">
                <CircleAlert size={16} />
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="button primary full-width generate-button"
            >
              {loading ? (
                <LoaderCircle className="spin" size={18} />
              ) : (
                <Sparkles size={18} />
              )}{" "}
              {loading
                ? "A little planning magic in progress…"
                : aiEnabled
                  ? "Generate my event plan"
                  : "Build my starter plan"}
              {!loading && <ArrowRight size={17} />}
            </button>
            {loading && (
              <button
                type="button"
                className="text-link cancel-generation"
                onClick={() => abortRef.current?.abort()}
              >
                Cancel generation
              </button>
            )}
            {aiEnabled && (
              <button
                type="button"
                disabled={loading}
                onClick={template}
                className="button secondary full-width starter-button"
              >
                Use a starter plan instead
              </button>
            )}
            <p className="form-footnote">
              <ShieldCheck size={13} />
              Review first. Nothing in your event changes automatically.
            </p>
          </form>
        </section>
        <div className="studio-output">
          {preview ? (
            <section className="panel plan-preview">
              <div className="plan-preview-heading">
                <span className="ai-orb">
                  <Check size={22} />
                </span>
                <div>
                  <span className="eyebrow">
                    {preview.source === "ai"
                      ? "GENERATED WITH AI"
                      : "CURATED STARTER PLAN"}
                  </span>
                  <h2>A little vision. A clear direction.</h2>
                </div>
              </div>
              {preview.model && (
                <p className="field-note">Model: {preview.model}</p>
              )}
              <p className="plan-summary">{preview.plan.summary}</p>
              <h3>Your budget, thoughtfully divided</h3>
              <div className="plan-budget">
                {preview.plan.budgets.map((b, i) => (
                  <div key={i}>
                    <span>{b.category}</span>
                    <strong>{money(b.amount, event.currency)}</strong>
                  </div>
                ))}
              </div>
              <h3>A few moments to plan for</h3>
              <ol className="plan-tasks">
                {preview.plan.tasks.map((t, i) => (
                  <li key={i}>
                    <span>{t.title}</span>
                    <small>{t.daysBefore} days before</small>
                  </li>
                ))}
              </ol>
              <h3>Your vendor selection checklist</h3>
              {preview.plan.vendors.map((v) => (
                <div className="plan-idea" key={v.category}>
                  <ShieldCheck size={16} />
                  <div>
                    <strong>{v.category}</strong>
                    <p>{v.requirements}</p>
                  </div>
                </div>
              ))}
              <h3>Made a little more personal</h3>
              {preview.plan.ideas.map((idea, i) => (
                <div className="plan-idea" key={i}>
                  <Sparkles size={16} />
                  <div>
                    <strong>{idea.title}</strong>
                    <p>{idea.detail}</p>
                  </div>
                </div>
              ))}
              <div className="notice">
                <CircleAlert size={17} />
                <p>
                  Planning estimates, not confirmed prices or reservations.
                  Review safety, accessibility and local requirements with your
                  vendors.
                </p>
              </div>
              <button className="button primary full-width" onClick={usePlan}>
                Create a new event with this plan
                <ArrowRight size={17} />
              </button>
              <p className="form-footnote">
                Your current event stays saved. A new event is created with this
                plan.
              </p>
            </section>
          ) : (
            <section className="studio-placeholder">
              <div className="placeholder-art">
                <Botanical />
                <span className="ai-orb">
                  <Sparkles size={29} />
                </span>
              </div>
              <span className="eyebrow">LET’S MAKE SOMETHING MEMORABLE</span>
              <h2>
                Your next great
                <br />
                celebration starts here.
              </h2>
              <p>
                A personalized budget. A practical timeline.
                <br />
                And a few ideas you might just fall in love with.
              </p>
              <div className="placeholder-features">
                <span>
                  <Check size={15} />
                  Budget-aware suggestions
                </span>
                <span>
                  <Check size={15} />A timeline that makes sense
                </span>
                <span>
                  <Check size={15} />
                  Thoughtful, personal touches
                </span>
              </div>
            </section>
          )}
        </div>
      </div>
      {showModels && (
        <Modal
          title="Find your planning companion."
          description="Live OpenRouter text model catalog. One model handles each request."
          onClose={() => setShowModels(false)}
        >
          <label>
            Search models
            <input
              type="search"
              value={modelSearch}
              onChange={(e) => setModelSearch(e.target.value)}
              placeholder="Search OpenAI, Anthropic, Google, Qwen…"
            />
          </label>
          <label className="checkbox-label model-free">
            <input
              type="checkbox"
              checked={freeOnly}
              onChange={(e) => setFreeOnly(e.target.checked)}
            />
            Show free models only
          </label>
          {catalogSource !== "live" && (
            <p className="notice">
              The live catalog is unavailable right now. A default free router
              is available; try refreshing the page later.
            </p>
          )}
          <button
            className="text-link"
            disabled={loading || catalogSource === "loading"}
            onClick={() => setCatalogRefresh((n) => n + 1)}
          >
            <RefreshCw size={14} />
            {catalogSource === "loading"
              ? "Refreshing catalog…"
              : "Refresh model catalog"}
          </button>
          <p className="field-note">
            {filtered.length} models match your filters.
          </p>
          <div className="model-list">
            {filtered.length ? (
              filtered.map((m) => (
                <button
                  key={m.id}
                  className={`model-option ${model === m.id ? "selected" : ""}`}
                  aria-pressed={model === m.id}
                  onClick={() => {
                    setModel(m.id);
                    setShowModels(false);
                  }}
                >
                  <span>
                    <strong>{m.name}</strong>
                    <small>{m.id}</small>
                    {!m.free &&
                      Number.isFinite(Number(m.inputPrice)) &&
                      Number.isFinite(Number(m.outputPrice)) && (
                        <small>
                          ${(Number(m.inputPrice) * 1000000).toFixed(2)} input /
                          ${(Number(m.outputPrice) * 1000000).toFixed(2)} output
                          per 1M tokens
                        </small>
                      )}
                  </span>
                  <span className="pill">
                    {m.free
                      ? "Free"
                      : Number.isFinite(Number(m.inputPrice))
                        ? "Paid"
                        : "Pricing unavailable"}
                  </span>
                  {model === m.id && <Check size={17} />}
                </button>
              ))
            ) : (
              <p className="mini-empty">No models match that search.</p>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
function PlusSmall() {
  return <span>+</span>;
}
