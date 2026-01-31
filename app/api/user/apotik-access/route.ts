import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * GET /api/user/apotik-access
 * Mengembalikan apotikIds dan isSuperAdmin user yang login dari database (bukan dari JWT),
 * agar daftar apotik POS selalu sesuai assign terbaru meskipun session belum di-refresh.
 */
export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = auth.substring(7);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: "Server config error" }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const admin = getSupabaseAdmin();
    const {
      data: { user: adminUser },
      error: adminError,
    } = await admin.auth.admin.getUserById(user.id);
    if (adminError || !adminUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }
    const apotikIds = (adminUser.app_metadata?.apotikIds as string[] | undefined) || [];
    const isSuperAdmin = !!adminUser.app_metadata?.isSuperAdmin;
    return NextResponse.json({ apotikIds, isSuperAdmin }, { status: 200 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
