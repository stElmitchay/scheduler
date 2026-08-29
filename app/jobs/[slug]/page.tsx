import Link from "next/link";
import { JobDetail } from "@/components/jobs/job-detail";
import { getJobSettings, getPublicJobBySlug } from "@/lib/jobs/data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Job Opportunity",
};

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [job, settings] = await Promise.all([
    getPublicJobBySlug(slug),
    getJobSettings(),
  ]);

  return (
    <main className="bulletin-page jobs-page">
      <div className="bulletin-shell">
        <header className="bulletin-header">
          <div>
            <p className="bulletin-eyebrow">Kharis Church</p>
            <h1>Job Board</h1>
          </div>
          <Link className="bulletin-icon-button" href="/jobs" aria-label="Go back">
            <span className="bulletin-back-mark">‹</span>
          </Link>
        </header>
        {job ? (
          <JobDetail job={job} settings={settings} />
        ) : (
          <p className="bulletin-empty job-unavailable">
            This opportunity is no longer available.
          </p>
        )}
      </div>
    </main>
  );
}
