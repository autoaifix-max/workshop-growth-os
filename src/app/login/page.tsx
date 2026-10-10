"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [configReady, setConfigReady] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth") === "callback_failed") {
      setNotice("تعذر إكمال رابط الدعوة. تحقق من إعداد رابط إعادة التوجيه في Supabase ثم أعد فتح رسالة الدعوة.");
    }
    try {
      getSupabaseBrowserClient();
    } catch (cause) {
      setConfigReady(false);
      setError(cause instanceof Error ? cause.message : "إعدادات Supabase غير مكتملة.");
    }
  }, []);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) throw new Error("تعذر تسجيل الدخول. تحقق من البريد وكلمة المرور.");
      const params = new URLSearchParams(window.location.search);
      const requestedNext = params.get("next");
      const nextPath = requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//")
        ? requestedNext
        : "/admin/bookings";
      window.location.assign(nextPath);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر تسجيل الدخول.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <Link href="/" className="auth-brand"><span className="brand-mark">WG</span><span><strong>Workshop Growth OS</strong><small>إدارة الورشة</small></span></Link>
        <p className="admin-eyebrow">مساحة تشغيل خاصة</p>
        <h1>تسجيل الدخول</h1>
        <p className="auth-description">استخدم حسابًا تمت دعوته مسبقًا من خلال Supabase Authentication. لا يوجد تسجيل عام مفتوح.</p>
        <form className="auth-form" onSubmit={signIn}>
          <label className="booking-create-field"><span>البريد الإلكتروني</span><input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} disabled={!configReady || loading} /></label>
          <label className="booking-create-field"><span>كلمة المرور</span><input type="password" autoComplete="current-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} disabled={!configReady || loading} /></label>
          <button className="primary-button auth-submit" type="submit" disabled={!configReady || loading}>{loading ? "جارٍ تسجيل الدخول…" : "دخول إلى الورشة"}</button>
        </form>
        {notice && <p className="auth-notice" role="status">{notice}</p>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        <p className="auth-footnote">لم تتم دعوتك بعد؟ يجب على مسؤول النظام إنشاء المستخدم من Supabase Authentication ثم إرسال دعوة آمنة.</p>
        <Link href="/" className="wg-text-link">العودة إلى الصفحة الرئيسية</Link>
      </section>
    </main>
  );
}
