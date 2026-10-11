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

export function classifyDatabaseError(
  code?: string,
  status?: number,
): ReadinessFailure {
  if (code === "42501" || status === 401 || status === 403) {
    return "DATABASE_PERMISSION_DENIED";
  }
  if (
    ["42P01", "PGRST204", "PGRST205"].includes(code ?? "") ||
    status === 404
  ) {
    return "CORE_SCHEMA_UNAVAILABLE";
  }
  return "DATABASE_UNAVAILABLE";
}

// Log only safe diagnostic metadata. Never log credentials, request cookies,
// customer/workshop data, raw error messages, or full Supabase error objects.
function logReadinessFailure(
  stage: "configuration" | "client_init" | "database_query" | "database_exception",
  details: {
    code?: unknown;
    status?: unknown;
    name?: unknown;
    missingUrl?: boolean;
    missingAnonKey?: boolean;
  } = {},
) {
  console.error("[readiness] dependency check failed", {
    stage,
    code: typeof details.code === "string" ? details.code : null,
    status: typeof details.status === "number" ? details.status : null,
    name: typeof details.name === "string" ? details.name : null,
    missingUrl: details.missingUrl ?? null,
    missingAnonKey: details.missingAnonKey ?? null,
  });
}

export async function GET() {
  const missingUrl = !process.env.NEXT_PUBLIC_SUPABASE_URL;
  const missingAnonKey = !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (missingUrl || missingAnonKey) {
    logReadinessFailure("configuration", { missingUrl, missingAnonKey });
    return readyResponse("SUPABASE_CONFIGURATION_MISSING");
  }

  let client;
  try {
    client = await getSupabaseServerClient();
  } catch (cause) {
    logReadinessFailure("client_init", {
      name: cause instanceof Error ? cause.name : typeof cause,
    });
    return readyResponse("DATABASE_UNAVAILABLE");
  }

  try {
    // A limited read checks connectivity, credentials, and the required core table.
    // RLS may legitimately return zero rows; a successful query is what matters.
    const { error } = await client.from("workshops").select("id").limit(1);
    if (error) {
      logReadinessFailure("database_query", {
        code: error.code,
        status: error.status,
        name: error.name,
      });
      return readyResponse(classifyDatabaseError(error.code, error.status));
    }
    return readyResponse();
  } catch (cause) {
    logReadinessFailure("database_exception", {
      name: cause instanceof Error ? cause.name : typeof cause,
    });
    return readyResponse("DATABASE_UNAVAILABLE");
  }
}
