"use client";

import { useState } from "react";
import {
  deleteServiceAction,
  rotateShareSlugAction,
  saveServiceAction,
  saveSettingsAction,
} from "@/app/rota/actions";
import type { RotaActionResult, RotaPayload, RotaService } from "@/lib/rota/types";

type RoleDraft = { id?: string; name: string; slotCount: number };

function toDraft(service: RotaService): RoleDraft[] {
  return service.roles.map((role) => ({
    id: role.id,
    name: role.name,
    slotCount: role.slotCount,
  }));
}

export function RotaSetup({
  payload,
  notice,
  busy,
  token,
  run,
  onSaved,
  onBack,
}: {
  payload: RotaPayload;
  notice: string;
  busy: boolean;
  token: string;
  run: <T>(call: () => Promise<RotaActionResult<T>>) => Promise<T | null>;
  onSaved: (payload: RotaPayload) => void;
  onBack: () => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, RoleDraft[]>>({});
  const [capDraft, setCapDraft] = useState<number | null>(null);
  const [newService, setNewService] = useState("");
  const [copied, setCopied] = useState(false);

  // Derived rather than synced from props: after a save the payload carries the
  // new value, so a local copy only needs to exist while it is being edited.
  const cap = capDraft ?? payload.settings.maxServesPerMonth;
  const sharePath = `/r/${payload.settings.shareSlug}`;

  function rolesFor(service: RotaService) {
    return drafts[service.id] ?? toDraft(service);
  }

  function setRoles(serviceId: string, roles: RoleDraft[]) {
    setDrafts((current) => ({ ...current, [serviceId]: roles }));
  }

  async function saveService(service: RotaService) {
    const roles = rolesFor(service)
      .filter((role) => role.name.trim().length > 0)
      .map((role, index) => ({
        id: role.id,
        name: role.name,
        slotCount: role.slotCount,
        sortOrder: index,
      }));

    const next = await run(() =>
      saveServiceAction(token, {
        id: service.id,
        serviceName: service.serviceName,
        roles,
      }),
    );

    if (next) {
      setDrafts((current) => {
        const copy = { ...current };
        delete copy[service.id];
        return copy;
      });
      onSaved(next);
    }
  }

  const available = payload.serviceNameOptions.filter(
    (name) => !payload.services.some((service) => service.serviceName === name),
  );

  return (
    <main className="bulletin-page">
      <div className="bulletin-shell">
        <header className="bulletin-header">
          <div>
            <p className="bulletin-eyebrow">{payload.departmentName}</p>
            <h1>Services and roles</h1>
          </div>
          <button
            type="button"
            className="bulletin-icon-button"
            onClick={onBack}
            aria-label="Go back"
          >
            <span className="bulletin-back-mark">‹</span>
          </button>
        </header>

        {notice ? <p className="bulletin-message error">{notice}</p> : null}

        {payload.serviceNameOptions.length === 0 ? (
          <p className="bulletin-empty">
            No services are on the church calendar yet. Add them in the scheduler
            first, then come back here.
          </p>
        ) : null}

        {payload.services.map((service) => {
          const roles = rolesFor(service);

          return (
            <section key={service.id} className="rota-card">
              <div className="bulletin-title-rule">{service.serviceName}</div>

              {roles.map((role, index) => (
                <div key={index} className="rota-role-row">
                  <input
                    aria-label="Role name"
                    value={role.name}
                    placeholder="Role, e.g. Main Door"
                    onChange={(event) =>
                      setRoles(
                        service.id,
                        roles.map((entry, position) =>
                          position === index
                            ? { ...entry, name: event.target.value }
                            : entry,
                        ),
                      )
                    }
                  />
                  <input
                    aria-label="How many people"
                    type="number"
                    min={1}
                    max={20}
                    value={role.slotCount}
                    onChange={(event) =>
                      setRoles(
                        service.id,
                        roles.map((entry, position) =>
                          position === index
                            ? {
                                ...entry,
                                slotCount: Math.max(
                                  1,
                                  Number(event.target.value) || 1,
                                ),
                              }
                            : entry,
                        ),
                      )
                    }
                  />
                  <button
                    type="button"
                    className="bulletin-cancel-btn"
                    onClick={() =>
                      setRoles(
                        service.id,
                        roles.filter((_, position) => position !== index),
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
              ))}

              {roles.length === 0 ? (
                <p className="rota-lead">
                  Add a role for each post you fill at this service. Everyone you
                  place in a post is on duty — there is no separate list.
                </p>
              ) : null}

              {drafts[service.id] ? (
                <p className="rota-unsaved">Unsaved changes</p>
              ) : null}

              <div className="rota-actions">
                <button
                  type="button"
                  onClick={() =>
                    setRoles(service.id, [...roles, { name: "", slotCount: 1 }])
                  }
                >
                  Add role
                </button>
                <button
                  type="button"
                  className="bulletin-primary"
                  disabled={busy}
                  onClick={() => saveService(service)}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="bulletin-delete-btn"
                  disabled={busy}
                  onClick={async () => {
                    if (
                      !window.confirm(
                        `Remove ${service.serviceName} from your rota?`,
                      )
                    ) {
                      return;
                    }

                    const next = await run(() =>
                      deleteServiceAction(token, service.id),
                    );
                    if (next) onSaved(next);
                  }}
                >
                  Remove service
                </button>
              </div>
            </section>
          );
        })}

        {available.length > 0 ? (
          <section className="rota-card">
            <div className="bulletin-title-rule">Add a service</div>
            <div className="rota-role-row">
              <select
                aria-label="Service"
                value={newService}
                onChange={(event) => setNewService(event.target.value)}
              >
                <option value="">Choose a service…</option>
                {available.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="bulletin-primary"
                disabled={busy || newService === ""}
                onClick={async () => {
                  // No default role: the posts below are the people on duty,
                  // so a generic bucket alongside them would double-count.
                  const next = await run(() =>
                    saveServiceAction(token, {
                      serviceName: newService,
                      roles: [],
                    }),
                  );

                  if (next) {
                    setNewService("");
                    onSaved(next);
                  }
                }}
              >
                Add
              </button>
            </div>
          </section>
        ) : null}

        <section className="rota-card">
          <div className="bulletin-title-rule">Settings</div>
          <div className="rota-role-row">
            <label className="rota-inline-label">
              Most serves per person per month
              <input
                type="number"
                min={1}
                max={31}
                value={cap}
                onChange={(event) => setCapDraft(Number(event.target.value) || 1)}
              />
            </label>
            <button
              type="button"
              className="bulletin-primary"
              disabled={busy}
              onClick={async () => {
                const next = await run(() => saveSettingsAction(token, cap));
                if (next) {
                  setCapDraft(null);
                  onSaved(next);
                }
              }}
            >
              Save
            </button>
          </div>
        </section>

        <section className="rota-card">
          <div className="bulletin-title-rule">Share link</div>
          <p className="rota-lead">
            Anyone with this link can read your published rota. They do not need
            a code.
          </p>
          <div className="rota-role-row">
            <input readOnly value={sharePath} aria-label="Share link" />
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(
                  `${window.location.origin}${sharePath}`,
                );
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
          <button
            type="button"
            className="bulletin-cancel-btn"
            disabled={busy}
            onClick={async () => {
              if (
                !window.confirm(
                  "Generate a new link? The old one will stop working for everyone you have already shared it with.",
                )
              ) {
                return;
              }

              const next = await run(() => rotateShareSlugAction(token));
              if (next) onSaved(next);
            }}
          >
            Generate a new link
          </button>
        </section>
      </div>
    </main>
  );
}
