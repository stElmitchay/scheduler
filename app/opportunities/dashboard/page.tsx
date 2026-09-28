import { OpportunityDashboard } from "@/components/opportunities/opportunity-dashboard";

export const dynamic = "force-dynamic";

const description =
  "Post and manage opportunities for Kharis Church Freetown. Welfare or pastor access code needed.";

export const metadata = {
  title: "Opportunities Dashboard",
  description,
  openGraph: {
    title: "Opportunities dashboard · Kharis Church Freetown",
    description,
    url: "/opportunities/dashboard",
  },
  twitter: {
    card: "summary_large_image" as const,
    title: "Opportunities dashboard · Kharis Church Freetown",
    description,
  },
};

export default function OpportunityDashboardPage() {
  return <OpportunityDashboard />;
}
