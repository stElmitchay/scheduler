import Link from "next/link";
import { OpportunityBoard } from "@/components/opportunities/opportunity-board";
import { getPublicOpportunities } from "@/lib/opportunities/data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Opportunities Board",
};

export default async function OpportunitiesPage() {
  const opportunities = await getPublicOpportunities();

  return (
    <main className="bulletin-page opportunities-page">
      <div className="bulletin-shell">
        <header className="bulletin-header">
          <div>
            <p className="bulletin-eyebrow">Kharis Church</p>
            <h1>Opportunities Board</h1>
            <p className="bulletin-subline">
              Jobs, scholarships, and more, vetted by the Welfare team.
            </p>
          </div>
          <Link className="bulletin-icon-button" href="/" aria-label="Go back">
            <span className="bulletin-back-mark">‹</span>
          </Link>
        </header>
        <OpportunityBoard opportunities={opportunities} />
      </div>
    </main>
  );
}
