import { buildJobShareUrl } from "@/lib/jobs/share-url";
import type { JobOpportunity, JobSettings } from "@/lib/jobs/types";
import { formatJobDeadline, formatJobType } from "./format";

function buildWhatsappUrl(job: JobOpportunity, settings: JobSettings) {
  if (!settings.welfareWhatsappNumber) return null;

  const message = [
    "Hello, I need help applying for this opportunity:",
    `Job: ${job.title}`,
    `Organisation: ${job.organisation}`,
    `Link: ${buildJobShareUrl(job.slug)}`,
  ].join("\n");

  return `https://wa.me/${settings.welfareWhatsappNumber}?text=${encodeURIComponent(message)}`;
}

export function JobDetail({
  job,
  settings,
}: {
  job: JobOpportunity;
  settings: JobSettings;
}) {
  const whatsappUrl = buildWhatsappUrl(job, settings);

  return (
    <article className="job-detail">
      <div>
        <p className="bulletin-eyebrow">{job.organisation}</p>
        <h1>{job.title}</h1>
        <p className="job-detail-meta">
          {[job.location, formatJobType(job.jobType)].filter(Boolean).join(" / ")}
        </p>
        {job.deadline ? (
          <p className="job-detail-deadline">
            Deadline: {formatJobDeadline(job.deadline)}
          </p>
        ) : null}
      </div>

      <section>
        <h2>Description</h2>
        <p>{job.description}</p>
      </section>

      {job.requirements ? (
        <section>
          <h2>Requirements</h2>
          <p>{job.requirements}</p>
        </section>
      ) : null}

      {job.salary ? (
        <section>
          <h2>Salary</h2>
          <p>{job.salary}</p>
        </section>
      ) : null}

      {job.applicationInstructions ? (
        <section>
          <h2>Application instructions</h2>
          <p>{job.applicationInstructions}</p>
        </section>
      ) : null}

      {job.organisationContact ? (
        <section>
          <h2>Contact</h2>
          <p>{job.organisationContact}</p>
        </section>
      ) : null}

      {job.attachmentUrl ? (
        <a
          className="bulletin-secondary-full job-action-link"
          href={job.attachmentUrl}
          target="_blank"
          rel="noreferrer"
        >
          Open attachment
        </a>
      ) : null}

      <div className="job-actions">
        {job.applicationLink ? (
          <a
            className="bulletin-primary job-action-link"
            href={job.applicationLink}
            target="_blank"
            rel="noreferrer"
          >
            Apply
          </a>
        ) : null}
        {whatsappUrl ? (
          <a
            className="bulletin-secondary-full job-action-link"
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
          >
            Need help
          </a>
        ) : null}
      </div>
    </article>
  );
}
