import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const APOTIKS_KEY = "apotiks";

function checkAuth(req: Request): Promise<{ authorized: boolean; token?: string }> {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return Promise.resolve({ authorized: false });
  const token = auth.substring(7);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return Promise.resolve({ authorized: false });
  const supabase = createClient(url, anonKey);
  return supabase.auth.getUser(token).then(({ data: { user }, error }) => ({
    authorized: !error && !!user,
    token,
  }));
}

function checkAdminAuth(req: Request): Promise<boolean> {
  return checkAuth(req).then(async ({ authorized, token }) => {
    if (!authorized || !token) return false;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) return false;
    const supabase = createClient(url, anonKey);
    const { data: { user } } = await supabase.auth.getUser(token);
    const role = user?.app_metadata?.role;
    return role === "Admin" || role === "Manager";
  });
}

/**
 * GET /api/data/apotiks
 * Mengembalikan daftar apotik dari server (untuk POS saat localStorage kosong).
 * Butuh tabel: create table if not exists app_config (key text primary key, value jsonb);
 */
export async function GET(req: Request) {
  const { authorized } = await checkAuth(req);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("app_config")
      .select("value")
      .eq("key", APOTIKS_KEY)
      .single();
    if (error) {
      if (error.code === "PGRST116") return NextResponse.json([], { status: 200 });
      console.error("apotiks GET error:", error);
      return NextResponse.json([], { status: 200 });
    }
    const row = data as { value?: unknown } | null;
    const list = Array.isArray(row?.value) ? row.value : [];
    return NextResponse.json(list, { status: 200 });
  } catch (e) {
    console.error("apotiks GET:", e);
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/data/apotiks
 * Menyimpan daftar apotik ke server (dipanggil dari Data Master > Apotik saat simpan).
 */
export async function POST(req: Request) {
  const isAdmin = await checkAdminAuth(req);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const apotiks = Array.isArray(body?.apotiks) ? body.apotiks : [];
    const admin = getSupabaseAdmin();
    const { error } = await (admin as any)
      .from("app_config")
      .upsert({ key: APOTIKS_KEY, value: apotiks }, { onConflict: "key" });
    if (error) {
      console.error("apotiks POST error:", error);
      return NextResponse.json(
        { error: error.message, hint: "Buat tabel: create table if not exists app_config (key text primary key, value jsonb);" },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
