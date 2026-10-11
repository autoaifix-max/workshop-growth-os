"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Offer = { slug: string; title: string; description: string; basePrice: number; discountType: "fixed" | "percent"; discountValue: number; discountAmount: number; finalPrice: number; terms: string; expiresAt: string | null; workshopName: string };
type ApiPayload<T> = { ok: boolean; data?: T; error?: { message?: string } | null };
const money = (value: number) => new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 2 }).format(value);
const localDateTime = () => { const date = new Date(Date.now() + 60 * 60 * 1000); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0, 16); };

export default function PublicServicePage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<{ trackingUrl: string; bookingId: string } | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [modelYear, setModelYear] = useState("");
  const [scheduledAt, setScheduledAt] = useState(localDateTime);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/public/services/${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json() as ApiPayload<Offer>;
        if (!response.ok || !payload.ok || !payload.data) throw new Error(payload.error?.message || "هذا العرض غير متاح.");
        if (active) setOffer(payload.data);
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "تعذر تحميل العرض."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/public/service-bookings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerSlug: slug, fullName, phone, plateNumber, make, model,
          modelYear: modelYear ? Number(modelYear) : null,
          scheduledAt: new Date(scheduledAt).toISOString(), notes,
        }),
      });
      const payload = await response.json() as ApiPayload<{ trackingUrl: string; bookingId: string }>;
      if (!response.ok || !payload.ok || !payload.data) throw new Error(payload.error?.message || "تعذر تسجيل الحجز.");
      setDone(payload.data);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر تسجيل الحجز."); }
    finally { setSaving(false); }
  }

  return <main className="public-service-shell" dir="rtl">
    <header className="public-service-header"><Link className="admin-brand" href="/"><span className="brand-mark">WG</span><span><strong>Workshop Growth</strong><small>خدمات وصيانة السيارات</small></span></Link><span className="pill">حجز إلكتروني آمن</span></header>
    {loading && <div className="public-service-card"><p>جارٍ تحميل تفاصيل العرض…</p></div>}
    {!loading && error && !offer && <div className="public-service-card"><h1>العرض غير متاح</h1><p>{error}</p><Link className="primary-button" href="/">العودة للرئيسية</Link></div>}
    {offer && <><section className="public-service-hero"><p className="admin-eyebrow">{offer.workshopName}</p><span className="public-offer-tag">عرض خاص عبر رابط مشاركة</span><h1>{offer.title}</h1><p>{offer.description || "احجز خدمتك إلكترونيًا وتابع حالة السيارة من خلال رابط خاص."}</p><div className="public-price-row"><strong>{money(offer.finalPrice)}</strong><del>{money(offer.basePrice)}</del><span>وفّر {money(offer.discountAmount)}</span></div><p className="public-terms">{offer.terms}</p>{offer.expiresAt && <small>ينتهي العرض: {new Date(offer.expiresAt).toLocaleString("ar-SA")}</small>}</section>
    {!done ? <section className="public-service-card"><div className="panel-heading" style={{ paddingInline: 0 }}><div><h2>احجز موعدك</h2><p>أكمل البيانات لإنشاء حجز ورابط تتبع خاص بك.</p></div></div>
      {error && <p className="wg-feedback wg-feedback-error" role="alert">{error}</p>}
      <form className="wg-form public-booking-form" onSubmit={submit}>
        <label className="wg-field">الاسم الكامل<input className="wg-input" value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={2} maxLength={120} autoComplete="name" /></label>
        <label className="wg-field">رقم الجوال<input className="wg-input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required minLength={8} maxLength={24} autoComplete="tel" placeholder="05xxxxxxxx" /></label>
        <label className="wg-field">لوحة السيارة<input className="wg-input" value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} required maxLength={20} /></label>
        <label className="wg-field">الشركة المصنعة<input className="wg-input" value={make} onChange={(e) => setMake(e.target.value)} required maxLength={60} placeholder="تويوتا" /></label>
        <label className="wg-field">طراز السيارة<input className="wg-input" value={model} onChange={(e) => setModel(e.target.value)} required maxLength={60} placeholder="كامري" /></label>
        <label className="wg-field">سنة الصنع (اختياري)<input className="wg-input" type="number" min="1950" max="2100" value={modelYear} onChange={(e) => setModelYear(e.target.value)} /></label>
        <label className="wg-field wg-field-wide">الموعد المطلوب<input className="wg-input" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} required /></label>
        <label className="wg-field wg-field-wide">ملاحظات إضافية<textarea className="wg-input" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={2000} placeholder="وصف مختصر للمشكلة إن وجد" /></label>
        <div className="wg-feedback wg-field-wide">السعر المعلن <strong>{money(offer.finalPrice)}</strong>. لا يبدأ أي عمل إضافي غير مشمول إلا بعد إبلاغك بالتكلفة والحصول على موافقتك.</div>
        <div className="wg-submit-row"><button className="primary-button" type="submit" disabled={saving}>{saving ? "جارٍ تسجيل الحجز…" : "تأكيد طلب الحجز"}</button></div>
      </form>
    </section> : <section className="public-service-card public-booking-success"><div className="public-success-icon">✓</div><h2>تم تسجيل طلب الحجز</h2><p>رقم الطلب: <strong>{done.bookingId.slice(0, 8).toUpperCase()}</strong></p><p>احتفظ برابط التتبع الخاص بك. سيظهر فيه كل تحديث تسجله الورشة عن السيارة.</p><Link className="primary-button" href={done.trackingUrl}>متابعة حالة السيارة</Link><button className="secondary-button" type="button" onClick={() => { void navigator.clipboard.writeText(`${window.location.origin}${done.trackingUrl}`); }}>نسخ رابط التتبع</button></section>}
    <footer className="public-service-footer"><span>Workshop Growth OS</span><span>سجل إلكتروني للحجز ومراحل الصيانة</span></footer></>}
  </main>;
}
