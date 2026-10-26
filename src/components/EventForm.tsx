import { useState, type FormEvent } from "react";
import { Heart, Cake, Users, ArrowRight } from "lucide-react";
import { briefSchema, shiftDate, today } from "../lib/domain.ts";
import { useFormValidation } from "../lib/useFormValidation";
import type { Brief, EventType } from "../lib/types";
export const eventTypes = [
  {
    id: "wedding",
    label: "Wedding",
    icon: Heart,
    note: "Your next chapter",
  },
  {
    id: "birthday",
    label: "Birthday",
    icon: Cake,
    note: "Another year of joy",
  },
  {
    id: "community",
    label: "Community",
    icon: Users,
    note: "Better, together",
  },
] as const;
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
  const validation = useFormValidation();
  const { error, errorId } = validation;
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const result = validation.parse(
      briefSchema,
      {
        title: form.get("title"),
        type,
        date: form.get("date"),
        location: form.get("location"),
        guests: Number(form.get("guests")),
        budget: Number(form.get("budget")),
        currency: form.get("currency"),
        preferences: form.get("preferences"),
      },
      e.currentTarget,
    );
    if (result) onSave(result, form.get("shiftTimeline") === "on");
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
            {...validation.input("title")}
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
            {...validation.input("date")}
            type="date"
            required
            defaultValue={initial?.date || shiftDate(today(), 60)}
          />
        </label>
        <label>
          Location
          <input
            name="location"
            {...validation.input("location")}
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
            {...validation.input("guests")}
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
            {...validation.input("currency")}
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
            {...validation.input("budget")}
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
            {...validation.input("preferences")}
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
