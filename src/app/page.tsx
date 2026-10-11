import Link from "next/link";

const modules = [
  { n: "01", title: "العملاء", desc: "سجّل بيانات العميل ووسيلة التواصل معه.", href: "/customers", action: "إدارة العملاء" },
  { n: "02", title: "السيارات", desc: "اربط المركبة بمالكها واحفظ بياناتها الأساسية.", href: "/vehicles", action: "إدارة السيارات" },
  { n: "03", title: "الحجوزات", desc: "نظّم المواعيد وتابع التأكيد وحالة الخدمة.", href: "/admin/bookings", action: "إدارة الحجوزات" },
  { n: "04", title: "أوامر العمل", desc: "تابع التشخيص والإصلاح من بداية العمل حتى إغلاقه.", href: "/work-orders", action: "متابعة العمل" },
  { n: "05", title: "مؤشرات النمو", desc: "راجع مؤشرات التشغيل المسجلة خلال آخر 30 يومًا.", href: "/admin/growth", action: "عرض المؤشرات" },
];

const workflow = [
  { n: "1", title: "سجّل العميل", desc: "أضف الاسم ورقم التواصل." },
  { n: "2", title: "أضف المركبة", desc: "اربط السيارة بملف العميل." },
  { n: "3", title: "أنشئ الحجز", desc: "حدّد الخدمة والموعد المطلوب." },
  { n: "4", title: "تابع أمر العمل", desc: "حوّل الحجز وتابع حالة التنفيذ." },
];

export default function HomePage() {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand" aria-hidden="true">WG</div>
        <div>
          <p className="eyebrow">WORKSHOP GROWTH OS</p>
          <h1>إدارة الورشة، من الاستقبال إلى التسليم</h1>
        </div>
        <Link className="primary-button" href="/login">تسجيل الدخول</Link>
      </header>

      <section className="hero">
        <p className="eyebrow">مساحة تشغيل الورشة</p>
        <h2>شغل الورشة واضح. والخطوة التالية معروفة.</h2>
        <p>نظّم العملاء والمركبات والحجوزات وأوامر العمل من مساحة واحدة، ثم راجع مؤشرات التشغيل. تُحمّل البيانات من واجهات النظام وفق جلسة المستخدم وعضويته في الورشة.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 22 }}>
          <Link className="primary-button" href="/login">الدخول إلى مساحة العمل <span aria-hidden="true">←</span></Link>
          <Link className="secondary-button" href="/admin/bookings">فتح الحجوزات</Link>
        </div>
      </section>

      <section aria-labelledby="workflow-title">
        <div className="section-head">
          <div><p className="eyebrow">مسار العمل اليومي</p><h2 id="workflow-title">من العميل إلى التسليم</h2></div>
          <span className="muted">4 خطوات</span>
        </div>
        <div className="grid">
          {workflow.map((step) => (
            <article className="card" key={step.n} style={{ minHeight: 130 }}>
              <div className="cardtop"><span>الخطوة {step.n}</span><span className="pill">سير العمل</span></div>
              <h3 style={{ marginTop: 20 }}>{step.title}</h3>
              <p>{step.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="modules-title">
        <div className="section-head">
          <div><p className="eyebrow">وحدات التشغيل</p><h2 id="modules-title">كل جزء في مكانه</h2></div>
          <span className="muted">5 وحدات</span>
        </div>
        <div className="grid">
          {modules.map((module) => (
            <Link className="card module-card" key={module.n} href={module.href}>
              <div className="cardtop"><span>{module.n}</span><span className="pill">يتطلب الدخول</span></div>
              <h3>{module.title}</h3>
              <p>{module.desc}</p>
              <span className="module-card-action">{module.action} ←</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="preview-notice" aria-label="ملاحظة حول البيانات">
        <span className="notice-symbol" aria-hidden="true">ⓘ</span>
        <div>
          <strong>البيانات الفعلية تتطلب تسجيل الدخول</strong>
          <p>هذه الصفحة بوابة للوحدات التشغيلية وليست عرضًا تجريبيًا لبيانات العملاء. إذا تعذّر تحميل البيانات بعد الدخول، يجب التحقق من إعدادات الاتصال وصلاحيات عضوية الورشة.</p>
        </div>
      </section>

      <footer>
        <span>Workshop Growth OS</span>
        <span>واجهة عربية RTL • تصميم مناسب للجوال • صلاحيات حسب عضوية الورشة</span>
      </footer>
    </main>
  );
}
