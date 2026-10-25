import { useState, useId, type FormEvent } from "react";
import { Heart, Cake, Users, ArrowRight } from "lucide-react";
import { briefSchema, shiftDate, today } from "../lib/domain.ts";
import type { Brief, EventType } from "../lib/types";
export const eventTypes = [
  {
    id: "wedding" as EventType,
    label: "Wedding",
    icon: Heart,
    note: "Your next chapter",
  },
  {
    id: "birthday" as EventType,
    label: "Birthday",
    icon: Cake,
    note: "Another year of joy",
  },
  {
    id: "community" as EventType,
    label: "Community",
    icon: Users,
    note: "Better, together",
  },
];
export function EventForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Brief;
  onSave: (brief: Brief, shiftTimeline?: boolean) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<EventType>(initial?.type || "wedding");
  const [error, setError] = useState("");
  const [errorField, setErrorField] = useState("");
  const errorId = useId();
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const result = briefSchema.safeParse({
      title: form.get("title"),
      type,
      date: form.get("date"),
      location: form.get("location"),
      guests: Number(form.get("guests")),
      budget: Number(form.get("budget")),
      currency: form.get("currency"),
      preferences: form.get("preferences"),
    });
    if (!result.success) {
      const issue = result.error.issues[0];
      const field = String(issue?.path[0] || "");
      setError(
        `Please check ${field || "your event details"}: ${issue?.message || "A valid value is required."}`,
      );
      setErrorField(field);
      const control = e.currentTarget.elements.namedItem(field);
      if (control instanceof HTMLElement) control.focus();
      return;
    }
    onSave(result.data, form.get("shiftTimeline") === "on");
  }
  return (
    <form onSubmit={submit}>
      <fieldset className="type-fieldset">
        <legend>What are we celebrating?</legend>
        <div className="type-options">
          {eventTypes.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={type === t.id}
              onClick={() => setType(t.id)}
              className={type === t.id ? "selected" : ""}
            >
              <t.icon size={21} />
              <strong>{t.label}</strong>
              <small>{t.note}</small>
            </button>
          ))}
        </div>
      </fieldset>
      <div className="form-grid">
        <label className="span-2">
          Event name
          <input
            name="title"
            aria-invalid={errorField === "title" || undefined}
            aria-describedby={errorField === "title" ? errorId : undefined}
            defaultValue={initial?.title}
            required
            maxLength={100}
            placeholder="e.g. Aanya & Arjun's wedding"
          />
        </label>
        <label>
          Event date
          <input
            name="date"
            aria-invalid={errorField === "date" || undefined}
            aria-describedby={errorField === "date" ? errorId : undefined}
            type="date"
            required
            defaultValue={initial?.date || shiftDate(today(), 60)}
          />
        </label>
        <label>
          Location
          <input
            name="location"
            aria-invalid={errorField === "location" || undefined}
            aria-describedby={errorField === "location" ? errorId : undefined}
            required
            maxLength={120}
            defaultValue={initial?.location}
            placeholder="City or venue"
          />
        </label>
        <label>
          Expected guests
          <input
            name="guests"
            aria-invalid={errorField === "guests" || undefined}
            aria-describedby={errorField === "guests" ? errorId : undefined}
            type="number"
            min="1"
            max="100000"
            step="1"
            required
            defaultValue={initial?.guests || 100}
          />
        </label>
        <label>
          Currency
          <select
            name="currency"
            aria-invalid={errorField === "currency" || undefined}
            aria-describedby={errorField === "currency" ? errorId : undefined}
            defaultValue={initial?.currency || "INR"}
          >
            <option value="INR">INR — Indian rupee</option>
            <option value="USD">USD — US dollar</option>
            <option value="EUR">EUR — Euro</option>
            <option value="GBP">GBP — British pound</option>
          </select>
        </label>
        <label className="span-2">
          Total budget
          <input
            name="budget"
            aria-invalid={errorField === "budget" || undefined}
            aria-describedby={errorField === "budget" ? errorId : undefined}
            type="number"
            required
            min="1"
            max="1000000000"
            step="1"
            defaultValue={initial?.budget || 100000}
          />
        </label>
        <label className="span-2">
          Make it yours <span className="optional">optional</span>
          <textarea
            name="preferences"
            aria-invalid={errorField === "preferences" || undefined}
            aria-describedby={
              errorField === "preferences" ? errorId : undefined
            }
            rows={3}
            maxLength={1600}
            defaultValue={initial?.preferences}
            placeholder="Your style, traditions, food preferences, accessibility needs, little must-haves…"
          />
        </label>
      </div>
      {initial && (
        <div className="edit-behavior-note">
          <label className="checkbox-label">
            <input type="checkbox" name="shiftTimeline" defaultChecked />
            Move unfinished task dates by the same number of days when the event
            date changes. Completed task dates stay recorded.
          </label>
          <p>
            Changing currency relabels existing amounts; it does not convert
            them. Changing event type keeps your existing plan.
          </p>
        </div>
      )}
      {error && (
        <p role="alert" id={errorId} className="form-error">
          {error}
        </p>
      )}
      <div className="modal-actions">
        <button type="button" className="button secondary" onClick={onCancel}>
          Cancel
        </button>
        <button className="button primary" type="submit">
          {initial ? "Save event" : "Create my event"}
          <ArrowRight size={17} />
        </button>
      </div>
      <p className="form-footnote">
        Saved on this browser. Your first plan is an editable starting point.
      </p>
    </form>
  );
}
