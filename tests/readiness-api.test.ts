import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: mocks.getSupabaseServerClient,
}));

import { GET } from "../src/app/api/v1/ready/route";

afterEach(() => vi.clearAllMocks());

function setup(options: { queryError?: { code?: string } | null; configError?: Error } = {}) {
  const limit = vi.fn().mockResolvedValue({
    data: [],
    error: options.queryError ?? null,
  });
  const select = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ select }));

  if (options.configError) {
    mocks.getSupabaseServerClient.mockRejectedValue(options.configError);
  } else {
    mocks.getSupabaseServerClient.mockResolvedValue({ from });
  }
  return { from, select, limit };
}

describe("GET /api/v1/ready", () => {
  it("returns ready when the database and core schema are reachable, even when RLS returns no rows", async () => {
    const db = setup();
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      data: {
        service: "workshop-growth-os",
        status: "ready",
        contractVersion: "v1",
        dependencies: { database: "available" },
      },
      error: null,
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(db.from).toHaveBeenCalledWith("workshops");
    expect(db.select).toHaveBeenCalledWith("id");
    expect(db.limit).toHaveBeenCalledWith(1);
  });

  it("returns 503 when the core table query fails", async () => {
    setup({ queryError: { code: "42P01" } });
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("NOT_READY");
    expect(payload.error.message).toBe("خدمة قاعدة البيانات غير جاهزة");
    expect(JSON.stringify(payload)).not.toContain("42P01");
  });

  it("returns 503 when Supabase configuration or client creation fails", async () => {
    setup({ configError: new Error("Supabase configuration is missing") });
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.error.code).toBe("NOT_READY");
    expect(JSON.stringify(payload)).not.toContain("Supabase configuration is missing");
  });
});
