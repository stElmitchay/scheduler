import type { ReactElement } from "react";

// One frame for every social preview so the three modules read as one app. The
// palette matches globals.css; ImageResponse has no access to the app's fonts,
// so these fall back to a system stack as the root preview already does.
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const INK = "#17181a";
const BG = "#fbfaf8";
const MUTED = "#6b6f72";
const LINE = "#e6e4de";
const ACCENT = "#2f6f52";

export function OgFrame({
  eyebrow,
  title,
  meta,
  chips,
}: {
  eyebrow: string;
  title: string;
  meta?: string;
  chips?: string[];
}): ReactElement {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: BG,
        color: INK,
        fontFamily: "Arial, Helvetica, sans-serif",
        padding: 72,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          style={{
            textTransform: "uppercase",
            letterSpacing: 3,
            fontSize: 24,
            fontWeight: 600,
            color: MUTED,
          }}
        >
          {eyebrow}
        </span>
        <div
          style={{
            width: 72,
            height: 72,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 16,
            background: INK,
            color: BG,
            fontSize: 34,
            fontWeight: 700,
            position: "relative",
          }}
        >
          K
          <div
            style={{
              position: "absolute",
              right: 12,
              bottom: 12,
              width: 10,
              height: 10,
              borderRadius: 999,
              background: ACCENT,
            }}
          />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{
            display: "flex",
            fontSize: title.length > 46 ? 64 : 88,
            lineHeight: 1.02,
            fontWeight: 700,
            letterSpacing: -2,
            maxWidth: 1010,
          }}
        >
          {title}
        </div>
        <div style={{ display: "flex", width: "100%", height: 1, background: LINE }} />
        {meta ? (
          <div style={{ display: "flex", fontSize: 28, color: MUTED }}>{meta}</div>
        ) : null}
      </div>

      <div style={{ display: "flex", gap: 14 }}>
        {(chips ?? []).map((chip) => (
          <div
            key={chip}
            style={{
              display: "flex",
              border: `1px solid ${LINE}`,
              borderRadius: 4,
              padding: "12px 18px",
              fontSize: 22,
              fontWeight: 600,
              color: MUTED,
            }}
          >
            {chip}
          </div>
        ))}
      </div>
    </div>
  );
}
