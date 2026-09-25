export type NavKey =
  | "home"
  | "calendar"
  | "add"
  | "manage"
  | "pastor"
  | "rota"
  | "opportunities";

export type NavItem = {
  key: NavKey;
  label: string;
  group: "main" | "also";
  // A scheduler item is a state change inside BulletinApp and a link to "/"
  // anywhere else, because those screens have no route of their own. Exactly one
  // of href / onSelect is set.
  href?: string;
  onSelect?: () => void;
};

export const SCHEDULER_NAV: { key: NavKey; label: string }[] = [
  { key: "home", label: "This week" },
  { key: "calendar", label: "Calendar" },
  { key: "add", label: "Add activity" },
  { key: "manage", label: "Manage" },
];

export const PASTOR_NAV: { key: NavKey; label: string } = {
  key: "pastor",
  label: "Overview",
};

export const ALSO_NAV: { key: NavKey; label: string; href: string }[] = [
  { key: "rota", label: "Serving rota", href: "/rota" },
  { key: "opportunities", label: "Opportunities", href: "/opportunities" },
];

// Used by /rota and /opportunities/dashboard, where none of the scheduler
// screens exist in the tree, so every scheduler item goes back to "/".
export function linkNavItems(): NavItem[] {
  return [
    ...SCHEDULER_NAV.map((item) => ({ ...item, group: "main" as const, href: "/" })),
    ...ALSO_NAV.map((item) => ({ ...item, group: "also" as const })),
  ];
}
