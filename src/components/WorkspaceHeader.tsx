import { Menu, Plus, Search } from "lucide-react";
import { searchEvent } from "../lib/navigation";
import type { Event, Workspace, Page } from "../lib/types";
export function WorkspaceHeader({
  event,
  workspace,
  search,
  setSearch,
  onMenu,
  onCreate,
  onSelect,
  navigate,
}: {
  event: Event;
  workspace: Workspace;
  search: string;
  setSearch: (value: string) => void;
  onMenu: () => void;
  onCreate: () => void;
  onSelect: (id: string) => void;
  navigate: (page: Page) => void;
}) {
  const results = searchEvent(event, search);
  return (
    <header className="topbar">
      <div className="header-left">
        <button
          className="icon-button mobile-menu"
          aria-label="Open navigation"
          onClick={() => onMenu()}
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
              onSelect(e.target.value);
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
          <span className="sr-only" role="status">
            {search.trim().length > 1 ? `${results.length} search results` : ""}
          </span>
          {search.trim().length > 1 && (
            <div className="search-results">
              {results.length ? (
                results.map((r) => (
                  <button
                    key={`${r.page}-${r.id}`}
                    onClick={() => navigate(r.page)}
                  >
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
        <button className="button primary new-event" onClick={() => onCreate()}>
          <Plus size={17} />
          <span>New event</span>
        </button>
        <span className="profile-avatar" aria-label="Personal workspace">
          P
        </span>
      </div>
    </header>
  );
}
