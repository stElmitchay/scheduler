export function buildJobShareUrl(slug: string) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");

  const base =
    configured ||
    (typeof window === "undefined" ? "" : window.location.origin);

  return `${base}/jobs/${slug}`;
}
