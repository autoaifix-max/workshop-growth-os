import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireTenantContext } from "@/lib/api/tenant-context";

const bookingStatuses = ["pending", "confirmed", "in_progress", "completed", "cancelled"] as const;
const createBookingSchema = z.object({
  customerId: z.string().uuid(),
  vehicleId: z.string().uuid().optional(),
  requestedService: z.string().trim().min(2).max(160),
  scheduledAt: z.string().datetime({ offset: true }),
  notes: z.string().trim().max(2000).optional().default(""),
}).strict();
const updateBookingSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(bookingStatuses),
}).strict();
const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(bookingStatuses).optional(),
  customerId: z.string().uuid().optional(),
});

function failure(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, data: null, error: { code, message } }, { status });
}

export async function GET(request: Request) {
  try {
    const client = await getSupabaseServerClient();
    const tenant = await requireTenantContext(client);
    if (!tenant.ok) return tenant.response;

    const url = new URL(request.url);
    const parsed = listQuerySchema.safeParse({
      limit: url.searchParams.get("limit") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      customerId: url.searchParams.get("customerId") ?? undefined,
    });
    if (!parsed.success) return failure("VALIDATION_ERROR", "معايير البحث عن الحجوزات غير صالحة", 400);

    let query = client.from("bookings")
      .select("id,customer_id,vehicle_id,requested_service,scheduled_at,status,notes,created_at,updated_at,customers!inner(full_name,phone),vehicles(plate_number,make,model,model_year)")
      .eq("workshop_id", tenant.context.workshopId)
      .order("scheduled_at", { ascending: true })
      .limit(parsed.data.limit);
    if (parsed.data.status) query = query.eq("status", parsed.data.status);
    if (parsed.data.customerId) query = query.eq("customer_id", parsed.data.customerId);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ ok: true, data: { items: data ?? [], limit: parsed.data.limit }, error: null });
  } catch {
    return failure("SERVER_ERROR", "تعذر جلب الحجوزات. تحقق من إعدادات قاعدة البيانات وترحيل bookings.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const client = await getSupabaseServerClient();
    const tenant = await requireTenantContext(client);
    if (!tenant.ok) return tenant.response;
    if (!["owner", "admin", "receptionist"].includes(tenant.context.role)) {
      return failure("FORBIDDEN", "لا تملك صلاحية إنشاء حجز", 403);
    }

    let body: unknown;
    try { body = await request.json(); } catch {
      return failure("INVALID_JSON", "صيغة الطلب غير صالحة", 400);
    }
    const parsed = createBookingSchema.safeParse(body);
    if (!parsed.success) return failure("VALIDATION_ERROR", "تحقق من العميل والخدمة والموعد وبيانات الحجز", 400);

    const { data: customer, error: customerError } = await client.from("customers")
      .select("id").eq("id", parsed.data.customerId)
      .eq("workshop_id", tenant.context.workshopId).maybeSingle();
    if (customerError) throw customerError;
    if (!customer) return failure("CUSTOMER_NOT_FOUND", "العميل غير موجود في هذه الورشة", 404);

    if (parsed.data.vehicleId) {
      const { data: vehicle, error: vehicleError } = await client.from("vehicles")
        .select("id").eq("id", parsed.data.vehicleId)
        .eq("customer_id", parsed.data.customerId)
        .eq("workshop_id", tenant.context.workshopId).maybeSingle();
      if (vehicleError) throw vehicleError;
      if (!vehicle) return failure("VEHICLE_NOT_FOUND", "السيارة لا تتبع هذا العميل أو هذه الورشة", 404);
    }

    const { data, error } = await client.from("bookings").insert({
      workshop_id: tenant.context.workshopId,
      customer_id: parsed.data.customerId,
      vehicle_id: parsed.data.vehicleId ?? null,
      requested_service: parsed.data.requestedService,
      scheduled_at: parsed.data.scheduledAt,
      notes: parsed.data.notes,
      status: "pending",
      created_by: tenant.context.userId,
    }).select("id,customer_id,vehicle_id,requested_service,scheduled_at,status,notes,created_at,updated_at").single();
    if (error) throw error;
    return NextResponse.json({ ok: true, data, error: null }, { status: 201 });
  } catch {
    return failure("SERVER_ERROR", "تعذر إنشاء الحجز. تحقق من إعدادات قاعدة البيانات وترحيل bookings.", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const client = await getSupabaseServerClient();
    const tenant = await requireTenantContext(client);
    if (!tenant.ok) return tenant.response;
    if (!["owner", "admin", "receptionist"].includes(tenant.context.role)) {
      return failure("FORBIDDEN", "لا تملك صلاحية تعديل حالة الحجز", 403);
    }

    let body: unknown;
    try { body = await request.json(); } catch {
      return failure("INVALID_JSON", "صيغة الطلب غير صالحة", 400);
    }
    const parsed = updateBookingSchema.safeParse(body);
    if (!parsed.success) return failure("VALIDATION_ERROR", "رقم الحجز أو الحالة غير صالح", 400);

    const { data, error } = await client.from("bookings")
      .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
      .eq("id", parsed.data.id)
      .eq("workshop_id", tenant.context.workshopId)
      .select("id,status,updated_at").maybeSingle();
    if (error) throw error;
    if (!data) return failure("BOOKING_NOT_FOUND", "الحجز غير موجود في هذه الورشة", 404);
    return NextResponse.json({ ok: true, data, error: null });
  } catch {
    return failure("SERVER_ERROR", "تعذر تحديث حالة الحجز. تحقق من إعدادات قاعدة البيانات وترحيل bookings.", 500);
  }
}
