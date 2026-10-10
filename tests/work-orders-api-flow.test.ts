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

import { POST } from "../src/app/api/v1/work-orders/route";

const tenantContext = {
  userId: "11111111-1111-4111-8111-111111111111",
  workshopId: "22222222-2222-4222-8222-222222222222",
  role: "owner" as const,
};
const bookingId = "33333333-3333-4333-8333-333333333333";
const customerId = "44444444-4444-4444-8444-444444444444";
const vehicleId = "55555555-5555-4555-8555-555555555555";
const workOrderId = "66666666-6666-4666-8666-666666666666";

const booking = {
  id: bookingId,
  workshop_id: tenantContext.workshopId,
  customer_id: customerId,
  vehicle_id: vehicleId,
  requested_service: "فحص المحرك",
  scheduled_at: "2026-10-12T10:00:00+03:00",
  status: "confirmed",
  notes: "اهتزاز عند التسارع",
};
const workOrder = {
  id: workOrderId,
  booking_id: bookingId,
  customer_id: customerId,
  vehicle_id: vehicleId,
  requested_service: "فحص المحرك",
  status: "open",
  notes: "اهتزاز عند التسارع",
  created_at: "2026-10-10T12:00:00.000Z",
  updated_at: "2026-10-10T12:00:00.000Z",
};

function lookup(result: { data: unknown; error: unknown }) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  query.select.mockImplementation(() => query);
  query.eq.mockImplementation(() => query);
  return query;
}

function setup(existing: unknown = null) {
  const bookingLookup = lookup({ data: booking, error: null });
  const existingLookup = lookup({ data: existing, error: null });
  const insertedSingle = vi.fn().mockResolvedValue({ data: workOrder, error: null });
  const insertSelect = vi.fn(() => ({ single: insertedSingle }));
  const insert = vi.fn(() => ({ select: insertSelect }));
  const updateQuery = {
    eq: vi.fn(),
  };
  updateQuery.eq
    .mockImplementationOnce(() => updateQuery)
    .mockImplementationOnce(() => Promise.resolve({ error: null }));
  const update = vi.fn(() => updateQuery);

  const calls = new Map<string, number>();
  const from = vi.fn((table: string) => {
    const count = calls.get(table) ?? 0;
    calls.set(table, count + 1);
    if (table === "bookings" && count === 0) return bookingLookup;
    if (table === "bookings" && count === 1) return { update };
    if (table === "work_orders" && count === 0) return existingLookup;
    if (table === "work_orders" && count === 1) return { insert };
    throw new Error(`Unexpected table access: ${table} #${count + 1}`);
  });

  mocks.getSupabaseServerClient.mockResolvedValue({ from });
  mocks.requireTenantContext.mockResolvedValue({
    ok: true,
    context: tenantContext,
  });

  return { from, bookingLookup, existingLookup, insert, insertedSingle, update, updateQuery };
}

function request() {
  return new Request("http://localhost/api/v1/work-orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ bookingId }),
  });
}

afterEach(() => vi.clearAllMocks());

describe("POST /api/v1/work-orders successful workflow", () => {
  it("creates one work order from a booking and marks the booking in progress", async () => {
    const db = setup();
    const response = await POST(request());

    expect(response.status).toBe(201);
    expect((await response.json()).data).toEqual(workOrder);
    expect(db.bookingLookup.eq).toHaveBeenCalledWith("workshop_id", tenantContext.workshopId);
    expect(db.existingLookup.eq).toHaveBeenCalledWith("workshop_id", tenantContext.workshopId);
    expect(db.insert).toHaveBeenCalledWith({
      workshop_id: tenantContext.workshopId,
      booking_id: bookingId,
      customer_id: customerId,
      vehicle_id: vehicleId,
      requested_service: "فحص المحرك",
      status: "open",
      notes: "اهتزاز عند التسارع",
      created_by: tenantContext.userId,
    });
    expect(db.insertedSingle).toHaveBeenCalledOnce();
    expect(db.update).toHaveBeenCalledWith("bookings");
    expect(db.updateQuery.eq).toHaveBeenNthCalledWith(1, "id", bookingId);
    expect(db.updateQuery.eq).toHaveBeenNthCalledWith(2, "workshop_id", tenantContext.workshopId);
  });

  it("repairs booking status on retry instead of creating a duplicate work order", async () => {
    const db = setup(workOrder);
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual(workOrder);
    expect(db.insert).not.toHaveBeenCalled();
    expect(db.update).toHaveBeenCalledWith("bookings");
  });
});
