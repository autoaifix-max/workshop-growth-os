"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { redirectIfUnauthorized } from "@/lib/auth/redirect-to-login";

type Partner = { id: string; name: string; referral_code: string; status: string };
type Offer = {
  id: string; slug: string; title: string; description: string; base_price: number;
  discount_type: "fixed" | "percent"; discount_value: number; terms: string;
  starts_at: string | null; expires_at: string | null; status: string;
  marketing_partner_id: string | null; marketing_partners?: { name: string; referral_code: string } | null;
};
type Payload<T> = { ok: boolean; data?: T; error?: { message?: string } | null };
const money = (value: number) => new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 2 }).format(value);
const discount = (offer: Offer) => Math.min(Number(offer.base_price), offer.discount_type === "percent" ? Number(offer.base_price) * Number(offer.discount_value) / 100 : Number(offer.discount_value));

export default function ServiceOffersPage() {
  const [items, setItems] = useState<Offer[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState("10");
  const [partnerId, setPartnerId] = useState("");
  const [terms, setTerms] = useState("السعر النهائي يعتمد على فحص السيارة. لا يشمل العرض قطع الغيار إلا إذا ذُكر ذلك صراحة.");
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [origin, setOrigin] = useState("");

  useEffect(() => { setOrigin(window.location.origin); }, []);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [offerResponse, partnerResponse] = await Promise.all([
        fetch("/api/v1/service-offers", { cache: "no-store" }),
        fetch("/api/v1/marketing/partners", { cache: "no-store" }),
      ]);
      if (redirectIfUnauthorized(offerResponse, partnerResponse)) return;
      const [offerPayload, partnerPayload] = await Promise.all([
        offerResponse.json() as Promise<Payload<{ items: Offer[] }>>,
        partnerResponse.json() as Promise<Payload<{ items: Partner[] }>>,
      ]);
      if (!offerResponse.ok || !offerPayload.ok) throw new Error(offerPayload.error?.message || "تعذر تحميل العروض.");
      setItems(offerPayload.data?.items ?? []);
      setPartners(partnerPayload.ok ? (partnerPayload.data?.items ?? []).filter((p) => p.status === "active") : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تحميل العروض.");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function createOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/v1/service-offers", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, slug, description, basePrice: Number(basePrice), discountType,
          discountValue: Number(discountValue), terms, marketingPartnerId: partnerId || null,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        }),
      });
      if (redirectIfUnauthorized(response)) return;
      const payload = await response.json() as Payload<Offer>;
      if (!response.ok || !payload.ok) throw new Error(payload.error?.message || "تعذر إنشاء العرض.");
      setMessage("تم إنشاء العرض. انسخ الرابط وأرسله للمشهور ليشاركه مع جمهوره.");
      setTitle(""); setSlug(""); setDescription(""); setBasePrice(""); setDiscountValue("10"); setPartnerId(""); setExpiresAt("");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر إنشاء العرض."); }
    finally { setSaving(false); }
  }

  async function copyLink(path: string) {
    try { await navigator.clipboard.writeText(`${origin}${path}`); setMessage("تم نسخ رابط الخدمة."); }
    catch { setMessage(`${origin}${path}`); }
  }

  return <main className="admin-shell" dir="rtl">
    <aside className="admin-sidebar">
      <Link className="admin-brand" href="/"><span className="brand-mark">WG</span><span><strong>Workshop Growth</strong><small>إدارة الورشة</small></span></Link>
      <p className="sidebar-caption">التسويق والتشغيل</p>
      <nav className="admin-nav" aria-label="التنقل الرئيسي">
        <Link href="/admin/bookings" className="nav-link">▦ الحجوزات</Link>
        <Link href="/work-orders" className="nav-link">☷ أوامر العمل</Link>
        <Link href="/admin/marketing" className="nav-link">★ التسويق بالعمولة</Link>
        <Link href="/admin/services" className="nav-link nav-link-active">◇ الخدمات والعروض</Link>
      </nav>
      <div className="sidebar-bottom"><span className="online-dot" />روابط عروض قابلة للمشاركة<br /><small>خصم + حجز + تتبع</small></div>
    </aside>
    <section className="admin-main">
      <header className="admin-topbar"><div className="breadcrumbs">إدارة الورشة <span>/</span> الخدمات والعروض</div><Link className="secondary-button" href="/admin/marketing">إدارة المشاهير</Link></header>
      <div className="booking-content">
        <section className="admin-page-intro"><p className="admin-eyebrow">عروض قابلة للتتبع</p><h1>الخدمات والعروض</h1><p>أنشئ صفحة خدمة برابط مستقل لكل حملة أو مشهور. العميل يرى الخصم، يحجز، ويحصل على رابط خاص لمتابعة مراحل صيانة سيارته.</p></section>
        <div className="preview-notice"><span className="notice-symbol">ⓘ</span><div><strong>قبل مشاركة الرابط</strong><p>السعر الظاهر سعر العرض المعلن. قد يتغير الإجمالي بعد فحص السيارة، ويجب توضيح أي تكلفة إضافية للعميل قبل تنفيذها. العمولة ترتبط بالمشهور المختار عند الحجز.</p></div></div>
        {error && <p className="wg-feedback wg-feedback-error" role="alert">{error}</p>}
        {message && <p className="wg-feedback wg-feedback-success" role="status">{message}</p>}
        <div className="wg-page-grid" style={{ marginTop: 16 }}>
          <section className="booking-panel">
            <div className="panel-heading"><div><h2>إنشاء عرض جديد</h2><p>حدد الخدمة والسعر والخصم ورابط المشاركة.</p></div></div>
            <form className="wg-form" onSubmit={createOffer}>
              <label className="wg-field wg-field-wide">اسم الخدمة<input className="wg-input" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={2} maxLength={160} placeholder="مثال: فحص كمبيوتر شامل" /></label>
              <label className="wg-field wg-field-wide">الرابط المختصر (بالإنجليزية)<input className="wg-input" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-"))} required pattern="[a-z0-9][a-z0-9-]{2,79}" placeholder="مثال: creator-checkup" /><small className="muted">سيكون الرابط: /services/{slug || "your-offer"}</small></label>
              <label className="wg-field wg-field-wide">وصف الخدمة<textarea className="wg-input" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={2000} placeholder="ما الذي يشمله الفحص أو الإصلاح؟" /></label>
              <label className="wg-field">السعر الأساسي (ر.س)<input className="wg-input" type="number" min="1" step="0.01" value={basePrice} onChange={(e) => setBasePrice(e.target.value)} required /></label>
              <label className="wg-field">نوع الخصم<select className="wg-input" value={discountType} onChange={(e) => setDiscountType(e.target.value as "percent" | "fixed")}><option value="percent">نسبة مئوية ٪</option><option value="fixed">مبلغ ثابت ر.س</option></select></label>
              <label className="wg-field">قيمة الخصم<input className="wg-input" type="number" min="0.01" max={discountType === "percent" ? 100 : 10000000} step="0.01" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} required /></label>
              <label className="wg-field">المشهور المرتبط<select className="wg-input" value={partnerId} onChange={(e) => setPartnerId(e.target.value)}><option value="">بدون مشهور محدد</option>{partners.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.referral_code}</option>)}</select></label>
              <label className="wg-field wg-field-wide">تاريخ انتهاء العرض (اختياري)<input className="wg-input" type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} /></label>
              <label className="wg-field wg-field-wide">الشروط والتنبيهات<textarea className="wg-input" value={terms} onChange={(e) => setTerms(e.target.value)} rows={3} maxLength={2000} /></label>
              {Number(basePrice) > 0 && Number(discountValue) > 0 && <div className="wg-feedback wg-field-wide">السعر بعد الخصم: <strong>{money(Math.max(0, Number(basePrice) - Math.min(Number(basePrice), discountType === "percent" ? Number(basePrice) * Number(discountValue) / 100 : Number(discountValue))))}</strong></div>}
              <div className="wg-submit-row"><button className="primary-button" type="submit" disabled={saving}>{saving ? "جارٍ الحفظ…" : "إنشاء صفحة الخدمة"}</button></div>
            </form>
          </section>
          <section className="booking-panel">
            <div className="panel-heading"><div><h2>العروض المنشأة</h2><p>{items.length.toLocaleString("ar-SA")} عرض</p></div><button className="secondary-button" type="button" onClick={() => void load()} disabled={loading}>تحديث</button></div>
            {loading && <div className="empty-state">جارٍ تحميل العروض…</div>}
            {!loading && !items.length && <div className="empty-state"><span>◇</span><strong>لا توجد عروض بعد</strong><p>أنشئ أول صفحة خدمة لتجربتها مع أحد المشاهير.</p></div>}
            <div style={{ display: "grid", gap: 12, padding: 16 }}>
              {items.map((offer) => <article key={offer.id} className="card" style={{ minHeight: 0 }}>
                <div className="cardtop"><span className="pill">{offer.status === "active" ? "نشط" : "متوقف"}</span><span>{offer.marketing_partners?.name ?? "بدون مشهور"}</span></div>
                <h3 style={{ marginTop: 15 }}>{offer.title}</h3><p>{offer.description || "لا يوجد وصف إضافي."}</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}><strong>{money(Math.max(0, Number(offer.base_price) - discount(offer)))}</strong><span className="muted" style={{ textDecoration: "line-through" }}>{money(Number(offer.base_price))}</span><span className="pill active">خصم {offer.discount_type === "percent" ? `${offer.discount_value}٪` : money(Number(offer.discount_value))}</span></div>
                <p className="muted">الرابط: /services/{offer.slug}</p>
                <button className="secondary-button" type="button" onClick={() => void copyLink(`/services/${offer.slug}`)}>نسخ رابط الخدمة</button>
              </article>)}
            </div>
            <div className="table-footer"><Link className="wg-text-link" href="/admin/marketing">عرض تقارير المشاهير والعمولات ←</Link></div>
          </section>
        </div>
        <footer className="admin-footer"><span>Workshop Growth OS</span><span>الخدمات والعروض · الخصم والحجز والتتبع</span></footer>
      </div>
    </section>
  </main>;
}
