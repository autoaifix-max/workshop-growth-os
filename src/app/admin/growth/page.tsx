"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type GrowthMetrics = {
  periodDays: number;
  since: string;
  bookings: number;
  pending: number;
  confirmed: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  workOrders: number;
  completionRate: number | null;
  completionRateDenominator: number;
  limitations: string[];
};
type ApiResponse = { ok: boolean; data?: GrowthMetrics; error?: { message?: string } | null };

const number = (value: number) => value.toLocaleString("ar-SA");
const percent = (value: number | null) => value === null ? "—" : `${value.toLocaleString("ar-SA", { maximumFractionDigits: 1 })}٪`;

export default function WorkshopGrowthPage() {
  const [metrics, setMetrics] = useState<GrowthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError("");
    setMetrics(null);
    try {
      const response = await fetch("/api/v1/growth", { cache: "no-store" });
      const payload = await response.json() as ApiResponse;
      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error?.message || (response.status === 401
          ? "يلزم تسجيل الدخول لعرض مؤشرات الورشة."
          : "تعذر تحميل مؤشرات الورشة."));
      }
      setMetrics(payload.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر الاتصال بخدمة المؤشرات.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadMetrics(); }, [loadMetrics]);

  return (
    <main className="admin-shell" dir="rtl">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/" aria-label="Workshop Growth OS الصفحة الرئيسية">
          <span className="brand-mark">WG</span><span><strong>Workshop Growth</strong><small>نمو الورشة</small></span>
        </Link>
        <p className="sidebar-caption">مساحة العمل</p>
        <nav className="admin-nav" aria-label="التنقل الرئيسي">
          <Link href="/admin/bookings" className="nav-link">▦ الحجوزات</Link>
          <Link href="/admin/growth" className="nav-link nav-link-active">↗ مؤشرات النمو</Link>
        </nav>
        <div className="sidebar-bottom"><span className="online-dot" />مؤشرات قراءة فقط<br /><small>من بيانات الورشة الحالية</small></div>
      </aside>
      <section className="admin-main">
        <header className="admin-topbar">
          <div className="breadcrumbs">إدارة الورشة <span>/</span> مؤشرات النمو</div>
          <Link className="secondary-button" href="/admin/bookings">العودة للحجوزات</Link>
        </header>
        <div className="booking-content">
          <div className="booking-title-row">
            <div><p className="admin-eyebrow">أداء التشغيل</p><h1>لوحة نمو الورشة</h1>
              <p className="admin-subtitle">صورة تشغيلية مبنية على السجلات المسجلة خلال آخر 30 يومًا، دون تعديل بياناتك.</p>
            </div>
            <button className="secondary-button" onClick={() => void loadMetrics()} type="button" disabled={loading}>
              {loading ? "جارٍ التحديث…" : "تحديث المؤشرات"}
            </button>
          </div>

          {error && <div className="preview-notice" role="alert"><span className="notice-symbol">ⓘ</span><div>
            <strong>تعذر تحميل المؤشرات</strong><p>{error}</p>
            <button className="secondary-button" onClick={() => void loadMetrics()} type="button">إعادة المحاولة</button>
          </div></div>}

          <section className="booking-stats" aria-label="مؤشرات نمو الورشة">
            <article className="stat-card"><span className="stat-label">الحجوزات المسجلة</span><span className="stat-value">{loading ? "…" : number(metrics?.bookings ?? 0)}</span><span className="stat-foot">آخر 30 يومًا</span><span className="stat-icon yellow">▦</span></article>
            <article className="stat-card"><span className="stat-label">بانتظار التأكيد</span><span className="stat-value">{loading ? "…" : number(metrics?.pending ?? 0)}</span><span className="stat-foot">حجوزات تحتاج متابعة</span><span className="stat-icon orange">◷</span></article>
            <article className="stat-card"><span className="stat-label">أوامر العمل الجديدة</span><span className="stat-value">{loading ? "…" : number(metrics?.workOrders ?? 0)}</span><span className="stat-foot">أُنشئت خلال الفترة</span><span className="stat-icon blue">⚙</span></article>
            <article className="stat-card"><span className="stat-label">نسبة إنجاز الحجوزات</span><span className="stat-value">{loading ? "…" : percent(metrics?.completionRate ?? null)}</span><span className="stat-foot">من {number(metrics?.completionRateDenominator ?? 0)} حجز غير ملغى</span><span className="stat-icon green">✓</span></article>
          </section>

          <section className="booking-panel">
            <div className="panel-heading"><div><h2>توزيع حالات الحجوزات</h2><p>الحالات حسب وقت إنشاء الحجز، وليس موعد الزيارة.</p></div></div>
            {loading && <div className="empty-state">جارٍ تحميل المؤشرات…</div>}
            {!loading && !error && metrics && <div className="booking-filters" aria-label="توزيع حالات الحجوزات">
              <span className="filter-chip">مؤكدة <strong>{number(metrics.confirmed)}</strong></span>
              <span className="filter-chip">قيد الخدمة <strong>{number(metrics.inProgress)}</strong></span>
              <span className="filter-chip">مكتملة <strong>{number(metrics.completed)}</strong></span>
              <span className="filter-chip">ملغاة <strong>{number(metrics.cancelled)}</strong></span>
            </div>}
            <div className="preview-notice"><span className="notice-symbol">ⓘ</span><div>
              <strong>قراءة فقط — لا توجد تغييرات على قاعدة البيانات</strong>
              <p>لا تعرض اللوحة أرباحًا أو هوامش ربح لأن بيانات الإيرادات والتكاليف غير متاحة ضمن المخطط الحالي.</p>
            </div></div>
            {metrics && <ul>{metrics.limitations.map((item) => <li key={item}>{item}</li>)}</ul>}
            <div className="table-footer"><span>المصدر: API محمي بعضوية الورشة</span><span>آخر 30 يومًا</span></div>
          </section>
          <footer className="admin-footer"><span>Workshop Growth OS</span><span>لوحة نمو الورشة · RTL</span></footer>
        </div>
      </section>
    </main>
  );
}
