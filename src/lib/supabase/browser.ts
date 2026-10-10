import { createBrowserClient } from "@supabase/ssr";

let browserClientInstance: ReturnType<typeof createBrowserClient> | undefined;

export function getSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("إعدادات Supabase غير مكتملة. تحقق من NEXT_PUBLIC_SUPABASE_URL وNEXT_PUBLIC_SUPABASE_ANON_KEY في إعدادات الاستضافة.");
  }
  browserClientInstance ??= createBrowserClient(url, key);
  return browserClientInstance;
}
