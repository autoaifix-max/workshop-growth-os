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

  it("identifies an unavailable core schema without exposing database error details", async () => {
    setup({ queryError: { code: "PGRST205" } });
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("CORE_SCHEMA_UNAVAILABLE");
    expect(payload.error.message).toBe("خدمة قاعدة البيانات غير جاهزة");
    expect(JSON.stringify(payload)).not.toContain("PGRST205");
  });

  it("identifies an RLS/table permission configuration problem without exposing raw errors", async () => {
    setup({ queryError: { code: "42501" } });
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.error.code).toBe("DATABASE_PERMISSION_DENIED");
    expect(JSON.stringify(payload)).not.toContain("42501");
  });

  it("identifies a configuration problem without exposing the config error", async () => {
    setup({ configError: new Error("Supabase configuration is missing") });
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.error.code).toBe("SUPABASE_CONFIGURATION_MISSING");
    expect(payload.error.message).toBe("خدمة قاعدة البيانات غير جاهزة");
    expect(JSON.stringify(payload)).not.toContain("Supabase configuration is missing");
  });

  it("falls back to a generic database-unavailable code for unexpected failures", async () => {
    setup({ configError: new Error("internal host and secret detail") });
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.error.code).toBe("DATABASE_UNAVAILABLE");
    expect(JSON.stringify(payload)).not.toContain("internal host and secret detail");
  });
});
