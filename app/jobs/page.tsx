import Link from "next/link";
import { JobBoard } from "@/components/jobs/job-board";
import { getPublicJobs } from "@/lib/jobs/data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Job Board",
};

export default async function JobsPage() {
  const jobs = await getPublicJobs();

  return (
    <main className="bulletin-page jobs-page">
      <div className="bulletin-shell">
        <header className="bulletin-header">
          <div>
            <p className="bulletin-eyebrow">Kharis Church</p>
            <h1>Job Board</h1>
            <p className="bulletin-subline">
              Vetted opportunities shared by the Welfare team.
            </p>
          </div>
          <Link className="bulletin-icon-button" href="/" aria-label="Go back">
            <span className="bulletin-back-mark">‹</span>
          </Link>
        </header>
        <JobBoard jobs={jobs} />
      </div>
    </main>
  );
}
