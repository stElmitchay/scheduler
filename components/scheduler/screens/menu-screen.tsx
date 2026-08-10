import { BulletinHeader } from "../bulletin-header";

export type ProtectedTarget = "add" | "manage" | "pastor";

export function MenuScreen({
  onBack,
  onOpenProtected,
  onOpenCalendar,
}: {
  onBack: () => void;
  onOpenProtected: (target: ProtectedTarget) => void;
  onOpenCalendar: () => void;
}) {
  return (
    <main className="bulletin-page">
      <div className="bulletin-shell">
        <BulletinHeader eyebrow="Kharis Church" title="Menu" onBack={onBack} />
        <nav className="bulletin-menu-panel" aria-label="Scheduler menu">
          <button type="button" onClick={() => onOpenProtected("add")}>
            <span>
              <strong>Add activity</strong>
              <small>Add a space booking or church activity</small>
            </span>
            <b>+</b>
          </button>
          <button type="button" onClick={() => onOpenProtected("manage")}>
            <span>
              <strong>Manage activities</strong>
              <small>Edit, confirm, or cancel what you own</small>
            </span>
            <b>›</b>
          </button>
          <button type="button" onClick={() => onOpenProtected("pastor")}>
            <span>
              <strong>Pastor dashboard</strong>
              <small>Pastor code required</small>
            </span>
            <b>›</b>
          </button>
          <button type="button" onClick={onOpenCalendar}>
            <span>
              <strong>Full calendar</strong>
              <small>Public month view and space filters</small>
            </span>
            <b>›</b>
          </button>
        </nav>
      </div>
    </main>
  );
}
