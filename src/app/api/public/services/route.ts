import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const client = await getSupabaseServerClient();
    const { data, error } = await client.rpc("get_public_service_offers");
    if (error) throw error;
    return NextResponse.json({ ok: true, data: { items: Array.isArray(data) ? data : [] }, error: null }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ ok: false, data: null, error: { message: "تعذر تحميل الخدمات والعروض." } }, { status: 503 });
  }
}
