import Link from "next/link";
import { OpportunityFollowUpForm } from "@/components/opportunities/opportunity-follow-up-form";
import { PublicShell } from "@/components/shell/public-shell";
import { getOpportunityFollowUpOptions } from "@/lib/opportunities/data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Opportunity follow-up",
  description: "Share an update on your job or internship application.",
};

export default async function OpportunityFollowUpPage({
  searchParams,
}: {
  searchParams: Promise<{ opportunity?: string; submitted?: string }>;
}) {
  const [params, opportunities] = await Promise.all([
    searchParams,
    getOpportunityFollowUpOptions(),
  ]);

  return (
    <PublicShell eyebrow="Kharis Freetown Opportunities Board" href="/opportunities">
      <header className="bulletin-header">
        <div>
          <p className="bulletin-eyebrow">Welfare follow-up</p>
          <h1>How is your application going?</h1>
        </div>
        <Link className="bulletin-icon-button" href="/opportunities" aria-label="Back to opportunities">
          <span className="bulletin-back-mark">‹</span>
        </Link>
      </header>

      {params.submitted === "1" ? (
        <section className="opportunity-follow-up-success" role="status">
          <h2>Update received</h2>
          <p>
            Thank you. The Welfare team can use your update to follow your
            application and check in after three months.
          </p>
          <Link href="/opportunities">Back to opportunities</Link>
        </section>
      ) : (
        <OpportunityFollowUpForm
          opportunities={opportunities}
          initialOpportunitySlug={params.opportunity ?? ""}
        />
      )}
    </PublicShell>
  );
}
