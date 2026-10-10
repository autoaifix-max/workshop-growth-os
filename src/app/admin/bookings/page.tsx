"use client";

import { useMemo, useState } from "react";

type BookingStatus = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
type Booking = {
  id: string;
  customer: string;
  phone: string;
  vehicle: string;
  plate: string;
  service: string;
  date: string;
  time: string;
  status: BookingStatus;
};

const demoBookings: Booking[] = [
  { id: "BK-1042", customer: "محمد العتيبي", phone: "05•• ••• 2184", vehicle: "تويوتا كامري 2021", plate: "ر ب د 4821", service: "فحص كمبيوتر", date: "2026-10-10", time: "10:30", status: "pending" },
  { id: "BK-1041", customer: "خالد الشمري", phone: "05•• ••• 6302", vehicle: "هيونداي سوناتا 2020", plate: "ح س م 1930", service: "صيانة دورية", date: "2026-10-10", time: "11:30", status: "confirmed" },
  { id: "BK-1040", customer: "عبدالله المطيري", phone: "05•• ••• 0471", vehicle: "فورد تورس 2019", plate: "د و ر 7314", service: "فحص كهرباء", date: "2026-10-10", time: "13:00", status: "in_progress" },
  { id: "BK-1039", customer: "سعد العنزي", phone: "05•• ••• 9015", vehicle: "نيسان ألتيما 2022", plate: "ط ل م 5280", service: "تغيير زيت وفلاتر", date: "2026-10-11", time: "09:00", status: "confirmed" },
  { id: "BK-1038", customer: "فهد الدوسري", phone: "05•• ••• 1629", vehicle: "كيا K5 2023", plate: "و ك ي 6042", service: "فحص قبل الشراء", date: "2026-10-11", time: "12:30", status: "completed" },
  { id: "BK-1037", customer: "تركي القحطاني", phone: "05•• ••• 4488", vehicle: "شفروليه ماليبو 2018", plate: "م ل ب 2918", service: "تشخيص لمبة المحرك", date: "2026-10-12", time: "15:00", status: "cancelled" },
];

const statusLabels: Record<BookingStatus, string> = {
  pending: "بانتظار التأكيد",
  confirmed: "مؤكد",
  in_progress: "قيد الخدمة",
  completed: "مكتمل",
  cancelled: "ملغي",
};
const filters: { key: "all" | BookingStatus; label: string }[] = [
  { key: "all", label: "كل الحجوزات" },
  { key: "pending", label: "بانتظار التأكيد" },
  { key: "confirmed", label: "مؤكدة" },
  { key: "in_progress", label: "قيد الخدمة" },
  { key: "completed", label: "مكتملة" },
  { key: "cancelled", label: "ملغاة" },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-SA", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value + "T12:00:00Z"));
}

export default function AdminBookingsPage() {
  const [filter, setFilter] = useState<"all" | BookingStatus>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const filteredBookings = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("ar");
    return demoBookings.filter((booking) => {
      const matchesFilter = filter === "all" || booking.status === filter;
      const haystack = [booking.id, booking.customer, booking.phone, booking.vehicle, booking.plate, booking.service].join(" ").toLocaleLowerCase("ar");
      return matchesFilter && (!normalized || haystack.includes(normalized));
    });
  }, [filter, query]);

  const today = "2026-10-10";
  const todayBookings = demoBookings.filter((booking) => booking.date === today && booking.status !== "cancelled").length;
  const pendingCount = demoBookings.filter((booking) => booking.status === "pending").length;
  const activeCount = demoBookings.filter((booking) => booking.status === "in_progress").length;
  const completedCount = demoBookings.filter((booking) => booking.status === "completed").length;

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <a className="admin-brand" href="/" aria-label="Workshop Growth OS الصفحة الرئيسية"><span className="brand-mark">WG</span><span><strong>Workshop Growth</strong><small>إدارة الورشة</small></span></a>
        <p className="sidebar-caption">مساحة العمل</p>
        <nav className="admin-nav" aria-label="التنقل الرئيسي">
          <a href="/" className="nav-link"><span className="nav-icon">⌂</span>نظرة عامة</a>
          <a href="/admin/bookings" className="nav-link nav-link-active"><span className="nav-icon">▦</span>الحجوزات <span className="nav-count">{demoBookings.length}</span></a>
          <a href="/customers" className="nav-link" aria-disabled="true"><span className="nav-icon">♙</span>العملاء</a>
          <a href="/vehicles" className="nav-link" aria-disabled="true"><span className="nav-icon">▱</span>السيارات</a>
          <a href="/work-orders" className="nav-link" aria-disabled="true"><span className="nav-icon">☷</span>أوامر العمل</a>
        </nav>
        <div className="sidebar-bottom"><span className="online-dot" />وضع المعاينة<br /><small>البيانات غير محفوظة</small></div>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <div className="breadcrumbs">إدارة الورشة <span>/</span> الحجوزات</div>
          <div className="admin-user"><span className="user-avatar">م</span><span><strong>مشرف الورشة</strong><small>صلاحيات الإدارة</small></span></div>
        </header>

        <div className="booking-content">
          <div className="booking-title-row">
            <div><p className="admin-eyebrow">إدارة المواعيد</p><h1>الحجوزات</h1><p className="admin-subtitle">تابع طلبات العملاء، أكّد المواعيد، وجهّز استقبال السيارات.</p></div>
            <button className="primary-button" onClick={() => window.print()} type="button"><span>＋</span> طباعة القائمة</button>
          </div>

          <div className="preview-notice"><span className="notice-symbol">ⓘ</span><div><strong>واجهة أولية — بيانات تجريبية</strong><p>هذه السجلات للمعاينة فقط. لم يتم ربط الحجوزات بقاعدة البيانات أو API بعد، ولن تُحفظ أي تغييرات.</p></div></div>

          <section className="booking-stats" aria-label="ملخص الحجوزات">
            <article className="stat-card"><span className="stat-label">حجوزات اليوم</span><span className="stat-value">{todayBookings.toLocaleString("ar-SA")}</span><span className="stat-foot">باستثناء الملغاة</span><span className="stat-icon yellow">▦</span></article>
            <article className="stat-card"><span className="stat-label">بانتظار التأكيد</span><span className="stat-value">{pendingCount.toLocaleString("ar-SA")}</span><span className="stat-foot">تحتاج مراجعة المشرف</span><span className="stat-icon orange">◷</span></article>
            <article className="stat-card"><span className="stat-label">داخل الورشة</span><span className="stat-value">{activeCount.toLocaleString("ar-SA")}</span><span className="stat-foot">قيد الخدمة حاليًا</span><span className="stat-icon blue">⚙</span></article>
            <article className="stat-card"><span className="stat-label">مكتملة</span><span className="stat-value">{completedCount.toLocaleString("ar-SA")}</span><span className="stat-foot">ضمن سجلات المعاينة</span><span className="stat-icon green">✓</span></article>
          </section>

          <section className="booking-panel">
            <div className="panel-heading"><div><h2>قائمة الحجوزات</h2><p>ابحث بالعميل أو رقم الحجز أو السيارة.</p></div><span className="results-count">{filteredBookings.length.toLocaleString("ar-SA")} نتائج</span></div>
            <div className="booking-toolbar">
              <label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث عن عميل، لوحة أو خدمة..." aria-label="البحث في الحجوزات" /><kbd>بحث</kbd></label>
              <button className="secondary-button" type="button" onClick={() => { setQuery(""); setFilter("all"); setSelected(null); }}>إعادة ضبط</button>
            </div>
            <div className="booking-filters" role="group" aria-label="تصفية حسب الحالة">
              {filters.map((item) => <button key={item.key} type="button" className={filter === item.key ? "filter-chip filter-chip-active" : "filter-chip"} onClick={() => setFilter(item.key)}>{item.label}{item.key === "all" ? <span>{demoBookings.length}</span> : <span>{demoBookings.filter((booking) => booking.status === item.key).length}</span>}</button>)}
            </div>
            <div className="booking-table-wrap">
              <table className="booking-table">
                <thead><tr><th>رقم الحجز</th><th>العميل</th><th>السيارة</th><th>الخدمة</th><th>الموعد</th><th>الحالة</th><th>التفاصيل</th></tr></thead>
                <tbody>
                  {filteredBookings.map((booking) => <tr key={booking.id}>
                    <td><strong className="booking-id">{booking.id}</strong></td>
                    <td><div className="customer-cell"><span className="customer-avatar">{booking.customer.slice(0, 1)}</span><span><strong>{booking.customer}</strong><small>{booking.phone}</small></span></div></td>
                    <td><strong>{booking.vehicle}</strong><small className="table-subline">{booking.plate}</small></td>
                    <td>{booking.service}</td>
                    <td><strong>{formatDate(booking.date)}</strong><small className="table-subline">{booking.time}</small></td>
                    <td><span className={"status-badge status-" + booking.status}><span />{statusLabels[booking.status]}</span></td>
                    <td><button className="details-button" type="button" onClick={() => setSelected(selected === booking.id ? null : booking.id)} aria-expanded={selected === booking.id}>{selected === booking.id ? "إخفاء" : "عرض"}</button></td>
                  </tr>)}
                </tbody>
              </table>
              {filteredBookings.length === 0 && <div className="empty-state"><span>⌕</span><strong>لا توجد نتائج مطابقة</strong><p>غيّر كلمات البحث أو اختر حالة أخرى.</p></div>}
            </div>
            {selected && filteredBookings.some((booking) => booking.id === selected) && (() => {
              const booking = filteredBookings.find((item) => item.id === selected)!;
              return <div className="booking-detail"><div><p className="admin-eyebrow">تفاصيل الحجز</p><h3>{booking.id} · {booking.customer}</h3><p>{booking.vehicle} — {booking.plate}</p><p>الخدمة المطلوبة: {booking.service}</p><p>الموعد: {formatDate(booking.date)}، الساعة {booking.time}</p><p>الحالة الحالية: {statusLabels[booking.status]}</p></div><span className="preview-tag">معاينة فقط</span></div>;
            })()}
            <div className="table-footer"><span>البيانات المعروضة محلية داخل الواجهة</span><span>لا يوجد اتصال بقاعدة البيانات</span></div>
          </section>
          <footer className="admin-footer"><span>Workshop Growth OS</span><span>نسخة أولية لإدارة الحجوزات · RTL</span></footer>
        </div>
      </section>
    </main>
  );
}
