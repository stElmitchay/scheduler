import { ImageResponse } from "next/og";
import { OgFrame, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og/frame";
import {
  employmentTypeLabels,
  opportunityKindLabels,
} from "@/lib/opportunities/types";
import { getPublicOpportunityBySlug } from "@/lib/opportunities/data";
import { deadlineLabel } from "@/lib/opportunities/display.mjs";

export const alt = "An opportunity shared by Kharis Church Freetown";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const opportunity = await getPublicOpportunityBySlug(slug);

  if (!opportunity) {
    return new ImageResponse(
      (
        <OgFrame
          eyebrow="Kharis Church Freetown"
          title="Opportunities"
          meta="This opportunity is no longer available"
        />
      ),
      size,
    );
  }

  const deadline = deadlineLabel(opportunity.deadline);
  const chips = [
    opportunityKindLabels[opportunity.kind],
    opportunity.location,
    opportunity.employmentType
      ? employmentTypeLabels[opportunity.employmentType]
      : "",
    deadline ? deadline.text : "",
  ].filter(Boolean);

  return new ImageResponse(
    (
      <OgFrame
        eyebrow="Kharis Church Freetown"
        title={opportunity.title}
        meta={opportunity.organisation}
        chips={chips.slice(0, 4)}
      />
    ),
    size,
  );
}
