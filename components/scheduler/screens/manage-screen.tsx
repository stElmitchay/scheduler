import { Ban, Check, Pencil, Trash2 } from "lucide-react";
import type { FormActionState } from "@/app/actions";
import type { AccessContext, Booking } from "@/lib/scheduler/types";
import { BulletinHeader } from "../bulletin-header";
import { bookingLine, formatDateTime } from "../format";

export function ManageScreen({
  access,
  activeCode,
  bookings,
  notice,
  cancelAction,
  confirmAction,
  deleteAction,
  cancelPending,
  confirmPending,
  deletePending,
  cancelState,
  confirmState,
  deleteState,
  onBack,
  onEdit,
  onAdd,
}: {
  access: AccessContext;
  activeCode: string;
  bookings: Booking[];
  notice: string;
  cancelAction: (formData: FormData) => void;
  confirmAction: (formData: FormData) => void;
  deleteAction: (formData: FormData) => void;
  cancelPending: boolean;
  confirmPending: boolean;
  deletePending: boolean;
  cancelState: FormActionState;
  confirmState: FormActionState;
  deleteState: FormActionState;
  onBack: () => void;
  onEdit: (bookingId: string) => void;
  onAdd: () => void;
}) {
  return (
    <main className="bulletin-page">
      <div className="bulletin-shell">
        <BulletinHeader
          eyebrow={
            access.kind === "pastor" ? "Branch pastor" : access.departmentName
          }
          title="Manage"
          onBack={onBack}
        />
        <div className="bulletin-title-rule">Editable activities</div>
        {notice ? <p className="bulletin-message">{notice}</p> : null}
        {bookings.length === 0 ? (
          <p className="bulletin-empty">No editable activities.</p>
        ) : (
          <section className="bulletin-manage-list">
            {bookings.map((booking) => (
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
                    <button type="button" onClick={() => onEdit(booking.id)}>
                      <Pencil size={14} strokeWidth={2} aria-hidden="true" />
                      Edit
                    </button>
                  ) : null}
                  {booking.status === "pending" ? (
                    <form action={confirmAction}>
                      <input type="hidden" name="accessCode" value={activeCode} />
                      <input type="hidden" name="bookingId" value={booking.id} />
                      <button
                        type="submit"
                        className="bulletin-confirm-btn"
                        disabled={confirmPending}
                      >
                        <Check size={14} strokeWidth={2} aria-hidden="true" />
                        Confirm
                      </button>
                    </form>
                  ) : null}
                  <form action={cancelAction}>
                    <input type="hidden" name="accessCode" value={activeCode} />
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <button
                      type="submit"
                      className="bulletin-cancel-btn"
                      disabled={cancelPending || booking.status === "cancelled"}
                    >
                      <Ban size={14} strokeWidth={2} aria-hidden="true" />
                      Cancel
                    </button>
                  </form>
                  <form action={deleteAction}>
                    <input type="hidden" name="accessCode" value={activeCode} />
                    <input type="hidden" name="bookingId" value={booking.id} />
                    <button
                      type="submit"
                      className="bulletin-delete-btn"
                      disabled={deletePending}
                    >
                      <Trash2 size={14} strokeWidth={2} aria-hidden="true" />
                      Delete
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
              confirmState.ok === true
                ? "bulletin-message"
                : "bulletin-message error"
            }
          >
            {confirmState.message}
          </p>
        ) : null}
        {deleteState.message ? (
          <p
            className={
              deleteState.ok ? "bulletin-message" : "bulletin-message error"
            }
          >
            {deleteState.message}
          </p>
        ) : null}
        <button type="button" className="bulletin-primary" onClick={onAdd}>
          Add another activity
        </button>
      </div>
    </main>
  );
}
