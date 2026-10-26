import type { Guest } from "../../lib/types.ts";
import { uid } from "../../lib/dates.ts";
import { guestSchema } from "../../lib/schemas.ts";
import { RecordEditor, type RecordEditorProps } from "./RecordEditor";

export function GuestEditor({
  initial,
  onSave,
  onClose,
}: RecordEditorProps<Guest>) {
  return (
    <RecordEditor
      schema={guestSchema}
      title={initial ? "A few guest details" : "Make room for someone special."}
      submitLabel={"Save guest"}
      onSave={onSave}
      onClose={onClose}
      readValues={(data) => ({
        id: initial?.id ?? uid(),
        name: data.get("name"),
        group: data.get("group"),
        count: Number(data.get("count")),
        rsvp: data.get("rsvp"),
        dietary: data.get("dietary"),
      })}
    >
      {(validation) => (
        <div className="form-grid">
          <label className="span-2">
            Guest or household name
            <input
              name="name"
              {...validation.input("name")}
              required

              maxLength={100}
              defaultValue={initial?.name}
            />
          </label>
          <label>
            Group
            <input
              name="group"
              {...validation.input("group")}
              required
              maxLength={60}
              defaultValue={initial?.group || "Friends"}
            />
          </label>
          <label>
            Party size
            <input
              name="count"
              {...validation.input("count")}
              type="number"
              required
              min="1"
              max="100"
              defaultValue={initial?.count || 1}
            />
          </label>
          <label className="span-2">
            RSVP
            <select
              name="rsvp"
              {...validation.input("rsvp")}
              defaultValue={initial?.rsvp || "pending"}
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="declined">Declined</option>
            </select>
          </label>
          <label className="span-2">
            Dietary or accessibility needs{" "}
            <span className="optional">optional</span>
            <textarea
              name="dietary"
              {...validation.input("dietary")}
              maxLength={180}
              rows={3}
              defaultValue={initial?.dietary}
              placeholder="Only add details your guest has agreed to share."
            />
          </label>
        </div>
      )}
    </RecordEditor>
  );
}
