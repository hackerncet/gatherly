import { useMemo, useState, type FormEvent } from "react";
import {
  CalendarDays,
  ClipboardList,
  Download,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Modal, PageHeading, Empty, Confirm } from "../components/ui";
import { today, uid, agendaItemSchema } from "../lib/domain.ts";
import { planningInsights, calendarFile, eventBrief } from "../lib/planning.ts";
import { DownloadLink } from "../components/DownloadLink";
import { dateLabel } from "../lib/storage";
import type { Event, Page } from "../lib/types";

type AgendaItem = Event["agenda"][number];
export function Guide({
  event,
  onUpdate,
  navigate,
  notify,
}: {
  event: Event;
  onUpdate: (event: Event) => void;
  navigate: (page: Page) => void;
  notify: (message: string) => void;
}) {
  const [editing, setEditing] = useState<AgendaItem | null>(null);
  const [deleting, setDeleting] = useState<AgendaItem | null>(null);
  const risks = planningInsights(event, today());
  const calendar = useMemo(() => calendarFile(event), [event]);
  const brief = useMemo(() => eventBrief(event), [event]);
  const ordered = [...event.agenda].sort((a, b) =>
    a.time.localeCompare(b.time),
  );
  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const values = new FormData(e.currentTarget);
    const parsed = agendaItemSchema.safeParse({
      id: editing.id,
      time: values.get("time"),
      title: values.get("title"),
      owner: values.get("owner"),
    });
    if (!parsed.success) {
      notify("Enter a valid time and a name for this schedule item.");
      return;
    }
    const updated = parsed.data;
    const exists = event.agenda.some((a) => a.id === updated.id);
    onUpdate({
      ...event,
      agenda: exists
        ? event.agenda.map((a) => (a.id === updated.id ? updated : a))
        : [...event.agenda, updated],
    });
    setEditing(null);
    notify("Event-day schedule updated.");
  }
  return (
    <>
      <PageHeading
        eyebrow="READY FOR THE MOMENT"
        title="The plan for the day."
        description="Bring your next decisions and event-day schedule together."
        action={
          <div className="button-group">
            <DownloadLink
              name="gatherly-calendar.ics"
              content={calendar}
              type="text/calendar;charset=utf-8"
            >
              <CalendarDays size={17} />
              Export calendar
            </DownloadLink>
            <DownloadLink
              name="gatherly-event-brief.md"
              content={brief}
              type="text/markdown;charset=utf-8"
            >
              <Download size={17} />
              Event brief
            </DownloadLink>
          </div>
        }
      />
      <div className="guide-grid">
        <section className="panel guide-section" aria-labelledby="guide-risks">
          <h2 id="guide-risks">A few things to check</h2>
          <p className="field-note">
            Based on your saved records. These checks support your judgment.
          </p>
          {risks.length ? (
            risks.map((r) => (
              <article className="guide-insight" key={r.title}>
                <h3>{r.title}</h3>
                <p>{r.detail}</p>
                <button className="text-link" onClick={() => navigate(r.page)}>
                  Review {r.page}
                </button>
              </article>
            ))
          ) : (
            <p>
              No issues identified by these basic checks. Confirm your final
              arrangements with everyone involved.
            </p>
          )}
        </section>
        <section className="panel guide-section" aria-labelledby="guide-agenda">
          <div className="section-title">
            <div>
              <h2 id="guide-agenda">Your event-day schedule</h2>
              <p>{dateLabel(event.date)} · times are local to the venue</p>
            </div>
            <button
              className="button primary"
              disabled={event.agenda.length >= 50}
              onClick={() =>
                setEditing({ id: uid(), time: "10:00", title: "", owner: "" })
              }
            >
              <Plus size={17} />
              Add moment
            </button>
          </div>
          {ordered.length ? (
            <ol className="agenda-list">
              {ordered.map((a) => (
                <li key={a.id}>
                  <time>{a.time}</time>
                  <div>
                    <strong>{a.title}</strong>
                    <p>{a.owner || "Organizer to assign"}</p>
                  </div>
                  <button
                    className="icon-button"
                    aria-label={`Edit ${a.title}`}
                    onClick={() => setEditing(a)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={`Delete ${a.title}`}
                    onClick={() => setDeleting(a)}
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <Empty
              icon={<ClipboardList />}
              title="Give the day a little structure."
              description="Add setup, arrivals, activities and cleanup. Assign a contact for each moment."
            />
          )}
          <p className="field-note">
            Up to 50 moments. Coordinate overlapping times and responsibilities
            with your team.
          </p>
        </section>
      </div>
      <section className="notice guide-source">
        <ClipboardList size={20} />
        <div>
          <strong>Where this plan started</strong>
          <p>
            {event.provenance
              ? `${event.provenance.source === "ai" ? `AI suggestions using ${event.provenance.model || "the selected model"}` : "A curated starter template"} · ${new Date(event.provenance.createdAt).toLocaleDateString("en-IN")}`
              : "Imported or manually created plan"}
            . Your edits and recorded statuses remain your responsibility.
          </p>
          <p>
            Calendar export includes the event and unfinished preparation tasks
            as all-day entries. Importing the file does not contact guests or
            vendors.
          </p>
        </div>
      </section>
      {editing && (
        <Modal
          title={
            event.agenda.some((a) => a.id === editing.id)
              ? "Edit this moment"
              : "Add a moment"
          }
          onClose={() => setEditing(null)}
        >
          <form onSubmit={save}>
            <label>
              Time at the venue
              <input
                type="time"
                required
                name="time"
                defaultValue={editing.time}
              />
            </label>
            <label>
              What is happening?
              <input
                required
                maxLength={160}
                name="title"
                defaultValue={editing.title}
              />
            </label>
            <label>
              Responsible person or team
              <input
                maxLength={100}
                name="owner"
                defaultValue={editing.owner}
              />
            </label>
            <div className="modal-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
              <button className="button primary" type="submit">
                Save moment
              </button>
            </div>
          </form>
        </Modal>
      )}
      {deleting && (
        <Confirm
          title="Remove this moment?"
          description={`Remove “${deleting.title}” from your event-day schedule.`}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            onUpdate({
              ...event,
              agenda: event.agenda.filter((a) => a.id !== deleting.id),
            });
            notify("Schedule item removed.");
          }}
        />
      )}
    </>
  );
}
