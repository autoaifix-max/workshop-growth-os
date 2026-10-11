import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireTenantContext } from "@/lib/api/tenant-context";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  platform: z.enum(["tiktok", "instagram", "snapchat", "youtube", "x", "other"]).default("other"),
  handle: z.string().trim().max(160).default(""),
  contact: z.string().trim().max(160).default(""),
  referralCode: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/).transform((value) => value.toUpperCase()),
  commissionType: z.enum(["fixed", "percent"]),
  commissionValue: z.number().positive().max(1000000),
}).strict();

const fail = (code: string, message: string, status: number) =>
  NextResponse.json({ ok: false, data: null, error: { code, message } }, { status, headers: { "Cache-Control": "private, no-store" } });
const manager = (role: string) => role === "owner" || role === "admin";

export async function GET() {
  try {
    const client = await getSupabaseServerClient();
    const tenant = await requireTenantContext(client);
    if (!tenant.ok) return tenant.response;
    if (!manager(tenant.context.role)) return fail("FORBIDDEN", "إدارة التسويق متاحة لمالك الورشة أو المدير فقط", 403);
    const { data, error } = await client.from("marketing_partners")
      .select("id,name,platform,handle,contact,referral_code,commission_type,commission_value,status,created_at")
      .eq("workshop_id", tenant.context.workshopId).order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    return NextResponse.json({ ok: true, data: { items: data ?? [] }, error: null }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return fail("SERVER_ERROR", "تعذر تحميل المسوقين. تحقق من تطبيق ترحيل التسويق.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const client = await getSupabaseServerClient();
    const tenant = await requireTenantContext(client);
    if (!tenant.ok) return tenant.response;
    if (!manager(tenant.context.role)) return fail("FORBIDDEN", "إضافة المسوقين متاحة لمالك الورشة أو المدير فقط", 403);
    let body: unknown;
    try { body = await request.json(); } catch { return fail("INVALID_JSON", "صيغة الطلب غير صالحة", 400); }
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail("VALIDATION_ERROR", "تحقق من الاسم والرمز ونوع العمولة وقيمتها", 400);
    if (parsed.data.commissionType === "percent" && parsed.data.commissionValue > 100)
      return fail("INVALID_COMMISSION", "نسبة العمولة يجب ألا تتجاوز 100٪", 400);
    const { data, error } = await client.from("marketing_partners").insert({
      workshop_id: tenant.context.workshopId, name: parsed.data.name, platform: parsed.data.platform,
      handle: parsed.data.handle, contact: parsed.data.contact, referral_code: parsed.data.referralCode,
      commission_type: parsed.data.commissionType, commission_value: parsed.data.commissionValue,
      created_by: tenant.context.userId,
    }).select("id,name,platform,handle,contact,referral_code,commission_type,commission_value,status,created_at").single();
    if (error?.code === "23505") return fail("REFERRAL_CODE_EXISTS", "رمز الإحالة مستخدم في هذه الورشة؛ اختر رمزًا آخر", 409);
    if (error) throw error;
    return NextResponse.json({ ok: true, data, error: null }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return fail("SERVER_ERROR", "تعذر حفظ المسوق. تحقق من إعدادات قاعدة البيانات.", 500);
  }
}
