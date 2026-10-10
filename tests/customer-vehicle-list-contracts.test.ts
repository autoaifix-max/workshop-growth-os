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

import { GET as listCustomers } from "../src/app/api/v1/customers/route";
import { GET as listVehicles } from "../src/app/api/v1/vehicles/route";

const tenantContext = {
  userId: "11111111-1111-4111-8111-111111111111",
  workshopId: "22222222-2222-4222-8222-222222222222",
  role: "owner" as const,
};

function setup(rows: unknown[] = []) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve({ data: rows, error: null }).then(resolve, reject),
  };
  query.select.mockImplementation(() => query);
  query.eq.mockImplementation(() => query);
  query.order.mockImplementation(() => query);
  query.limit.mockImplementation(() => query);

  const from = vi.fn(() => query);
  mocks.getSupabaseServerClient.mockResolvedValue({ from });
  mocks.requireTenantContext.mockResolvedValue({ ok: true, context: tenantContext });
  return { from, query };
}

afterEach(() => vi.clearAllMocks());

describe("customer and vehicle list API contracts", () => {
  it("scopes customer listing to the authenticated workshop and validates the limit", async () => {
    const db = setup([{ id: "customer-a" }]);
    const response = await listCustomers(new Request("http://localhost/api/v1/customers?limit=25"));

    expect(response.status).toBe(200);
    expect((await response.json()).data.items).toEqual([{ id: "customer-a" }]);
    expect(db.from).toHaveBeenCalledWith("customers");
    expect(db.query.eq).toHaveBeenCalledWith("workshop_id", tenantContext.workshopId);

    const invalidDb = setup();
    const invalid = await listCustomers(new Request("http://localhost/api/v1/customers?limit=101"));
    expect(invalid.status).toBe(400);
    expect(invalidDb.from).not.toHaveBeenCalled();
  });

  it("scopes vehicle listing to the authenticated workshop and optional customer", async () => {
    const db = setup([{ id: "vehicle-a", customer_id: "customer-a" }]);
    const response = await listVehicles(new Request(
      "http://localhost/api/v1/vehicles?customerId=33333333-3333-4333-8333-333333333333",
    ));

    expect(response.status).toBe(200);
    expect((await response.json()).data.items).toEqual([{ id: "vehicle-a", customer_id: "customer-a" }]);
    expect(db.from).toHaveBeenCalledWith("vehicles");
    expect(db.query.eq).toHaveBeenCalledWith("workshop_id", tenantContext.workshopId);
    expect(db.query.eq).toHaveBeenCalledWith("customer_id", "33333333-3333-4333-8333-333333333333");
  });
});
