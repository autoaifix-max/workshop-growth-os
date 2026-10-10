import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export type TenantContext = {
  userId: string;
  workshopId: string;
  role: "owner" | "admin" | "receptionist" | "technician";
};
export type TenantResult =
  | { ok: true; context: TenantContext }
  | { ok: false; response: NextResponse };

export async function requireTenantContext(client: SupabaseClient): Promise<TenantResult> {
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) {
    return { ok: false, response: NextResponse.json({ ok: false, data: null, error: { code: "UNAUTHORIZED", message: "يلزم تسجيل الدخول" } }, { status: 401 }) };
  }
  const { data: memberships, error } = await client
    .from("workshop_memberships")
    .select("workshop_id, role, status, workshops!inner(status)")
    .eq("user_id", auth.user.id)
    .eq("status", "active")
    .eq("workshops.status", "active");

  if (error) {
    return { ok: false, response: NextResponse.json({ ok: false, data: null, error: { code: "MEMBERSHIP_LOOKUP_FAILED", message: "تعذر التحقق من عضوية الورشة" } }, { status: 500 }) };
  }
  if (!memberships?.length) {
    return { ok: false, response: NextResponse.json({ ok: false, data: null, error: { code: "ACTIVE_WORKSHOP_REQUIRED", message: "لا توجد عضوية فعالة في ورشة نشطة" } }, { status: 403 }) };
  }
  if (memberships.length !== 1) {
    return { ok: false, response: NextResponse.json({ ok: false, data: null, error: { code: "WORKSHOP_SELECTION_REQUIRED", message: "الحساب مرتبط بأكثر من ورشة؛ يلزم اختيار الورشة" } }, { status: 409 }) };
  }
  const membership = memberships[0];
  if (!["owner", "admin", "receptionist", "technician"].includes(membership.role)) {
    return { ok: false, response: NextResponse.json({ ok: false, data: null, error: { code: "INVALID_ROLE", message: "دور المستخدم غير صالح" } }, { status: 403 }) };
  }
  return { ok: true, context: { userId: auth.user.id, workshopId: membership.workshop_id as string, role: membership.role as TenantContext["role"] } };
}
