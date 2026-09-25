import { OpportunityDetail } from "@/components/opportunities/opportunity-detail";
import { PublicShell } from "@/components/shell/public-shell";
import {
  getOpportunityBoardSettings,
  getPublicOpportunityBySlug,
} from "@/lib/opportunities/data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Opportunity",
};

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
    <PublicShell eyebrow="Kharis \u00b7 Opportunities">
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
