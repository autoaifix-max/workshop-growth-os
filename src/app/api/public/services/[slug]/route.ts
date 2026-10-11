import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const slugSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{2,79}$/);
export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (!slugSchema.safeParse(slug).success) return NextResponse.json({ ok: false, data: null, error: { message: "رابط العرض غير صالح." } }, { status: 400 });
  try {
    const client = await getSupabaseServerClient();
    const { data, error } = await client.rpc("get_public_service_offer", { p_slug: slug });
    if (error) throw error;
    if (!data) return NextResponse.json({ ok: false, data: null, error: { message: "العرض غير متاح أو انتهت صلاحيته." } }, { status: 404 });
    return NextResponse.json({ ok: true, data, error: null }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, data: null, error: { message: "تعذر تحميل العرض. قد تحتاج قاعدة البيانات إلى تطبيق الترحيل الجديد." } }, { status: 503 });
  }
}
