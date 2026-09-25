"use client";

import { useState, type ReactNode } from "react";
import { OpportunityMenuModal } from "@/components/opportunities/opportunity-menu-modal";
import { RotaUnlockModal } from "@/components/rota/rota-unlock-modal";
import { AppShell } from "./app-shell";
import { SCHEDULER_NAV, type NavItem, type NavKey } from "./nav";

// Outside BulletinApp the rail was built from plain hrefs, so Rota and
// Opportunities navigated straight through and their popups only ever appeared
// on "/". This owns both modals so every shell behaves the same.
export function ShellWithMenus({
  active,
  panel,
  children,
}: {
  active: NavKey;
  panel?: ReactNode;
  children: ReactNode;
}) {
  const [rotaOpen, setRotaOpen] = useState(false);
  const [opportunitiesOpen, setOpportunitiesOpen] = useState(false);

  const items: NavItem[] = [
    ...SCHEDULER_NAV.map((item) => ({
      ...item,
      group: "main" as const,
      href: "/",
    })),
    {
      key: "rota",
      label: "Serving rota",
      group: "also",
      onSelect: () => setRotaOpen(true),
    },
    {
      key: "opportunities",
      label: "Opportunities",
      group: "also",
      onSelect: () => setOpportunitiesOpen(true),
    },
  ];

  return (
    <>
      <AppShell items={items} active={active} panel={panel}>
        {children}
      </AppShell>
      <RotaUnlockModal open={rotaOpen} onClose={() => setRotaOpen(false)} />
      <OpportunityMenuModal
        open={opportunitiesOpen}
        onClose={() => setOpportunitiesOpen(false)}
      />
    </>
  );
}
