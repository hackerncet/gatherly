import type { UpdateEvent, Notify } from "../lib/commands";
import { changeEventRecord } from "../lib/records";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronRight,
  Clock3,
  Heart,
  MapPin,
  Pencil,
  Sparkles,
  Store,
  Users,
  Wallet,
} from "lucide-react";
import { Botanical } from "../components/Botanical";
import { SectionTitle, TextLink } from "../components/ui";
import { totals } from "../lib/events.ts";
import { today } from "../lib/dates.ts";
import { dateLabel, daysUntil, money } from "../lib/storage";
import type { Event, Page } from "../lib/types";
export function Overview({
  event,
  onUpdate,
  navigate,
  onEdit,
  notify,
}: {
  event: Event;
  onUpdate: UpdateEvent;
  navigate: (p: Page) => void;
  onEdit: () => void;
  notify: Notify;
}) {
  const t = totals(event);
  const days = daysUntil(event.date);
  const progress = t.totalTasks
    ? Math.round((t.completed / t.totalTasks) * 100)
    : 0;
  const nextTasks = [...event.tasks]
    .filter((t) => !t.done)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);
  const visibleBudgets = event.budgets.slice(0, 4);
  const overdue = event.tasks.filter((t) => !t.done && t.date < today()).length;
  return (
    <>
      <div className="welcome-row">
        <div>
          <p className="eyebrow">A LITTLE PLANNING. A LOT OF JOY.</p>
          <h1>
            Good things are coming<span className="green-dot">.</span>
          </h1>
          <p>Let’s make your next celebration feel effortless.</p>
        </div>
        <div className="today-label">
          <CalendarDays size={16} />
          {dateLabel(today(), true)}
        </div>
      </div>
      <div className="overview-layout">
        <div className="overview-main">
          <section className="event-hero">
            <div className="hero-text">
              <span className="hero-label">
                <Heart size={13} />
                {event.type === "wedding"
                  ? "THE WEDDING"
                  : event.type === "birthday"
                    ? "THE BIRTHDAY"
                    : "THE COMMUNITY EVENT"}
              </span>
              <h2>{event.title}</h2>
              <p className="hero-subtitle">
                A day to remember. A plan to get you there.
              </p>
              <div className="hero-meta">
                <span>
                  <CalendarDays size={15} />
                  {dateLabel(event.date)}
                </span>
                <span>
                  <MapPin size={15} />
                  {event.location}
                </span>
              </div>
              <button className="hero-button" onClick={onEdit}>
                View event details
                <ArrowUpRight size={16} />
              </button>
            </div>
            <Botanical />
            <div className="countdown">
              <strong>{Math.abs(days)}</strong>
              <span>
                {days < 0
                  ? "days since"
                  : days === 0
                    ? "it’s today!"
                    : "days to go"}
              </span>
            </div>
          </section>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-icon sage">
                <Wallet size={19} />
              </span>
              <span className="stat-label">Total budget</span>
              <strong>{money(event.budget, event.currency)}</strong>
              <small>
                {money(t.remaining, event.currency)}{" "}
                {t.remaining < 0 ? "over budget" : "remaining"}
              </small>
            </div>
            <div className="stat-card">
              <span className="stat-icon peach">
                <CheckCheck size={19} />
              </span>
              <span className="stat-label">Planning progress</span>
              <strong>
                {progress}
                <span className="stat-unit">%</span>
              </strong>
              <small>
                {t.completed} of {t.totalTasks} tasks completed
              </small>
            </div>
            <div className="stat-card">
              <span className="stat-icon lilac">
                <Users size={19} />
              </span>
              <span className="stat-label">Your guest list</span>
              <strong>
                {event.guests}
                <span className="stat-unit">guests</span>
              </strong>
              <small>{t.confirmed} confirmed so far</small>
            </div>
            <div className="stat-card">
              <span className="stat-icon sand">
                <Store size={19} />
              </span>
              <span className="stat-label">Vendor team</span>
              <strong>
                {event.vendors.filter((v) => v.status === "booked").length}
                <span className="stat-unit">booked</span>
              </strong>
              <small>{event.vendors.length} in your shortlist</small>
            </div>
          </div>
          <div className="overview-panels">
            <section className="panel next-tasks">
              <SectionTitle
                title="Your next little steps"
                note="One thing at a time. You’ve got this."
                action={
                  <TextLink onClick={() => navigate("timeline")}>
                    View all
                  </TextLink>
                }
              />
              {nextTasks.length ? (
                nextTasks.map((task) => (
                  <div className="task-row" key={task.id}>
                    <input
                      type="checkbox"
                      aria-label={`Complete ${task.title}`}
                      checked={task.done}
                      onChange={() => {
                        const result = onUpdate((current) =>
                          changeEventRecord(
                            current,
                            "tasks",
                            task.id,
                            (record) => ({ ...record, done: !record.done }),
                          ),
                        );
                        if (!result.ok) notify(result.error, "error");
                      }}
                    />
                    <div>
                      <strong>{task.title}</strong>
                      <span>{task.category}</span>
                    </div>
                    <span
                      className={`date-pill ${task.date < today() ? "overdue" : ""}`}
                    >
                      {task.date < today()
                        ? "Overdue"
                        : dateLabel(task.date, true)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="mini-empty">
                  <Check size={24} />
                  <p>You’re all caught up. Time to enjoy the moment.</p>
                </div>
              )}
              <button
                className="panel-bottom-link"
                onClick={() => navigate("timeline")}
              >
                <PlusIcon />
                Add a task
                <ChevronRight size={16} />
              </button>
            </section>
            <section className="panel budget-overview">
              <SectionTitle
                title="A budget with balance"
                note="Room for the essentials. And a little magic."
                action={
                  <button
                    className="icon-button"
                    aria-label="Manage budget"
                    onClick={() => navigate("budget")}
                  >
                    <ArrowUpRight size={18} />
                  </button>
                }
              />
              <div className="budget-mini-total">
                <strong>{money(t.paid, event.currency)}</strong>
                <span>paid of {money(event.budget, event.currency)}</span>
              </div>
              <div
                className="stacked-bar"
                role="img"
                aria-label={`Allocated ${money(t.allocated, event.currency)} of ${money(event.budget, event.currency)}`}
              >
                {event.budgets.map((b, i) => (
                  <span
                    key={b.id}
                    className={`bar-color color-${i % 7}`}
                    style={{
                      width: `${t.allocated ? (b.planned / t.allocated) * 100 : 0}%`,
                    }}
                  />
                ))}
              </div>
              <div className="budget-legend">
                {visibleBudgets.map((b, i) => (
                  <div key={b.id}>
                    <span className={`legend-dot color-${i}`} />
                    <span>{b.category}</span>
                    <strong>{money(b.planned, event.currency)}</strong>
                  </div>
                ))}
              </div>
              <button
                className="panel-bottom-link"
                onClick={() => navigate("budget")}
              >
                See the full picture
                <ArrowRight size={16} />
              </button>
            </section>
          </div>
          <section className="inspiration-strip">
            <div className="inspiration-graphic">
              <Botanical variant="mini" />
            </div>
            <div>
              <span className="eyebrow">A MOMENT OF INSPIRATION</span>
              <h3>It’s the little details they’ll remember.</h3>
              <p>Discover thoughtful ideas to make this celebration yours.</p>
            </div>
            <button
              className="button secondary"
              onClick={() => navigate("inspiration")}
            >
              Find your inspiration
              <ArrowUpRight size={16} />
            </button>
          </section>
        </div>
        <aside
          className="overview-rail"
          aria-label="Planning companion and progress"
        >
          <section className="ai-card">
            <div className="ai-card-top">
              <span className="ai-orb">
                <Sparkles size={23} />
              </span>
              <span className="pill">PLANNING COMPANION</span>
            </div>
            <h2>
              Big ideas.
              <br />
              Little effort.
            </h2>
            <p>
              A celebration as unique as you are. Let’s bring it to life,
              together.
            </p>
            <div className="ai-suggestions">
              {[
                "Build my event plan",
                "Make the most of my budget",
                "Find a few thoughtful ideas",
              ].map((s, i) => (
                <button
                  key={s}
                  onClick={() => {
                    try {
                      sessionStorage.setItem("gatherly.prompt", s);
                    } catch {
                      /* The prompt is optional when session storage is unavailable. */
                    }
                    navigate("studio");
                  }}
                >
                  <span className="suggestion-number" aria-hidden="true">
                    0{i + 1}
                  </span>
                  {s}
                  <ArrowUpRight size={15} />
                </button>
              ))}
            </div>
            <button
              className="button primary full-width"
              onClick={() => navigate("studio")}
            >
              <Sparkles size={16} />
              Open AI planning studio
            </button>
            <small>Thoughtful suggestions. Your final say.</small>
          </section>
          <section className="panel celebration-card">
            <div className="section-title">
              <h2>The big picture</h2>
              <span className="status-dot" />
            </div>
            <div
              className="progress-ring"
              style={{ "--progress": `${progress}%` } as React.CSSProperties}
            >
              <div>
                <strong>{progress}%</strong>
                <small>READY TO CELEBRATE</small>
              </div>
            </div>
            <div className="progress-caption">
              <span>
                <span className="legend-dot color-0" />
                Completed
              </span>
              <strong>
                {t.completed}/{t.totalTasks}
              </strong>
            </div>
            <div className="rail-message">
              <Clock3 size={16} />
              <span>
                {overdue
                  ? `${overdue} ${overdue === 1 ? "task needs" : "tasks need"} a little attention.`
                  : "Every little step brings it closer."}
              </span>
            </div>
          </section>
          <button className="edit-event-link" onClick={onEdit}>
            <Pencil size={14} />
            Edit event details
          </button>
        </aside>
      </div>
    </>
  );
}
function PlusIcon() {
  return (
    <span className="plus-symbol" aria-hidden="true">
      +
    </span>
  );
}
