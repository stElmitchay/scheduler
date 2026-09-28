import { ImageResponse } from "next/og";
import { OgFrame, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og/frame";

export const alt = "Opportunities dashboard for the Kharis Church Welfare team";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

// Static and database-free: nothing behind the code gate should reach a preview,
// and a card for a gated page must not look like an open door.
export default function Image() {
  return new ImageResponse(
    (
      <OgFrame
        eyebrow="Kharis Church Freetown"
        title="Opportunities dashboard"
        meta="Welfare or pastor access code needed"
        chips={["Post", "Publish", "Manage"]}
      />
    ),
    size,
  );
}
