"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Event = { type: string; title: string; description: string; createdAt: string };
type Tracking = { bookingId: string; service: string; scheduledAt: string; bookingStatus: string; workOrderStatus: string | null; vehicle: { make: string; model: string; plateNumber: string; year: number | null } | null; events: Event[] };
type Payload = { ok: boolean; data?: Tracking; error?: { message?: string } | null };
const statusLabels: Record<string, string> = { pending: "بانتظار تأكيد الموعد", confirmed: "تم تأكيد الموعد", in_progress: "السيارة داخل الورشة", completed: "اكتملت الخدمة", cancelled: "تم إلغاء الحجز" };
const dateTime = (value: string) => new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default function CustomerTrackingPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/public/service-tracking/${encodeURIComponent(token)}`, { cache: "no-store" });
      const payload = await response.json() as Payload;
      if (!response.ok || !payload.ok || !payload.data) throw new Error(payload.error?.message || "تعذر العثور على سجل التتبع.");
      setTracking(payload.data);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر تحميل سجل التتبع."); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => { void load(); }, [load]);

  return <main className="public-service-shell" dir="rtl">
    <header className="public-service-header"><Link className="admin-brand" href="/"><span className="brand-mark">WG</span><span><strong>Workshop Growth</strong><small>متابعة صيانة السيارة</small></span></Link><button className="secondary-button" type="button" onClick={() => void load()} disabled={loading}>تحديث الحالة</button></header>
    <section className="public-service-card tracking-card">
      <p className="admin-eyebrow">سجل الخدمة الإلكتروني</p><h1>متابعة حالة سيارتك</h1>
      {loading && <p>جارٍ تحميل آخر تحديث…</p>}
      {error && <div className="wg-feedback wg-feedback-error" role="alert">{error}<p>احتفظ برابط التتبع الكامل؛ فهو مفتاح الوصول الخاص بهذا الحجز.</p></div>}
      {!loading && tracking && <>
        <div className="tracking-summary"><div><span className="muted">الخدمة</span><strong>{tracking.service}</strong></div><div><span className="muted">حالة الحجز</span><strong>{statusLabels[tracking.bookingStatus] ?? tracking.bookingStatus}</strong></div><div><span className="muted">الموعد المطلوب</span><strong>{dateTime(tracking.scheduledAt)}</strong></div><div><span className="muted">السيارة</span><strong>{tracking.vehicle ? `${tracking.vehicle.make} ${tracking.vehicle.model}` : "لم تسجل"}{tracking.vehicle?.year ? ` · ${tracking.vehicle.year}` : ""}</strong><small>{tracking.vehicle?.plateNumber ?? ""}</small></div></div>
        <div className="tracking-number">رقم الحجز <strong>{tracking.bookingId.slice(0, 8).toUpperCase()}</strong></div>
        <h2 className="tracking-section-title">مراحل الخدمة</h2>
        <ol className="tracking-timeline">{tracking.events.map((event, index) => <li className="tracking-event" key={`${event.type}-${event.createdAt}-${index}`}><span className="tracking-event-dot">{index + 1}</span><div className="tracking-event-body"><div className="tracking-event-heading"><strong>{event.title}</strong><time>{dateTime(event.createdAt)}</time></div><p>{event.description}</p></div></li>)}</ol>
        {!tracking.events.length && <p className="muted">لم تسجل الورشة تحديثات إضافية بعد. سيظهر كل تحديث جديد هنا.</p>}
        <div className="preview-notice"><span className="notice-symbol">ⓘ</span><div><strong>التحديثات تظهر بعد تسجيلها في نظام الورشة</strong><p>قد يحتاج تأكيد الموعد أو أي تحديث جديد إلى بعض الوقت. إذا كانت لديك موافقة مطلوبة على تكلفة إضافية، تأكد من توثيقها مع الورشة قبل بدء العمل.</p></div></div>
      </>}
    </section>
    <footer className="public-service-footer"><span>Workshop Growth OS</span><span>الرابط خاص بهذا الحجز، لا تشاركه علنًا</span></footer>
  </main>;
}
