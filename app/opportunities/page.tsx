import { OpportunityBoard } from "@/components/opportunities/opportunity-board";
import { PublicShell } from "@/components/shell/public-shell";
import { getPublicOpportunities } from "@/lib/opportunities/data";

export const dynamic = "force-dynamic";

const description =
  "Jobs, scholarships, grants and training, vetted by the Kharis Church Welfare team.";

export const metadata = {
  title: "Opportunities",
  description,
  openGraph: {
    title: "Opportunities · Kharis Church Freetown",
    description,
    url: "/opportunities",
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "Opportunities · Kharis Church Freetown",
    description,
  },
};

export default async function OpportunitiesPage() {
  const opportunities = await getPublicOpportunities();

  return (
    <PublicShell eyebrow="Kharis Freetown Opportunities Board" href="/opportunities">
      <OpportunityBoard opportunities={opportunities} />
    </PublicShell>
  );
}
