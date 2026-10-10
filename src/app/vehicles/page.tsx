"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Customer = { id: string; full_name: string; phone: string; notes: string; created_at: string };
type Vehicle = {
  id: string; customer_id: string; plate_number: string; make: string; model: string;
  model_year: number | null; vin: string | null; created_at: string;
};
type ListResponse<T> = { ok: boolean; data?: { items?: T[] }; error?: { message?: string } | null };
type CreateResponse = { ok: boolean; data?: Vehicle; error?: { message?: string } | null };
const dateFormat = (value: string) =>
  new Intl.DateTimeFormat("ar-SA", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));

export default function VehiclesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [modelYear, setModelYear] = useState("");
  const [vin, setVin] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [customerResponse, vehicleResponse] = await Promise.all([
        fetch("/api/v1/customers?limit=100", { cache: "no-store" }),
        fetch("/api/v1/vehicles", { cache: "no-store" }),
      ]);
      const customerPayload = await customerResponse.json() as ListResponse<Customer>;
      const vehiclePayload = await vehicleResponse.json() as ListResponse<Vehicle>;
      if (!customerResponse.ok || !customerPayload.ok || !customerPayload.data ||
          !vehicleResponse.ok || !vehiclePayload.ok || !vehiclePayload.data) {
        throw new Error(customerPayload.error?.message || vehiclePayload.error?.message ||
          (customerResponse.status === 401 || vehicleResponse.status === 401
            ? "يلزم تسجيل الدخول لعرض المركبات."
            : "تعذر تحميل المركبات والعملاء."));
      }
      const loadedCustomers = customerPayload.data.items ?? [];
      setCustomers(loadedCustomers);
      setItems(vehiclePayload.data.items ?? []);
      setCustomerId((current) => current || loadedCustomers[0]?.id || "");
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : "تعذر الاتصال بخدمات المركبات.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function createVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customerId) {
      setError("أضف عميلًا أولًا، ثم اربط المركبة به.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/v1/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId, plateNumber, make, model,
          ...(modelYear ? { modelYear: Number(modelYear) } : {}),
          ...(vin.trim() ? { vin: vin.trim() } : {}),
        }),
      });
      const payload = await response.json() as CreateResponse;
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error?.message || "تعذر تسجيل المركبة.");
      }
      setPlateNumber("");
      setMake("");
      setModel("");
      setModelYear("");
      setVin("");
      setMessage("تم تسجيل المركبة وربطها بملف العميل.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تسجيل المركبة.");
    } finally {
      setSaving(false);
    }
  }

  const customerNames = new Map(customers.map((customer) => [customer.id, customer.full_name]));

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
          <Link href="/vehicles" className="nav-link nav-link-active"><span className="nav-icon">▱</span>السيارات</Link>
          <Link href="/admin/bookings" className="nav-link"><span className="nav-icon">▦</span>الحجوزات</Link>
          <Link href="/admin/growth" className="nav-link"><span className="nav-icon">↗</span>مؤشرات النمو</Link>
        </nav>
        <div className="sidebar-bottom"><span className="online-dot" />مصدر البيانات<br /><small>/api/v1/vehicles</small></div>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <div className="breadcrumbs">إدارة الورشة <span>/</span> السيارات</div>
          <div className="admin-user"><span className="user-avatar">س</span><span><strong>سجل المركبات</strong><small>ضمن الورشة الحالية</small></span></div>
        </header>

        <main className="booking-content">
        <section className="admin-page-intro">
          <p className="admin-eyebrow">بيانات المركبات</p>
          <h1>السيارات</h1>
          <p>كل مركبة مرتبطة بعميل وورشة محددين؛ لا يمكن ربط سيارة بعميل من ورشة أخرى.</p>
        </section>

        <section className="wg-page-grid">
          <article className="booking-panel">
            <div className="panel-heading"><div><h2>تسجيل مركبة</h2><p>العميل مطلوب، ورقم اللوحة فريد داخل الورشة.</p></div></div>
            {customers.length === 0 && !loading && <p className="wg-feedback">يجب تسجيل عميل أولًا قبل إضافة مركبة. <Link href="/customers" className="wg-text-link">إضافة عميل ←</Link></p>}
            <form className="wg-form" onSubmit={createVehicle}>
              <label className="wg-field wg-field-wide"><span>العميل *</span><select className="wg-input" required value={customerId} onChange={(e) => setCustomerId(e.target.value)} disabled={!customers.length || saving}><option value="" disabled>اختر العميل</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.full_name} — {customer.phone}</option>)}</select></label>
              <label className="wg-field"><span>رقم اللوحة *</span><input className="wg-input" required minLength={2} maxLength={20} value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} /></label>
              <label className="wg-field"><span>الشركة المصنعة *</span><input className="wg-input" required minLength={1} maxLength={60} value={make} onChange={(e) => setMake(e.target.value)} placeholder="تويوتا" /></label>
              <label className="wg-field"><span>الموديل *</span><input className="wg-input" required minLength={1} maxLength={60} value={model} onChange={(e) => setModel(e.target.value)} placeholder="كامري" /></label>
              <label className="wg-field"><span>سنة الصنع</span><input className="wg-input" type="number" min="1950" max={new Date().getUTCFullYear() + 1} value={modelYear} onChange={(e) => setModelYear(e.target.value)} inputMode="numeric" /></label>
              <label className="wg-field wg-field-wide"><span>رقم الهيكل VIN (اختياري)</span><input className="wg-input" minLength={5} maxLength={40} value={vin} onChange={(e) => setVin(e.target.value)} dir="ltr" /></label>
              <div className="wg-submit-row"><button className="primary-button" type="submit" disabled={saving || !customers.length}>{saving ? "جارٍ الحفظ…" : "حفظ المركبة"}</button></div>
              {error && <p className="wg-feedback wg-feedback-error" role="alert">{error}</p>}
              {message && <p className="wg-feedback wg-feedback-success" role="status">{message}</p>}
            </form>
          </article>

          <article className="booking-panel">
            <div className="panel-heading"><div><h2>المركبات المسجلة</h2><p>{items.length.toLocaleString("ar-SA")} مركبة محمّلة</p></div><button type="button" className="secondary-button" onClick={() => void load()} disabled={loading}>تحديث</button></div>
            {loadError && <div className="empty-state"><strong>تعذر تحميل المركبات</strong><p>{loadError}</p><button className="secondary-button" type="button" onClick={() => void load()}>إعادة المحاولة</button></div>}
            {!loadError && loading && <div className="empty-state"><strong>جارٍ تحميل المركبات…</strong></div>}
            {!loadError && !loading && items.length === 0 && <div className="empty-state"><strong>لا توجد مركبات مسجلة</strong><p>سجّل عميلًا ثم أضف المركبة الأولى.</p></div>}
            {!loadError && items.length > 0 && <div className="booking-table-wrap"><table className="booking-table"><thead><tr><th>المركبة</th><th>اللوحة</th><th>العميل</th><th>التسجيل</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><strong>{item.make} {item.model}</strong><small className="table-subline">{item.model_year ?? "سنة الصنع غير محددة"}{item.vin ? " · VIN مسجل" : ""}</small></td><td>{item.plate_number}</td><td>{customerNames.get(item.customer_id) ?? "عميل غير معروف"}</td><td>{dateFormat(item.created_at)}</td></tr>)}</tbody></table></div>}
            <div className="table-footer"><span>المصدر: API الورشة</span><Link href="/admin/bookings" className="wg-text-link">الانتقال للحجوزات ←</Link></div>
          </article>
          </section>
        </main>
      </section>
    </main>
  );
}
