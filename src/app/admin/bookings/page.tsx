"use client";

import Link from "next/link";
import { redirectIfUnauthorized } from "@/lib/auth/redirect-to-login";
import { getAllowedBookingStatusTransitions } from "@/lib/booking-status";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type BookingStatus = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
type Booking = {
  id: string;
  customer_id: string;
  vehicle_id: string | null;
  requested_service: string;
  scheduled_at: string;
  status: BookingStatus;
  notes: string;
  created_at: string;
  updated_at: string;
  customers?: { full_name: string; phone: string } | null;
  vehicles?: { plate_number: string; make: string; model: string; model_year: number | null } | null;
};
type ApiResponse = { ok: boolean; data?: { items?: Booking[] } | Booking; error?: { message?: string } | null };

const statusLabels: Record<BookingStatus, string> = {
  pending: "بانتظار التأكيد", confirmed: "مؤكد", in_progress: "قيد الخدمة",
  completed: "مكتمل", cancelled: "ملغي",
};
const filters: { key: "all" | BookingStatus; label: string }[] = [
  { key: "all", label: "كل الحجوزات" }, { key: "pending", label: "بانتظار التأكيد" },
  { key: "confirmed", label: "مؤكدة" }, { key: "in_progress", label: "قيد الخدمة" },
  { key: "completed", label: "مكتملة" }, { key: "cancelled", label: "ملغاة" },
];
function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-SA", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}
function formatTime(value: string) {
  return new Intl.DateTimeFormat("ar-SA", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
function customerName(booking: Booking) { return booking.customers?.full_name ?? "عميل"; }
function vehicleName(booking: Booking) {
  if (!booking.vehicles) return "لم تحدد سيارة";
  return [booking.vehicles.make, booking.vehicles.model, booking.vehicles.model_year].filter(Boolean).join(" ");
}
function plateNumber(booking: Booking) { return booking.vehicles?.plate_number ?? "—"; }

type CustomerOption = { id: string; full_name: string; phone: string };
type VehicleOption = { id: string; customer_id: string; plate_number: string; make: string; model: string; model_year: number | null };
type OptionsResponse<T> = { ok: boolean; data?: { items?: T[] }; error?: { message?: string } | null };
type CreateResponse = { ok: boolean; data?: unknown; error?: { message?: string } | null };

function CreateBookingPanel({ onCreated }: { onCreated: () => Promise<void> }) {
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [requestedService, setRequestedService] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function loadOptions() {
      setLoadingOptions(true);
      setOptionsError("");
      try {
        const [customersResponse, vehiclesResponse] = await Promise.all([
          fetch("/api/v1/customers?limit=100", { cache: "no-store" }),
          fetch("/api/v1/vehicles", { cache: "no-store" }),
        ]);
        if (redirectIfUnauthorized(customersResponse, vehiclesResponse)) return;
        const customersPayload = await customersResponse.json() as OptionsResponse<CustomerOption>;
        const vehiclesPayload = await vehiclesResponse.json() as OptionsResponse<VehicleOption>;
        if (!customersResponse.ok || !customersPayload.ok || !customersPayload.data ||
            !vehiclesResponse.ok || !vehiclesPayload.ok || !vehiclesPayload.data) {
          throw new Error(customersPayload.error?.message || vehiclesPayload.error?.message ||
            (customersResponse.status === 401 || vehiclesResponse.status === 401
              ? "يلزم تسجيل الدخول لإنشاء حجز."
              : "تعذر تحميل العملاء والمركبات."));
        }
        if (!active) return;
        const loadedCustomers = customersPayload.data.items ?? [];
        setCustomers(loadedCustomers);
        setVehicles(vehiclesPayload.data.items ?? []);
        setCustomerId((current) => current || loadedCustomers[0]?.id || "");
      } catch (cause) {
        if (active) setOptionsError(cause instanceof Error ? cause.message : "تعذر تحميل خيارات الحجز.");
      } finally {
        if (active) setLoadingOptions(false);
      }
    }
    void loadOptions();
    return () => { active = false; };
  }, []);

  const availableVehicles = vehicles.filter((vehicle) => vehicle.customer_id === customerId);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const scheduled = new Date(scheduledAt);
      if (!Number.isFinite(scheduled.getTime())) throw new Error("أدخل موعدًا صالحًا.");
      const response = await fetch("/api/v1/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          ...(vehicleId ? { vehicleId } : {}),
          requestedService,
          scheduledAt: scheduled.toISOString(),
          notes,
          ...(referralCode.trim() ? { referralCode: referralCode.trim().toUpperCase() } : {}),
        }),
      });
      if (redirectIfUnauthorized(response)) return;
      const payload = await response.json() as CreateResponse;
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error?.message || "تعذر إنشاء الحجز.");
      }
      setRequestedService("");
      setScheduledAt("");
      setNotes("");
      setReferralCode("");
      setVehicleId("");
      setMessage("تم إنشاء الحجز بنجاح.");
      await onCreated();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر إنشاء الحجز.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="booking-panel booking-create-panel">
      <div className="panel-heading">
        <div><h2>إنشاء حجز جديد</h2><p>اختر عميلًا ومركبة مسجلين داخل الورشة الحالية.</p></div>
      </div>
      {optionsError && <p className="booking-create-feedback booking-create-error" role="alert">{optionsError}</p>}
      {!loadingOptions && !optionsError && customers.length === 0 && (
        <p className="booking-create-feedback">لا يوجد عملاء بعد. <Link href="/customers">سجّل أول عميل ←</Link></p>
      )}
      <form className="booking-create-form" onSubmit={submit}>
        <label className="booking-create-field booking-create-span-2">
          <span>العميل *</span>
          <select required value={customerId} disabled={loadingOptions || saving || customers.length === 0}
            onChange={(event) => { setCustomerId(event.target.value); setVehicleId(""); }}>
            <option value="" disabled>اختر العميل</option>
            {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.full_name} — {customer.phone}</option>)}
          </select>
        </label>
        <label className="booking-create-field booking-create-span-2">
          <span>المركبة (اختياري)</span>
          <select value={vehicleId} disabled={loadingOptions || saving || !customerId}
            onChange={(event) => setVehicleId(event.target.value)}>
            <option value="">بدون تحديد مركبة</option>
            {availableVehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>
              {vehicle.make} {vehicle.model}{vehicle.model_year ? ` ${vehicle.model_year}` : ""} · {vehicle.plate_number}
            </option>)}
          </select>
        </label>
        <label className="booking-create-field booking-create-span-2">
          <span>الخدمة المطلوبة *</span>
          <input required minLength={2} maxLength={160} value={requestedService}
            onChange={(event) => setRequestedService(event.target.value)} placeholder="مثال: فحص كمبيوتر وتشخيص عطل" />
        </label>
        <label className="booking-create-field booking-create-span-2">
          <span>موعد الحجز *</span>
          <input required type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} />
        </label>
        <label className="booking-create-field booking-create-span-2">
          <span>رمز إحالة المشهور (اختياري)</span>
          <input maxLength={32} pattern="[A-Za-z0-9_-]+" value={referralCode} onChange={(event) => setReferralCode(event.target.value.toUpperCase())} placeholder="مثال: AHMAD10" />
        </label>
        <label className="booking-create-field booking-create-full">
          <span>ملاحظات (اختياري)</span>
          <textarea rows={2} maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="وصف أولي للعَرَض أو طلب العميل" />
        </label>
        <div className="booking-create-actions">
          <button className="primary-button" type="submit" disabled={saving || loadingOptions || !customers.length}>
            {saving ? "جارٍ إنشاء الحجز…" : "حفظ الحجز"}
          </button>
          {message && <span className="booking-create-success" role="status">{message}</span>}
          {error && <span className="booking-create-error" role="alert">{error}</span>}
        </div>
      </form>
    </section>
  );
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<"all" | BookingStatus>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState("");

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/v1/bookings?limit=100", { cache: "no-store" });
      if (redirectIfUnauthorized(response)) return;
      const payload = await response.json() as ApiResponse;
      if (!response.ok || !payload.ok || !payload.data || !("items" in payload.data)) {
        throw new Error(payload.error?.message || (response.status === 401 ? "يلزم تسجيل الدخول لعرض الحجوزات." : "تعذر تحميل الحجوزات."));
      }
      setBookings(payload.data.items ?? []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "تعذر الاتصال بخدمة الحجوزات.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadBookings(); }, [loadBookings]);

  const filteredBookings = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ar");
    return bookings.filter((booking) => {
      const matchesFilter = filter === "all" || booking.status === filter;
      const haystack = [
        booking.id, customerName(booking), booking.customers?.phone ?? "",
        vehicleName(booking), plateNumber(booking), booking.requested_service,
      ].join(" ").toLocaleLowerCase("ar");
      return matchesFilter && (!normalized || haystack.includes(normalized));
    });
  }, [bookings, filter, query]);

  const todayKey = new Date().toLocaleDateString("en-CA");
  const todayBookings = bookings.filter((b) => new Date(b.scheduled_at).toLocaleDateString("en-CA") === todayKey && b.status !== "cancelled").length;
  const pendingCount = bookings.filter((b) => b.status === "pending").length;
  const activeCount = bookings.filter((b) => b.status === "in_progress").length;
  const completedCount = bookings.filter((b) => b.status === "completed").length;

  async function updateStatus(booking: Booking, status: BookingStatus) {
    setSaving(true);
    setActionMessage("");
    try {
      const response = await fetch("/api/v1/bookings", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: booking.id, status }),
      });
      if (redirectIfUnauthorized(response)) return;
      const payload = await response.json() as ApiResponse;
      if (!response.ok || !payload.ok) throw new Error(payload.error?.message || "تعذر تحديث حالة الحجز.");
      setActionMessage("تم تحديث حالة الحجز.");
      await loadBookings();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "تعذر تحديث حالة الحجز.");
    } finally { setSaving(false); }
  }

  async function convertToWorkOrder(booking: Booking) {
    setSaving(true);
    setActionMessage("");
    try {
      const response = await fetch("/api/v1/work-orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id }),
      });
      if (redirectIfUnauthorized(response)) return;
      const payload = await response.json() as ApiResponse;
      if (!response.ok || !payload.ok) throw new Error(payload.error?.message || "تعذر تحويل الحجز إلى أمر عمل.");
      setActionMessage("تم إنشاء/استرجاع أمر العمل المرتبط بالحجز.");
      await loadBookings();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "تعذر تحويل الحجز إلى أمر عمل.");
    } finally { setSaving(false); }
  }

  function openWhatsAppDraft(booking: Booking) {
    const rawPhone = booking.customers?.phone?.replace(/\\D/g, "") ?? "";
    if (!rawPhone) {
      setActionMessage("لا يوجد رقم هاتف مسجل لهذا العميل.");
      return;
    }
    const phone = rawPhone.startsWith("00") ? rawPhone.slice(2)
      : rawPhone.startsWith("0") ? "966" + rawPhone.slice(1)
      : rawPhone;
    const message = `مرحباً ${customerName(booking)}، نؤكد استلام طلبكم في الورشة. الخدمة: ${booking.requested_service}. الموعد: ${formatDate(booking.scheduled_at)} الساعة ${formatTime(booking.scheduled_at)}. يرجى الرد لتأكيد الموعد. شكراً لكم.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    setActionMessage("تم تجهيز رسالة واتساب؛ راجعها وأرسلها يدويًا من واتساب.");
  }

  const selectedBooking = bookings.find((booking) => booking.id === selected);

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/" aria-label="Workshop Growth OS الصفحة الرئيسية"><span className="brand-mark">WG</span><span><strong>Workshop Growth</strong><small>إدارة الورشة</small></span></Link>
        <p className="sidebar-caption">مساحة العمل</p>
        <nav className="admin-nav" aria-label="التنقل الرئيسي">
          <Link href="/" className="nav-link"><span className="nav-icon">⌂</span>نظرة عامة</Link>
          <a href="/admin/bookings" className="nav-link nav-link-active"><span className="nav-icon">▦</span>الحجوزات <span className="nav-count">{bookings.length}</span></a>
          <Link href="/customers" className="nav-link"><span className="nav-icon">♙</span>العملاء</Link>
          <Link href="/vehicles" className="nav-link"><span className="nav-icon">▱</span>السيارات</Link>
          <Link href="/work-orders" className="nav-link"><span className="nav-icon">☷</span>أوامر العمل</Link>
          <Link href="/admin/growth" className="nav-link"><span className="nav-icon">↗</span>مؤشرات النمو</Link>
        </nav>
        <div className="sidebar-bottom"><span className="online-dot" />اتصال مباشر<br /><small>الحجوزات من API</small></div>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar"><div className="breadcrumbs">إدارة الورشة <span>/</span> الحجوزات</div><div className="admin-user"><span className="user-avatar">م</span><span><strong>مشرف الورشة</strong><small>صلاحيات الإدارة</small></span></div></header>
        <div className="booking-content">
          <div className="booking-title-row"><div><p className="admin-eyebrow">إدارة المواعيد</p><h1>الحجوزات</h1><p className="admin-subtitle">تابع طلبات العملاء، أكّد المواعيد، وجهّز استقبال السيارات.</p></div><div className="booking-toolbar"><button className="secondary-button" onClick={() => void loadBookings()} type="button" disabled={loading}>تحديث القائمة</button><button className="primary-button" onClick={() => window.print()} type="button">طباعة القائمة</button></div></div>

          {loadError && <div className="preview-notice" role="alert"><span className="notice-symbol">ⓘ</span><div><strong>تعذر تحميل الحجوزات</strong><p>{loadError} تأكد من تسجيل الدخول وتطبيق ترحيل قاعدة البيانات.</p><button className="secondary-button" onClick={() => void loadBookings()} type="button">إعادة المحاولة</button></div></div>}
          {!loadError && <div className="preview-notice"><span className="notice-symbol">ⓘ</span><div><strong>بيانات فعلية عبر API</strong><p>أنشئ الحجز من النموذج أدناه. تجهيز رسالة واتساب يفتح مسودة فقط، ولا يرسل رسالة تلقائيًا.</p></div></div>}

          <section className="booking-stats" aria-label="ملخص الحجوزات">
            <article className="stat-card"><span className="stat-label">حجوزات اليوم</span><span className="stat-value">{todayBookings.toLocaleString("ar-SA")}</span><span className="stat-foot">باستثناء الملغاة</span><span className="stat-icon yellow">▦</span></article>
            <article className="stat-card"><span className="stat-label">بانتظار التأكيد</span><span className="stat-value">{pendingCount.toLocaleString("ar-SA")}</span><span className="stat-foot">تحتاج مراجعة المشرف</span><span className="stat-icon orange">◷</span></article>
            <article className="stat-card"><span className="stat-label">داخل الورشة</span><span className="stat-value">{activeCount.toLocaleString("ar-SA")}</span><span className="stat-foot">قيد الخدمة حاليًا</span><span className="stat-icon blue">⚙</span></article>
            <article className="stat-card"><span className="stat-label">مكتملة</span><span className="stat-value">{completedCount.toLocaleString("ar-SA")}</span><span className="stat-foot">من قاعدة البيانات</span><span className="stat-icon green">✓</span></article>
          </section>

          <CreateBookingPanel onCreated={loadBookings} />

          <section className="booking-panel">
            <div className="panel-heading"><div><h2>قائمة الحجوزات</h2><p>ابحث بالعميل أو رقم الحجز أو السيارة.</p></div><span className="results-count">{filteredBookings.length.toLocaleString("ar-SA")} نتائج</span></div>
            <div className="booking-toolbar"><label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث عن عميل، لوحة أو خدمة..." aria-label="البحث في الحجوزات" /><kbd>بحث</kbd></label><button className="secondary-button" type="button" onClick={() => { setQuery(""); setFilter("all"); setSelected(null); }}>إعادة ضبط</button></div>
            <div className="booking-filters" role="group" aria-label="تصفية حسب الحالة">{filters.map((item) => <button key={item.key} type="button" className={filter === item.key ? "filter-chip filter-chip-active" : "filter-chip"} onClick={() => setFilter(item.key)}>{item.label}<span>{(item.key === "all" ? bookings : bookings.filter((b) => b.status === item.key)).length}</span></button>)}</div>
            <div className="booking-table-wrap"><table className="booking-table"><thead><tr><th>رقم الحجز</th><th>العميل</th><th>السيارة</th><th>الخدمة</th><th>الموعد</th><th>الحالة</th><th>التفاصيل</th></tr></thead>
              <tbody>{filteredBookings.map((booking) => <tr key={booking.id}>
                <td><strong className="booking-id">{booking.id.slice(0, 8)}</strong></td>
                <td><div className="customer-cell"><span className="customer-avatar">{customerName(booking).slice(0, 1)}</span><span><strong>{customerName(booking)}</strong><small>{booking.customers?.phone ?? "—"}</small></span></div></td>
                <td><strong>{vehicleName(booking)}</strong><small className="table-subline">{plateNumber(booking)}</small></td>
                <td>{booking.requested_service}</td><td><strong>{formatDate(booking.scheduled_at)}</strong><small className="table-subline">{formatTime(booking.scheduled_at)}</small></td>
                <td><span className={"status-badge status-" + booking.status}><span />{statusLabels[booking.status]}</span></td>
                <td><button className="details-button" type="button" onClick={() => setSelected(selected === booking.id ? null : booking.id)} aria-expanded={selected === booking.id}>{selected === booking.id ? "إخفاء" : "عرض"}</button></td>
              </tr>)}</tbody></table>
              {!loading && filteredBookings.length === 0 && <div className="empty-state"><span>⌕</span><strong>{loadError ? "لا يمكن عرض النتائج" : "لا توجد حجوزات مطابقة"}</strong><p>{loadError ? "تحقق من الاتصال والإعدادات ثم أعد المحاولة." : "ستظهر الحجوزات المسجلة هنا عند توفرها."}</p></div>}
              {loading && <div className="empty-state"><strong>جارٍ تحميل الحجوزات…</strong></div>}
            </div>
            {selectedBooking && <div className="booking-detail"><div><p className="admin-eyebrow">تفاصيل الحجز</p><h3>{selectedBooking.id.slice(0, 8)} · {customerName(selectedBooking)}</h3><p>{vehicleName(selectedBooking)} — {plateNumber(selectedBooking)}</p><p>الخدمة المطلوبة: {selectedBooking.requested_service}</p><p>الموعد: {formatDate(selectedBooking.scheduled_at)}، الساعة {formatTime(selectedBooking.scheduled_at)}</p><p>الحالة الحالية: {statusLabels[selectedBooking.status]}</p>{selectedBooking.notes && <p>ملاحظات: {selectedBooking.notes}</p>}</div><div className="booking-toolbar"><label><span>تغيير الحالة</span><select value={selectedBooking.status} disabled={saving || getAllowedBookingStatusTransitions(selectedBooking.status).length === 0} onChange={(event) => void updateStatus(selectedBooking, event.target.value as BookingStatus)}>{[selectedBooking.status, ...getAllowedBookingStatusTransitions(selectedBooking.status)].map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></label><button className="secondary-button" type="button" onClick={() => openWhatsAppDraft(selectedBooking)}>تجهيز رسالة واتساب</button>{selectedBooking.status !== "completed" && selectedBooking.status !== "cancelled" && <button className="primary-button" type="button" disabled={saving} onClick={() => void convertToWorkOrder(selectedBooking)}>{saving ? "جارٍ التنفيذ…" : "تحويل إلى أمر عمل"}</button>}</div></div>}
            {actionMessage && <p role="status" className="table-footer">{actionMessage}</p>}
            <div className="table-footer"><span>{loading ? "جارٍ الاتصال بالخدمة…" : "مصدر البيانات: /api/v1/bookings"}</span><span>{bookings.length.toLocaleString("ar-SA")} حجز مسجل</span></div>
          </section>
          <footer className="admin-footer"><span>Workshop Growth OS</span><span>إدارة الحجوزات · RTL</span></footer>
        </div>
      </section>
    </main>
  );
}
