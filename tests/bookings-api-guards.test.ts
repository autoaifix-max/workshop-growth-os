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

import { GET, PATCH, POST } from "../src/app/api/v1/bookings/route";

const tenantContext = {
  userId: "11111111-1111-4111-8111-111111111111",
  workshopId: "22222222-2222-4222-8222-222222222222",
  role: "owner" as const,
};

function setup(role: "owner" | "admin" | "receptionist" | "technician" = "owner") {
  const from = vi.fn();
  mocks.getSupabaseServerClient.mockResolvedValue({ from });
  mocks.requireTenantContext.mockResolvedValue({
    ok: true,
    context: { ...tenantContext, role },
  });
  return { from };
}

function request(method: string, body?: unknown) {
  return new Request("http://localhost/api/v1/bookings", {
    method,
    headers: { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) }),
  });
}

afterEach(() => vi.clearAllMocks());

describe("bookings API tenant and request guards", () => {
  it("rejects technicians from creating bookings before querying the database", async () => {
    const db = setup("technician");
    const response = await POST(request("POST", {
      customerId: "33333333-3333-4333-8333-333333333333",
      requestedService: "فحص المحرك",
      scheduledAt: "2026-10-12T10:00:00+03:00",
    }));

    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("FORBIDDEN");
    expect(db.from).not.toHaveBeenCalled();
  });

  it("creates a booking only after checking the customer and optional vehicle belong to the active workshop", async () => {
    const db = setup();
    const customer = {
      select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data: { id: "33333333-3333-4333-8333-333333333333" }, error: null }),
    };
    customer.select.mockImplementation(() => customer);
    customer.eq.mockImplementation(() => customer);
    const vehicle = {
      select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data: { id: "44444444-4444-4444-8444-444444444444" }, error: null }),
    };
    vehicle.select.mockImplementation(() => vehicle);
    vehicle.eq.mockImplementation(() => vehicle);
    const inserted = { id: "55555555-5555-4555-8555-555555555555", status: "pending" };
    const single = vi.fn().mockResolvedValue({ data: inserted, error: null });
    const selectInserted = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select: selectInserted }));
    db.from.mockImplementation((table: string) => {
      if (table === "customers") return customer;
      if (table === "vehicles") return vehicle;
      if (table === "bookings") return { insert };
      throw new Error(`Unexpected table: ${table}`);
    });

    const response = await POST(request("POST", {
      customerId: "33333333-3333-4333-8333-333333333333",
      vehicleId: "44444444-4444-4444-8444-444444444444",
      requestedService: "فحص كمبيوتر",
      scheduledAt: "2026-10-12T07:00:00.000Z",
      notes: "صوت عند التشغيل",
    }));

    expect(response.status).toBe(201);
    expect(customer.eq).toHaveBeenCalledWith("workshop_id", tenantContext.workshopId);
    expect(vehicle.eq).toHaveBeenCalledWith("workshop_id", tenantContext.workshopId);
    expect(vehicle.eq).toHaveBeenCalledWith("customer_id", "33333333-3333-4333-8333-333333333333");
    expect(insert).toHaveBeenCalledWith({
      workshop_id: tenantContext.workshopId,
      customer_id: "33333333-3333-4333-8333-333333333333",
      vehicle_id: "44444444-4444-4444-8444-444444444444",
      requested_service: "فحص كمبيوتر",
      scheduled_at: "2026-10-12T07:00:00.000Z",
      notes: "صوت عند التشغيل",
      status: "pending",
      created_by: tenantContext.userId,
    });
  });

  it("rejects malformed customer IDs before querying the database", async () => {
    const db = setup();
    const response = await POST(request("POST", {
      customerId: "not-a-uuid",
      requestedService: "فحص المحرك",
      scheduledAt: "2026-10-12T10:00:00+03:00",
    }));

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
    expect(db.from).not.toHaveBeenCalled();
  });

  it("rejects customers outside the active workshop and does not insert a booking", async () => {
    const db = setup();
    const customerQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    customerQuery.select.mockImplementation(() => customerQuery);
    customerQuery.eq.mockImplementation(() => customerQuery);
    db.from.mockImplementation((table: string) => table === "customers" ? customerQuery : {});

    const response = await POST(request("POST", {
      customerId: "33333333-3333-4333-8333-333333333333",
      requestedService: "فحص المحرك",
      scheduledAt: "2026-10-12T10:00:00+03:00",
    }));

    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("CUSTOMER_NOT_FOUND");
    expect(db.from).toHaveBeenCalledWith("customers");
    expect(db.from).not.toHaveBeenCalledWith("bookings");
  });

  it("rejects invalid list limits before querying the database", async () => {
    const db = setup();
    const response = await GET(new Request("http://localhost/api/v1/bookings?limit=101"));

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
    expect(db.from).not.toHaveBeenCalled();
  });

  it("rejects technicians from changing booking status before querying the database", async () => {
    const db = setup("technician");
    const response = await PATCH(request("PATCH", {
      id: "33333333-3333-4333-8333-333333333333",
      status: "completed",
    }));

    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("FORBIDDEN");
    expect(db.from).not.toHaveBeenCalled();
  });
});
