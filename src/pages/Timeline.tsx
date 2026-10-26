import { TaskEditor } from "../components/editors/TaskEditor";
import { useEventRecords } from "../lib/useEventRecords";
import type { EventPageProps } from "../lib/commands";
import { useState } from "react";
import { CalendarDays, CheckCheck, Pencil, Plus, Trash2 } from "lucide-react";
import { Confirm } from "../components/Confirm";
import { Empty, PageHeading } from "../components/ui";
import { today } from "../lib/dates.ts";
import { dateLabel } from "../lib/storage";
export function Timeline({ event, onUpdate, notify }: EventPageProps) {
  const records = useEventRecords("tasks", onUpdate, notify);
  const [filter, setFilter] = useState("all");
  const [deleting, setDeleting] = useState<string | null>(null);
  const complete = event.tasks.filter((t) => t.done).length;
  const tasks = [...event.tasks]
    .filter((t) =>
      filter === "completed"
        ? t.done
        : filter === "upcoming"
          ? !t.done
          : filter === "overdue"
            ? !t.done && t.date < today()
            : true,
    )
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <>
      <PageHeading
        eyebrow="MAKE SPACE FOR THE GOOD STUFF"
        title="A little closer, every day."
        description="From the big decisions to the final little details. Your plan, at your pace."
        action={
          <button className="button primary" onClick={records.create}>
            <Plus size={17} />
            Add a task
          </button>
        }
      />
      <section className="timeline-summary panel">
        <span className="large-icon sage">
          <CheckCheck size={25} />
        </span>
        <div>
          <h2>
            {complete} little {complete === 1 ? "victory" : "victories"}.
          </h2>
          <p>
            {event.tasks.length - complete} tasks left to bring your celebration
            together.
          </p>
        </div>
        <div className="timeline-progress">
          <strong>
            {event.tasks.length
              ? Math.round((complete / event.tasks.length) * 100)
              : 0}
            % complete
          </strong>
          <div className="table-progress">
            <span
              style={{
                width: `${event.tasks.length ? (complete / event.tasks.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </section>
      <div className="filter-row" role="group" aria-label="Filter tasks">
        {(
          [
            ["all", "All tasks"],
            ["upcoming", "To do"],
            ["overdue", "Overdue"],
            ["completed", "Completed"],
          ] as const
        ).map(([id, label]) => (
          <button
            aria-pressed={filter === id}
            key={id}
            className={`filter-button ${filter === id ? "active" : ""}`}
            onClick={() => setFilter(id)}
          >
            {label}
            {id === "all" && <span>{event.tasks.length}</span>}
          </button>
        ))}
      </div>
      <section className="panel timeline-list">
        {tasks.length ? (
          tasks.map((task) => (
            <div
              className={`timeline-task ${task.done ? "completed" : ""}`}
              key={task.id}
            >
              <input
                type="checkbox"
                checked={task.done}
                aria-label={`Mark ${task.title} ${task.done ? "incomplete" : "complete"}`}
                onChange={() =>
                  records.change(task.id, (current) => ({
                    ...current,
                    done: !current.done,
                  }))
                }
              />
              <div className="timeline-task-copy">
                <strong>{task.title}</strong>
                <span className="muted">{task.category}</span>
              </div>
              <span
                className={`task-date ${!task.done && task.date < today() ? "negative" : ""}`}
              >
                <CalendarDays size={15} />
                {dateLabel(task.date, true)}
                {!task.done && task.date < today() && <small>Overdue</small>}
              </span>
              <button
                className="icon-button"
                aria-label={`Edit ${task.title}`}
                onClick={() => records.edit(task)}
              >
                <Pencil size={16} />
              </button>
              <button
                className="icon-button"
                aria-label={`Delete ${task.title}`}
                onClick={() => setDeleting(task.id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        ) : (
          <Empty
            icon={<CheckCheck />}
            title={
              filter === "completed"
                ? "Your little victories will appear here"
                : "A little breathing room"
            }
            description="No tasks match this view. Add a task or explore another filter."
          />
        )}
      </section>
      {records.isOpen && (
        <TaskEditor
          initial={records.initial}
          onSave={(record) => records.save(record, "Task updated.")}
          onClose={records.close}
        />
      )}
      {deleting && (
        <Confirm
          title="Remove this task?"
          description="This task and its completion status will be deleted from this event."
          onClose={() => setDeleting(null)}
          onConfirm={() => records.remove(deleting, "Task removed.")}
        />
      )}
    </>
  );
}
