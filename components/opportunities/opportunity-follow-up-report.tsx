import type { OpportunityFollowUpReport as OpportunityFollowUpReportRecord } from "@/lib/opportunities/types";

function contactKey(value: string) {
  const trimmed = value.trim().toLowerCase();
  return trimmed.includes("@")
    ? trimmed.replace(/\s/g, "")
    : trimmed.replace(/\D/g, "");
}

function uniquePeople(reports: OpportunityFollowUpReportRecord[]) {
  return new Set(reports.map((report) => contactKey(report.contactDetail))).size;
}

function isThreeMonthCheckInDue(startedAt: string | null) {
  if (!startedAt) return false;

  const [year, month, day] = startedAt.split("-").map(Number);
  const targetMonth = month + 2;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedMonth = targetMonth % 12;
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  const dueAt = new Date(
    Date.UTC(targetYear, normalizedMonth, Math.min(day, lastDay)),
  );

  return dueAt <= new Date();
}

function answer(value: boolean) {
  return value ? "Yes" : "No";
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="opportunity-follow-up-metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

export function OpportunityFollowUpReport({
  reports,
  onBack,
}: {
  reports: OpportunityFollowUpReportRecord[];
  onBack: () => void;
}) {
  const dueReports = reports.filter(
    (report) =>
      report.startedWorking &&
      report.retainedAfterThreeMonths === null &&
      isThreeMonthCheckInDue(report.startedAt),
  );
  const opportunityGroups = Array.from(
    reports.reduce((groups, report) => {
      const group = groups.get(report.opportunityId) ?? [];
      group.push(report);
      groups.set(report.opportunityId, group);
      return groups;
    }, new Map<string, OpportunityFollowUpReportRecord[]>()),
  );

  return (
    <section className="opportunity-follow-up-report">
      <header className="opportunity-follow-up-report-heading">
        <div>
          <p className="bulletin-eyebrow">Welfare</p>
          <h2>Follow-up reports</h2>
          <p>Self-reported progress for jobs and internships.</p>
        </div>
        <button className="bulletin-secondary-full" type="button" onClick={onBack}>
          Back to opportunities
        </button>
      </header>

      <div className="opportunity-follow-up-metrics">
        <Metric label="People reporting" value={uniquePeople(reports)} />
        <Metric
          label="Applied"
          value={uniquePeople(reports.filter((report) => report.didApply))}
        />
        <Metric
          label="Shortlisted or interviewed"
          value={uniquePeople(
            reports.filter((report) => report.shortlistedOrInterviewed),
          )}
        />
        <Metric
          label="Offers"
          value={uniquePeople(reports.filter((report) => report.offeredPosition))}
        />
        <Metric
          label="Started work"
          value={uniquePeople(reports.filter((report) => report.startedWorking))}
        />
        <Metric
          label="Still in role after 3 months"
          value={uniquePeople(
            reports.filter((report) => report.retainedAfterThreeMonths === true),
          )}
        />
      </div>

      {dueReports.length > 0 ? (
        <p className="opportunity-follow-up-due" role="status">
          {dueReports.length} three-month check-in{dueReports.length === 1 ? "" : "s"} due.
          Contact the applicants below and ask them to update their report.
        </p>
      ) : null}

      {opportunityGroups.length > 0 ? (
        <section className="opportunity-follow-up-by-opportunity">
          <h3>Outcomes by opportunity</h3>
          <div className="opportunity-follow-up-opportunity-list">
            {opportunityGroups.map(([opportunityId, opportunityReports]) => {
              const opportunity = opportunityReports[0];

              return (
                <article
                  className="opportunity-follow-up-opportunity-card"
                  key={opportunityId}
                >
                  <div>
                    <h4>{opportunity.opportunityTitle}</h4>
                    <p>{opportunity.organisation}</p>
                  </div>
                  <dl className="opportunity-follow-up-opportunity-stats">
                    <div><dt>People</dt><dd>{uniquePeople(opportunityReports)}</dd></div>
                    <div><dt>Applied</dt><dd>{uniquePeople(opportunityReports.filter((report) => report.didApply))}</dd></div>
                    <div><dt>Shortlisted/interviewed</dt><dd>{uniquePeople(opportunityReports.filter((report) => report.shortlistedOrInterviewed))}</dd></div>
                    <div><dt>Offers</dt><dd>{uniquePeople(opportunityReports.filter((report) => report.offeredPosition))}</dd></div>
                    <div><dt>Started</dt><dd>{uniquePeople(opportunityReports.filter((report) => report.startedWorking))}</dd></div>
                    <div><dt>Still in role</dt><dd>{uniquePeople(opportunityReports.filter((report) => report.retainedAfterThreeMonths === true))}</dd></div>
                  </dl>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {reports.length === 0 ? (
        <p className="bulletin-empty">No follow-up updates have been submitted yet.</p>
      ) : (
        <div className="opportunity-follow-up-report-list">
          {reports.map((report) => {
            const due =
              report.startedWorking &&
              report.retainedAfterThreeMonths === null &&
              isThreeMonthCheckInDue(report.startedAt);

            return (
              <article className="opportunity-follow-up-report-card" key={report.id}>
                <div className="opportunity-follow-up-report-title">
                  <div>
                    <h3>{report.opportunityTitle}</h3>
                    <p>{report.organisation}</p>
                  </div>
                  {due ? <span className="opportunity-follow-up-due-tag">Check-in due</span> : null}
                </div>

                <p className="opportunity-follow-up-contact">
                  <strong>{report.name}</strong>
                  <span>{report.contactDetail}</span>
                </p>

                <dl className="opportunity-follow-up-statuses">
                  <div><dt>Applied</dt><dd>{answer(report.didApply)}</dd></div>
                  <div><dt>Shortlisted/interviewed</dt><dd>{answer(report.shortlistedOrInterviewed)}</dd></div>
                  <div><dt>Offered</dt><dd>{answer(report.offeredPosition)}</dd></div>
                  <div><dt>Started work</dt><dd>{answer(report.startedWorking)}</dd></div>
                  <div>
                    <dt>Still in role after 3 months</dt>
                    <dd>
                      {report.retainedAfterThreeMonths === null
                        ? "Not reported"
                        : answer(report.retainedAfterThreeMonths)}
                    </dd>
                  </div>
                </dl>

                <small>
                  Updated {new Date(report.updatedAt).toLocaleDateString("en-GB")}
                </small>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
