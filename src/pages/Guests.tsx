import { guestSchema } from "../lib/schemas";
import { GuestEditor } from "../components/editors/GuestEditor";
import { useEventRecords } from "../lib/useEventRecords";
import type { EventPageProps } from "../lib/commands";
import { useState } from "react";
import {
  Check,
  Clock3,
  Pencil,
  Plus,
  Trash2,
  Users,
  Download,
} from "lucide-react";
import { Confirm } from "../components/Confirm";
import { Empty, PageHeading } from "../components/ui";
import { escapeCsv, totals } from "../lib/events.ts";
import { downloadFile } from "../lib/storage";
export function Guests({ event, onUpdate, notify }: EventPageProps) {
  const records = useEventRecords("guestList", onUpdate, notify);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const t = totals(event);
  const total = event.guestList.reduce((n, g) => n + g.count, 0);
  const guests = event.guestList.filter(
    (g) =>
      (filter === "all" || filter === g.rsvp) &&
      `${g.name} ${g.group}`.toLowerCase().includes(search.toLowerCase()),
  );

  function exportGuests() {
    const rows = [
      ["Name", "Group", "Party size", "RSVP", "Dietary or access notes"],
      ...event.guestList.map((g) => [
        g.name,
        g.group,
        g.count,
        g.rsvp,
        g.dietary,
      ]),
    ];
    downloadFile(
      "gatherly-guests.csv",
      rows.map((r) => r.map(escapeCsv).join(",")).join("\r\n"),
      "text/csv;charset=utf-8",
    );
  }
  return (
    <>
      <PageHeading
        eyebrow="THE PEOPLE MAKE THE PARTY"
        title="A place for everyone you love."
        description="Keep track of invitations, RSVPs and the details that help everyone feel welcome."
        action={
          <div className="button-group">
            <button className="button secondary" onClick={exportGuests}>
              <Download size={16} />
              Export
            </button>
            <button className="button primary" onClick={records.create}>
              <Plus size={17} />
              Add guests
            </button>
          </div>
        }
      />
      <div className="guest-stats">
        <div className="panel">
          <Users size={21} />
          <strong>{total}</strong>
          <span>on your list</span>
          <small>{event.guests} expected overall</small>
        </div>
        <div className="panel">
          <Check size={21} />
          <strong>{t.confirmed}</strong>
          <span>confirmed</span>
          <small>Ready to celebrate</small>
        </div>
        <div className="panel">
          <Clock3 size={21} />
          <strong>
            {event.guestList
              .filter((g) => g.rsvp === "pending")
              .reduce((n, g) => n + g.count, 0)}
          </strong>
          <span>awaiting a reply</span>
          <small>A little follow-up helps</small>
        </div>
      </div>
      {total > event.guests && (
        <p className="notice warning">
          Your guest list is larger than the expected count. Review your venue
          capacity and update the event details.
        </p>
      )}
      <div className="guests-toolbar">
        <div className="filter-row" role="group" aria-label="Filter guests">
          {["all", "confirmed", "pending", "declined"].map((f) => (
            <button
              key={f}
              className={`filter-button ${filter === f ? "active" : ""}`}
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {f === "all"
                ? "Everyone"
                : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <label>
          <span className="sr-only">Search guests</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a name or group…"
          />
        </label>
      </div>
      <section className="panel table-panel">
        {guests.length ? (
          <div
            className="table-scroll"
            role="region"
            aria-label="Scrollable guest list table"
            tabIndex={0}
          >
            <table>
              <caption className="sr-only">Guest list and RSVP status</caption>
              <thead>
                <tr>
                  <th scope="col">Guest / household</th>
                  <th scope="col">Group</th>
                  <th scope="col">Party size</th>
                  <th scope="col">RSVP</th>
                  <th scope="col">Dietary & access notes</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {guests.map((g) => (
                  <tr key={g.id}>
                    <th scope="row">
                      <span className="guest-avatar">
                        {g.name.charAt(0).toUpperCase()}
                      </span>
                      {g.name}
                    </th>
                    <td>{g.group}</td>
                    <td>{g.count}</td>
                    <td>
                      <label>
                        <span className="sr-only">RSVP for {g.name}</span>
                        <select
                          className={`rsvp-select ${g.rsvp}`}
                          aria-label={`RSVP for ${g.name}`}
                          value={g.rsvp}
                          onChange={(event) => {
                            const rsvp = event.currentTarget.value;
                            records.change(g.id, (current) => ({
                              ...current,
                              rsvp: guestSchema.shape.rsvp.parse(rsvp),
                            }));
                          }}
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="declined">Declined</option>
                        </select>
                      </label>
                    </td>
                    <td className="guest-notes">{g.dietary || "—"}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-button"
                          aria-label={`Edit ${g.name}`}
                          onClick={() => records.edit(g)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={`Delete ${g.name}`}
                          onClick={() => setDeleting(g.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            icon={<Users />}
            title="The best part is who you share it with"
            description="Add a guest or household, or try a different filter."
          />
        )}
      </section>
      <div className="notice">
        <Users size={18} />
        <p>
          RSVPs are recorded manually by you. No invitations or messages are
          sent. Dietary and access notes stay on this browser and are never
          included in AI requests.
        </p>
      </div>
      {records.isOpen && (
        <GuestEditor
          initial={records.initial}
          onSave={(record) => records.save(record, "Guest details updated.")}
          onClose={records.close}
        />
      )}
      {deleting && (
        <Confirm
          title="Remove this guest entry?"
          description="This guest’s party size, RSVP and notes will be removed. No message will be sent."
          onClose={() => setDeleting(null)}
          onConfirm={() => records.remove(deleting, "Guest removed.")}
        />
      )}
    </>
  );
}
