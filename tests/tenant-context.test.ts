import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { requireTenantContext } from "../src/lib/api/tenant-context";

const user = { id: "11111111-1111-4111-8111-111111111111" };
const membership = {
  workshop_id: "22222222-2222-4222-8222-222222222222",
  role: "owner",
  status: "active",
  workshops: { status: "active" },
};

function makeClient(options: {
  authenticated?: boolean;
  memberships?: unknown[];
  membershipError?: { message: string } | null;
} = {}) {
  const authenticated = options.authenticated ?? true;
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve({
        data: options.memberships ?? [membership],
        error: options.membershipError ?? null,
      }).then(resolve, reject),
  };
  query.select.mockImplementation(() => query);
  query.eq.mockImplementation(() => query);

  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: authenticated ? user : null },
        error: authenticated ? null : { message: "No session" },
      }),
    },
    from: vi.fn(() => query),
  };

  return client as unknown as SupabaseClient;
}

describe("requireTenantContext", () => {
  it("rejects unauthenticated requests", async () => {
    const result = await requireTenantContext(makeClient({ authenticated: false }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it("rejects users without an active workshop membership", async () => {
    const result = await requireTenantContext(makeClient({ memberships: [] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });

  it("requires an explicit workshop choice when multiple memberships are active", async () => {
    const result = await requireTenantContext(makeClient({ memberships: [membership, membership] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(409);
  });

  it("rejects an unsupported membership role defensively", async () => {
    const result = await requireTenantContext(
      makeClient({ memberships: [{ ...membership, role: "superuser" }] }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(403);
  });

  it("derives tenant scope and role from the authenticated membership", async () => {
    const result = await requireTenantContext(makeClient());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.context).toEqual({
        userId: user.id,
        workshopId: membership.workshop_id,
        role: "owner",
      });
    }
  });

  it("returns a server error if membership lookup fails", async () => {
    const result = await requireTenantContext(
      makeClient({ membershipError: { message: "database unavailable" } }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(500);
  });
});
