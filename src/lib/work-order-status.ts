export const WORK_ORDER_STATUSES = [
  "open",
  "diagnosing",
  "waiting_parts",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number];

const allowedTransitions: Record<WorkOrderStatus, readonly WorkOrderStatus[]> = {
  open: ["diagnosing", "cancelled"],
  diagnosing: ["waiting_parts", "in_progress", "cancelled"],
  waiting_parts: ["diagnosing", "in_progress", "cancelled"],
  in_progress: ["waiting_parts", "completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function getAllowedWorkOrderStatusTransitions(status: WorkOrderStatus): readonly WorkOrderStatus[] {
  return allowedTransitions[status];
}

export function canTransitionWorkOrderStatus(current: WorkOrderStatus, next: WorkOrderStatus): boolean {
  return current === next || allowedTransitions[current].includes(next);
}
