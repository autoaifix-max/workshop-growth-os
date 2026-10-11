import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  offerSlug: z.string().regex(/^[a-z0-9][a-z0-9-]{2,79}$/),
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^[0-9+()\s-]{8,24}$/),
  plateNumber: z.string().trim().min(2).max(20),
  make: z.string().trim().min(1).max(60),
  model: z.string().trim().min(1).max(60),
  modelYear: z.number().int().min(1950).max(2100).nullable().optional(),
  scheduledAt: z.string().datetime({ offset: true }),
  notes: z.string().trim().max(2000).default(""),
}).strict();

const fail = (message: string, status: number) =>
  NextResponse.json({ ok: false, data: null, error: { message } }, { status });

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return fail("بيانات الحجز غير صالحة.", 400); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("أكمل بيانات العميل والسيارة والموعد بشكل صحيح.", 400);
  const trackingToken = randomBytes(32).toString("base64url");
  try {
    const client = await getSupabaseServerClient();
    const { data, error } = await client.rpc("create_public_service_booking", {
      p_offer_slug: parsed.data.offerSlug,
      p_full_name: parsed.data.fullName,
      p_phone: parsed.data.phone,
      p_plate_number: parsed.data.plateNumber,
      p_make: parsed.data.make,
      p_model: parsed.data.model,
      p_model_year: parsed.data.modelYear ?? null,
      p_scheduled_at: parsed.data.scheduledAt,
      p_notes: parsed.data.notes,
      p_tracking_token: trackingToken,
    });
    if (error) {
      if (error.code === "P0002") return fail("العرض لم يعد متاحًا أو تعذر قبول الحجز حاليًا.", 409);
      if (error.code === "22023") return fail("الموعد يجب أن يكون بعد 30 دقيقة وخلال 120 يومًا، مع اكتمال البيانات.", 400);
      if (error.code === "23505") return fail("لوحة السيارة مرتبطة بعميل آخر. راجع الورشة لتصحيح البيانات.", 409);
      throw error;
    }
    return NextResponse.json({
      ok: true,
      data: { ...data, trackingUrl: `/track/${trackingToken}` },
      error: null,
    }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return fail("تعذر تسجيل الحجز. لم يتم تأكيد الموعد؛ حاول لاحقًا أو تواصل مع الورشة.", 503);
  }
}
