import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const slugSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{1,62}$/);
export async function GET(request: Request) {
  const workshopSlug = new URL(request.url).searchParams.get("workshop") ?? "";
  if (!slugSchema.safeParse(workshopSlug).success) {
    return NextResponse.json({ ok: false, data: null, error: { message: "رابط كتالوج الورشة غير صالح. استخدم الرابط الذي وفرته لك الورشة." } }, { status: 400 });
  }
  try {
    const client = await getSupabaseServerClient();
    const { data, error } = await client.rpc("get_public_service_offers", { p_workshop_slug: workshopSlug });
    if (error) throw error;
    return NextResponse.json({ ok: true, data: { items: Array.isArray(data) ? data : [] }, error: null }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ ok: false, data: null, error: { message: "تعذر تحميل الخدمات والعروض." } }, { status: 503 });
  }
}
