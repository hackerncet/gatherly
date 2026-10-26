import { useState } from "react";
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
import { Botanical } from "../components/Botanical";
import { PageHeading } from "../components/ui";
import { money } from "../lib/storage";
import { useModelCatalog } from "../lib/useModelCatalog";
import { usePlanner } from "../lib/usePlanner";
import { ModelPicker } from "../components/ModelPicker";
import { PlanPreview } from "../components/PlanPreview";
import type { Event } from "../lib/types";
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
  const catalog = useModelCatalog();
  const { models, model, selected, source: catalogSource } = catalog;
  const [showModels, setShowModels] = useState(false);
  const planner = usePlanner(event, aiEnabled, notify);
  const {
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
  } = planner;
  function usePlan() {
    const next = planner.createEvent();
    if (next) onCreate(next);
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
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void generate(model);
            }}
            data-workspace-draft={
              Boolean(prompt || code || consent || loading) || undefined
            }
            aria-busy={loading}
          >
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
                {["live", "cached"].includes(catalogSource)
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
                onClick={cancel}
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
            <PlanPreview preview={preview} onUse={usePlan} />
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
        <ModelPicker
          models={models}
          model={model}
          catalogSource={catalogSource}
          loading={loading}
          refresh={catalog.refresh}
          onSelect={catalog.select}
          onClose={() => setShowModels(false)}
        />
      )}
    </>
  );
}
function PlusSmall() {
  return <span aria-hidden="true">+</span>;
}
