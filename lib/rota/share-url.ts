// The share link must be the deployed URL even while building the rota on
// localhost, so NEXT_PUBLIC_SITE_URL wins over the current origin.
export function buildShareUrl(shareSlug: string) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");

  const base =
    configured ||
    (typeof window === "undefined" ? "" : window.location.origin);

  return `${base}/r/${shareSlug}`;
}
