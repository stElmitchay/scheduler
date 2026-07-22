import { ImageResponse } from "next/og";

export const alt = "Kharis Church Freetown scheduling calendar";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#fbfaf8",
          color: "#17181a",
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
              color: "#6b6f72",
            }}
          >
            Kharis Church Freetown
          </span>
          <div
            style={{
              width: 72,
              height: 72,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 16,
              background: "#17181a",
              color: "#fbfaf8",
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
                background: "#2f6f52",
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 88,
              lineHeight: 1.02,
              fontWeight: 700,
              letterSpacing: -2,
              maxWidth: 980,
            }}
          >
            This week at Kharis Freetown
          </div>
          <div style={{ display: "flex", width: "100%", height: 1, background: "#e6e4de" }} />
        </div>

        <div style={{ display: "flex", gap: 14 }}>
          {["Main Auditorium", "Second Floor Room", "Balcony"].map((space) => (
            <div
              key={space}
              style={{
                display: "flex",
                border: "1px solid #e6e4de",
                borderRadius: 4,
                padding: "12px 18px",
                fontSize: 22,
                fontWeight: 600,
                color: "#6b6f72",
              }}
            >
              {space}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
