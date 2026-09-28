import { ImageResponse } from "next/og";
import { OgFrame, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og/frame";

export const alt = "Serving rota builder for Kharis Church Freetown leaders";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

// The published rota at /r/[slug] is the link that travels; this is the leader
// side, so the card says so rather than implying an open rota.
export default function Image() {
  return new ImageResponse(
    (
      <OgFrame
        eyebrow="Kharis Church Freetown"
        title="Serving rota"
        meta="Department access code needed"
        chips={["Build", "Auto-fill", "Publish"]}
      />
    ),
    size,
  );
}
