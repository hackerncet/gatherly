import { Component, type ReactNode } from "react";

export class PageBoundary extends Component<
  {
    children: ReactNode;
    resetKey: string;
    onHome: () => void;
    onBackup: () => void;
  },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidUpdate(previous: Readonly<{ resetKey: string }>) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey)
      this.setState({ failed: false });
  }
  render() {
    return this.state.failed ? (
      <section className="panel recovery-screen" role="alert">
        <h1>This page needs a fresh start.</h1>
        <p>
          Your current workspace is still available. Export a backup, then
          return to the overview or reload to fetch the latest version.
        </p>
        <div className="button-group">
          <button className="button primary" onClick={this.props.onBackup}>
            Export workspace backup
          </button>
          <button className="button secondary" onClick={this.props.onHome}>
            Return to overview
          </button>
          <button
            className="button secondary"
            onClick={() => location.reload()}
          >
            Reload application
          </button>
        </div>
      </section>
    ) : (
      this.props.children
    );
  }
}
