import { useState, type FormEvent } from "react";
import { CalendarDays, CheckCheck, Pencil, Plus, Trash2 } from "lucide-react";
import { Confirm, Empty, Modal, PageHeading } from "../components/ui";
import { taskSchema, today, uid } from "../lib/domain.ts";
import { dateLabel } from "../lib/storage";
import type { Event, Task } from "../lib/types";
export function Timeline({
  event,
  onUpdate,
  notify,
}: {
  event: Event;
  onUpdate: (e: Event) => void;
  notify: (s: string) => void;
}) {
  const [filter, setFilter] = useState("all");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");
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
  function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const r = taskSchema.safeParse({
      id: editing?.id || uid(),
      title: f.get("title"),
      date: f.get("date"),
      category: f.get("category"),
      done: editing?.done || false,
    });
    if (!r.success) {
      setError("Please add a task name, category and valid date.");
      return;
    }
    if (!editing && event.tasks.length >= 300) {
      setError("You can keep up to 300 tasks per event.");
      return;
    }
    onUpdate({
      ...event,
      tasks: editing
        ? event.tasks.map((task) => (task.id === editing.id ? r.data : task))
        : [...event.tasks, r.data],
    });
    setAdding(false);
    notify(editing ? "Task updated." : "One little step added.");
    setEditing(null);
  }
  return (
    <>
      <PageHeading
        eyebrow="MAKE SPACE FOR THE GOOD STUFF"
        title="A little closer, every day."
        description="From the big decisions to the final little details. Your plan, at your pace."
        action={
          <button
            className="button primary"
            onClick={() => {
              setEditing(null);
              setAdding(true);
              setError("");
            }}
          >
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
        {[
          ["all", "All tasks"],
          ["upcoming", "To do"],
          ["overdue", "Overdue"],
          ["completed", "Completed"],
        ].map(([id, label]) => (
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
                  onUpdate({
                    ...event,
                    tasks: event.tasks.map((t) =>
                      t.id === task.id ? { ...t, done: !t.done } : t,
                    ),
                  })
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
                onClick={() => {
                  setEditing(task);
                  setAdding(true);
                  setError("");
                }}
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
      {adding && (
        <Modal
          title={editing ? "A little change of plan." : "One little step."}
          description="Give it a name and a date. We’ll keep it right here."
          onClose={() => setAdding(false)}
        >
          <form onSubmit={add}>
            <div className="form-grid">
              <label className="span-2">
                Task name
                <input
                  name="title"

                  required
                  maxLength={180}
                  placeholder="e.g. Confirm the cake delivery"
                  defaultValue={editing?.title}
                />
              </label>
              <label>
                Due date
                <input
                  name="date"
                  type="date"
                  required
                  defaultValue={editing?.date || today()}
                />
              </label>
              <label>
                Category
                <input
                  name="category"
                  required
                  maxLength={60}
                  defaultValue={editing?.category || "Planning"}
                  list="task-categories"
                />
                <datalist id="task-categories">
                  {[
                    "Planning",
                    "Venue",
                    "Guests",
                    "Catering",
                    "Decor",
                    "Vendors",
                    "Safety",
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </datalist>
              </label>
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="modal-actions">
              <button
                className="button secondary"
                type="button"
                onClick={() => setAdding(false)}
              >
                Cancel
              </button>
              <button className="button primary">
                {editing ? "Save task" : "Add task"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {deleting && (
        <Confirm
          title="Remove this task?"
          description="This task and its completion status will be deleted from this event."
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            onUpdate({
              ...event,
              tasks: event.tasks.filter((t) => t.id !== deleting),
            });
            notify("Task removed.");
          }}
        />
      )}
    </>
  );
}
