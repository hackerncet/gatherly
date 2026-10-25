import { useState, type FormEvent } from "react";
import {
  Check,
  ClipboardCheck,
  Pencil,
  Plus,
  Store,
  Trash2,
} from "lucide-react";
import { Confirm, Empty, Modal, PageHeading } from "../components/ui";
import { uid, vendorSchema } from "../lib/domain.mjs";
import { money } from "../lib/storage";
import type { Event, Vendor } from "../lib/types";
const checks = [
  "Quote received",
  "Availability confirmed",
  "Terms & cancellation reviewed",
  "Booking confirmed",
];
export function Vendors({
  event,
  onUpdate,
  notify,
}: {
  event: Event;
  onUpdate: (e: Event) => void;
  notify: (s: string) => void;
}) {
  const [editing, setEditing] = useState<Vendor | null | false>(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const r = vendorSchema.safeParse({
      id: editing ? editing.id : uid(),
      name: f.get("name"),
      category: f.get("category"),
      contact: f.get("contact"),
      quote: Number(f.get("quote")),
      status: f.get("status"),
      notes: f.get("notes"),
      checklist: editing ? editing.checklist : [false, false, false, false],
    });
    if (!r.success) {
      setError("Check your vendor details and quote amount.");
      return;
    }
    if (!editing && event.vendors.length >= 100) {
      setError("You can keep up to 100 vendors per event.");
      return;
    }
    onUpdate({
      ...event,
      vendors: editing
        ? event.vendors.map((v) => (v.id === editing.id ? r.data : v))
        : [...event.vendors, r.data],
    });
    setEditing(false);
    notify("Vendor details saved.");
  }
  const vendors = event.vendors.filter(
    (v) => filter === "all" || v.status === filter,
  );
  return (
    <>
      <PageHeading
        eyebrow="GOOD PEOPLE. GREAT CELEBRATIONS."
        title="Your dream team, coming together."
        description="Keep real quotes, contacts and the important little checks in one place."
        action={
          <button
            className="button primary"
            onClick={() => {
              setEditing(null);
              setError("");
            }}
          >
            <Plus size={17} />
            Add a vendor
          </button>
        }
      />
      <div className="vendor-summary">
        <div>
          <Store size={19} />
          <strong>{event.vendors.length}</strong> shortlisted vendors
        </div>
        <div>
          <Check size={19} />
          <strong>
            {event.vendors.filter((v) => v.status === "booked").length}
          </strong>{" "}
          marked as booked
        </div>
        <div>
          <ClipboardCheck size={19} />
          <strong>
            {money(
              event.vendors.reduce((n, v) => n + v.quote, 0),
              event.currency,
            )}
          </strong>{" "}
          total quoted
        </div>
      </div>
      <div className="filter-row" role="group" aria-label="Filter vendors">
        {["all", "shortlisted", "contacted", "booked"].map((id) => (
          <button
            key={id}
            className={`filter-button ${filter === id ? "active" : ""}`}
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
          >
            {id === "all"
              ? "All vendors"
              : id.charAt(0).toUpperCase() + id.slice(1)}
          </button>
        ))}
      </div>
      <div className="vendor-grid">
        {vendors.length ? (
          vendors.map((v, i) => (
            <section className="panel vendor-card" key={v.id}>
              <div className="vendor-card-head">
                <span
                  className={`large-icon ${["sage", "peach", "lilac"][i % 3]}`}
                >
                  <Store size={22} />
                </span>
                <span className={`status-badge ${v.status}`}>{v.status}</span>
                <div className="row-actions">
                  <button
                    className="icon-button"
                    aria-label={`Edit ${v.name}`}
                    onClick={() => {
                      setEditing(v);
                      setError("");
                    }}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Delete ${v.name}`}
                    onClick={() => setDeleting(v.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <span className="eyebrow">{v.category}</span>
              <h2>{v.name}</h2>
              <p className="vendor-contact">
                {v.contact || "No contact added yet"}
              </p>
              <div className="vendor-quote">
                <span>Quoted amount</span>
                <strong>{money(v.quote, event.currency)}</strong>
              </div>
              <div className="vendor-checklist">
                <h3>The little checks that matter</h3>
                {checks.map((label, index) => (
                  <label key={label}>
                    <input
                      type="checkbox"
                      checked={v.checklist[index]}
                      onChange={() =>
                        onUpdate({
                          ...event,
                          vendors: event.vendors.map((item) =>
                            item.id === v.id
                              ? {
                                  ...item,
                                  checklist: item.checklist.map((done, j) =>
                                    j === index ? !done : done,
                                  ),
                                }
                              : item,
                          ),
                        })
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
              {v.notes && <p className="vendor-notes">{v.notes}</p>}
            </section>
          ))
        ) : (
          <div className="panel span-all">
            <Empty
              icon={<Store />}
              title="Great celebrations start with good people"
              description="Add a real vendor to compare quotes and work through your booking checklist."
              action={
                <button
                  className="button primary"
                  onClick={() => setEditing(null)}
                >
                  Add your first vendor
                </button>
              }
            />
          </div>
        )}
      </div>
      <div className="notice">
        <ClipboardCheck size={19} />
        <p>
          This is your personal shortlist. Entries and statuses are managed by
          you; Gatherly does not verify, contact or book vendors. Vendor quotes
          do not automatically change your budget.
        </p>
      </div>
      {editing !== false && (
        <Modal
          title={editing ? "The vendor details" : "Meet a new team member."}
          onClose={() => setEditing(false)}
        >
          <form onSubmit={save}>
            <div className="form-grid">
              <label className="span-2">
                Vendor or business name
                <input
                  name="name"
                  autoFocus
                  required
                  maxLength={100}
                  defaultValue={editing?.name}
                />
              </label>
              <label>
                Category
                <input
                  name="category"
                  required
                  maxLength={80}
                  defaultValue={editing?.category || "Venue"}
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
                  defaultValue={editing?.status || "shortlisted"}
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
                  maxLength={180}
                  defaultValue={editing?.contact}
                  placeholder="Phone, email or website"
                />
              </label>
              <label className="span-2">
                Quoted amount ({event.currency})
                <input
                  name="quote"
                  type="number"
                  min="0"
                  max="1000000000"
                  step="1"
                  required
                  defaultValue={editing?.quote || 0}
                />
              </label>
              <label className="span-2">
                Notes
                <textarea
                  name="notes"
                  rows={3}
                  maxLength={600}
                  defaultValue={editing?.notes}
                />
              </label>
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
              <button className="button primary">Save vendor</button>
            </div>
          </form>
        </Modal>
      )}
      {deleting && (
        <Confirm
          title="Remove this vendor?"
          description="This vendor’s quote, notes and checklist will be deleted. No cancellation message will be sent."
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            onUpdate({
              ...event,
              vendors: event.vendors.filter((v) => v.id !== deleting),
            });
            notify("Vendor removed.");
          }}
        />
      )}
    </>
  );
}
