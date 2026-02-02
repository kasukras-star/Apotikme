import { NextResponse } from "next/server";

/**
 * GET /api/health
 * Returns whether Supabase env is configured (without exposing secrets).
 * Useful to verify Vercel env vars are set.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseConfigured = !!(url && serviceKey);
  return NextResponse.json({ supabaseConfigured }, { status: 200 });
}
