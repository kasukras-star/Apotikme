import { createClient } from '@supabase/supabase-js';

let client: ReturnType<typeof createClient> | null = null;

function isInvalidRefreshTokenError(e: unknown): boolean {
  const err = e as { message?: string; name?: string };
  return (
    err?.name === 'AuthApiError' ||
    (typeof err?.message === 'string' &&
      (err.message.includes('Refresh Token') || err.message.includes('refresh_token')))
  );
}

export function getSupabaseClient() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      'Supabase env belum dikonfigurasi. Tambahkan NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY di Vercel → Project Settings → Environment Variables, lalu redeploy.'
    );
  }
  const isBrowser = typeof window !== 'undefined';
  client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: isBrowser ? window.localStorage : undefined,
      storageKey: 'simatik-auth',
    },
  });

  // Jika refresh token invalid (revoked/expired), bersihkan session agar user bisa login lagi
  if (isBrowser) {
    const auth = client.auth;
    const originalGetSession = auth.getSession.bind(auth);
    type SessionResult = Awaited<ReturnType<typeof originalGetSession>>;
    (auth as { getSession: () => Promise<SessionResult> }).getSession = async (): Promise<SessionResult> => {
      try {
        return await originalGetSession();
      } catch (e) {
        if (isInvalidRefreshTokenError(e)) {
          await auth.signOut();
          return { data: { session: null }, error: e } as SessionResult;
        }
        throw e;
      }
    };
  }

  return client;
}
