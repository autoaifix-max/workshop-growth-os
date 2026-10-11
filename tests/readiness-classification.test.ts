import { describe, expect, it } from "vitest";
import { classifyDatabaseError } from "../src/lib/readiness/classify-database-error";

describe("classifyDatabaseError", () => {
  it("classifies PostgreSQL permission failures", () => {
    expect(classifyDatabaseError("42501")).toBe("DATABASE_PERMISSION_DENIED");
  });

  it("classifies missing core schema errors", () => {
    expect(classifyDatabaseError("42P01")).toBe("CORE_SCHEMA_UNAVAILABLE");
    expect(classifyDatabaseError("PGRST204")).toBe("CORE_SCHEMA_UNAVAILABLE");
    expect(classifyDatabaseError("PGRST205")).toBe("CORE_SCHEMA_UNAVAILABLE");
  });

  it("keeps unknown failures generic", () => {
    expect(classifyDatabaseError("XX000")).toBe("DATABASE_UNAVAILABLE");
    expect(classifyDatabaseError()).toBe("DATABASE_UNAVAILABLE");
  });
});
