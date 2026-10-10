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

import { POST } from "../src/app/api/v1/customers/route";

const tenantContext = {
  userId: "11111111-1111-4111-8111-111111111111",
  workshopId: "22222222-2222-4222-8222-222222222222",
  role: "owner" as const,
};

function setup(options: {
  role?: "owner" | "admin" | "receptionist" | "technician";
  databaseResult?: { data: unknown; error: { code?: string } | null };
} = {}) {
  const single = vi.fn().mockResolvedValue(
    options.databaseResult ?? {
      data: { id: "33333333-3333-4333-8333-333333333333", full_name: "محمد العتيبي", phone: "0501234567" },
      error: null,
    },
  );
  const select = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select }));
  const from = vi.fn(() => ({ insert }));

  mocks.getSupabaseServerClient.mockResolvedValue({ from });
  mocks.requireTenantContext.mockResolvedValue({
    ok: true,
    context: { ...tenantContext, role: options.role ?? "owner" },
  });

  return { from, insert, select, single };
}

function request(body: unknown) {
  return new Request("http://localhost/api/v1/customers", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

afterEach(() => vi.clearAllMocks());

describe("POST /api/v1/customers", () => {
  it("rejects technicians before touching the database", async () => {
    const db = setup({ role: "technician" });
    const response = await POST(request({ fullName: "محمد العتيبي", phone: "0501234567" }));
    expect(response.status).toBe(403);
    expect(db.from).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON", async () => {
    setup();
    const response = await POST(request("{"));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("INVALID_JSON");
  });

  it("rejects client-supplied tenant fields", async () => {
    const db = setup();
    const response = await POST(request({
      fullName: "محمد العتيبي",
      phone: "0501234567",
      workshop_id: "99999999-9999-4999-8999-999999999999",
    }));
    expect(response.status).toBe(400);
    expect(db.from).not.toHaveBeenCalled();
  });

  it("creates a customer using tenant and user IDs from the authenticated context", async () => {
    const db = setup();
    const response = await POST(request({
      fullName: "محمد العتيبي",
      phone: "0501234567",
    }));
    expect(response.status).toBe(201);
    expect(db.from).toHaveBeenCalledWith("customers");
    expect(db.insert).toHaveBeenCalledWith({
      workshop_id: tenantContext.workshopId,
      full_name: "محمد العتيبي",
      phone: "0501234567",
      notes: "",
      created_by: tenantContext.userId,
    });
  });

  it("maps a duplicate customer constraint to HTTP 409", async () => {
    setup({ databaseResult: { data: null, error: { code: "23505" } } });
    const response = await POST(request({
      fullName: "محمد العتيبي",
      phone: "0501234567",
    }));
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("CUSTOMER_EXISTS");
  });

  it("returns a controlled server error for unexpected database failures", async () => {
    setup({ databaseResult: { data: null, error: { code: "XX000" } } });
    const response = await POST(request({
      fullName: "محمد العتيبي",
      phone: "0501234567",
    }));
    expect(response.status).toBe(500);
  });
});
