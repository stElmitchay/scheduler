export function slugifyJobTitle(title: string) {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");

  return slug || "job";
}

export function buildUniqueSlug(baseTitle: string, existingSlugs: string[]) {
  const base = slugifyJobTitle(baseTitle);
  const taken = new Set(existingSlugs);

  if (!taken.has(base)) {
    return base;
  }

  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${base}-${index}`;

    if (!taken.has(candidate)) {
      return candidate;
    }
  }

  return `${base}-${Date.now()}`;
}
