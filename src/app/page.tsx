import Link from "next/link";

const modules = [
  { n: "01", title: "العملاء", desc: "تسجيل العملاء ومعلومات التواصل.", href: "/customers", status: "متاح" },
  { n: "02", title: "السيارات", desc: "ربط كل مركبة بعميل داخل الورشة.", href: "/vehicles", status: "متاح" },
  { n: "03", title: "الحجوزات", desc: "إدارة المواعيد وحالات الحجز.", href: "/admin/bookings", status: "متاح" },
  { n: "04", title: "أوامر العمل", desc: "متابعة أوامر العمل التي أنشئت من الحجوزات.", href: "/work-orders", status: "متاح" },
  { n: "05", title: "مؤشرات النمو", desc: "ملخص قراءة فقط لنشاط الورشة خلال 30 يومًا.", href: "/admin/growth", status: "متاح" },
];

export default function HomePage() {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">WG</div>
        <div><p className="eyebrow">WORKSHOP GROWTH OS</p><h1>إدارة الورشة، من الاستقبال إلى التسليم</h1></div>
        <Link className="pill" href="/login">تسجيل الدخول</Link>
      </header>
      <section className="hero">
        <p className="eyebrow">لوحة إدارة الورشة</p>
        <h2>كل عمليات ورشتك في مكان واحد.</h2>
        <p>ابدأ بتسجيل العميل ومركبته، ثم انتقل إلى إدارة الحجوزات ومتابعة مؤشرات الورشة. تظهر البيانات وفق عضوية المستخدم والورشة الحالية.</p>
      </section>
      <div className="section-head"><div><p className="eyebrow">وحدات التشغيل</p><h2>مساحة العمل</h2></div><span className="muted">5 وحدات</span></div>
      <section className="grid">
        {modules.map((m) => (
          <Link className="card module-card" key={m.n} href={m.href}>
            <div className="cardtop"><span>{m.n}</span><span className="active pill">{m.status}</span></div>
            <h3>{m.title}</h3><p>{m.desc}</p><span className="module-card-action">فتح الوحدة ←</span>
          </Link>
        ))}
      </section>
      <footer><span>Workshop Growth OS</span><span>عزل بيانات الورش • API موحّد • تشغيل مرحلي</span></footer>
    </main>
  );
}
