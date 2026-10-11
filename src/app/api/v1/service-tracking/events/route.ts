import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireTenantContext } from "@/lib/api/tenant-context";

const schema = z.object({
  workOrderId: z.string().uuid(),
  eventType: z.enum(["vehicle_delivered", "note"]),
  title: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().max(2000).default(""),
}).strict();
const fail = (code: string, message: string, status: number) =>
  NextResponse.json({ ok: false, data: null, error: { code, message } }, { status });

export async function POST(request: Request) {
  try {
    const client = await getSupabaseServerClient();
    const tenant = await requireTenantContext(client);
    if (!tenant.ok) return tenant.response;
    if (!["owner", "admin", "receptionist", "technician"].includes(tenant.context.role))
      return fail("FORBIDDEN", "لا تملك صلاحية توثيق مراحل الصيانة", 403);
    let body: unknown;
    try { body = await request.json(); } catch { return fail("INVALID_JSON", "صيغة الطلب غير صالحة", 400); }
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail("VALIDATION_ERROR", "بيانات التحديث غير صالحة", 400);
    const { data: workOrder, error: workOrderError } = await client.from("work_orders")
      .select("id,booking_id,status").eq("id", parsed.data.workOrderId)
      .eq("workshop_id", tenant.context.workshopId).maybeSingle();
    if (workOrderError) throw workOrderError;
    if (!workOrder) return fail("WORK_ORDER_NOT_FOUND", "أمر العمل غير موجود في هذه الورشة", 404);
    if (parsed.data.eventType === "vehicle_delivered" && workOrder.status !== "completed")
      return fail("WORK_ORDER_NOT_COMPLETED", "لا يمكن توثيق خروج السيارة قبل إكمال أمر العمل", 409);
    if (parsed.data.eventType === "vehicle_delivered") {
      const { data: prior, error: priorError } = await client.from("service_tracking_events")
        .select("id").eq("workshop_id", tenant.context.workshopId)
        .eq("work_order_id", workOrder.id).eq("event_type", "vehicle_delivered").limit(1);
      if (priorError) throw priorError;
      if (prior?.length) return fail("ALREADY_DELIVERED", "تم توثيق تسليم السيارة مسبقًا.", 409);
    }
    const title = parsed.data.eventType === "vehicle_delivered" ? "تم تسليم السيارة للعميل" : parsed.data.title;
    if (!title) return fail("TITLE_REQUIRED", "أدخل عنوان التحديث.", 400);
    const description = parsed.data.eventType === "vehicle_delivered"
      ? (parsed.data.description || "تم توثيق خروج السيارة بعد اكتمال الخدمة.")
      : parsed.data.description;
    const { data, error } = await client.from("service_tracking_events").insert({
      workshop_id: tenant.context.workshopId, booking_id: workOrder.booking_id,
      work_order_id: workOrder.id, event_type: parsed.data.eventType, title, description,
      visible_to_customer: true, created_by: tenant.context.userId,
    }).select("id,event_type,title,description,created_at").single();
    if (error) throw error;
    return NextResponse.json({ ok: true, data, error: null }, { status: 201 });
  } catch {
    return fail("SERVER_ERROR", "تعذر توثيق التحديث. تحقق من تطبيق ترحيل تتبع الصيانة.", 500);
  }
}
