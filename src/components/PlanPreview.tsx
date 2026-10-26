import {
  ArrowRight,
  Check,
  CircleAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { money } from "../lib/storage";
import type { PlanPreviewData } from "../lib/usePlanner";
export function PlanPreview({
  preview,
  onUse,
}: {
  preview: PlanPreviewData;
  onUse: () => void;
}) {
  const currency = preview.brief.currency;
  return (
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
      {preview.model && <p className="field-note">Model: {preview.model}</p>}
      <p className="plan-summary">{preview.plan.summary}</p>
      <h3>Your budget, thoughtfully divided</h3>
      {preview.source === "ai" && (
        <p className="field-note">
          Category priorities are allocated to your total, with a 10%
          contingency rounded up to a whole currency unit.
        </p>
      )}
      <div className="plan-budget">
        {preview.plan.budgets.map((b, i) => (
          <div key={i}>
            <span>{b.category}</span>
            <strong>{money(b.amount, currency)}</strong>
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
          Planning estimates, not confirmed prices or reservations. Review
          safety, accessibility and local requirements with your vendors.
        </p>
      </div>
      <button className="button primary full-width" onClick={onUse}>
        Create a new event with this plan
        <ArrowRight size={17} />
      </button>
      <p className="form-footnote">
        Your current event stays saved. A new event is created with this plan.
      </p>
    </section>
  );
}
