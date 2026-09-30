import { OpportunityDetail } from "@/components/opportunities/opportunity-detail";
import { PublicShell } from "@/components/shell/public-shell";
import {
  getOpportunityBoardSettings,
  getPublicOpportunityBySlug,
} from "@/lib/opportunities/data";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const opportunity = await getPublicOpportunityBySlug(slug);

  if (!opportunity) {
    return { title: "Opportunity" };
  }

  const title = `${opportunity.title} · ${opportunity.organisation}`;
  // Messaging apps truncate hard, so lead with the description and keep it short.
  const description =
    opportunity.description.length > 160
      ? `${opportunity.description.slice(0, 157).trimEnd()}...`
      : opportunity.description;

  return {
    title: opportunity.title,
    description,
    openGraph: {
      title,
      description,
      url: `/opportunities/${opportunity.slug}`,
    },
    twitter: {
      card: "summary_large_image" as const,
      title,
      description,
    },
  };
}

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [opportunity, settings] = await Promise.all([
    getPublicOpportunityBySlug(slug),
    getOpportunityBoardSettings(),
  ]);

  return (
    <PublicShell eyebrow="Kharis Freetown Opportunities Board" href="/opportunities">
      {opportunity ? (
        <OpportunityDetail opportunity={opportunity} settings={settings} />
      ) : (
        <p className="bulletin-empty opportunity-unavailable">
          This opportunity is no longer available.
        </p>
      )}
    </PublicShell>
  );
}
