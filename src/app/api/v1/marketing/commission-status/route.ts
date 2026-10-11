import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireTenantContext } from "@/lib/api/tenant-context";

const schema = z.object({
  id: z.string().uuid(),
  action: z.enum(["approve", "mark_paid", "cancel"]),
  paymentReference: z.string().trim().max(160).optional().default(""),
}).strict();
const fail = (message: string, status: number) => NextResponse.json({ ok: false, data: null, error: { message } }, { status, headers: { "Cache-Control": "private, no-store" } });

export async function POST(request: Request) {
  try {
    const client = await getSupabaseServerClient();
    const tenant = await requireTenantContext(client);
    if (!tenant.ok) return tenant.response;
    if (!["owner", "admin"].includes(tenant.context.role)) return fail("متاح لمالك الورشة أو المدير فقط", 403);
    let body: unknown;
    try { body = await request.json(); } catch { return fail("صيغة الطلب غير صالحة", 400); }
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail("بيانات تحديث العمولة غير صالحة", 400);
    if (parsed.data.action === "mark_paid" && !parsed.data.paymentReference) return fail("أدخل مرجع التحويل قبل تسجيل العمولة كمدفوعة", 400);
    const { data: current, error: lookupError } = await client.from("marketing_commissions")
      .select("id,status").eq("id", parsed.data.id).eq("workshop_id", tenant.context.workshopId).maybeSingle();
    if (lookupError) throw lookupError;
    if (!current) return fail("العمولة غير موجودة في هذه الورشة", 404);
    const nextStatus = parsed.data.action === "approve" ? "approved" : parsed.data.action === "mark_paid" ? "paid" : "cancelled";
    const allowed = current.status === "pending_review"
      ? ["approved", "cancelled"].includes(nextStatus)
      : current.status === "approved" && ["paid", "cancelled"].includes(nextStatus);
    if (!allowed) return fail("انتقال حالة العمولة غير مسموح", 409);
    const now = new Date().toISOString();
    const { data, error } = await client.from("marketing_commissions").update({
      status: nextStatus,
      payment_reference: nextStatus === "paid" ? parsed.data.paymentReference : "",
      paid_at: nextStatus === "paid" ? now : null,
      paid_by: nextStatus === "paid" ? tenant.context.userId : null,
      updated_at: now,
    }).eq("id", parsed.data.id).eq("workshop_id", tenant.context.workshopId).eq("status", current.status)
      .select("id,status,payment_reference,paid_at,updated_at").maybeSingle();
    if (error) throw error;
    if (!data) return fail("تغيرت حالة العمولة بالتزامن؛ حدّث الصفحة", 409);
    return NextResponse.json({ ok: true, data, error: null }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return fail("تعذر تحديث العمولة", 500); }
}
