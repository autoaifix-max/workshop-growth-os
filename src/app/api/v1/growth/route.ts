import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireTenantContext } from "@/lib/api/tenant-context";

const privateNoStore = { "Cache-Control": "private, no-store" };

const fail = (code: string, message: string, status: number) =>
  NextResponse.json({ ok: false, data: null, error: { code, message } }, { status, headers: privateNoStore });

export async function GET() {
  try {
    const client = await getSupabaseServerClient();
    const tenant = await requireTenantContext(client);
    if (!tenant.ok) {
      tenant.response.headers.set("Cache-Control", "private, no-store");
      return tenant.response;
    }

    // Read-only metrics. Every query is scoped to the active membership's workshop.
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const bookingCount = (status?: string) => {
      let query = client.from("bookings").select("id", { count: "exact", head: true })
        .eq("workshop_id", tenant.context.workshopId).gte("created_at", since);
      if (status) query = query.eq("status", status);
      return query;
    };

    const [all, pending, confirmed, inProgress, completed, cancelled, workOrders] = await Promise.all([
      bookingCount(),
      bookingCount("pending"),
      bookingCount("confirmed"),
      bookingCount("in_progress"),
      bookingCount("completed"),
      bookingCount("cancelled"),
      client.from("work_orders").select("id", { count: "exact", head: true })
        .eq("workshop_id", tenant.context.workshopId).gte("created_at", since),
    ]);

    const results = [all, pending, confirmed, inProgress, completed, cancelled, workOrders];
    if (results.some((result) => result.error)) throw new Error("Growth metrics query failed");

    const total = all.count ?? 0;
    const completedCount = completed.count ?? 0;
    const cancelledCount = cancelled.count ?? 0;
    const eligible = Math.max(0, total - cancelledCount);
    return NextResponse.json({
      ok: true,
      data: {
        periodDays: 30,
        since,
        bookings: total,
        pending: pending.count ?? 0,
        confirmed: confirmed.count ?? 0,
        inProgress: inProgress.count ?? 0,
        completed: completedCount,
        cancelled: cancelledCount,
        workOrders: workOrders.count ?? 0,
        completionRate: eligible > 0 ? Math.round((completedCount / eligible) * 1000) / 10 : null,
        completionRateDenominator: eligible,
        limitations: [
          "المؤشرات مبنية على تاريخ إنشاء السجلات خلال آخر 30 يومًا.",
          "نسبة الإنجاز محسوبة من الحجوزات غير الملغاة، وليست مقياسًا للربحية.",
          "لا تتوفر بيانات موثوقة عن الإيرادات والتكاليف لحساب هامش الربح.",
        ],
      },
      error: null,
    }, { headers: privateNoStore });
  } catch {
    return fail("SERVER_ERROR", "تعذر حساب مؤشرات الورشة. تحقق من إعدادات قاعدة البيانات.", 500);
  }
}
