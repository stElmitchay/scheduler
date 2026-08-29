import type { FormActionState } from "@/app/actions";
import type {
  AccessContext,
  Booking,
  Department,
  Space,
} from "@/lib/scheduler/types";
import { BookingForm } from "../booking-form";
import { BulletinHeader } from "../bulletin-header";

export function AddScreen({
  access,
  activeCode,
  booking,
  departments,
  spaces,
  onBack,
  onSaved,
  onStopEditing,
}: {
  access: AccessContext;
  activeCode: string;
  booking: Booking | undefined;
  departments: Department[];
  spaces: Space[];
  onBack: () => void;
  onSaved: (state: Extract<FormActionState, { ok: true }>) => void;
  onStopEditing: () => void;
}) {
  return (
    <main className="bulletin-page">
      <div className="bulletin-shell">
        <BulletinHeader
          eyebrow={
            access.kind === "pastor" ? "Branch pastor" : access.departmentName
          }
          title={booking ? "Edit activity" : "Add activity"}
          onBack={onBack}
        />
        <BookingForm
          access={access}
          accessCode={activeCode}
          booking={booking}
          departments={departments}
          onSaved={onSaved}
          spaces={spaces}
        />
        {booking ? (
          <button
            type="button"
            className="bulletin-secondary-full"
            onClick={onStopEditing}
          >
            Stop editing
          </button>
        ) : null}
      </div>
    </main>
  );
}
