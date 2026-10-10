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

import { GET, POST } from "../src/app/api/v1/work-orders/route";

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

function postRequest(body: unknown) {
  return new Request("http://localhost/api/v1/work-orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

afterEach(() => vi.clearAllMocks());

describe("work-orders API request guards", () => {
  it("rejects technicians from converting bookings before querying the database", async () => {
    const db = setup("technician");
    const response = await POST(postRequest({
      bookingId: "33333333-3333-4333-8333-333333333333",
    }));

    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("FORBIDDEN");
    expect(db.from).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON before querying the database", async () => {
    const db = setup();
    const response = await POST(postRequest("{"));

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("INVALID_JSON");
    expect(db.from).not.toHaveBeenCalled();
  });

  it("rejects a malformed booking ID before querying the database", async () => {
    const db = setup();
    const response = await POST(postRequest({ bookingId: "not-a-uuid" }));

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
    expect(db.from).not.toHaveBeenCalled();
  });

  it("rejects an invalid list limit before querying the database", async () => {
    const db = setup();
    const response = await GET(new Request("http://localhost/api/v1/work-orders?limit=101"));

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
    expect(db.from).not.toHaveBeenCalled();
  });
});
