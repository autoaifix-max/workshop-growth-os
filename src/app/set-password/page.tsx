"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function SetPasswordPage() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function checkInvitation() {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error: userError } = await supabase.auth.getUser();
        if (userError || !data.user) {
          if (active) setError("لم يتم العثور على جلسة دعوة فعّالة. افتح رابط الدعوة الذي وصلك عبر البريد أولًا.");
        } else if (active) {
          setEmail(data.user.email ?? "");
          setReady(true);
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "تعذر التحقق من جلسة الدعوة.");
      } finally {
        if (active) setChecking(false);
      }
    }
    void checkInvitation();
    return () => { active = false; };
  }, []);

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (newPassword.length < 8) {
      setError("استخدم كلمة مرور من 8 أحرف على الأقل.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("تأكيد كلمة المرور غير مطابق.");
      return;
    }
    setSaving(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw new Error("تعذر حفظ كلمة المرور. أعد فتح رابط الدعوة إذا انتهت صلاحيته.");
      setMessage("تم ضبط كلمة المرور. جارٍ فتح مساحة الورشة…");
      window.location.assign("/admin/bookings");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر حفظ كلمة المرور.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <Link href="/" className="auth-brand"><span className="brand-mark">WG</span><span><strong>Workshop Growth OS</strong><small>تهيئة حساب المالك</small></span></Link>
        <p className="admin-eyebrow">إكمال الدعوة</p>
        <h1>ضبط كلمة المرور</h1>
        {checking && <p className="auth-description">جارٍ التحقق من رابط الدعوة…</p>}
        {!checking && ready && <>
          <p className="auth-description">الحساب: <strong dir="ltr">{email}</strong></p>
          <form className="auth-form" onSubmit={savePassword}>
            <label className="booking-create-field"><span>كلمة المرور الجديدة</span><input type="password" required minLength={8} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} disabled={saving} /></label>
            <label className="booking-create-field"><span>تأكيد كلمة المرور</span><input type="password" required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} disabled={saving} /></label>
            <button className="primary-button auth-submit" type="submit" disabled={saving}>{saving ? "جارٍ الحفظ…" : "حفظ كلمة المرور"}</button>
          </form>
        </>}
        {message && <p className="auth-notice" role="status">{message}</p>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        <Link href="/login" className="wg-text-link">الانتقال إلى تسجيل الدخول</Link>
      </section>
    </main>
  );
}
