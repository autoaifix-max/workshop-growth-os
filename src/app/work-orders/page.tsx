"use client";

import Link from "next/link";
import { redirectIfUnauthorized } from "@/lib/auth/redirect-to-login";
import { getAllowedWorkOrderStatusTransitions } from "@/lib/work-order-status";
import { useCallback, useEffect, useState } from "react";

type WorkOrderStatus = "open" | "diagnosing" | "waiting_parts" | "in_progress" | "completed" | "cancelled";
type WorkOrder = {
  id: string;
  booking_id: string;
  customer_id: string;
  vehicle_id: string | null;
  requested_service: string;
  status: WorkOrderStatus;
  notes: string;
  created_at: string;
  updated_at: string;
  customers?: { full_name: string; phone: string } | null;
  vehicles?: { plate_number: string; make: string; model: string; model_year: number | null } | null;
};
type ApiResponse = { ok: boolean; data?: { items?: WorkOrder[] }; error?: { message?: string } | null };
type UpdateResponse = { ok: boolean; data?: { id: string; status: WorkOrderStatus }; error?: { message?: string } | null };

const statusLabels: Record<WorkOrderStatus, string> = {
  open: "مفتوح", diagnosing: "قيد التشخيص", waiting_parts: "بانتظار قطع الغيار",
  in_progress: "قيد الإصلاح", completed: "مكتمل", cancelled: "ملغي",
};
const dateFormat = (value: string) =>
  new Intl.DateTimeFormat("ar-SA", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));

export default function WorkOrdersPage() {
  const [items, setItems] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/v1/work-orders?limit=100", { cache: "no-store" });
      if (redirectIfUnauthorized(response)) return;
      const payload = await response.json() as ApiResponse;
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error?.message || (response.status === 401
          ? "يلزم تسجيل الدخول لعرض أوامر العمل."
          : "تعذر تحميل أوامر العمل."));
      }
      setItems(payload.data.items ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر الاتصال بخدمة أوامر العمل.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  async function updateStatus(item: WorkOrder, status: WorkOrderStatus) {
    setUpdatingId(item.id);
    setFeedback("");
    try {
      const response = await fetch("/api/v1/work-orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, status }),
      });
      if (redirectIfUnauthorized(response)) return;
      const payload = await response.json() as UpdateResponse;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error?.message || "تعذر تحديث حالة أمر العمل.");
      }
      setFeedback("تم تحديث حالة أمر العمل.");
      await load();
    } catch (cause) {
      setFeedback(cause instanceof Error ? cause.message : "تعذر تحديث حالة أمر العمل.");
    } finally {
      setUpdatingId(null);
    }
  }


  async function recordDelivery(item: WorkOrder) {
    if (item.status !== "completed") return;
    if (!window.confirm("تأكيد توثيق تسليم السيارة للعميل؟ سيظهر التحديث في رابط تتبع العميل.")) return;
    setUpdatingId(item.id);
    setFeedback("");
    try {
      const response = await fetch("/api/v1/service-tracking/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workOrderId: item.id, eventType: "vehicle_delivered" }),
      });
      if (redirectIfUnauthorized(response)) return;
      const payload = await response.json() as { ok: boolean; error?: { message?: string } | null };
      if (!response.ok || !payload.ok) throw new Error(payload.error?.message || "تعذر توثيق تسليم السيارة.");
      setFeedback("تم توثيق تسليم السيارة، وظهر التحديث في رابط العميل.");
      await load();
    } catch (cause) {
      setFeedback(cause instanceof Error ? cause.message : "تعذر توثيق تسليم السيارة.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/" aria-label="Workshop Growth OS الصفحة الرئيسية">
          <span className="brand-mark">WG</span><span><strong>Workshop Growth</strong><small>إدارة الورشة</small></span>
        </Link>
        <p className="sidebar-caption">مساحة العمل</p>
        <nav className="admin-nav" aria-label="التنقل الرئيسي">
          <Link href="/" className="nav-link"><span className="nav-icon">⌂</span>الرئيسية</Link>
          <Link href="/customers" className="nav-link"><span className="nav-icon">♙</span>العملاء</Link>
          <Link href="/vehicles" className="nav-link"><span className="nav-icon">▱</span>السيارات</Link>
          <Link href="/admin/bookings" className="nav-link"><span className="nav-icon">▦</span>الحجوزات</Link>
          <Link href="/work-orders" className="nav-link nav-link-active"><span className="nav-icon">☷</span>أوامر العمل</Link>
          <Link href="/admin/growth" className="nav-link"><span className="nav-icon">↗</span>مؤشرات النمو</Link>
        </nav>
        <div className="sidebar-bottom"><span className="online-dot" />مصدر البيانات<br /><small>/api/v1/work-orders</small></div>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <div className="breadcrumbs">إدارة الورشة <span>/</span> أوامر العمل</div>
          <div className="admin-user"><span className="user-avatar">ع</span><span><strong>أوامر العمل</strong><small>مرتبطة بالحجوزات والعملاء والمركبات</small></span></div>
        </header>
        <main className="booking-content">
          <section className="admin-page-intro">
            <p className="admin-eyebrow">متابعة التنفيذ</p>
            <h1>أوامر العمل</h1>
            <p>تابع تقدم التشخيص والإصلاح. تغيير الحالة يخضع لقواعد سير العمل والصلاحيات، وعند إكمال أمر العمل أو إلغائه تُزامَن حالة الحجز المرتبط تلقائيًا.</p>
          </section>
          <section className="booking-panel">
            <div className="panel-heading"><div><h2>قائمة أوامر العمل</h2><p>{items.length.toLocaleString("ar-SA")} أمر عمل محمّل</p></div><button className="secondary-button" type="button" onClick={() => void load()} disabled={loading}>تحديث</button></div>
            {feedback && <p className="work-order-feedback" role="status">{feedback}</p>}
            {error && <div className="empty-state"><strong>تعذر تحميل أوامر العمل</strong><p>{error}</p><button className="secondary-button" type="button" onClick={() => void load()}>إعادة المحاولة</button></div>}
            {!error && loading && <div className="empty-state"><strong>جارٍ تحميل أوامر العمل…</strong></div>}
            {!error && !loading && items.length === 0 && <div className="empty-state"><strong>لا توجد أوامر عمل مسجلة</strong><p>ابدأ من صفحة الحجوزات ثم اختر «تحويل إلى أمر عمل» لحجز قابل للتحويل.</p><Link className="primary-button" href="/admin/bookings">فتح الحجوزات</Link></div>}
            {!error && !loading && items.length > 0 && <div className="booking-table-wrap"><table className="booking-table"><thead><tr><th>رقم الأمر</th><th>العميل</th><th>المركبة</th><th>الخدمة</th><th>الحالة</th><th>تاريخ الإنشاء</th><th>التسليم</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><strong>{item.id.slice(0, 8)}</strong><small className="table-subline">حجز {item.booking_id.slice(0, 8)}</small></td><td><strong>{item.customers?.full_name ?? "عميل"}</strong><small className="table-subline" dir="ltr">{item.customers?.phone ?? "—"}</small></td><td>{item.vehicles ? `${item.vehicles.make} ${item.vehicles.model}` : "لم تحدد مركبة"}<small className="table-subline">{item.vehicles?.plate_number ?? "—"}</small></td><td>{item.requested_service}</td><td><div className="work-order-status-cell"><span className={"status-badge status-" + item.status}><span />{statusLabels[item.status]}</span><select className="work-order-status-select" aria-label={`تغيير حالة أمر العمل ${item.id.slice(0, 8)}`} value={item.status} disabled={updatingId === item.id || getAllowedWorkOrderStatusTransitions(item.status).length === 0} onChange={(event) => void updateStatus(item, event.target.value as WorkOrderStatus)}>{[item.status, ...getAllowedWorkOrderStatusTransitions(item.status)].map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></div></td><td>{dateFormat(item.created_at)}</td><td>{item.status === "completed" ? <button className="details-button" type="button" disabled={updatingId === item.id} onClick={() => void recordDelivery(item)}>{updatingId === item.id ? "جارٍ التوثيق…" : "توثيق التسليم"}</button> : <span className="muted">بعد اكتمال الإصلاح</span>}</td></tr>)}</tbody></table></div>}
            <div className="table-footer"><span>المصدر: API الورشة</span><Link className="wg-text-link" href="/admin/bookings">إدارة الحجوزات ←</Link></div>
          </section>
        </main>
      </section>
    </main>
  );
}
