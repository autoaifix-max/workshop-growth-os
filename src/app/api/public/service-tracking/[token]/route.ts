import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  if (!/^[A-Za-z0-9_-]{32,200}$/.test(token)) {
    return NextResponse.json({ ok: false, data: null, error: { message: "رابط التتبع غير صالح." } }, { status: 400 });
  }
  try {
    const client = await getSupabaseServerClient();
    const { data, error } = await client.rpc("get_public_service_tracking", { p_tracking_token: token });
    if (error) throw error;
    if (!data) return NextResponse.json({ ok: false, data: null, error: { message: "لم نعثر على سجل بهذا الرابط." } }, { status: 404 });
    return NextResponse.json({ ok: true, data, error: null }, { headers: { "Cache-Control": "no-store, private" } });
  } catch {
    return NextResponse.json({ ok: false, data: null, error: { message: "تعذر تحميل سجل التتبع." } }, { status: 503 });
  }
}
