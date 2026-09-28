import { ImageResponse } from "next/og";
import { OgFrame, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og/frame";

export const alt = "Opportunities from Kharis Church Freetown";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

// Deliberately no database call. A live count would be baked in at build time
// and go stale, and a preview that depends on Supabase breaks the moment it is
// unreachable — the worst time for a shared link to render badly. The postings
// themselves carry their own data in their own previews.
export default function Image() {
  return new ImageResponse(
    (
      <OgFrame
        eyebrow="Kharis Church Freetown"
        title="Opportunities"
        meta="Vetted by the Welfare team"
        chips={["Jobs", "Scholarships", "Grants", "Training"]}
      />
    ),
    size,
  );
}
