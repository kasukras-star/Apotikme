import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const ALLOWED_KEYS = new Set([
  "products",
  "suppliers",
  "customers",
  "apotiks",
  "units",
  "kategoris",
  "types",
  "jenis",
  "margins",
  "racikans",
  "pesananPembelian",
  "fakturPembelian",
  "penyesuaianStok",
  "transferBarang",
  "rencanaTransferBarang",
  "penerimaanPembelian",
  "terimaTransfer",
  "pengajuanTerimaTransfer",
  "stokOpname",
  "penjualan",
  "pengajuanPembelian",
  "pengajuanPenerimaanPembelian",
  "pengajuanApotik",
  "pengajuanUnit",
  "pengajuanSupplier",
  "pengajuanCustomer",
  "pengajuanKategori",
  "pengajuanType",
  "pengajuanJenis",
  "pengajuanMargin",
  "pengajuanProduk",
  "pengajuanRacikan",
  "pengajuanPenyesuaianStok",
  "pengajuanTransferBarang",
  "pengajuanPenerimaanPembelian",
  "pengajuanPerubahanHargaJual",
  "pengaturanPerusahaan",
  "pengaturanSistem",
]);

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  if (!key || !ALLOWED_KEYS.has(key)) {
    return NextResponse.json({ error: "Invalid or disallowed key" }, { status: 400 });
  }
  const { authorized } = await checkAuth(req);
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("app_config")
      .select("value")
      .eq("key", key)
      .single();
    if (error) {
      if (error.code === "PGRST116") return NextResponse.json([], { status: 200 });
      console.error("data/[key] GET error:", error);
      return NextResponse.json([], { status: 200 });
    }
    const row = data as { value?: unknown } | null;
    const value = row?.value;
    if (value === undefined || value === null) return NextResponse.json([], { status: 200 });
    return NextResponse.json(value, { status: 200 });
  } catch (e) {
    console.error("data/[key] GET:", e);
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Keys that any authenticated user can POST (e.g. POS saves penjualan and product stock updates)
const POST_ANY_AUTH_KEYS = new Set(["penjualan", "products"]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  if (!key || !ALLOWED_KEYS.has(key)) {
    return NextResponse.json({ error: "Invalid or disallowed key" }, { status: 400 });
  }
  const allowAnyAuth = POST_ANY_AUTH_KEYS.has(key);
  if (allowAnyAuth) {
    const { authorized } = await checkAuth(req);
    if (!authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    const isAdmin = await checkAdminAuth(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  }
  try {
    const body = await req.json();
    const value = body?.value !== undefined ? body.value : body;
    const admin = getSupabaseAdmin();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any).from("app_config").upsert({ key, value }, { onConflict: "key" });
    if (error) {
      console.error("data/[key] POST error:", error);
      return NextResponse.json(
        { error: (error as { message?: string }).message ?? "Database error" },
        { status: 400 }
      );
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
