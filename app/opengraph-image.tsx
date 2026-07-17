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
          background: "#fff8e8",
          color: "#252018",
          fontFamily: "Georgia, 'Times New Roman', serif",
          padding: 54,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            border: "8px solid #252018",
            padding: 56,
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              fontFamily: "Arial, Helvetica, sans-serif",
              textTransform: "uppercase",
              letterSpacing: 3,
              fontSize: 28,
              fontWeight: 800,
            }}
          >
            <span>Kharis Church Freetown</span>
            <span style={{ color: "#8b6f46" }}>Scheduler</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div
              style={{
                width: 104,
                height: 104,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 52,
                background: "#252018",
                color: "#fff8e8",
                border: "6px solid #c89332",
                fontSize: 36,
                fontWeight: 900,
                fontFamily: "Arial, Helvetica, sans-serif",
              }}
            >
              KC
            </div>
            <div
              style={{
                fontSize: 92,
                lineHeight: 0.95,
                fontWeight: 700,
                maxWidth: 860,
              }}
            >
              This week at Kharis Freetown
            </div>
            <div
              style={{
                width: 720,
                height: 6,
                background: "#c89332",
                marginTop: 10,
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              gap: 16,
              fontFamily: "Arial, Helvetica, sans-serif",
              fontSize: 24,
              fontWeight: 800,
              color: "#6f6252",
            }}
          >
            {["Main Auditorium", "Second Floor Room", "Balcony"].map((space) => (
              <div
                key={space}
                style={{
                  border: "3px solid #d7b66e",
                  padding: "14px 18px",
                  background: "#fffdf6",
                }}
              >
                {space}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
