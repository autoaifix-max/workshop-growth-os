import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const readyResponse = (ready: boolean) =>
  NextResponse.json(
    ready
      ? {
          ok: true,
          data: {
            service: "workshop-growth-os",
            status: "ready",
            contractVersion: "v1",
            dependencies: { database: "available" },
          },
          error: null,
        }
      : {
          ok: false,
          data: null,
          error: {
            code: "NOT_READY",
            message: "خدمة قاعدة البيانات غير جاهزة",
          },
        },
    {
      status: ready ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );

export async function GET() {
  try {
    const client = await getSupabaseServerClient();
    // A limited read checks connectivity, credentials, and the required core table.
    // RLS may legitimately return zero rows; a successful query is what matters.
    const { error } = await client.from("workshops").select("id").limit(1);
    if (error) return readyResponse(false);
    return readyResponse(true);
  } catch {
    // Keep deployment details and database errors out of this public endpoint.
    return readyResponse(false);
  }
}
