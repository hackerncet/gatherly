import { RECORD_LIMITS } from "../lib/limits";
import { AgendaEditor } from "../components/editors/AgendaEditor";
import { useEventRecords } from "../lib/useEventRecords";
import type { EventPageProps } from "../lib/commands";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  ClipboardList,
  Download,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Confirm } from "../components/Confirm";
import { PageHeading, Empty } from "../components/ui";
import { today } from "../lib/dates.ts";
import { planningInsights, calendarFile, eventBrief } from "../lib/planning.ts";
import { DownloadLink } from "../components/DownloadLink";
import { dateLabel } from "../lib/storage";
import type { Event, Page } from "../lib/types";

export function Guide({
  event,
  onUpdate,
  navigate,
  notify,
}: EventPageProps & { navigate: (page: Page) => void }) {
  const records = useEventRecords("agenda", onUpdate, notify);
  const [deleting, setDeleting] = useState<Event["agenda"][number] | null>(
    null,
  );
  const risks = planningInsights(event, today());
  const calendar = useMemo(() => calendarFile(event), [event]);
  const brief = useMemo(() => eventBrief(event), [event]);
  const ordered = [...event.agenda].sort((a, b) =>
    a.time.localeCompare(b.time),
  );

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
              disabled={event.agenda.length >= RECORD_LIMITS.agenda}
              onClick={records.create}
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
                    onClick={() => records.edit(a)}
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
      {records.isOpen && (
        <AgendaEditor
          initial={records.initial}
          onSave={(record) =>
            records.save(record, "Event-day schedule updated.")
          }
          onClose={records.close}
        />
      )}
      {deleting && (
        <Confirm
          title="Remove this moment?"
          description={`Remove “${deleting.title}” from your event-day schedule.`}
          onClose={() => setDeleting(null)}
          onConfirm={() =>
            records.remove(deleting.id, "Schedule item removed.")
          }
        />
      )}
    </>
  );
}
