import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ReadinessFailure =
  | "SUPABASE_CONFIGURATION_MISSING"
  | "CORE_SCHEMA_UNAVAILABLE"
  | "DATABASE_PERMISSION_DENIED"
  | "DATABASE_UNAVAILABLE";

const readyResponse = (failure?: ReadinessFailure) =>
  NextResponse.json(
    failure
      ? {
          ok: false,
          data: null,
          error: {
            code: failure,
            message: "خدمة قاعدة البيانات غير جاهزة",
          },
        }
      : {
          ok: true,
          data: {
            service: "workshop-growth-os",
            status: "ready",
            contractVersion: "v1",
            dependencies: { database: "available" },
          },
          error: null,
        },
    {
      status: failure ? 503 : 200,
      headers: { "Cache-Control": "no-store" },
    },
  );

function classifyDatabaseError(code?: string): ReadinessFailure {
  if (code === "42501") return "DATABASE_PERMISSION_DENIED";
  if (["42P01", "PGRST204", "PGRST205"].includes(code ?? "")) {
    return "CORE_SCHEMA_UNAVAILABLE";
  }
  return "DATABASE_UNAVAILABLE";
}

export async function GET() {
  let client;
  try {
    client = await getSupabaseServerClient();
  } catch (cause) {
    const configMissing =
      cause instanceof Error && cause.message === "Supabase configuration is missing";
    return readyResponse(configMissing ? "SUPABASE_CONFIGURATION_MISSING" : "DATABASE_UNAVAILABLE");
  }

  try {
    // A limited read checks connectivity, credentials, and the required core table.
    // RLS may legitimately return zero rows; a successful query is what matters.
    const { error } = await client.from("workshops").select("id").limit(1);
    if (error) return readyResponse(classifyDatabaseError(error.code));
    return readyResponse();
  } catch {
    return readyResponse("DATABASE_UNAVAILABLE");
  }
}
