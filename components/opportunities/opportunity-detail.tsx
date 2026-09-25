import { buildOpportunityShareUrl } from "@/lib/opportunities/share-url";
import type {
  Opportunity,
  OpportunityBoardSettings,
} from "@/lib/opportunities/types";
import { deadlineLabel } from "@/lib/opportunities/display.mjs";
import { formatEmploymentType, formatOpportunityKind } from "./format";

function buildWhatsappUrl(
  opportunity: Opportunity,
  settings: OpportunityBoardSettings,
) {
  if (!settings.welfareWhatsappNumber) return null;

  const message = [
    "Hello, I need help applying for this opportunity:",
    `${formatOpportunityKind(opportunity.kind)}: ${opportunity.title}`,
    `Organisation: ${opportunity.organisation}`,
    `Link: ${buildOpportunityShareUrl(opportunity.slug)}`,
  ].join("\n");

  return `https://wa.me/${settings.welfareWhatsappNumber}?text=${encodeURIComponent(message)}`;
}

export function OpportunityDetail({
  opportunity,
  settings,
}: {
  opportunity: Opportunity;
  settings: OpportunityBoardSettings;
}) {
  const whatsappUrl = buildWhatsappUrl(opportunity, settings);
  const deadline = deadlineLabel(opportunity.deadline);

  return (
    <article className="opportunity-detail">
      <div className="opportunity-detail-head">
        <div>
          <span className={`opportunity-kind kind-${opportunity.kind}`}>
            {formatOpportunityKind(opportunity.kind)}
          </span>
          <p className="bulletin-eyebrow">{opportunity.organisation}</p>
          <h1>{opportunity.title}</h1>
          <p className="opportunity-detail-meta">
            {[
              opportunity.location,
              formatEmploymentType(opportunity.employmentType),
              opportunity.salary,
            ]
              .filter(Boolean)
              .join(" / ")}
          </p>
          {deadline ? (
            <p
              className={
                deadline.urgent
                  ? "opportunity-detail-deadline urgent"
                  : "opportunity-detail-deadline"
              }
            >
              {deadline.text}
            </p>
          ) : null}
        </div>
      </div>

      <section>
        <h2>Description</h2>
        <p>{opportunity.description}</p>
      </section>

      {opportunity.requirements ? (
        <section>
          <h2>Requirements</h2>
          <p>{opportunity.requirements}</p>
        </section>
      ) : null}

      {opportunity.applicationInstructions ? (
        <section>
          <h2>Application instructions</h2>
          <p>{opportunity.applicationInstructions}</p>
        </section>
      ) : null}

      {opportunity.organisationContact ? (
        <section>
          <h2>Contact</h2>
          <p>{opportunity.organisationContact}</p>
        </section>
      ) : null}

      {opportunity.attachmentUrl ? (
        <a
          className="bulletin-secondary-full opportunity-action-link"
          href={opportunity.attachmentUrl}
          target="_blank"
          rel="noreferrer"
        >
          Open attachment
        </a>
      ) : null}

      <div className="opportunity-actions">
        {opportunity.applicationLink ? (
          <a
            className="bulletin-primary opportunity-action-link"
            href={opportunity.applicationLink}
            target="_blank"
            rel="noreferrer"
          >
            Apply
          </a>
        ) : null}
        {whatsappUrl ? (
          <a
            className="bulletin-secondary-full opportunity-action-link"
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
