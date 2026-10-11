import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireTenantContext } from "@/lib/api/tenant-context";

const createSchema = z.object({
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9-]{2,79}$/),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).default(""),
  basePrice: z.number().positive().max(10000000),
  discountType: z.enum(["fixed", "percent"]),
  discountValue: z.number().positive().max(10000000),
  terms: z.string().trim().max(2000).default(""),
  marketingPartnerId: z.string().uuid().nullable().optional(),
  startsAt: z.string().datetime({ offset: true }).nullable().optional(),
  expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
}).strict().refine((value) => value.discountType !== "percent" || value.discountValue <= 100, {
  message: "نسبة الخصم يجب ألا تتجاوز 100٪",
  path: ["discountValue"],
});

const fail = (code: string, message: string, status: number) =>
  NextResponse.json({ ok: false, data: null, error: { code, message } }, { status });

export async function GET() {
  try {
    const client = await getSupabaseServerClient();
    const tenant = await requireTenantContext(client);
    if (!tenant.ok) return tenant.response;
    if (!["owner", "admin"].includes(tenant.context.role)) return fail("FORBIDDEN", "إدارة العروض متاحة للمالك أو المدير فقط", 403);
    const [{ data, error }, { data: workshop, error: workshopError }] = await Promise.all([
      client.from("service_offers")
        .select("id,slug,title,description,base_price,discount_type,discount_value,terms,starts_at,expires_at,status,created_at,marketing_partner_id,marketing_partners(name,referral_code)")
        .eq("workshop_id", tenant.context.workshopId)
        .order("created_at", { ascending: false }).limit(100),
      client.from("workshops").select("slug").eq("id", tenant.context.workshopId).maybeSingle(),
    ]);
    if (error || workshopError) throw error ?? workshopError;
    return NextResponse.json({ ok: true, data: { items: data ?? [], workshopSlug: workshop?.slug ?? null }, error: null });
  } catch {
    return fail("SERVER_ERROR", "تعذر تحميل العروض. تحقق من ترحيل قاعدة البيانات.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const client = await getSupabaseServerClient();
    const tenant = await requireTenantContext(client);
    if (!tenant.ok) return tenant.response;
    if (!["owner", "admin"].includes(tenant.context.role)) return fail("FORBIDDEN", "إنشاء العروض متاح للمالك أو المدير فقط", 403);
    let body: unknown;
    try { body = await request.json(); } catch { return fail("INVALID_JSON", "صيغة الطلب غير صالحة", 400); }
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return fail("VALIDATION_ERROR", "تحقق من اسم العرض والرابط والسعر والخصم.", 400);
    if (parsed.data.startsAt && parsed.data.expiresAt && parsed.data.expiresAt <= parsed.data.startsAt) {
      return fail("INVALID_DATE_RANGE", "تاريخ انتهاء العرض يجب أن يأتي بعد تاريخ بدايته.", 400);
    }
    const { data, error } = await client.from("service_offers").insert({
      workshop_id: tenant.context.workshopId,
      created_by: tenant.context.userId,
      slug: parsed.data.slug,
      title: parsed.data.title,
      description: parsed.data.description,
      base_price: parsed.data.basePrice,
      discount_type: parsed.data.discountType,
      discount_value: parsed.data.discountValue,
      terms: parsed.data.terms,
      marketing_partner_id: parsed.data.marketingPartnerId ?? null,
      starts_at: parsed.data.startsAt ?? null,
      expires_at: parsed.data.expiresAt ?? null,
      status: "active",
    }).select("id,slug,title,base_price,discount_type,discount_value,marketing_partner_id,status").single();
    if (error?.code === "23505") return fail("SLUG_EXISTS", "رابط العرض مستخدم مسبقًا. اختر رابطًا مختلفًا.", 409);
    if (error?.code === "23503") return fail("INVALID_PARTNER", "المشهور المحدد غير تابع لهذه الورشة.", 400);
    if (error) throw error;
    return NextResponse.json({ ok: true, data, error: null }, { status: 201 });
  } catch {
    return fail("SERVER_ERROR", "تعذر إنشاء العرض. تحقق من إعدادات قاعدة البيانات.", 500);
  }
}
