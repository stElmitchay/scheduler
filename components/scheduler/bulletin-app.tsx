"use client";

import Link from "next/link";
import {
  type FormEvent,
  useActionState,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { Ban, Check, Pencil, Trash2 } from "lucide-react";
import { createPortal } from "react-dom";
import { useActionState, useMemo, useState } from "react";
import {
  cancelBookingAction,
  confirmBookingAction,
  deleteBookingAction,
  type FormActionState,
} from "@/app/actions";
import {
  buildMonthGrid,
  getWeekRange,
} from "@/lib/scheduler/calendar-utils.mjs";
import type {
  AccessContext,
  Booking,
  Department,
  Space,
} from "@/lib/scheduler/types";
import { AccessModal } from "./access-modal";
import { AddScreen } from "./screens/add-screen";
import { CalendarScreen } from "./screens/calendar-screen";
import { HomeScreen } from "./screens/home-screen";
import { ManageScreen } from "./screens/manage-screen";
import { MenuScreen, type ProtectedTarget } from "./screens/menu-screen";
import { PastorScreen } from "./screens/pastor-screen";
import { bookingsForDay, type SpaceFilter } from "./format";

type Screen = "home" | "menu" | "calendar" | "add" | "manage" | "pastor";

const initialCancelState: FormActionState = {
  ok: false,
  message: "",
};

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
  const [activeCode, setActiveCode] = useState("");
  const [activeAccess, setActiveAccess] = useState<AccessContext | null>(null);
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [calendarNotice, setCalendarNotice] = useState("");
  const [manageNotice, setManageNotice] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [protectedTarget, setProtectedTarget] = useState<ProtectedTarget>("add");
  const [cancelState, cancelAction, cancelPending] = useActionState(
    cancelBookingAction,
    initialCancelState,
  );
  const [confirmState, confirmAction, confirmPending] = useActionState(
    confirmBookingAction,
    initialCancelState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteBookingAction,
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
  const publicWeekDays = useMemo(() => {
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);

    const upcoming = weekDays.filter(
      (day) => day.getTime() >= todayStart.getTime(),
    );
    const past = weekDays.filter(
      (day) => day.getTime() < todayStart.getTime(),
    );

    return [...upcoming, ...past]
      .map((day) => ({
        day,
        bookings: bookingsForDay(publicBookings, day),
      }))
      .filter(({ bookings }) => bookings.length > 0);
  }, [publicBookings, today, weekDays]);
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

  function renderJobModal() {
    if (!jobModalOpen) {
      return null;
    }

    const modal = (
      <div className="bulletin-modal-backdrop" role="presentation">
        <div
          className="job-menu-popup"
          role="dialog"
          aria-modal="true"
          aria-labelledby="job-menu-title"
        >
          <button
            type="button"
            className="bulletin-modal-close"
            onClick={() => setJobModalOpen(false)}
            aria-label="Close job popup"
          >
            ×
          </button>
          <div>
            <p className="bulletin-eyebrow">Job</p>
            <h2 id="job-menu-title">Open jobs</h2>
          </div>
          <Link href="/jobs" className="bulletin-secondary-full job-action-link">
            Job Board
          </Link>
          <Link
            href="/jobs/dashboard"
            className="bulletin-secondary-full job-action-link"
          >
            Job Dashboard
          </Link>
          <button
            className="bulletin-primary"
            type="button"
            onClick={() => setJobModalOpen(false)}
          >
            Close
          </button>
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

  function handleFormSaved(state: Extract<FormActionState, { ok: true }>) {
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
            <button type="button" onClick={() => setJobModalOpen(true)}>
              <span>
                <strong>Job</strong>
                <small>Open the Job Board or Welfare dashboard</small>
              </span>
              <b>›</b>
            </button>
          </nav>
          {renderAccessModal()}
          {renderJobModal()}
        </div>
      </main>
      <>
        <MenuScreen
          onBack={goHome}
          onOpenProtected={openProtected}
          onOpenCalendar={() => setScreen("calendar")}
        />
        <AccessModal
          open={accessModalOpen}
          requirePastor={protectedTarget === "pastor"}
          onClose={() => setAccessModalOpen(false)}
          onUnlocked={(access, code) => {
            setActiveCode(code);
            setActiveAccess(access);
            setEditingId(null);
            setAccessModalOpen(false);
            setScreen(protectedTarget);
          }}
        />
      </>
    );
  }

  if (screen === "calendar") {
    return (
      <CalendarScreen
        monthCursor={monthCursor}
        monthDays={monthDays}
        selectedDate={selectedDate}
        selectedBookings={selectedBookings}
        publicBookings={publicBookings}
        spaces={spaces}
        spaceFilter={spaceFilter}
        notice={calendarNotice}
        onBack={goHome}
        onShiftMonth={shiftMonth}
        onToday={() => {
          const now = new Date();
          setMonthCursor(now);
          setSelectedDate(now);
        }}
        onSelectDate={setSelectedDate}
        onSpaceFilterChange={setSpaceFilter}
      />
    );
  }

  if (screen === "add" && activeAccess) {
    return (
      <AddScreen
        access={activeAccess}
        activeCode={activeCode}
        booking={editingBooking}
        departments={departments}
        spaces={spaces}
        onBack={goHome}
        onSaved={handleFormSaved}
        onStopEditing={() => {
          setEditingId(null);
          setScreen("manage");
        }}
      />
    );
  }

  if (screen === "manage" && activeAccess) {
    return (
      <ManageScreen
        access={activeAccess}
        activeCode={activeCode}
        bookings={editableBookings}
        notice={manageNotice}
        cancelAction={cancelAction}
        confirmAction={confirmAction}
        deleteAction={deleteAction}
        cancelPending={cancelPending}
        confirmPending={confirmPending}
        deletePending={deletePending}
        cancelState={cancelState}
        confirmState={confirmState}
        deleteState={deleteState}
        onBack={goHome}
        onEdit={(bookingId) => {
          setEditingId(bookingId);
          setScreen("add");
        }}
        onAdd={() => {
          setEditingId(null);
          setScreen("add");
        }}
      />
    );
  }

  if (screen === "pastor" && activeAccess?.kind === "pastor") {
    return (
      <PastorScreen
        bookings={bookings}
        confirmedBookings={confirmedBookings}
        spaces={spaces}
        weekDays={weekDays}
        today={today}
        onBack={goHome}
      />
    );
  }

  return (
    <>
      <HomeScreen
        weekDays={publicWeekDays}
        onMenu={() => setScreen("menu")}
        onOpenCalendar={() => setScreen("calendar")}
      />
      <AccessModal
          open={accessModalOpen}
          requirePastor={protectedTarget === "pastor"}
          onClose={() => setAccessModalOpen(false)}
          onUnlocked={(access, code) => {
            setActiveCode(code);
            setActiveAccess(access);
            setEditingId(null);
            setAccessModalOpen(false);
            setScreen(protectedTarget);
          }}
        />
    </>
  );
}
