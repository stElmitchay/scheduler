"use client";

import {
  type FormEvent,
  useActionState,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import {
  cancelBookingAction,
  confirmBookingAction,
  unlockAccessAction,
  type FormActionState,
} from "@/app/actions";
import {
  buildMonthGrid,
  formatDateKey,
  getWeekRange,
  isSameDate,
} from "@/lib/scheduler/calendar-utils.mjs";
import type {
  AccessContext,
  Booking,
  Department,
  Space,
} from "@/lib/scheduler/types";
import { BookingForm } from "./booking-form";

type Screen = "home" | "menu" | "calendar" | "add" | "manage" | "pastor";
type ProtectedTarget = "add" | "manage" | "pastor";
type SpaceFilter = "all" | string;

const initialCancelState: FormActionState = {
  ok: false,
  message: "",
};

function formatDayHeading(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatShortDay(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "numeric",
  }).format(date);
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function byStartTime(a: Booking, b: Booking) {
  return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
}

function filterBySpace(bookings: Booking[], spaceFilter: SpaceFilter) {
  if (spaceFilter === "all") {
    return bookings;
  }

  return bookings.filter((booking) => booking.spaceId === spaceFilter);
}

function bookingsForDay(bookings: Booking[], day: Date, spaceFilter: SpaceFilter = "all") {
  return filterBySpace(bookings, spaceFilter)
    .filter((booking) => isSameDate(new Date(booking.startAt), day))
    .sort(byStartTime);
}

function bookingLine(booking: Booking) {
  const location = booking.spaceId ? booking.spaceName : "No church space";
  return `${location} / ${booking.departmentName}`;
}

function countByLabel<T>(items: T[], getLabel: (item: T) => string) {
  const counts = new Map<string, number>();

  items.forEach((item) => {
    const label = getLabel(item);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });

  return Array.from(counts, ([label, count]) => ({ label, count })).sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label),
  );
}

function BulletinHeader({
  eyebrow,
  title,
  onMenu,
  onBack,
}: {
  eyebrow: string;
  title: string;
  onMenu?: () => void;
  onBack?: () => void;
}) {
  return (
    <header className="bulletin-header">
      <div>
        <p className="bulletin-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      <button
        type="button"
        className="bulletin-icon-button"
        onClick={onBack ?? onMenu}
        aria-label={onBack ? "Go back" : "Open menu"}
      >
        {onBack ? (
          <span className="bulletin-back-mark">‹</span>
        ) : (
          <span className="bulletin-menu-mark">
            <span />
            <span />
            <span />
          </span>
        )}
      </button>
    </header>
  );
}

function EventItem({ booking }: { booking: Booking }) {
  return (
    <article
      className={
        booking.status === "pending"
          ? "bulletin-event bulletin-event-pending"
          : booking.status === "cancelled"
          ? "bulletin-event bulletin-event-cancelled"
          : "bulletin-event"
      }
    >
      <time>
        {booking.status === "pending"
          ? "Pending"
          : booking.status === "cancelled"
          ? "Cancelled"
          : `${formatTime(booking.startAt)} - ${formatTime(booking.endAt)}`}
      </time>
      <h3>{booking.activityName}</h3>
      <p>{bookingLine(booking)}</p>
    </article>
  );
}

export function BulletinApp({
  bookings,
  departments,
  spaces,
}: {
  bookings: Booking[];
  departments: Department[];
  spaces: Space[];
}) {
  const today = useMemo(() => new Date(), []);
  const [screen, setScreen] = useState<Screen>("home");
  const [spaceFilter, setSpaceFilter] = useState<SpaceFilter>("all");
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [accessCode, setAccessCode] = useState("");
  const [activeCode, setActiveCode] = useState("");
  const [activeAccess, setActiveAccess] = useState<AccessContext | null>(null);
  const [accessMessage, setAccessMessage] = useState("");
  const [accessMessageIsError, setAccessMessageIsError] = useState(false);
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [calendarNotice, setCalendarNotice] = useState("");
  const [manageNotice, setManageNotice] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [protectedTarget, setProtectedTarget] = useState<ProtectedTarget>("add");
  const pendingCode = useRef("");
  const [unlockPending, startUnlockTransition] = useTransition();
  const [cancelState, cancelAction, cancelPending] = useActionState(
    cancelBookingAction,
    initialCancelState,
  );
  const [confirmState, confirmAction, confirmPending] = useActionState(
    confirmBookingAction,
    initialCancelState,
  );

  const confirmedBookings = useMemo(
    () => bookings.filter((booking) => booking.status === "confirmed"),
    [bookings],
  );
  const publicBookings = useMemo(
    () => bookings.filter((booking) => booking.status !== "pending"),
    [bookings],
  );
  const weekDays = useMemo(() => getWeekRange(today), [today]);
  const monthDays = useMemo(() => buildMonthGrid(monthCursor), [monthCursor]);
  const publicWeekDays = useMemo(
    () =>
      weekDays
        .map((day) => ({
          day,
          bookings: bookingsForDay(publicBookings, day),
        }))
        .filter(({ bookings }) => bookings.length > 0),
    [publicBookings, weekDays],
  );
  const selectedBookings = bookingsForDay(publicBookings, selectedDate, spaceFilter);

  const editableBookings = useMemo(() => {
    if (!activeAccess) {
      return [];
    }

    return bookings.filter((booking) => {
      if (activeAccess.kind === "pastor") {
        return true;
      }

      return booking.departmentId === activeAccess.departmentId;
    });
  }, [activeAccess, bookings]);

  const editingBooking = editableBookings.find(
    (booking) => booking.id === editingId,
  );

  function openProtected(target: ProtectedTarget) {
    setProtectedTarget(target);
    setAccessCode("");
    setAccessMessage("");
    setAccessMessageIsError(false);
    setAccessModalOpen(true);
  }

  function handleAccessSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const submittedCode = accessCode;
    pendingCode.current = submittedCode;

    startUnlockTransition(async () => {
      const result = await unlockAccessAction(
        { ok: false, message: "", access: null },
        formData,
      );

      if (!result.ok) {
        setAccessMessage(result.message);
        setAccessMessageIsError(true);
        return;
      }

      if (protectedTarget === "pastor" && result.access.kind !== "pastor") {
        setAccessMessage("Pastor code required.");
        setAccessMessageIsError(true);
        return;
      }

      setAccessMessage(result.message);
      setAccessMessageIsError(false);
      setActiveCode(submittedCode);
      setActiveAccess(result.access);
      setEditingId(null);
      setAccessModalOpen(false);
      setScreen(protectedTarget);
    });
  }

  function renderAccessModal() {
    if (!accessModalOpen) {
      return null;
    }

    const modal = (
      <div className="bulletin-modal-backdrop" role="presentation">
        <div
          className="bulletin-access-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="access-modal-title"
        >
          <button
            type="button"
            className="bulletin-modal-close"
            onClick={() => setAccessModalOpen(false)}
            aria-label="Close access code popup"
          >
            ×
          </button>
          <h2 id="access-modal-title">Enter access code</h2>
          <form className="bulletin-form" onSubmit={handleAccessSubmit}>
            <label>
              Access code
              <input
                name="accessCode"
                value={accessCode}
                onChange={(event) => setAccessCode(event.target.value)}
                autoComplete="off"
              />
            </label>
            <button type="submit" className="bulletin-primary" disabled={unlockPending}>
              {unlockPending ? "Checking..." : "Continue"}
            </button>
          </form>
          {accessMessage ? (
            <p
              className={
                accessMessageIsError ? "bulletin-message error" : "bulletin-message"
              }
            >
              {accessMessage}
            </p>
          ) : null}
        </div>
      </div>
    );

    if (typeof document === "undefined") {
      return null;
    }

    return createPortal(modal, document.body);
  }

  function shiftMonth(amount: number) {
    setMonthCursor((current) => {
      const next = new Date(current);
      next.setMonth(current.getMonth() + amount);
      return next;
    });
  }

  function goHome() {
    setScreen("home");
    setEditingId(null);
  }

  function handleFormSaved(state: FormActionState) {
    if (state.startAt) {
      const savedDate = new Date(state.startAt);
      setSelectedDate(savedDate);
      setMonthCursor(savedDate);
    }

    setEditingId(null);

    if (state.status === "pending") {
      setManageNotice(state.message);
      setScreen("manage");
      return;
    }

    setCalendarNotice(state.message);
    setScreen("calendar");
  }

  const pastorMetrics = {
    weeklyBookings: weekDays.flatMap((day) =>
      bookingsForDay(confirmedBookings, day),
    ),
    pendingBookings: bookings
      .filter((booking) => booking.status === "pending")
      .sort(byStartTime),
    upcomingBookings: confirmedBookings
      .filter((booking) => {
        const endOfRange = new Date(today);
        endOfRange.setDate(today.getDate() + 7);

        return (
          new Date(booking.endAt) >= today &&
          new Date(booking.startAt) < endOfRange
        );
      })
      .sort(byStartTime)
      .slice(0, 6),
  };
  const pastorDashboard = {
    activeDepartments: new Set(
      pastorMetrics.weeklyBookings.map((booking) => booking.departmentId),
    ).size,
    activityTypes: countByLabel(
      pastorMetrics.weeklyBookings,
      (booking) => booking.activityType,
    ),
    departments: countByLabel(
      pastorMetrics.weeklyBookings,
      (booking) => booking.departmentName,
    ).slice(0, 6),
    spaces: spaces.map((space) => ({
      label: space.name,
      count: pastorMetrics.weeklyBookings.filter(
        (booking) => booking.spaceId === space.id,
      ).length,
    })),
    today: bookingsForDay(confirmedBookings, today),
    weekly: pastorMetrics.weeklyBookings.length,
    pending: pastorMetrics.pendingBookings.length,
  };
  const maxSpaceUse = Math.max(
    1,
    ...pastorDashboard.spaces.map((space) => space.count),
  );
  const maxDepartmentUse = Math.max(
    1,
    ...pastorDashboard.departments.map((department) => department.count),
  );

  if (screen === "menu") {
    return (
      <main className="bulletin-page">
        <div className="bulletin-shell">
          <BulletinHeader eyebrow="Kharis Church" title="Menu" onBack={goHome} />
          <nav className="bulletin-menu-panel" aria-label="Scheduler menu">
            <button type="button" onClick={() => openProtected("add")}>
              <span>
                <strong>Add activity</strong>
                <small>Add a space booking or church activity</small>
              </span>
              <b>+</b>
            </button>
            <button type="button" onClick={() => openProtected("manage")}>
              <span>
                <strong>Manage activities</strong>
                <small>Edit, confirm, or cancel what you own</small>
              </span>
              <b>›</b>
            </button>
            <button type="button" onClick={() => openProtected("pastor")}>
              <span>
                <strong>Pastor dashboard</strong>
                <small>Pastor code required</small>
              </span>
              <b>›</b>
            </button>
            <button type="button" onClick={() => setScreen("calendar")}>
              <span>
                <strong>Full calendar</strong>
                <small>Public month view and space filters</small>
              </span>
              <b>›</b>
            </button>
          </nav>
          {renderAccessModal()}
        </div>
      </main>
    );
  }

  if (screen === "calendar") {
    return (
      <main className="bulletin-page">
        <div className="bulletin-shell bulletin-shell-wide">
          <BulletinHeader
            eyebrow="Full calendar"
            title={formatMonth(monthCursor)}
            onMenu={() => setScreen("menu")}
          />

          <div className="bulletin-calendar-toolbar">
            <button type="button" onClick={() => shiftMonth(-1)}>
              Previous
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setMonthCursor(now);
                setSelectedDate(now);
              }}
            >
              Today
            </button>
            <button type="button" onClick={() => shiftMonth(1)}>
              Next
            </button>
          </div>

          <div className="bulletin-filters" aria-label="Space filters">
            <button
              type="button"
              className={spaceFilter === "all" ? "active" : ""}
              onClick={() => setSpaceFilter("all")}
            >
              All activities
            </button>
            {spaces.map((space) => (
              <button
                type="button"
                key={space.id}
                className={spaceFilter === space.id ? "active" : ""}
                onClick={() => setSpaceFilter(space.id)}
              >
                {space.name}
              </button>
            ))}
          </div>

          <section className="calendar-app-grid" aria-label="Monthly calendar">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div className="calendar-weekday" key={day}>
                {day}
              </div>
            ))}
            {monthDays.map((day) => {
              const dayBookings = bookingsForDay(publicBookings, day, spaceFilter);
              const isSelected = isSameDate(day, selectedDate);
              const isOutsideMonth = day.getMonth() !== monthCursor.getMonth();

              return (
                <button
                  type="button"
                  key={formatDateKey(day)}
                  className={[
                    "calendar-day-cell",
                    isSelected ? "selected" : "",
                    isOutsideMonth ? "outside" : "",
                  ].join(" ")}
                  onClick={() => setSelectedDate(day)}
                >
                  <span className="calendar-day-number">{day.getDate()}</span>
                  <span className="calendar-day-events">
                    {dayBookings.slice(0, 2).map((booking) => (
                      <span key={booking.id}>{booking.activityName}</span>
                    ))}
                    {dayBookings.length > 2 ? (
                      <em>+{dayBookings.length - 2} more</em>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </section>

          <section className="bulletin-section">
            <h2>{formatDayHeading(selectedDate)}</h2>
            {calendarNotice ? (
              <p className="bulletin-message">{calendarNotice}</p>
            ) : null}
            {selectedBookings.length === 0 ? (
              <p className="bulletin-empty">No activities for this date.</p>
            ) : (
              selectedBookings.map((booking) => (
                <EventItem booking={booking} key={booking.id} />
              ))
            )}
          </section>
        </div>
      </main>
    );
  }

  if (screen === "add" && activeAccess) {
    return (
      <main className="bulletin-page">
        <div className="bulletin-shell">
          <BulletinHeader
            eyebrow={
              activeAccess.kind === "pastor"
                ? "Branch pastor"
                : activeAccess.departmentName
            }
            title={editingBooking ? "Edit activity" : "Add activity"}
            onMenu={() => setScreen("menu")}
          />
          <BookingForm
            access={activeAccess}
            accessCode={activeCode}
            booking={editingBooking}
            departments={departments}
            onSaved={handleFormSaved}
            spaces={spaces}
          />
          {editingBooking ? (
            <button
              type="button"
              className="bulletin-secondary-full"
              onClick={() => {
                setEditingId(null);
                setScreen("manage");
              }}
            >
              Stop editing
            </button>
          ) : null}
        </div>
      </main>
    );
  }

  if (screen === "manage" && activeAccess) {
    return (
      <main className="bulletin-page">
        <div className="bulletin-shell">
          <BulletinHeader
            eyebrow={
              activeAccess.kind === "pastor"
                ? "Branch pastor"
                : activeAccess.departmentName
            }
            title="Manage"
            onMenu={() => setScreen("menu")}
          />
          <div className="bulletin-title-rule">Editable activities</div>
          {manageNotice ? (
            <p className="bulletin-message">{manageNotice}</p>
          ) : null}
          {editableBookings.length === 0 ? (
            <p className="bulletin-empty">No editable activities.</p>
          ) : (
            <section className="bulletin-manage-list">
              {editableBookings.map((booking) => (
                <article key={booking.id} className="bulletin-manage-row">
                  <div>
                    <h3>{booking.activityName}</h3>
                    <p>
                      {formatDateTime(booking.startAt)} / {bookingLine(booking)}
                    </p>
                    <span className={`bulletin-status-badge ${booking.status}`}>
                      {booking.status}
                    </span>
                  </div>
                  <div className="bulletin-row-actions">
                    {booking.status !== "cancelled" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(booking.id);
                          setScreen("add");
                        }}
                      >
                        Edit
                      </button>
                    ) : null}
                    {booking.status === "pending" ? (
                      <form action={confirmAction}>
                        <input type="hidden" name="accessCode" value={activeCode} />
                        <input type="hidden" name="bookingId" value={booking.id} />
                        <button type="submit" disabled={confirmPending}>
                          Confirm
                        </button>
                      </form>
                    ) : null}
                    <form action={cancelAction}>
                      <input type="hidden" name="accessCode" value={activeCode} />
                      <input type="hidden" name="bookingId" value={booking.id} />
                      <button
                        type="submit"
                        disabled={cancelPending || booking.status === "cancelled"}
                      >
                        Cancel
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </section>
          )}
          {cancelState.message ? (
            <p
              className={
                cancelState.ok ? "bulletin-message" : "bulletin-message error"
              }
            >
              {cancelState.message}
            </p>
          ) : null}
          {confirmState.message ? (
            <p
              className={
                confirmState.ok ? "bulletin-message" : "bulletin-message error"
              }
            >
              {confirmState.message}
            </p>
          ) : null}
          <button
            type="button"
            className="bulletin-primary"
            onClick={() => {
              setEditingId(null);
              setScreen("add");
            }}
          >
            Add another activity
          </button>
        </div>
      </main>
    );
  }

  if (screen === "pastor" && activeAccess?.kind === "pastor") {
    return (
      <main className="bulletin-page">
        <div className="bulletin-shell">
          <BulletinHeader
            eyebrow="Branch pastor"
            title="Dashboard"
            onMenu={() => setScreen("menu")}
          />
          <section className="bulletin-metrics bulletin-metrics-compact">
            <div>
              <strong>{pastorDashboard.weekly}</strong>
              <span>This week</span>
            </div>
            <div>
              <strong>{pastorDashboard.pending}</strong>
              <span>Pending</span>
            </div>
            <div>
              <strong>{pastorDashboard.today.length}</strong>
              <span>Today</span>
            </div>
            <div>
              <strong>{pastorDashboard.activeDepartments}</strong>
              <span>Active departments</span>
            </div>
          </section>

          <section className="bulletin-dashboard-section">
            <h2>Department activity this week</h2>
            {pastorDashboard.departments.length === 0 ? (
              <p className="bulletin-empty">No active departments this week.</p>
            ) : (
              <div className="bulletin-department-grid">
                {pastorDashboard.departments.map((item) => (
                  <div className="bulletin-department-row" key={item.label}>
                    <div>
                      <span>{item.label}</span>
                      <i>
                        <b
                          style={{
                            width: `${(item.count / maxDepartmentUse) * 100}%`,
                          }}
                        />
                      </i>
                    </div>
                    <strong>{item.count}</strong>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bulletin-dashboard-grid">
            <div className="bulletin-dashboard-section">
              <h2>Activity mix</h2>
              {pastorDashboard.activityTypes.length === 0 ? (
                <p className="bulletin-empty compact">No activity types yet.</p>
              ) : (
                <div className="bulletin-chip-grid">
                  {pastorDashboard.activityTypes.map((item) => (
                    <span className="bulletin-insight-chip" key={item.label}>
                      <strong>{item.count}</strong>
                      {item.label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="bulletin-dashboard-section">
              <h2>Space usage</h2>
              {pastorDashboard.spaces.map((item) => (
                <div className="bulletin-usage-row" key={item.label}>
                  <div>
                    <span>{item.label}</span>
                    <strong>{item.count}</strong>
                  </div>
                  <i>
                    <b style={{ width: `${(item.count / maxSpaceUse) * 100}%` }} />
                  </i>
                </div>
              ))}
            </div>
          </section>

          <section className="bulletin-dashboard-grid">
            <details className="bulletin-dashboard-details">
              <summary>
                <span>Upcoming 7 days</span>
                <strong>{pastorMetrics.upcomingBookings.length}</strong>
              </summary>
              {pastorMetrics.upcomingBookings.length === 0 ? (
                <p className="bulletin-empty compact">
                  No confirmed upcoming activities.
                </p>
              ) : (
                <div className="bulletin-compact-events">
                  {pastorMetrics.upcomingBookings.map((booking) => (
                    <div className="bulletin-compact-event" key={booking.id}>
                      <time>{formatDateTime(booking.startAt)}</time>
                      <span>{booking.activityName}</span>
                      <small>{bookingLine(booking)}</small>
                    </div>
                  ))}
                </div>
              )}
            </details>

            <details className="bulletin-dashboard-details">
              <summary>
                <span>Pending attention</span>
                <strong>{pastorMetrics.pendingBookings.length}</strong>
              </summary>
              {pastorMetrics.pendingBookings.length === 0 ? (
                <p className="bulletin-empty compact">No pending activities.</p>
              ) : (
                <div className="bulletin-compact-events">
                  {pastorMetrics.pendingBookings.slice(0, 5).map((booking) => (
                    <div className="bulletin-compact-event pending" key={booking.id}>
                      <time>{formatDateTime(booking.startAt)}</time>
                      <span>{booking.activityName}</span>
                      <small>{bookingLine(booking)}</small>
                    </div>
                  ))}
                </div>
              )}
            </details>
          </section>

          <div className="bulletin-title-rule">Today</div>
          {pastorDashboard.today.length === 0 ? (
            <p className="bulletin-empty">No confirmed activities today.</p>
          ) : (
            <div className="bulletin-compact-events">
              {pastorDashboard.today.map((booking) => (
                <div className="bulletin-compact-event" key={booking.id}>
                  <time>
                    {formatTime(booking.startAt)} - {formatTime(booking.endAt)}
                  </time>
                  <span>{booking.activityName}</span>
                  <small>{bookingLine(booking)}</small>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="bulletin-page">
      <div className="bulletin-shell">
        <BulletinHeader
          eyebrow="Kharis Church"
          title="Freetown"
          onMenu={() => setScreen("menu")}
        />
        <div className="bulletin-title-rule">This week at Kharis Freetown</div>
        <section className="bulletin-week-list">
          {publicWeekDays.length === 0 ? (
            <p className="bulletin-empty">No confirmed activities this week.</p>
          ) : (
            publicWeekDays.map(({ day, bookings }) => (
              <div key={formatDateKey(day)} className="bulletin-day-group">
                <h2>{formatShortDay(day)}</h2>
                {bookings.map((booking) => (
                  <EventItem booking={booking} key={booking.id} />
                ))}
              </div>
            ))
          )}
        </section>
        <button
          type="button"
          className="bulletin-primary"
          onClick={() => setScreen("calendar")}
        >
          Open full calendar
        </button>
        {renderAccessModal()}
      </div>
    </main>
  );
}
