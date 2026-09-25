import Link from "next/link";
import type { ReactNode } from "react";

// Public share links — a published rota, the opportunities board — get a slim bar
// and a centred column, never the nav rail. Whoever opens one of these has no use
// for Add activity or Manage, and church admin navigation should not travel with
// a link shared outward.
export function PublicShell({
  eyebrow,
  meta,
  width = "regular",
  children,
}: {
  eyebrow: string;
  meta?: ReactNode;
  width?: "regular" | "wide";
  children: ReactNode;
}) {
  return (
    <main className="bulletin-page public-page">
      <div className="public-bar">
        <Link href="/" className="public-bar-brand">
          {eyebrow}
        </Link>
        {meta ? <span className="public-bar-meta">{meta}</span> : null}
      </div>
      <div
        className={
          width === "wide" ? "public-column public-column-wide" : "public-column"
        }
      >
        {children}
      </div>
    </main>
  );
}
