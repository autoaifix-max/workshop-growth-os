"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { redirectIfUnauthorized } from "@/lib/auth/redirect-to-login";

type Partner = {
  id: string; name: string; platform: string; handle: string; contact: string;
  referral_code: string; commission_type: "fixed" | "percent"; commission_value: number; status: string;
};
type Commission = {
  id: string; partner_id: string; work_order_id: string; collected_amount: number;
  commission_amount: number; status: "pending_review" | "approved" | "paid" | "cancelled";
  created_at: string; marketing_partners?: { name: string; referral_code: string };
};
type Payload<T> = { ok: boolean; data?: T; error?: { message?: string } | null };
const money = (value: number) => new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 2 }).format(value);
const statusLabel: Record<Commission["status"], string> = {
  pending_review: "بانتظار المراجعة", approved: "معتمدة للصرف", paid: "مدفوعة", cancelled: "ملغاة",
};

export default function InfluencerMarketingPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("snapchat");
  const [handle, setHandle] = useState("");
  const [contact, setContact] = useState("");
  const [code, setCode] = useState("");
  const [commissionType, setCommissionType] = useState<"fixed" | "percent">("percent");
  const [commissionValue, setCommissionValue] = useState("10");
  const [workOrderId, setWorkOrderId] = useState("");
  const [collectedAmount, setCollectedAmount] = useState("");
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [pResponse, cResponse] = await Promise.all([
        fetch("/api/v1/marketing/partners", { cache: "no-store" }),
        fetch("/api/v1/marketing/commissions", { cache: "no-store" }),
      ]);
      if (redirectIfUnauthorized(pResponse, cResponse)) return;
      const [p, c] = await Promise.all([pResponse.json() as Promise<Payload<{ items: Partner[] }>>, cResponse.json() as Promise<Payload<{ items: Commission[] }>>]);
      if (!pResponse.ok || !p.ok || !cResponse.ok || !c.ok) throw new Error(p.error?.message || c.error?.message || "تعذر تحميل بيانات التسويق.");
      setPartners(p.data?.items ?? []); setCommissions(c.data?.items ?? []);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر تحميل بيانات التسويق."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function addPartner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/v1/marketing/partners", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, platform, handle, contact, referralCode: code, commissionType, commissionValue: Number(commissionValue) }),
      });
      if (redirectIfUnauthorized(response)) return;
      const result = await response.json() as Payload<Partner>;
      if (!response.ok || !result.ok) throw new Error(result.error?.message || "تعذر إضافة المسوق.");
      setName(""); setHandle(""); setContact(""); setCode(""); setCommissionValue("10");
      setMessage("تمت إضافة المسوق ورمز الإحالة."); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر إضافة المسوق."); }
    finally { setSaving(false); }
  }

  async function recordCommission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/v1/marketing/commissions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workOrderId, collectedAmount: Number(collectedAmount), paymentConfirmed }),
      });
      if (redirectIfUnauthorized(response)) return;
      const result = await response.json() as Payload<Commission>;
      if (!response.ok || !result.ok) throw new Error(result.error?.message || "تعذر تسجيل العمولة.");
      setWorkOrderId(""); setCollectedAmount(""); setPaymentConfirmed(false);
      setMessage("سُجلت العمولة للمراجعة، ولم تُسجل كمدفوعة."); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "تعذر تسجيل العمولة."); }
    finally { setSaving(false); }
  }

  const outstanding = commissions.filter((item) => item.status === "pending_review" || item.status === "approved")
    .reduce((sum, item) => sum + Number(item.commission_amount), 0);
  const paid = commissions.filter((item) => item.status === "paid").reduce((sum, item) => sum + Number(item.commission_amount), 0);

  return (
    <main className="admin-shell" dir="rtl">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/"><span className="brand-mark">WG</span><span><strong>Workshop Growth</strong><small>نمو الورشة</small></span></Link>
        <p className="sidebar-caption">مساحة العمل</p>
        <nav className="admin-nav" aria-label="التنقل الرئيسي">
          <Link href="/admin/bookings" className="nav-link">▦ الحجوزات</Link>
          <Link href="/admin/growth" className="nav-link">↗ مؤشرات النمو</Link>
          <Link href="/admin/marketing" className="nav-link nav-link-active">★ التسويق بالعمولة</Link>
        </nav>
        <div className="sidebar-bottom">خاص بمالك الورشة والمدير<br/><small>بيانات كل ورشة معزولة</small></div>
      </aside>
      <section className="admin-main">
        <header className="admin-topbar"><div className="breadcrumbs">إدارة الورشة <span>/</span> التسويق بالعمولة</div><Link className="secondary-button" href="/admin/growth">مؤشرات النمو</Link></header>
        <div className="booking-content">
          <div className="booking-title-row"><div><p className="admin-eyebrow">المشاهير وصنّاع المحتوى</p><h1>التسويق بالعمولة</h1><p className="admin-subtitle">تتبّع العميل من رمز الإحالة إلى أمر العمل المكتمل، ثم راجع العمولة قبل صرفها.</p></div><button className="secondary-button" type="button" disabled={loading} onClick={() => void load()}>{loading ? "جارٍ التحديث…" : "تحديث"}</button></div>
          {error && <div className="preview-notice" role="alert"><div><strong>تعذر تنفيذ العملية</strong><p>{error}</p></div></div>}
          {message && <div className="preview-notice" role="status"><div><strong>{message}</strong></div></div>}
          <section className="booking-stats" aria-label="ملخص العمولات">
            <article className="stat-card"><span className="stat-label">المسوقون المسجلون</span><span className="stat-value">{loading ? "…" : partners.length.toLocaleString("ar-SA")}</span><span className="stat-foot">رموز إحالة مستقلة</span></article>
            <article className="stat-card"><span className="stat-label">العمولات قيد المراجعة أو الاعتماد</span><span className="stat-value">{loading ? "…" : money(outstanding)}</span><span className="stat-foot">ليست مصروفة بعد</span></article>
            <article className="stat-card"><span className="stat-label">العمولات المسجلة كمدفوعة</span><span className="stat-value">{loading ? "…" : money(paid)}</span><span className="stat-foot">حسب سجل الدفع</span></article>
          </section>

          <section className="booking-panel">
            <div className="panel-heading"><div><h2>إضافة مشهور أو مسوّق</h2><p>اتفق معه على العمولة أولًا، ثم أنشئ رمزًا فريدًا لكل ورشة.</p></div></div>
            <form className="booking-create-form" onSubmit={addPartner}>
              <label className="booking-create-field"><span>الاسم *</span><input required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم المشهور" /></label>
              <label className="booking-create-field"><span>المنصة</span><select value={platform} onChange={(e) => setPlatform(e.target.value)}><option value="snapchat">سناب شات</option><option value="tiktok">تيك توك</option><option value="instagram">إنستغرام</option><option value="youtube">يوتيوب</option><option value="x">إكس</option><option value="other">أخرى</option></select></label>
              <label className="booking-create-field"><span>اسم الحساب</span><input maxLength={160} value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@account" /></label>
              <label className="booking-create-field"><span>وسيلة التواصل</span><input maxLength={160} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="رقم أو بريد" /></label>
              <label className="booking-create-field"><span>رمز الإحالة *</span><input required minLength={3} maxLength={32} pattern="[A-Za-z0-9_-]+" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="AHMAD10" /></label>
              <label className="booking-create-field"><span>طريقة العمولة</span><select value={commissionType} onChange={(e) => setCommissionType(e.target.value as "fixed" | "percent")}><option value="percent">نسبة من المبلغ المحصل</option><option value="fixed">مبلغ ثابت لكل عميل</option></select></label>
              <label className="booking-create-field"><span>{commissionType === "percent" ? "نسبة العمولة (%)" : "العمولة (ريال)"}</span><input required type="number" min="0.01" max={commissionType === "percent" ? "100" : "1000000"} step="0.01" value={commissionValue} onChange={(e) => setCommissionValue(e.target.value)} /></label>
              <div className="booking-create-actions"><button className="primary-button" type="submit" disabled={saving}>{saving ? "جارٍ الحفظ…" : "إضافة المسوق"}</button></div>
            </form>
          </section>

          <section className="booking-panel">
            <div className="panel-heading"><div><h2>المشاهير ورموز الإحالة</h2><p>أدخل الرمز عند إنشاء الحجز ليُنسب العميل إلى المسوق.</p></div></div>
            {loading ? <div className="empty-state">جارٍ التحميل…</div> : partners.length === 0 ? <div className="empty-state">لا يوجد مسوقون حتى الآن.</div> : <div className="table-scroll"><table><thead><tr><th>المسوق</th><th>المنصة</th><th>رمز الإحالة</th><th>العمولة المتفق عليها</th><th>الحالة</th></tr></thead><tbody>{partners.map((p) => <tr key={p.id}><td><strong>{p.name}</strong><small>{p.handle}</small></td><td>{({snapchat:"سناب شات",tiktok:"تيك توك",instagram:"إنستغرام",youtube:"يوتيوب",x:"إكس",other:"أخرى"} as Record<string,string>)[p.platform] ?? p.platform}</td><td><code>{p.referral_code}</code></td><td>{p.commission_type === "percent" ? `${p.commission_value}٪` : money(Number(p.commission_value))}</td><td>{p.status === "active" ? "نشط" : "غير نشط"}</td></tr>)}</tbody></table></div>}
          </section>

          <section className="booking-panel">
            <div className="panel-heading"><div><h2>تسجيل عمولة لخدمة مكتملة</h2><p>يتطلب معرّف أمر العمل، وتأكيدًا يدويًا بأن العميل دفع المبلغ المسجل.</p></div></div>
            <form className="booking-create-form" onSubmit={recordCommission}>
              <label className="booking-create-field booking-create-span-2"><span>معرّف أمر العمل *</span><input required type="text" value={workOrderId} onChange={(e) => setWorkOrderId(e.target.value.trim())} placeholder="UUID من أمر العمل" /></label>
              <label className="booking-create-field"><span>المبلغ المحصل (ريال) *</span><input required type="number" min="0.01" step="0.01" value={collectedAmount} onChange={(e) => setCollectedAmount(e.target.value)} /></label>
              <label className="booking-create-field booking-create-span-2"><span><input type="checkbox" checked={paymentConfirmed} onChange={(e) => setPaymentConfirmed(e.target.checked)} /> أؤكد أن الورشة استلمت هذا المبلغ من العميل</span></label>
              <div className="booking-create-actions"><button className="primary-button" type="submit" disabled={saving || !paymentConfirmed}>{saving ? "جارٍ التسجيل…" : "احتساب العمولة وتسجيلها للمراجعة"}</button></div>
            </form>
          </section>

          <section className="booking-panel">
            <div className="panel-heading"><div><h2>سجل العمولات</h2><p>كل أمر عمل مؤهل يُحتسب مرة واحدة فقط.</p></div></div>
            {loading ? <div className="empty-state">جارٍ التحميل…</div> : commissions.length === 0 ? <div className="empty-state">لا توجد عمولات مسجلة.</div> : <div className="table-scroll"><table><thead><tr><th>المسوق</th><th>أمر العمل</th><th>المبلغ المحصل</th><th>العمولة</th><th>الحالة</th></tr></thead><tbody>{commissions.map((c) => <tr key={c.id}><td>{c.marketing_partners?.name ?? c.partner_id}</td><td><code>{c.work_order_id.slice(0, 8)}…</code></td><td>{money(Number(c.collected_amount))}</td><td><strong>{money(Number(c.commission_amount))}</strong></td><td>{statusLabel[c.status]}</td></tr>)}</tbody></table></div>}
          </section>
          <div className="preview-notice"><div><strong>مهم قبل الصرف</strong><p>تسجيل العمولة هنا لا يحول الأموال تلقائيًا. يلزم اعتماد العمولة وإثبات التحويل في سجل الدفع. حاليًا، الاعتماد والصرف الآلي غير مفعّلين.</p></div></div>
          <footer className="admin-footer"><span>Workshop Growth OS</span><span>التسويق بالعمولة · RTL</span></footer>
        </div>
      </section>
    </main>
  );
}
