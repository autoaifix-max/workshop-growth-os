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

import { PATCH } from "../src/app/api/v1/bookings/route";

const tenantContext = {
  userId: "11111111-1111-4111-8111-111111111111",
  workshopId: "22222222-2222-4222-8222-222222222222",
  role: "owner" as const,
};
const bookingId = "33333333-3333-4333-8333-333333333333";

function setup(options: {
  current?: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled" | null;
  updated?: { id: string; status: string; updated_at: string } | null;
  updateError?: { code?: string } | null;
} = {}) {
  const lookup = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: options.current === null ? null : { id: bookingId, status: options.current ?? "pending" },
      error: null,
    }),
  };
  lookup.select.mockImplementation(() => lookup);
  lookup.eq.mockImplementation(() => lookup);

  const updateQuery = {
    eq: vi.fn(),
    select: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: options.updated === undefined
        ? { id: bookingId, status: "confirmed", updated_at: "2026-10-11T00:00:00.000Z" }
        : options.updated,
      error: options.updateError ?? null,
    }),
  };
  updateQuery.eq.mockImplementation(() => updateQuery);
  updateQuery.select.mockImplementation(() => updateQuery);

  const update = vi.fn(() => updateQuery);
  const from = vi.fn((table: string) => {
    if (table !== "bookings") throw new Error(`Unexpected table: ${table}`);
    return from.mock.calls.filter((call) => call[0] === "bookings").length === 1
      ? lookup
      : { update };
  });

  mocks.getSupabaseServerClient.mockResolvedValue({ from });
  mocks.requireTenantContext.mockResolvedValue({ ok: true, context: tenantContext });
  return { from, lookup, update, updateQuery };
}

function request(status: string) {
  return new Request("http://localhost/api/v1/bookings", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: bookingId, status }),
  });
}

afterEach(() => vi.clearAllMocks());

describe("PATCH /api/v1/bookings state transitions", () => {
  it("allows pending -> confirmed and uses the observed state as a compare-and-set guard", async () => {
    const db = setup({ current: "pending" });
    const response = await PATCH(request("confirmed"));

    expect(response.status).toBe(200);
    expect((await response.json()).data.status).toBe("confirmed");
    expect(db.update).toHaveBeenCalledWith({
      status: "confirmed",
      updated_at: expect.any(String),
    });
    expect(db.updateQuery.eq).toHaveBeenCalledWith("status", "pending");
  });

  it("rejects pending -> completed before attempting a database update", async () => {
    const db = setup({ current: "pending" });
    const response = await PATCH(request("completed"));

    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("INVALID_STATUS_TRANSITION");
    expect(db.update).not.toHaveBeenCalled();
  });

  it("treats completed and cancelled as terminal states", async () => {
    for (const current of ["completed", "cancelled"] as const) {
      const db = setup({ current });
      const response = await PATCH(request(current === "completed" ? "confirmed" : "pending"));
      expect(response.status).toBe(409);
      expect(db.update).not.toHaveBeenCalled();
    }
  });

  it("returns 404 when the booking is not in the active workshop", async () => {
    const db = setup({ current: null });
    const response = await PATCH(request("confirmed"));

    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("BOOKING_NOT_FOUND");
    expect(db.update).not.toHaveBeenCalled();
  });

  it("returns 409 if the row changes before the guarded update completes", async () => {
    const db = setup({ current: "pending", updated: null });
    const response = await PATCH(request("confirmed"));

    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("BOOKING_STATUS_CONFLICT");
  });

  it("maps the database transition trigger to a controlled conflict response", async () => {
    const db = setup({ current: "pending", updateError: { code: "23514" } });
    const response = await PATCH(request("confirmed"));

    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("INVALID_STATUS_TRANSITION");
  });
});
