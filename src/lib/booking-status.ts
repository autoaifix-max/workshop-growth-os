export const BOOKING_STATUSES = ["pending", "confirmed", "in_progress", "completed", "cancelled"] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

const nextStatuses: Record<BookingStatus, readonly BookingStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function getAllowedBookingStatusTransitions(status: BookingStatus): readonly BookingStatus[] {
  return nextStatuses[status];
}

export function canTransitionBookingStatus(current: BookingStatus, next: BookingStatus): boolean {
  // Repeating the current status is idempotent; otherwise only explicit transitions are valid.
  return current === next || nextStatuses[current].includes(next);
}
