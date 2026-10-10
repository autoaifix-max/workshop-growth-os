import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSupabaseServerClient: vi.fn(),
  requireTenantContext: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: mocks.getSupabaseServerClient,
}));
vi.mock("@/lib/api/tenant-context", () => ({
  requireTenantContext: mocks.requireTenantContext,
}));

import { PATCH } from "../src/app/api/v1/work-orders/route";

const tenantContext = {
  userId: "11111111-1111-4111-8111-111111111111",
  workshopId: "22222222-2222-4222-8222-222222222222",
  role: "owner" as const,
};
const workOrderId = "33333333-3333-4333-8333-333333333333";

function setup(options: {
  role?: "owner" | "admin" | "receptionist" | "technician";
  current?: "open" | "diagnosing" | "waiting_parts" | "in_progress" | "completed" | "cancelled" | null;
  updated?: { id: string; status: string; updated_at: string } | null;
  updateError?: { code?: string } | null;
} = {}) {
  const currentQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: options.current === null ? null : { id: workOrderId, status: options.current ?? "open" },
      error: null,
    }),
  };
  currentQuery.select.mockImplementation(() => currentQuery);
  currentQuery.eq.mockImplementation(() => currentQuery);

  const updateQuery = {
    eq: vi.fn(),
    select: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: options.updated === undefined
        ? { id: workOrderId, status: "diagnosing", updated_at: "2026-10-11T00:00:00.000Z" }
        : options.updated,
      error: options.updateError ?? null,
    }),
  };
  updateQuery.eq.mockImplementation(() => updateQuery);
  updateQuery.select.mockImplementation(() => updateQuery);

  const update = vi.fn(() => updateQuery);
  let lookupUsed = false;
  const from = vi.fn((table: string) => {
    if (table !== "work_orders") throw new Error(`Unexpected table: ${table}`);
    if (!lookupUsed) {
      lookupUsed = true;
      return currentQuery;
    }
    return { update };
  });
  mocks.getSupabaseServerClient.mockResolvedValue({ from });
  mocks.requireTenantContext.mockResolvedValue({
    ok: true, context: { ...tenantContext, role: options.role ?? "owner" },
  });
  return { from, currentQuery, update, updateQuery };
}

function request(body: unknown) {
  return new Request("http://localhost/api/v1/work-orders", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

afterEach(() => vi.clearAllMocks());

describe("PATCH /api/v1/work-orders status workflow", () => {
  it("allows a technician to move an order from open to diagnosing with tenant compare-and-set", async () => {
    const db = setup({ role: "technician" });
    const response = await PATCH(request({ id: workOrderId, status: "diagnosing" }));

    expect(response.status).toBe(200);
    expect((await response.json()).data.status).toBe("diagnosing");
    expect(db.update).toHaveBeenCalledWith({ status: "diagnosing", updated_at: expect.any(String) });
    expect(db.updateQuery.eq).toHaveBeenCalledWith("workshop_id", tenantContext.workshopId);
    expect(db.updateQuery.eq).toHaveBeenCalledWith("status", "open");
  });

  it("rejects skipping directly from open to completed", async () => {
    const db = setup({ current: "open" });
    const response = await PATCH(request({ id: workOrderId, status: "completed" }));

    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("INVALID_STATUS_TRANSITION");
    expect(db.update).not.toHaveBeenCalled();
  });

  it("returns 404 when the work order is outside the current workshop", async () => {
    const db = setup({ current: null });
    const response = await PATCH(request({ id: workOrderId, status: "diagnosing" }));

    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("WORK_ORDER_NOT_FOUND");
    expect(db.update).not.toHaveBeenCalled();
  });

  it("maps the database trigger rejection to HTTP 409", async () => {
    const db = setup({ current: "in_progress", updateError: { code: "23514" } });
    const response = await PATCH(request({ id: workOrderId, status: "completed" }));

    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("INVALID_STATUS_TRANSITION");
  });

  it("returns 409 if a concurrent update changes the current status", async () => {
    const db = setup({ current: "open", updated: null });
    const response = await PATCH(request({ id: workOrderId, status: "diagnosing" }));

    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("WORK_ORDER_STATUS_CONFLICT");
  });

  it("rejects malformed status input without querying the database", async () => {
    const db = setup();
    const response = await PATCH(request({ id: workOrderId, status: "done" }));

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
    expect(db.from).not.toHaveBeenCalled();
  });
});
