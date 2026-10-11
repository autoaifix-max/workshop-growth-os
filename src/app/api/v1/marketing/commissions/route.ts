import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireTenantContext } from "@/lib/api/tenant-context";

const fail = (message: string, status: number) => NextResponse.json({ ok: false, data: null, error: { message } }, { status, headers: { "Cache-Control": "private, no-store" } });
const inputSchema = z.object({ workOrderId: z.string().uuid(), collectedAmount: z.number().positive().max(100000000), paymentConfirmed: z.literal(true) }).strict();

export async function GET() {
  try {
    const client = await getSupabaseServerClient();
    const tenant = await requireTenantContext(client);
    if (!tenant.ok) return tenant.response;
    if (!["owner", "admin"].includes(tenant.context.role)) return fail("متاح لمالك الورشة أو المدير فقط", 403);
    const { data, error } = await client.from("marketing_commissions")
      .select("id,partner_id,work_order_id,collected_amount,commission_amount,status,created_at,marketing_partners!inner(name,referral_code)")
      .eq("workshop_id", tenant.context.workshopId).order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    return NextResponse.json({ ok: true, data: { items: data ?? [] }, error: null }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return fail("تعذر تحميل سجل العمولات", 500); }
}

export async function POST(request: Request) {
  try {
    const client = await getSupabaseServerClient();
    const tenant = await requireTenantContext(client);
    if (!tenant.ok) return tenant.response;
    if (!["owner", "admin"].includes(tenant.context.role)) return fail("متاح لمالك الورشة أو المدير فقط", 403);
    let body: unknown;
    try { body = await request.json(); } catch { return fail("صيغة الطلب غير صالحة", 400); }
    const parsed = inputSchema.safeParse(body);
    if (!parsed.success) return fail("أكد استلام المبلغ وأدخل أمر العمل والمبلغ المحصل", 400);
    const { data: wo, error: woError } = await client.from("work_orders")
      .select("id,status,bookings!inner(marketing_partner_id)")
      .eq("id", parsed.data.workOrderId).eq("workshop_id", tenant.context.workshopId).maybeSingle();
    if (woError) throw woError;
    if (!wo) return fail("أمر العمل غير موجود في هذه الورشة", 404);
    if (wo.status !== "completed") return fail("لا تسجل العمولة قبل إكمال الخدمة", 409);
    const booking = wo.bookings as unknown as { marketing_partner_id: string | null };
    if (!booking?.marketing_partner_id) return fail("أمر العمل لا يحمل إحالة مسوق", 409);
    const { data: partner, error: pError } = await client.from("marketing_partners")
      .select("id,commission_type,commission_value,status")
      .eq("id", booking.marketing_partner_id).eq("workshop_id", tenant.context.workshopId).maybeSingle();
    if (pError) throw pError;
    if (!partner || partner.status !== "active") return fail("المسوق غير نشط", 409);
    const collected = Number(parsed.data.collectedAmount.toFixed(2));
    const commission = Number((partner.commission_type === "percent" ? collected * Number(partner.commission_value) / 100 : Number(partner.commission_value)).toFixed(2));
    if (commission <= 0 || commission > collected) return fail("قيمة العمولة المحسوبة غير صالحة", 409);
    const { data, error } = await client.from("marketing_commissions").insert({
      workshop_id: tenant.context.workshopId, partner_id: partner.id, work_order_id: wo.id,
      collected_amount: collected, commission_amount: commission, status: "pending_review", recorded_by: tenant.context.userId,
    }).select("id,partner_id,work_order_id,collected_amount,commission_amount,status,created_at").single();
    if (error?.code === "23505") return fail("سبق تسجيل عمولة لهذا الأمر", 409);
    if (error) throw error;
    return NextResponse.json({ ok: true, data, error: null }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch { return fail("تعذر تسجيل العمولة؛ تحقق من إعدادات قاعدة البيانات", 500); }
}
