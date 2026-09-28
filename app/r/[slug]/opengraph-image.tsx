import { ImageResponse } from "next/og";
import { OgFrame, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og/frame";
import { getPublicRota } from "@/lib/rota/data";

export const alt = "A serving rota from Kharis Church Freetown";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

function monthLabel(month: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${month}T00:00:00`));
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const rota = await getPublicRota(slug);

  if (!rota) {
    return new ImageResponse(
      (
        <OgFrame
          eyebrow="Kharis Church Freetown"
          title="Serving rota"
          meta="This rota is no longer shared"
        />
      ),
      size,
    );
  }

  const months = rota.periods
    .filter((period) => period.days.length > 0)
    .map((period) => monthLabel(period.month));
  const serviceCount = rota.periods.reduce(
    (total, period) => total + period.days.length,
    0,
  );

  return new ImageResponse(
    (
      <OgFrame
        eyebrow="Kharis Church Freetown"
        title={`${rota.departmentName} serving rota`}
        meta={
          serviceCount > 0
            ? `${serviceCount} serving ${serviceCount === 1 ? "day" : "days"} · find your name`
            : "Find your name and your dates"
        }
        chips={months.slice(0, 3)}
      />
    ),
    size,
  );
}
