import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/login?auth=callback_failed", url.origin));
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL("/login?auth=callback_failed", url.origin));
    }
    return NextResponse.redirect(new URL("/set-password", url.origin));
  } catch {
    return NextResponse.redirect(new URL("/login?auth=callback_failed", url.origin));
  }
}
