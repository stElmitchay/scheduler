"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { NavItem, NavKey } from "./nav";

// Below the desktop breakpoint `.app-shell` is `display: contents`, so the rail
// disappears, the screen renders exactly as it does today, and the panel falls
// into normal flow underneath it. Every desktop rule lives behind one media
// query in globals.css.
export function AppShell({
  items,
  active,
  panel,
  children,
}: {
  items: NavItem[];
  active: NavKey;
  panel?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="app-shell">
      <nav className="app-rail" aria-label="Sections">
        <span className="app-rail-brand">Kharis</span>
        {renderGroup(items, "main", active)}
        {items.some((item) => item.group === "also") ? (
          <div className="app-rail-group">
            <span className="app-rail-label">Also</span>
            {renderGroup(items, "also", active)}
          </div>
        ) : null}
      </nav>
      {children}
      {panel ? <aside className="app-panel">{panel}</aside> : null}
    </div>
  );
}

function renderGroup(items: NavItem[], group: NavItem["group"], active: NavKey) {
  return items
    .filter((item) => item.group === group)
    .map((item) => {
      const className =
        item.key === active ? "app-rail-item active" : "app-rail-item";

      if (item.href) {
        return (
          <Link
            key={item.key}
            href={item.href}
            className={className}
            aria-current={item.key === active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      }

      return (
        <button
          key={item.key}
          type="button"
          className={className}
          aria-current={item.key === active ? "page" : undefined}
          onClick={item.onSelect}
        >
          {item.label}
        </button>
      );
    });
}
