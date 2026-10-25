import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  Wallet,
  CalendarDays,
  Store,
  Users,
  Lightbulb,
  Sparkles,
  Settings,
  Plus,
  Search,
  ChevronDown,
  Menu,
  ArrowUpRight,
  Check,
  ShieldCheck,
  CircleHelp,
  Download,
} from "lucide-react";
import { Logo, Modal, Confirm } from "./components/ui";
import { EventForm } from "./components/EventForm";
import { Overview } from "./pages/Overview";
const BudgetPage = lazy(() =>
  import("./pages/Budget").then((module) => ({ default: module.BudgetPage })),
);
const Timeline = lazy(() =>
  import("./pages/Timeline").then((module) => ({ default: module.Timeline })),
);
const Vendors = lazy(() =>
  import("./pages/Vendors").then((module) => ({ default: module.Vendors })),
);
const Guests = lazy(() =>
  import("./pages/Guests").then((module) => ({ default: module.Guests })),
);
const Inspiration = lazy(() =>
  import("./pages/Inspiration").then((module) => ({
    default: module.Inspiration,
  })),
);
const Studio = lazy(() =>
  import("./pages/Studio").then((module) => ({ default: module.Studio })),
);
const SettingsPage = lazy(() =>
  import("./pages/Settings").then((module) => ({
    default: module.SettingsPage,
  })),
);
import { eventFromPlan, reviseEvent } from "./lib/domain.mjs";
import { downloadFile, loadWorkspace, saveWorkspace } from "./lib/storage";
import type { Brief, Event, Page, Workspace } from "./lib/types";
const nav = [
  { id: "overview" as Page, label: "Overview", icon: LayoutDashboard },
  { id: "budget" as Page, label: "Budget", icon: Wallet },
  { id: "timeline" as Page, label: "Timeline", icon: CalendarDays },
  { id: "vendors" as Page, label: "Vendors", icon: Store },
  { id: "guests" as Page, label: "Guest list", icon: Users },
  { id: "inspiration" as Page, label: "Inspiration", icon: Lightbulb },
];
const pageFromHash = (): Page => {
  const value = location.hash.slice(1) as Page;
  return [...nav.map((n) => n.id), "studio", "settings"].includes(value)
    ? value
    : "overview";
};
export default function App() {
  const [loaded] = useState(loadWorkspace);
  const [workspace, setWorkspace] = useState<Workspace>(loaded.workspace);
  const [saveBlocked, setSaveBlocked] = useState(Boolean(loaded.warning));
  const [warning, setWarning] = useState(loaded.warning);
  const [page, setPage] = useState<Page>(pageFromHash);
  const [modal, setModal] = useState<
    "create" | "edit" | "menu" | "help" | null
  >(null);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const headingRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const event =
    workspace.events.find((e) => e.id === workspace.activeId) ||
    workspace.events[0];
  useEffect(() => {
    if (saveBlocked) return;
    try {
      saveWorkspace(workspace);
      setWarning("");
    } catch {
      setWarning(
        "Your changes are in memory, but could not be saved on this browser. Export a backup before leaving.",
      );
    }
  }, [workspace, saveBlocked]);
  useEffect(() => {
    const update = () => {
      setPage(pageFromHash());
      setSearch("");
    };
    window.addEventListener("hashchange", update);
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setAiEnabled(d.aiEnabled === true))
      .catch(() => {});
    return () => {
      window.removeEventListener("hashchange", update);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);
  function notify(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4500);
  }
  function navigate(next: Page) {
    setPage(next);
    location.hash = next;
    setSearch("");
    setModal(null);
    window.scrollTo({ top: 0, behavior: "instant" });
    setTimeout(() => headingRef.current?.focus(), 0);
  }
  function updateEvent(next: Event) {
    setWorkspace((w) => ({
      ...w,
      events: w.events.map((e) => (e.id === next.id ? next : e)),
    }));
  }
  function addEvent(next: Event) {
    if (workspace.events.length >= 30) {
      notify(
        "You can keep up to 30 events. Export and remove an old event first.",
      );
      return;
    }
    setWorkspace((w) => ({
      ...w,
      events: [...w.events, next],
      activeId: next.id,
    }));
    setModal(null);
    navigate("overview");
    notify("Your event is ready. Let’s make it memorable.");
  }
  function saveBrief(brief: Brief, shiftTimeline = true) {
    if (modal === "edit") {
      try {
        updateEvent(reviseEvent(event, brief, shiftTimeline) as Event);
      } catch {
        notify(
          "These dates could not be moved. Check the event date or keep your existing task dates.",
        );
        return;
      }
      setModal(null);
      notify("Event details updated.");
    } else addEvent(eventFromPlan(brief) as Event);
  }
  const results =
    search.trim().length > 1
      ? [
          ...event.tasks.map((t) => ({
            title: t.title,
            page: "timeline" as Page,
            kind: "Task",
          })),
          ...event.vendors.map((v) => ({
            title: v.name,
            page: "vendors" as Page,
            kind: "Vendor",
          })),
          ...event.ideas.map((i) => ({
            title: i.title,
            page: "inspiration" as Page,
            kind: "Idea",
          })),
        ]
          .filter((x) => x.title.toLowerCase().includes(search.toLowerCase()))
          .slice(0, 7)
      : [];
  const navContent = (
    <>
      <div className="nav-label">YOUR WORKSPACE</div>
      {nav.map((n) => (
        <button
          key={n.id}
          className={`nav-item ${page === n.id ? "active" : ""}`}
          aria-current={page === n.id ? "page" : undefined}
          onClick={() => navigate(n.id)}
        >
          <n.icon size={19} />
          {n.label}
          {n.id === "vendors" && event.vendors.length > 0 && (
            <span className="nav-count">{event.vendors.length}</span>
          )}
        </button>
      ))}
      <div className="nav-divider" />
      <button
        className={`nav-item ${page === "studio" ? "active" : ""}`}
        aria-current={page === "studio" ? "page" : undefined}
        onClick={() => navigate("studio")}
      >
        <Sparkles size={19} />
        AI planning studio<span className="tiny-badge">AI</span>
      </button>
    </>
  );
  return (
    <>
      <a
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
        className="skip-link"
      >
        Skip to content
      </a>
      <aside className="sidebar">
        <button
          className="brand-button"
          aria-label="Gatherly home"
          onClick={() => navigate("overview")}
        >
          <Logo />
        </button>
        <div className="workspace-label">
          <span className="workspace-avatar">P</span>
          <div>
            <strong>My planning space</strong>
            <small>Your moments, together</small>
          </div>
          <ChevronDown size={15} />
        </div>
        <nav aria-label="Main navigation">{navContent}</nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span className="tip-icon">
              <Sparkles size={18} />
            </span>
            <h3>A little help. A little magic.</h3>
            <p>Turn your ideas into a celebration that feels like you.</p>
            <button onClick={() => navigate("studio")}>
              Meet your AI planner
              <ArrowUpRight size={15} />
            </button>
          </div>
          <button
            className={`nav-item ${page === "settings" ? "active" : ""}`}
            onClick={() => navigate("settings")}
          >
            <Settings size={18} />
            Settings & data
          </button>
          <button className="nav-item" onClick={() => setModal("help")}>
            <CircleHelp size={18} />A helping hand
          </button>
          <div className="local-status">
            <span />
            Saved on your device
          </div>
        </div>
      </aside>
      <div className="app-shell">
        <header className="topbar">
          <div className="header-left">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setModal("menu")}
            >
              <Menu size={22} />
            </button>
            <span className="breadcrumb">
              My events <span>/</span>
            </span>
            <label className="event-switch">
              <span className="sr-only">Active event</span>
              <select
                value={event.id}
                aria-label="Active event"
                onChange={(e) => {
                  setWorkspace((w) => ({ ...w, activeId: e.target.value }));
                  setSearch("");
                }}
              >
                {workspace.events.map((e) => (
                  <option value={e.id} key={e.id}>
                    {e.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="header-right">
            <div className="search-wrap">
              <Search size={17} />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Find something…"
                aria-label="Search this event"
                onKeyDown={(e) => {
                  if (e.key === "Escape") setSearch("");
                }}
              />
              {search.trim().length > 1 && (
                <div className="search-results">
                  {results.length ? (
                    results.map((r, i) => (
                      <button key={i} onClick={() => navigate(r.page)}>
                        <span>{r.title}</span>
                        <small>{r.kind}</small>
                      </button>
                    ))
                  ) : (
                    <p>No matches in this event.</p>
                  )}
                </div>
              )}
            </div>
            <button
              className="button primary new-event"
              onClick={() => setModal("create")}
            >
              <Plus size={17} />
              <span>New event</span>
            </button>
            <span className="profile-avatar" aria-label="Personal workspace">
              P
            </span>
          </div>
        </header>
        {warning && (
          <div className="warning-banner" role="alert">
            <span>{warning}</span>
            <button
              onClick={() =>
                downloadFile(
                  "gatherly-backup.json",
                  JSON.stringify(workspace, null, 2),
                )
              }
            >
              <Download size={16} />
              Export
            </button>
            {saveBlocked && loaded.recovery && (
              <button
                onClick={() =>
                  downloadFile("gatherly-recovery.json", loaded.recovery!)
                }
              >
                Download unread data
              </button>
            )}
            {saveBlocked && (
              <button
                onClick={() => {
                  setSaveBlocked(false);
                  setWarning("");
                }}
              >
                Save current workspace
              </button>
            )}
          </div>
        )}
        <main
          id="main-content"
          tabIndex={-1}
          className={`main-content page-${page}`}
        >
          <div
            tabIndex={-1}
            ref={headingRef}
            className="page-focus"
            aria-label={`${page} page`}
          />
          <Suspense
            fallback={
              <div className="page-loading" role="status">
                <Logo small />
                <p>Bringing your plans together…</p>
              </div>
            }
          >
            {page === "overview" && (
              <Overview
                event={event}
                onUpdate={updateEvent}
                navigate={navigate}
                onEdit={() => setModal("edit")}
              />
            )}{" "}
            {page === "budget" && (
              <BudgetPage
                event={event}
                onUpdate={updateEvent}
                notify={notify}
              />
            )}{" "}
            {page === "timeline" && (
              <Timeline event={event} onUpdate={updateEvent} notify={notify} />
            )}{" "}
            {page === "vendors" && (
              <Vendors event={event} onUpdate={updateEvent} notify={notify} />
            )}{" "}
            {page === "guests" && (
              <Guests event={event} onUpdate={updateEvent} notify={notify} />
            )}{" "}
            {page === "inspiration" && (
              <Inspiration
                event={event}
                onUpdate={updateEvent}
                notify={notify}
              />
            )}{" "}
            {page === "studio" && (
              <Studio
                key={event.id}
                event={event}
                aiEnabled={aiEnabled}
                onCreate={addEvent}
                notify={notify}
              />
            )}{" "}
            {page === "settings" && (
              <SettingsPage
                workspace={workspace}
                event={event}
                onImport={(w) => {
                  setWorkspace(w);
                  setSaveBlocked(false);
                  notify("Workspace imported successfully.");
                }}
                onDelete={() => setDeleting(true)}
                onEdit={() => setModal("edit")}
                notify={notify}
              />
            )}
          </Suspense>
          <footer className="app-footer">
            <span>Made for the moments that matter.</span>
            <span>
              <ShieldCheck size={13} />
              Your plans stay in your browser
            </span>
            <span>Gatherly · 2026</span>
          </footer>
        </main>
      </div>
      {modal === "create" && (
        <Modal
          wide
          title="Something wonderful starts here."
          description="Tell us a little. We’ll help you bring it all together."
          onClose={() => setModal(null)}
        >
          <EventForm onSave={saveBrief} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal === "edit" && (
        <Modal
          wide
          title="The little details."
          description="Update your event. Existing budget lines and checklists stay editable."
          onClose={() => setModal(null)}
        >
          <EventForm
            initial={event}
            onSave={saveBrief}
            onCancel={() => setModal(null)}
          />
        </Modal>
      )}
      {modal === "menu" && (
        <Modal title="Your planning space" onClose={() => setModal(null)}>
          <nav aria-label="Mobile navigation">
            {navContent}
            <button className="nav-item" onClick={() => navigate("settings")}>
              <Settings size={18} />
              Settings & data
            </button>
            <button
              className="button primary full-width"
              onClick={() => setModal("create")}
            >
              <Plus size={18} />
              New event
            </button>
          </nav>
        </Modal>
      )}
      {modal === "help" && (
        <Modal
          title="A little guidance goes a long way."
          onClose={() => setModal(null)}
        >
          <div className="help-content">
            <p>
              Start with <strong>New event</strong> and choose a wedding,
              birthday or community celebration. Your starter plan includes a
              budget, timeline and personalized starting ideas.
            </p>
            <p>
              Edit your budget and record payments, check off tasks, add real
              vendors and keep track of RSVPs. Sample entries are placeholders,
              not recommendations or bookings.
            </p>
            <p>
              Use <strong>AI planning studio</strong> to preview an AI plan
              after the owner adds the server key and private access code.
              Creating a plan never books a vendor or spends your budget.
            </p>
            <p>
              Plans are saved only in this browser. Export a backup in Settings
              to move them to another device. Clearing browser data removes
              local plans.
            </p>
          </div>
        </Modal>
      )}
      {deleting && (
        <Confirm
          title="Delete this event?"
          description={`“${event.title}” and its budget, guests and checklists will be removed from this browser. Export a backup first if you need it.`}
          onClose={() => setDeleting(false)}
          onConfirm={() => {
            if (workspace.events.length === 1) {
              notify("Create another event before deleting your last one.");
              return;
            }
            setWorkspace((w) => {
              const events = w.events.filter((e) => e.id !== event.id);
              return { ...w, events, activeId: events[0].id };
            });
            notify("Event deleted.");
          }}
        />
      )}
      <div
        className={`toast ${toast ? "visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        {toast && (
          <>
            <Check size={17} />
            {toast}
          </>
        )}
      </div>
    </>
  );
}
