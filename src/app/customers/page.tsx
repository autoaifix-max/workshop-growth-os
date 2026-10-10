"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Customer = {
  id: string;
  full_name: string;
  phone: string;
  notes: string;
  created_at: string;
};
type ListResponse = {
  ok: boolean;
  data?: { items?: Customer[] };
  error?: { message?: string } | null;
};
type CreateResponse = {
  ok: boolean;
  data?: Customer;
  error?: { message?: string } | null;
};

const dateFormat = (value: string) =>
  new Intl.DateTimeFormat("ar-SA", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));

export default function CustomersPage() {
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/v1/customers?limit=100", { cache: "no-store" });
      const payload = await response.json() as ListResponse;
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error?.message || (response.status === 401
          ? "يلزم تسجيل الدخول لعرض العملاء."
          : "تعذر تحميل العملاء."));
      }
      setItems(payload.data.items ?? []);
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : "تعذر الاتصال بخدمة العملاء.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function createCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/v1/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, phone, notes }),
      });
      const payload = await response.json() as CreateResponse;
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error?.message || "تعذر حفظ العميل.");
      }
      setFullName("");
      setPhone("");
      setNotes("");
      setMessage("تم تسجيل العميل.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر حفظ العميل.");
    } finally {
      setSaving(false);
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
          <Link href="/customers" className="nav-link nav-link-active"><span className="nav-icon">♙</span>العملاء</Link>
          <Link href="/vehicles" className="nav-link"><span className="nav-icon">▱</span>السيارات</Link>
          <Link href="/admin/bookings" className="nav-link"><span className="nav-icon">▦</span>الحجوزات</Link>
          <Link href="/admin/growth" className="nav-link"><span className="nav-icon">↗</span>مؤشرات النمو</Link>
        </nav>
        <div className="sidebar-bottom"><span className="online-dot" />مصدر البيانات<br /><small>/api/v1/customers</small></div>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <div className="breadcrumbs">إدارة الورشة <span>/</span> العملاء</div>
          <div className="admin-user"><span className="user-avatar">ع</span><span><strong>ملفات العملاء</strong><small>ضمن الورشة الحالية</small></span></div>
        </header>

        <section className="admin-page-intro">
          <p className="admin-eyebrow">بيانات العملاء</p>
          <h1>العملاء</h1>
          <p>سجّل بيانات العميل مرة واحدة، ثم اربط مركباته وحجوزاته بملفه.</p>
        </section>

        <section className="wg-page-grid">
          <article className="booking-panel">
            <div className="panel-heading"><div><h2>إضافة عميل</h2><p>رقم الهاتف لا يتكرر داخل الورشة نفسها.</p></div></div>
            <form className="wg-form" onSubmit={createCustomer}>
              <label className="wg-field"><span>اسم العميل *</span><input className="wg-input" required minLength={2} maxLength={120} value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" /></label>
              <label className="wg-field"><span>رقم الهاتف *</span><input className="wg-input" required minLength={8} maxLength={20} pattern="[+0-9()\\-\\s]+" title="استخدم الأرقام وعلامة + والأقواس والشرطات فقط" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" /></label>
              <label className="wg-field wg-field-wide"><span>ملاحظات (اختياري)</span><textarea className="wg-input" maxLength={2000} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
              <div className="wg-submit-row"><button className="primary-button" type="submit" disabled={saving}>{saving ? "جارٍ الحفظ…" : "حفظ العميل"}</button></div>
              {error && <p className="wg-feedback wg-feedback-error" role="alert">{error}</p>}
              {message && <p className="wg-feedback wg-feedback-success" role="status">{message}</p>}
            </form>
          </article>

          <article className="booking-panel">
            <div className="panel-heading"><div><h2>قائمة العملاء</h2><p>{items.length.toLocaleString("ar-SA")} عميل محمّل</p></div><button type="button" className="secondary-button" onClick={() => void load()} disabled={loading}>تحديث</button></div>
            {loadError && <div className="empty-state"><strong>تعذر تحميل العملاء</strong><p>{loadError}</p><button className="secondary-button" type="button" onClick={() => void load()}>إعادة المحاولة</button></div>}
            {!loadError && loading && <div className="empty-state"><strong>جارٍ تحميل العملاء…</strong></div>}
            {!loadError && !loading && items.length === 0 && <div className="empty-state"><strong>لا يوجد عملاء مسجلون</strong><p>أضف أول عميل لتبدأ ربط المركبات والحجوزات به.</p></div>}
            {!loadError && items.length > 0 && <div className="booking-table-wrap"><table className="booking-table"><thead><tr><th>الاسم</th><th>الهاتف</th><th>تاريخ التسجيل</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><strong>{item.full_name}</strong>{item.notes && <small className="table-subline">{item.notes}</small>}</td><td dir="ltr">{item.phone}</td><td>{dateFormat(item.created_at)}</td></tr>)}</tbody></table></div>}
            <div className="table-footer"><span>المصدر: API الورشة</span><Link href="/vehicles" className="wg-text-link">إضافة مركبة ←</Link></div>
          </article>
        </section>
      </section>
    </main>
  );
}
