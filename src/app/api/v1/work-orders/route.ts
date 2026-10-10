import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireTenantContext } from "@/lib/api/tenant-context";

const convertSchema = z.object({ bookingId: z.string().uuid() }).strict();
const fail = (code: string, message: string, status: number) =>
  NextResponse.json({ ok: false, data: null, error: { code, message } }, { status });

export async function GET(request: Request) {
  try {
    const client = await getSupabaseServerClient();
    const tenant = await requireTenantContext(client);
    if (!tenant.ok) return tenant.response;
    const limitValue = new URL(request.url).searchParams.get("limit") ?? "25";
    const limit = Number(limitValue);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100)
      return fail("VALIDATION_ERROR", "قيمة limit يجب أن تكون من 1 إلى 100", 400);
    const { data, error } = await client.from("work_orders")
      .select("id,booking_id,customer_id,vehicle_id,requested_service,status,notes,created_at,updated_at,customers!inner(full_name,phone),vehicles(plate_number,make,model,model_year)")
      .eq("workshop_id", tenant.context.workshopId)
      .order("created_at", { ascending: false }).limit(limit);
    if (error) throw error;
    return NextResponse.json({ ok: true, data: { items: data ?? [], limit }, error: null });
  } catch {
    return fail("SERVER_ERROR", "تعذر جلب أوامر العمل؛ تحقق من تطبيق ترحيل قاعدة البيانات", 500);
  }
}

export async function POST(request: Request) {
  try {
    const client = await getSupabaseServerClient();
    const tenant = await requireTenantContext(client);
    if (!tenant.ok) return tenant.response;
    if (!["owner", "admin", "receptionist"].includes(tenant.context.role))
      return fail("FORBIDDEN", "لا تملك صلاحية إنشاء أمر عمل", 403);
    let body: unknown;
    try { body = await request.json(); } catch {
      return fail("INVALID_JSON", "صيغة الطلب غير صالحة", 400);
    }
    const parsed = convertSchema.safeParse(body);
    if (!parsed.success) return fail("VALIDATION_ERROR", "معرّف الحجز غير صالح", 400);

    const { data: booking, error: bookingError } = await client.from("bookings")
      .select("id,workshop_id,customer_id,vehicle_id,requested_service,scheduled_at,status,notes")
      .eq("id", parsed.data.bookingId).eq("workshop_id", tenant.context.workshopId).maybeSingle();
    if (bookingError) throw bookingError;
    if (!booking) return fail("BOOKING_NOT_FOUND", "الحجز غير موجود في هذه الورشة", 404);
    if (booking.status === "cancelled" || booking.status === "completed")
      return fail("BOOKING_NOT_CONVERTIBLE", "لا يمكن تحويل حجز ملغى أو مكتمل إلى أمر عمل", 409);

    const { data: existing, error: existingError } = await client.from("work_orders")
      .select("id,booking_id,customer_id,vehicle_id,requested_service,status,notes,created_at,updated_at")
      .eq("booking_id", booking.id).eq("workshop_id", tenant.context.workshopId).maybeSingle();
    if (existingError) throw existingError;
    if (existing) {
      // A previous attempt may have created the work order but failed before
      // updating the booking. Make retries repair that state before returning.
      const { error: bookingUpdateError } = await client.from("bookings")
        .update({ status: "in_progress", updated_at: new Date().toISOString() })
        .eq("id", booking.id).eq("workshop_id", tenant.context.workshopId);
      if (bookingUpdateError) throw bookingUpdateError;
      return NextResponse.json({ ok: true, data: existing, error: null });
    }

    const { data, error } = await client.from("work_orders").insert({
      workshop_id: tenant.context.workshopId,
      booking_id: booking.id,
      customer_id: booking.customer_id,
      vehicle_id: booking.vehicle_id,
      requested_service: booking.requested_service,
      status: "open",
      notes: booking.notes ?? "",
      created_by: tenant.context.userId,
    }).select("id,booking_id,customer_id,vehicle_id,requested_service,status,notes,created_at,updated_at").single();
    if (error?.code === "23505") {
      const { data: concurrent } = await client.from("work_orders")
        .select("id,booking_id,customer_id,vehicle_id,requested_service,status,notes,created_at,updated_at")
        .eq("booking_id", booking.id).eq("workshop_id", tenant.context.workshopId).maybeSingle();
      if (concurrent) {
        // Concurrent requests can win the unique booking_id constraint. Keep
        // the booking status consistent with the work order in this path too.
        const { error: bookingUpdateError } = await client.from("bookings")
          .update({ status: "in_progress", updated_at: new Date().toISOString() })
          .eq("id", booking.id).eq("workshop_id", tenant.context.workshopId);
        if (bookingUpdateError) throw bookingUpdateError;
        return NextResponse.json({ ok: true, data: concurrent, error: null });
      }
    }
    if (error) throw error;

    const { error: bookingUpdateError } = await client.from("bookings")
      .update({ status: "in_progress", updated_at: new Date().toISOString() })
      .eq("id", booking.id).eq("workshop_id", tenant.context.workshopId);
    if (bookingUpdateError) throw bookingUpdateError;
    return NextResponse.json({ ok: true, data, error: null }, { status: 201 });
  } catch {
    return fail("SERVER_ERROR", "تعذر تحويل الحجز إلى أمر عمل؛ تحقق من إعدادات قاعدة البيانات", 500);
  }
}
