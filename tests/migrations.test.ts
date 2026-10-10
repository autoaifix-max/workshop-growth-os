import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Supabase migration filenames", () => {
  it("uses a unique numeric version prefix for every SQL migration", () => {
    const directory = resolve(process.cwd(), "supabase/migrations");
    const files = readdirSync(directory).filter((file) => file.endsWith(".sql"));
    const versions = files.map((file) => {
      const match = /^(\d+)_.*\.sql$/.exec(file);
      expect(match, `Migration filename must start with a numeric version and underscore: ${file}`).not.toBeNull();
      return match![1];
    });

    expect(new Set(versions).size, "Migration version prefixes must be unique").toBe(versions.length);
  });
});
