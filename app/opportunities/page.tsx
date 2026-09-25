import { OpportunityBoard } from "@/components/opportunities/opportunity-board";
import { PublicShell } from "@/components/shell/public-shell";
import { getPublicOpportunities } from "@/lib/opportunities/data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Opportunities",
};

export default async function OpportunitiesPage() {
  const opportunities = await getPublicOpportunities();

  return (
    <PublicShell
      eyebrow="Kharis \u00b7 Opportunities"
      meta={`${opportunities.length} open`}
    >
      <OpportunityBoard opportunities={opportunities} />
    </PublicShell>
  );
}
