"use client";

import { useMemo, useState } from "react";
import type { PublicRota } from "@/lib/rota/data";

function formatMonthLabel(month: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${month}T00:00:00`));
}

function formatDayHeading(dateKey: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${dateKey}T00:00:00`));
}

function formatTime(startAt: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(startAt));
}

export function PublicRotaView({ rota }: { rota: PublicRota }) {
  const [query, setQuery] = useState("");
  const search = query.trim().toLowerCase();

  // Whole days drop off once they are past, so today's services stay visible
  // all day rather than vanishing the moment a service starts.
  const upcoming = useMemo(() => {
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    return rota.periods
      .map((period) => ({
        ...period,
        days: period.days.filter((day) => day.dateKey >= todayKey),
      }))
      .filter((period) => period.days.length > 0);
  }, [rota.periods]);

  const filtered = useMemo(() => {
    if (search.length === 0) {
      return upcoming;
    }

    return upcoming
      .map((period) => ({
        ...period,
        days: period.days
          .map((day) => ({
            ...day,
            services: day.services
              .map((service) => ({
                ...service,
                roles: service.roles
                  .map((role) => ({
                    ...role,
                    people: role.people.filter((name) =>
                      name.toLowerCase().includes(search),
                    ),
                  }))
                  .filter((role) => role.people.length > 0),
              }))
              .filter((service) => service.roles.length > 0),
          }))
          .filter((day) => day.services.length > 0),
      }))
      .filter((period) => period.days.length > 0);
  }, [upcoming, search]);

  const matchedDays = filtered.reduce(
    (total, period) => total + period.days.length,
    0,
  );

  const hasPublished = rota.periods.some((period) => period.days.length > 0);
  const hasAnything = upcoming.length > 0;

  return (
    <main className="bulletin-page">
      <div className="bulletin-shell">
        <header className="bulletin-header">
          <div>
            <p className="bulletin-eyebrow">Kharis Church</p>
            <h1>{rota.departmentName} rota</h1>
          </div>
          {hasAnything ? (
            <button
              type="button"
              className="rota-print-button"
              onClick={() => window.print()}
            >
              Download PDF
            </button>
          ) : null}
        </header>

        <p className="rota-print-only">
          Printed {new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(new Date())}
          {search.length > 0 ? ` · filtered to "${query.trim()}"` : ""}
        </p>

        {hasAnything ? (
          <div className="rota-search">
            <label>
              Find my dates
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Type your name"
                autoComplete="off"
              />
            </label>
            {search.length > 0 ? (
              <p className="rota-lead">
                {matchedDays === 0
                  ? "No dates found for that name."
                  : `${matchedDays} ${matchedDays === 1 ? "day" : "days"} found.`}
              </p>
            ) : null}
          </div>
        ) : null}

        {!hasAnything ? (
          <p className="bulletin-empty">
            {hasPublished
              ? "No upcoming serving dates. The next rota has not been published yet."
              : "This rota has not been published yet. Check back soon."}
          </p>
        ) : null}

        {filtered.map((period) => (
          <section key={period.month}>
            <div className="bulletin-title-rule">
              {formatMonthLabel(period.month)}
            </div>

            {period.days.map((day) => (
              <article key={day.dateKey} className="rota-card">
                <h2>{formatDayHeading(day.dateKey)}</h2>

                {day.services.map((service) => (
                  <div key={service.startAt} className="rota-service">
                    <h3>
                      {service.serviceName}{" "}
                      <small>{formatTime(service.startAt)}</small>
                    </h3>
                    {service.roles.map((role) => (
                      <p key={role.roleName} className="rota-public-role">
                        <strong>{role.roleName}</strong>
                        <span>{role.people.join(", ")}</span>
                      </p>
                    ))}
                  </div>
                ))}
              </article>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
