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

import { GET } from "../src/app/api/v1/growth/route";

const tenantContext = {
  userId: "11111111-1111-4111-8111-111111111111",
  workshopId: "22222222-2222-4222-8222-222222222222",
  role: "owner" as const,
};

function setup() {
  const queries: Array<{ table: string; filters: Array<[string, unknown]> }> = [];
  const client = {
    from: vi.fn((table: string) => {
      const query: {
        table: string;
        filters: Array<[string, unknown]>;
        select: (...args: unknown[]) => unknown;
        eq: (...args: unknown[]) => unknown;
        gte: (...args: unknown[]) => unknown;
        then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise<unknown>;
      } = {
        table,
        filters: [],
        select: () => query,
        eq: (column: string, value: unknown) => { query.filters.push([column, value]); return query; },
        gte: (column: string, value: unknown) => { query.filters.push([column, value]); return query; },
        then: (resolve, reject) => {
          queries.push({ table: query.table, filters: [...query.filters] });
          const status = query.filters.find(([column]) => column === "status")?.[1];
          const count = table === "work_orders" ? 4
            : status === "pending" ? 3
            : status === "confirmed" ? 2
            : status === "in_progress" ? 1
            : status === "completed" ? 2
            : status === "cancelled" ? 2
            : 10;
          return Promise.resolve({ count, error: null }).then(resolve, reject);
        },
      };
      return query;
    }),
  };
  mocks.getSupabaseServerClient.mockResolvedValue(client);
  mocks.requireTenantContext.mockResolvedValue({ ok: true, context: tenantContext });
  return { client, queries };
}

afterEach(() => vi.clearAllMocks());

describe("workshop growth metrics API", () => {
  it("stops before querying data when tenant access is denied", async () => {
    const client = { from: vi.fn() };
    mocks.getSupabaseServerClient.mockResolvedValue(client);
    const { NextResponse } = await import("next/server");
    mocks.requireTenantContext.mockResolvedValue({
      ok: false,
      response: NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED" } }, { status: 401 }),
    });

    const response = await GET();
    expect(response.status).toBe(401);
    expect(client.from).not.toHaveBeenCalled();
  });

  it("scopes every metric query to the active workshop and reports transparent counts", async () => {
    const { client, queries } = setup();
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.bookings).toBe(10);
    expect(body.data.workOrders).toBe(4);
    expect(body.data.completionRate).toBe(25);
    expect(body.data.completionRateDenominator).toBe(8);
    expect(client.from).toHaveBeenCalledTimes(7);
    expect(queries).toHaveLength(7);
    for (const query of queries) {
      expect(query.filters).toContainEqual(["workshop_id", tenantContext.workshopId]);
      expect(query.filters.some(([column]) => column === "created_at")).toBe(true);
    }
  });
});
