"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Offer = { slug: string; title: string; description: string; basePrice: number; discountType: "fixed" | "percent"; discountValue: number; discountAmount: number; finalPrice: number; terms: string; expiresAt: string | null; workshopName: string };
type Payload = { ok: boolean; data?: { items: Offer[] }; error?: { message?: string } | null };
const money = (value: number) => new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 2 }).format(value);

export default function ServicesCatalogPage() {
  const [items, setItems] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const workshopSlug = new URLSearchParams(window.location.search).get("workshop") ?? "";
    if (!workshopSlug) {
      setError("افتح رابط كتالوج الخدمات الذي وفرته لك الورشة.");
      setLoading(false);
      return () => { active = false; };
    }
    fetch(`/api/public/services?workshop=${encodeURIComponent(workshopSlug)}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json() as Payload;
        if (!response.ok || !payload.ok) throw new Error(payload.error?.message || "تعذر تحميل الخدمات.");
        if (active) setItems(payload.data?.items ?? []);
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "تعذر تحميل الخدمات."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return <main className="public-service-shell" dir="rtl">
    <header className="public-service-header"><Link className="admin-brand" href="/"><span className="brand-mark">WG</span><span><strong>Workshop Growth</strong><small>الخدمات والعروض</small></span></Link><span className="pill">عروض الورشة</span></header>
    <section className="public-service-hero"><p className="admin-eyebrow">خدمات السيارات</p><h1>اختر خدمتك واحجز إلكترونيًا</h1><p>استعرض العروض والخصومات المتاحة، واحجز موعدك من صفحة الخدمة. بعد تسجيل الحجز ستحصل على رابط خاص لمتابعة مراحل الصيانة.</p></section>
    {loading && <div className="public-service-card">جارٍ تحميل العروض…</div>}
    {error && <div className="public-service-card"><h2>تعذر تحميل الخدمات</h2><p>{error}</p></div>}
    {!loading && !error && !items.length && <div className="public-service-card"><h2>لا توجد عروض منشورة حاليًا</h2><p>ستظهر الخدمات هنا عند نشرها من إدارة الورشة.</p></div>}
    {!loading && !error && items.length > 0 && <section className="public-service-catalog" aria-label="الخدمات والعروض">{items.map((offer) => <article className="public-offer-card" key={offer.slug}><div className="cardtop"><span className="public-offer-tag">خصم {offer.discountType === "percent" ? `${offer.discountValue}٪` : money(offer.discountAmount)}</span><span className="muted">{offer.workshopName}</span></div><h2>{offer.title}</h2><p>{offer.description || "احجز الخدمة إلكترونيًا وتابع مراحل صيانة السيارة."}</p><div className="public-price-row"><strong>{money(offer.finalPrice)}</strong><del>{money(offer.basePrice)}</del><span>توفير {money(offer.discountAmount)}</span></div>{offer.expiresAt && <small className="muted">ينتهي {new Date(offer.expiresAt).toLocaleDateString("ar-SA")}</small>}<Link className="primary-button public-offer-button" href={`/services/${offer.slug}`}>تفاصيل العرض والحجز ←</Link></article>)}</section>}
    <footer className="public-service-footer"><span>Workshop Growth OS</span><span>حجز إلكتروني · خصومات · متابعة الصيانة</span></footer>
  </main>;
}
