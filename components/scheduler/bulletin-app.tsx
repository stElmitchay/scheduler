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
  return `${booking.spaceName} / ${booking.departmentName}`;
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
        booking.status === "cancelled"
          ? "bulletin-event bulletin-event-cancelled"
          : "bulletin-event"
      }
    >
      <time>
        {booking.status === "cancelled"
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [protectedTarget, setProtectedTarget] = useState<ProtectedTarget>("add");
  const pendingCode = useRef("");
  const [unlockPending, startUnlockTransition] = useTransition();
  const [cancelState, cancelAction, cancelPending] = useActionState(
    cancelBookingAction,
    initialCancelState,
  );

  const confirmedBookings = useMemo(
    () => bookings.filter((booking) => booking.status === "confirmed"),
    [bookings],
  );
  const weekDays = useMemo(() => getWeekRange(today), [today]);
  const monthDays = useMemo(() => buildMonthGrid(monthCursor), [monthCursor]);
  const selectedBookings = bookingsForDay(bookings, selectedDate, spaceFilter);

  const editableBookings = useMemo(() => {
    if (!activeAccess) {
      return [];
    }

    return confirmedBookings.filter((booking) => {
      if (activeAccess.kind === "pastor") {
        return true;
      }

      return booking.departmentId === activeAccess.departmentId;
    });
  }, [activeAccess, confirmedBookings]);

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

  const pastorMetrics = {
    weekly: weekDays.reduce(
      (count, day) => count + bookingsForDay(confirmedBookings, day).length,
      0,
    ),
    spacesUsed: new Set(confirmedBookings.map((booking) => booking.spaceId)).size,
    tonight: bookingsForDay(confirmedBookings, today).length,
  };

  if (screen === "menu") {
    return (
      <main className="bulletin-page">
        <div className="bulletin-shell">
          <BulletinHeader eyebrow="Kharis Church" title="Menu" onBack={goHome} />
          <nav className="bulletin-menu-panel" aria-label="Scheduler menu">
            <button type="button" onClick={() => openProtected("add")}>
              <span>
                <strong>Add booking</strong>
                <small>Department or pastor code required</small>
              </span>
              <b>+</b>
            </button>
            <button type="button" onClick={() => openProtected("manage")}>
              <span>
                <strong>Manage bookings</strong>
                <small>Edit or cancel bookings you own</small>
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
              All spaces
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
              const dayBookings = bookingsForDay(bookings, day, spaceFilter);
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
            {selectedBookings.length === 0 ? (
              <p className="bulletin-empty">No bookings for this date.</p>
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
            title={editingBooking ? "Edit booking" : "Add booking"}
            onMenu={() => setScreen("menu")}
          />
          <BookingForm
            access={activeAccess}
            accessCode={activeCode}
            booking={editingBooking}
            departments={departments}
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
          <div className="bulletin-title-rule">Editable bookings</div>
          {editableBookings.length === 0 ? (
            <p className="bulletin-empty">No editable bookings.</p>
          ) : (
            <section className="bulletin-manage-list">
              {editableBookings.map((booking) => (
                <article key={booking.id} className="bulletin-manage-row">
                  <div>
                    <h3>{booking.activityName}</h3>
                    <p>
                      {formatDateTime(booking.startAt)} / {booking.spaceName}
                    </p>
                  </div>
                  <div className="bulletin-row-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(booking.id);
                        setScreen("add");
                      }}
                    >
                      Edit
                    </button>
                    <form action={cancelAction}>
                      <input type="hidden" name="accessCode" value={activeCode} />
                      <input type="hidden" name="bookingId" value={booking.id} />
                      <button type="submit" disabled={cancelPending}>
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
          <button
            type="button"
            className="bulletin-primary"
            onClick={() => {
              setEditingId(null);
              setScreen("add");
            }}
          >
            Add another booking
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
          <section className="bulletin-metrics">
            <div>
              <strong>{pastorMetrics.weekly}</strong>
              <span>This week</span>
            </div>
            <div>
              <strong>{pastorMetrics.spacesUsed}</strong>
              <span>Spaces used</span>
            </div>
            <div>
              <strong>{pastorMetrics.tonight}</strong>
              <span>Today</span>
            </div>
          </section>
          <div className="bulletin-title-rule">Today</div>
          {bookingsForDay(confirmedBookings, today).length === 0 ? (
            <p className="bulletin-empty">No confirmed bookings today.</p>
          ) : (
            bookingsForDay(confirmedBookings, today).map((booking) => (
              <EventItem booking={booking} key={booking.id} />
            ))
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
          {weekDays.map((day) => {
            const dayBookings = bookingsForDay(bookings, day);

            return (
              <div key={formatDateKey(day)} className="bulletin-day-group">
                <h2>{formatShortDay(day)}</h2>
                {dayBookings.length === 0 ? (
                  <p className="bulletin-empty compact">No bookings.</p>
                ) : (
                  dayBookings.map((booking) => (
                    <EventItem booking={booking} key={booking.id} />
                  ))
                )}
              </div>
            );
          })}
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
