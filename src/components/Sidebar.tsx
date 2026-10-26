import {
  ArrowUpRight,
  ChevronDown,
  CircleHelp,
  Settings,
  Sparkles,
} from "lucide-react";
import { Logo } from "./Logo";
import { WorkspaceNavigation } from "./WorkspaceNavigation";
import type { Page } from "../lib/types";
export function Sidebar({
  page,
  vendorCount,
  saveStatus,
  navigate,
  onHelp,
}: {
  page: Page;
  vendorCount: number;
  saveStatus: string;
  navigate: (page: Page) => void;
  onHelp: () => void;
}) {
  return (
    <aside className="sidebar" aria-label="Planning navigation">
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
      <nav aria-label="Main navigation">
        <WorkspaceNavigation
          page={page}
          vendorCount={vendorCount}
          navigate={navigate}
        />
      </nav>
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
          aria-current={page === "settings" ? "page" : undefined}
          onClick={() => navigate("settings")}
        >
          <Settings size={18} />
          Settings & data
        </button>
        <button className="nav-item" onClick={() => onHelp()}>
          <CircleHelp size={18} />A helping hand
        </button>
        <div className="local-status" role="status" aria-live="polite">
          <span />
          {saveStatus}
        </div>
      </div>
    </aside>
  );
}
