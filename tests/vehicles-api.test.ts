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

import { POST } from "../src/app/api/v1/vehicles/route";

const tenantContext = {
  userId: "11111111-1111-4111-8111-111111111111",
  workshopId: "22222222-2222-4222-8222-222222222222",
};
const customerId = "33333333-3333-4333-8333-333333333333";
const vehicleId = "44444444-4444-4444-8444-444444444444";
const validInput = { customerId, plateNumber: "ABC1234", make: "Toyota", model: "Camry", modelYear: 2022 };

function setup(options: {
  customer?: { data: unknown; error: { code?: string } | null };
  vehicle?: { data: unknown; error: { code?: string } | null };
  role?: "owner" | "admin" | "receptionist" | "technician";
} = {}) {
  const customerResult = options.customer ?? { data: { id: customerId }, error: null };
  const vehicleResult = options.vehicle ?? {
    data: { id: vehicleId, customer_id: customerId, plate_number: "ABC1234" },
    error: null,
  };

  const customerQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(customerResult),
  };
  customerQuery.select.mockImplementation(() => customerQuery);
  customerQuery.eq.mockImplementation(() => customerQuery);

  const vehicleSingle = vi.fn().mockResolvedValue(vehicleResult);
  const vehicleSelect = vi.fn(() => ({ single: vehicleSingle }));
  const vehicleInsert = vi.fn(() => ({ select: vehicleSelect }));
  const from = vi.fn((table: string) => table === "customers" ? customerQuery : { insert: vehicleInsert });

  mocks.getSupabaseServerClient.mockResolvedValue({ from });
  mocks.requireTenantContext.mockResolvedValue({
    ok: true,
    context: { ...tenantContext, role: options.role ?? "technician" },
  });

  return { from, customerQuery, vehicleInsert, vehicleSingle };
}

function request(body: unknown) {
  return new Request("http://localhost/api/v1/vehicles", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

afterEach(() => vi.clearAllMocks());

describe("POST /api/v1/vehicles", () => {
  it("allows a technician to register a vehicle for a customer in the active workshop", async () => {
    const db = setup();
    const response = await POST(request(validInput));
    expect(response.status).toBe(201);
    expect(db.from).toHaveBeenNthCalledWith(1, "customers");
    expect(db.from).toHaveBeenNthCalledWith(2, "vehicles");
    expect(db.vehicleInsert).toHaveBeenCalledWith({
      workshop_id: tenantContext.workshopId,
      customer_id: customerId,
      plate_number: "ABC1234",
      make: "Toyota",
      model: "Camry",
      model_year: 2022,
      vin: null,
      created_by: tenantContext.userId,
    });
  });

  it("rejects malformed customer IDs before querying the database", async () => {
    const db = setup();
    const response = await POST(request({ ...validInput, customerId: "not-a-uuid" }));
    expect(response.status).toBe(400);
    expect(db.from).not.toHaveBeenCalled();
  });

  it("rejects customer IDs that do not belong to the active workshop", async () => {
    const db = setup({ customer: { data: null, error: null } });
    const response = await POST(request(validInput));
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("CUSTOMER_NOT_FOUND");
    expect(db.vehicleInsert).not.toHaveBeenCalled();
  });

  it("maps duplicate plate or VIN constraints to HTTP 409", async () => {
    setup({ vehicle: { data: null, error: { code: "23505" } } });
    const response = await POST(request(validInput));
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("VEHICLE_EXISTS");
  });

  it("rejects client-supplied tenant fields", async () => {
    const db = setup();
    const response = await POST(request({ ...validInput, workshop_id: "forged" }));
    expect(response.status).toBe(400);
    expect(db.from).not.toHaveBeenCalled();
  });
});
