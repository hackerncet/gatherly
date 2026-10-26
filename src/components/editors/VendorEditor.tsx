import type { Vendor, Currency } from "../../lib/types.ts";
import { uid } from "../../lib/dates.ts";
import { vendorSchema } from "../../lib/schemas.ts";
import { RecordEditor, type RecordEditorProps } from "./RecordEditor";

export function VendorEditor({
  initial,
  onSave,
  onClose,
  currency,
}: RecordEditorProps<Vendor> & { currency: Currency }) {
  return (
    <RecordEditor
      schema={vendorSchema}
      title={initial ? "The vendor details" : "Meet a new team member."}
      submitLabel={"Save vendor"}
      onSave={onSave}
      onClose={onClose}
      readValues={(data) => ({
        id: initial?.id ?? uid(),
        name: data.get("name"),
        category: data.get("category"),
        contact: data.get("contact"),
        quote: Number(data.get("quote")),
        status: data.get("status"),
        notes: data.get("notes"),
        checklist: initial?.checklist ?? [false, false, false, false],
      })}
    >
      {(validation) => (
        <div className="form-grid">
          <label className="span-2">
            Vendor or business name
            <input
              name="name"
              {...validation.input("name")}
              required
              maxLength={100}
              defaultValue={initial?.name}
            />
          </label>
          <label>
            Category
            <input
              name="category"
              {...validation.input("category")}
              required
              maxLength={80}
              defaultValue={initial?.category || "Venue"}
              list="vendor-categories"
            />
            <datalist id="vendor-categories">
              {[
                "Venue",
                "Catering",
                "Photography",
                "Decor & flowers",
                "Music",
                "Cake",
                "Equipment",
                "Other",
              ].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </datalist>
          </label>
          <label>
            Status
            <select
              name="status"
              {...validation.input("status")}
              defaultValue={initial?.status || "shortlisted"}
            >
              <option value="shortlisted">Shortlisted</option>
              <option value="contacted">Contacted</option>
              <option value="booked">Booked</option>
            </select>
          </label>
          <label className="span-2">
            Contact details <span className="optional">optional</span>
            <input
              name="contact"
              {...validation.input("contact")}
              maxLength={180}
              defaultValue={initial?.contact}
              placeholder="Phone, email or website"
            />
          </label>
          <label className="span-2">
            Quoted amount ({currency})
            <input
              name="quote"
              {...validation.input("quote")}
              type="number"
              min="0"
              max="1000000000"
              step="1"
              required
              defaultValue={initial?.quote || 0}
            />
          </label>
          <label className="span-2">
            Notes
            <textarea
              name="notes"
              {...validation.input("notes")}
              rows={3}
              maxLength={600}
              defaultValue={initial?.notes}
            />
          </label>
        </div>
      )}
    </RecordEditor>
  );
}
