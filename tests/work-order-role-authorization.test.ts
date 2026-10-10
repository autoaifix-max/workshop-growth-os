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

afterEach(() => vi.clearAllMocks());

describe("POST /api/v1/work-orders authorization", () => {
  it("rejects technician role before attempting any database mutation", async () => {
    const from = vi.fn();
    mocks.getSupabaseServerClient.mockResolvedValue({ from });
    mocks.requireTenantContext.mockResolvedValue({
      ok: true,
      context: {
        userId: "11111111-1111-4111-8111-111111111111",
        workshopId: "22222222-2222-4222-8222-222222222222",
        role: "technician",
      },
    });

    const response = await POST(new Request("http://localhost/api/v1/work-orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ bookingId: "33333333-3333-4333-8333-333333333333" }),
    }));

    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("FORBIDDEN");
    expect(from).not.toHaveBeenCalled();
  });
});
