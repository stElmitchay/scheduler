"use client";

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
