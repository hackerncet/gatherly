import { VendorEditor } from "../components/editors/VendorEditor";
import { useEventRecords } from "../lib/useEventRecords";
import type { EventPageProps } from "../lib/commands";
import { useState } from "react";
import {
  Check,
  ClipboardCheck,
  Pencil,
  Plus,
  Store,
  Trash2,
} from "lucide-react";
import { Confirm } from "../components/Confirm";
import { Empty, PageHeading } from "../components/ui";
import { money } from "../lib/storage";
const checks = [
  "Quote received",
  "Availability confirmed",
  "Terms & cancellation reviewed",
  "Booking confirmed",
];
export function Vendors({ event, onUpdate, notify }: EventPageProps) {
  const records = useEventRecords("vendors", onUpdate, notify);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

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
          <button className="button primary" onClick={records.create}>
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
                    onClick={() => records.edit(v)}
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
                        records.change(v.id, (current) => ({
                          ...current,
                          checklist: current.checklist.map((done, position) =>
                            position === index ? !done : done,
                          ),
                        }))
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
                <button className="button primary" onClick={records.create}>
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
      {records.isOpen && (
        <VendorEditor
          initial={records.initial}
          onSave={(record) => records.save(record, "Vendor details updated.")}
          onClose={records.close}
          currency={event.currency}
        />
      )}
      {deleting && (
        <Confirm
          title="Remove this vendor?"
          description="This vendor’s quote, notes and checklist will be deleted. No cancellation message will be sent."
          onClose={() => setDeleting(null)}
          onConfirm={() => records.remove(deleting, "Vendor removed.")}
        />
      )}
    </>
  );
}
