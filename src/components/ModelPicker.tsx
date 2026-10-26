import { useState } from "react";
import { Check, RefreshCw } from "lucide-react";
import { Modal } from "./ui";
import { hasKnownPricing } from "../lib/models";
import type { Model } from "../lib/types";
export function ModelPicker({
  models,
  model,
  catalogSource,
  loading,
  refresh,
  onSelect,
  onClose,
}: {
  models: Model[];
  model: string;
  catalogSource: string;
  loading: boolean;
  refresh: () => void;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [modelSearch, setModelSearch] = useState("");
  const [freeOnly, setFreeOnly] = useState(false);
  const filtered = models.filter(
    (m) =>
      (!freeOnly || m.free) &&
      `${m.name} ${m.id}`
        .toLocaleLowerCase()
        .includes(modelSearch.toLocaleLowerCase()),
  );
  return (
    <Modal
      title="Find your planning companion."
      description="Live OpenRouter text model catalog. One model handles each request."
      onClose={() => onClose()}
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
      {catalogSource === "fallback" && (
        <p className="notice">
          The live catalog is unavailable right now. A default free router is
          available; try refreshing the catalog later.
        </p>
      )}
      <button
        className="text-link"
        disabled={loading || catalogSource === "loading"}
        onClick={() => refresh()}
      >
        <RefreshCw size={14} />
        {catalogSource === "loading"
          ? "Refreshing catalog…"
          : "Refresh model catalog"}
      </button>
      <p className="field-note">{filtered.length} models match your filters.</p>
      <div className="model-list">
        {filtered.length ? (
          filtered.map((m) => (
            <button
              key={m.id}
              className={`model-option ${model === m.id ? "selected" : ""}`}
              aria-pressed={model === m.id}
              onClick={() => {
                onSelect(m.id);
                onClose();
              }}
            >
              <span>
                <strong>{m.name}</strong>
                <small>{m.id}</small>
                {!m.free && hasKnownPricing(m) && (
                  <small>
                    ${(Number(m.inputPrice) * 1000000).toFixed(2)} input / $
                    {(Number(m.outputPrice) * 1000000).toFixed(2)} output per 1M
                    tokens
                  </small>
                )}
              </span>
              <span className="pill">
                {m.free
                  ? "Free"
                  : hasKnownPricing(m)
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
  );
}
