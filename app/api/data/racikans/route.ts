import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const RACIKANS_KEY = "racikans";

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
 * GET /api/data/racikans
 * Mengembalikan daftar racikan dari server (untuk POS saat localStorage kosong).
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
      .eq("key", RACIKANS_KEY)
      .single();
    if (error) {
      if (error.code === "PGRST116") return NextResponse.json([], { status: 200 });
      console.error("racikans GET error:", error);
      return NextResponse.json([], { status: 200 });
    }
    const list = Array.isArray(data?.value) ? data.value : [];
    return NextResponse.json(list, { status: 200 });
  } catch (e) {
    console.error("racikans GET:", e);
    return NextResponse.json([], { status: 200 });
  }
}

/**
 * POST /api/data/racikans
 * Menyimpan daftar racikan ke server (dipanggil dari Data Master > Racikan saat simpan).
 */
export async function POST(req: Request) {
  const isAdmin = await checkAdminAuth(req);
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const racikans = Array.isArray(body?.racikans) ? body.racikans : [];
    const admin = getSupabaseAdmin();
    const { error } = await admin
      .from("app_config")
      .upsert({ key: RACIKANS_KEY, value: racikans }, { onConflict: "key" });
    if (error) {
      console.error("racikans POST error:", error);
      return NextResponse.json(
        { error: error.message, hint: "Pastikan tabel app_config ada (lihat supabase-app_config.sql)." },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
