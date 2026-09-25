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
import { AppShell } from "@/components/shell/app-shell";
import type { NavItem } from "@/components/shell/nav";
import { OpportunityMenuModal } from "@/components/opportunities/opportunity-menu-modal";
import { RotaUnlockModal } from "@/components/rota/rota-unlock-modal";
import { AccessModal } from "./access-modal";
import { AddScreen } from "./screens/add-screen";
import {
  CalendarDayPanel,
  CalendarScreen,
} from "./screens/calendar-screen";
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
  const [rotaModalOpen, setRotaModalOpen] = useState(false);
  const [opportunityModalOpen, setOpportunityModalOpen] = useState(false);
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

  function openAdd() {
    setEditingId(null);

    if (activeAccess) {
      setScreen("add");
      return;
    }

    openProtected("add");
  }

  // Inside BulletinApp a scheduler item is a state change; the rota and
  // opportunities items are the only real links. Protected items fall back to
  // the access modal exactly as the mobile menu does.
  const navItems: NavItem[] = [
    { key: "home", label: "This week", group: "main", onSelect: goHome },
    {
      key: "calendar",
      label: "Calendar",
      group: "main",
      onSelect: () => setScreen("calendar"),
    },
    { key: "add", label: "Add activity", group: "main", onSelect: openAdd },
    {
      key: "manage",
      label: "Manage",
      group: "main",
      onSelect: () =>
        activeAccess ? setScreen("manage") : openProtected("manage"),
    },
    ...(activeAccess?.kind === "pastor"
      ? [
          {
            key: "pastor" as const,
            label: "Overview",
            group: "main" as const,
            onSelect: () => setScreen("pastor"),
          },
        ]
      : []),
    {
      key: "rota",
      label: "Serving rota",
      group: "also",
      onSelect: () => setRotaModalOpen(true),
    },
    {
      key: "opportunities",
      label: "Opportunities",
      group: "also",
      onSelect: () => setOpportunityModalOpen(true),
    },
  ];

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

  // Every branch below returns a screen; the access modal is mounted once around
  // the lot. It used to live inside the menu and home branches only, so the
  // rail's Add activity and Manage on any other screen set the modal's state
  // with nothing on the page to render it.
  function renderScreen() {
    if (screen === "menu") {
      return (
        <MenuScreen
          onBack={goHome}
          onOpenProtected={openProtected}
          onOpenCalendar={() => setScreen("calendar")}
        />
      );
    }

    if (screen === "calendar") {
      return (
        <AppShell
          items={navItems}
          active="calendar"
          panel={
            <CalendarDayPanel
              selectedDate={selectedDate}
              selectedBookings={selectedBookings}
              notice={calendarNotice}
              onAddToDay={
                activeAccess
                  ? () => {
                      setEditingId(null);
                      setScreen("add");
                    }
                  : undefined
              }
            />
          }
        >
          <CalendarScreen
            monthCursor={monthCursor}
            monthDays={monthDays}
            selectedDate={selectedDate}
            publicBookings={publicBookings}
            spaces={spaces}
            spaceFilter={spaceFilter}
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
        </AppShell>
      );
    }

    if (screen === "add" && activeAccess) {
      return (
        <AppShell items={navItems} active="add">
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
        </AppShell>
      );
    }

    if (screen === "manage" && activeAccess) {
      const pendingCount = editableBookings.filter(
        (booking) => booking.status === "pending",
      ).length;

      return (
        <AppShell
          items={navItems}
          active="manage"
          panel={
            <>
              <p className="app-panel-label">
                {activeAccess.kind === "pastor"
                  ? "All departments"
                  : activeAccess.departmentName}
              </p>
              <div className="app-stat">
                <b>{editableBookings.length}</b>
                <span>bookings</span>
              </div>
              <div className="app-stat">
                <b>{pendingCount}</b>
                <span>awaiting review</span>
              </div>
              <button
                className="bulletin-primary"
                type="button"
                onClick={openAdd}
              >
                New activity
              </button>
            </>
          }
        >
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
            onAdd={openAdd}
          />
        </AppShell>
      );
    }

    if (screen === "pastor" && activeAccess?.kind === "pastor") {
      return (
        <AppShell items={navItems} active="pastor">
          <PastorScreen
            bookings={bookings}
            confirmedBookings={confirmedBookings}
            spaces={spaces}
            weekDays={weekDays}
            today={today}
            onBack={goHome}
          />
        </AppShell>
      );
    }

    const weekBookingCount = publicWeekDays.reduce(
      (total, { bookings: dayBookings }) => total + dayBookings.length,
      0,
    );
    const weekPendingCount = bookings.filter(
      (booking) => booking.status === "pending",
    ).length;
    const activeDepartments = new Set(
      publicWeekDays.flatMap(({ bookings: dayBookings }) =>
        dayBookings.map((booking) => booking.departmentId),
      ),
    ).size;

    return (
      <AppShell
        items={navItems}
        active="home"
        panel={
          <>
            <p className="app-panel-label">This week</p>
            <div className="app-stat">
              <b>{weekBookingCount}</b>
              <span>activities booked</span>
            </div>
            <div className="app-stat">
              <b>{weekPendingCount}</b>
              <span>pending review</span>
            </div>
            <div className="app-stat">
              <b>{activeDepartments}</b>
              <span>departments active</span>
            </div>
            {activeAccess ? null : (
              <button
                className="bulletin-primary"
                type="button"
                onClick={() => openProtected("add")}
              >
                Enter access code
              </button>
            )}
          </>
        }
      >
        <HomeScreen
          weekDays={publicWeekDays}
          onMenu={() => setScreen("menu")}
          onOpenCalendar={() => setScreen("calendar")}
        />
      </AppShell>
    );
  }

  return (
    <>
      {renderScreen()}
      <RotaUnlockModal
        open={rotaModalOpen}
        onClose={() => setRotaModalOpen(false)}
      />
      <OpportunityMenuModal
        open={opportunityModalOpen}
        onClose={() => setOpportunityModalOpen(false)}
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
