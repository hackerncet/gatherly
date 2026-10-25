import { useState, type FormEvent } from "react";
import {
  Check,
  Clock3,
  Pencil,
  Plus,
  Trash2,
  Users,
  Download,
} from "lucide-react";
import { Confirm, Empty, Modal, PageHeading } from "../components/ui";
import { escapeCsv, guestSchema, totals, uid } from "../lib/domain.ts";
import { downloadFile } from "../lib/storage";
import type { Event, Guest } from "../lib/types";
export function Guests({
  event,
  onUpdate,
  notify,
}: {
  event: Event;
  onUpdate: (e: Event) => void;
  notify: (s: string) => void;
}) {
  const [editing, setEditing] = useState<Guest | null | false>(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const t = totals(event);
  const total = event.guestList.reduce((n, g) => n + g.count, 0);
  const guests = event.guestList.filter(
    (g) =>
      (filter === "all" || filter === g.rsvp) &&
      `${g.name} ${g.group}`.toLowerCase().includes(search.toLowerCase()),
  );
  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const r = guestSchema.safeParse({
      id: editing ? editing.id : uid(),
      name: f.get("name"),
      group: f.get("group"),
      count: Number(f.get("count")),
      rsvp: f.get("rsvp"),
      dietary: f.get("dietary"),
    });
    if (!r.success) {
      setError("Please check the name, group and party size (1–100).");
      return;
    }
    if (!editing && event.guestList.length >= 1000) {
      setError("You can keep up to 1,000 guest entries per event.");
      return;
    }
    onUpdate({
      ...event,
      guestList: editing
        ? event.guestList.map((g) => (g.id === editing.id ? r.data : g))
        : [...event.guestList, r.data],
    });
    setEditing(false);
    notify("Guest details saved.");
  }
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
            <button
              className="button primary"
              onClick={() => {
                setEditing(null);
                setError("");
              }}
            >
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
                          onChange={(e) =>
                            onUpdate({
                              ...event,
                              guestList: event.guestList.map((item) =>
                                item.id === g.id
                                  ? {
                                      ...item,
                                      rsvp: e.target.value as Guest["rsvp"],
                                    }
                                  : item,
                              ),
                            })
                          }
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
                          onClick={() => {
                            setEditing(g);
                            setError("");
                          }}
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
      {editing !== false && (
        <Modal
          title={
            editing ? "A few guest details" : "Make room for someone special."
          }
          onClose={() => setEditing(false)}
        >
          <form onSubmit={save}>
            <div className="form-grid">
              <label className="span-2">
                Guest or household name
                <input
                  name="name"
                  required

                  maxLength={100}
                  defaultValue={editing?.name}
                />
              </label>
              <label>
                Group
                <input
                  name="group"
                  required
                  maxLength={60}
                  defaultValue={editing?.group || "Friends"}
                />
              </label>
              <label>
                Party size
                <input
                  name="count"
                  type="number"
                  required
                  min="1"
                  max="100"
                  defaultValue={editing?.count || 1}
                />
              </label>
              <label className="span-2">
                RSVP
                <select name="rsvp" defaultValue={editing?.rsvp || "pending"}>
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
                  maxLength={180}
                  rows={3}
                  defaultValue={editing?.dietary}
                  placeholder="Only add details your guest has agreed to share."
                />
              </label>
            </div>
            {error && (
              <p role="alert" className="form-error">
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
              <button className="button primary">Save guest</button>
            </div>
          </form>
        </Modal>
      )}
      {deleting && (
        <Confirm
          title="Remove this guest entry?"
          description="This guest’s party size, RSVP and notes will be removed. No message will be sent."
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            onUpdate({
              ...event,
              guestList: event.guestList.filter((g) => g.id !== deleting),
            });
            notify("Guest removed.");
          }}
        />
      )}
    </>
  );
}
