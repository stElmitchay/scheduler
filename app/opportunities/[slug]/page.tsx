import Link from "next/link";
import { OpportunityDetail } from "@/components/opportunities/opportunity-detail";
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
    <main className="bulletin-page opportunities-page">
      <div className="bulletin-shell">
        <header className="bulletin-header">
          <div>
            <p className="bulletin-eyebrow">Kharis Church</p>
            <h1>Opportunities Board</h1>
          </div>
          <Link
            className="bulletin-icon-button"
            href="/opportunities"
            aria-label="Go back"
          >
            <span className="bulletin-back-mark">‹</span>
          </Link>
        </header>
        {opportunity ? (
          <OpportunityDetail opportunity={opportunity} settings={settings} />
        ) : (
          <p className="bulletin-empty opportunity-unavailable">
            This opportunity is no longer available.
          </p>
        )}
      </div>
    </main>
  );
}
