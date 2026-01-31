import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    // Try session-based auth first
    const auth = req.headers.get('authorization') || '';
    if (auth.startsWith('Bearer ')) {
      const token = auth.substring(7);
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseAnonKey) {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        
        if (!userError && user) {
          const userRole = user.app_metadata?.role;
          // Only allow Admin or Manager to list users
          if (userRole === 'Admin' || userRole === 'Manager') {
            const admin = getSupabaseAdmin();
            const { data, error } = await admin.auth.admin.listUsers();
            
            if (error) {
              return NextResponse.json({ error: error.message }, { status: 400 });
            }

            const users = data.users.map((user: any) => ({
              id: user.id,
              email: user.email,
              nama: user.user_metadata?.full_name || user.user_metadata?.nama || '',
              role: user.app_metadata?.role || null,
              apotikIds: user.app_metadata?.apotikIds || [],
              isSuperAdmin: user.app_metadata?.isSuperAdmin || false,
              created_at: user.created_at,
              last_sign_in_at: user.last_sign_in_at,
              email_confirmed_at: user.email_confirmed_at,
            }));

            return NextResponse.json({ users }, { status: 200 });
          } else {
            // User doesn't have required role
            return NextResponse.json({ 
              error: `Unauthorized: Role '${userRole || 'None'}' tidak memiliki akses. Hanya Admin atau Manager yang dapat mengakses halaman ini.` 
            }, { status: 403 });
          }
        } else {
          // Token validation failed
          return NextResponse.json({ 
            error: 'Unauthorized: Token tidak valid atau session telah berakhir' 
          }, { status: 401 });
        }
      }
    }
    
    // Fallback to ADMIN_API_TOKEN for backward compatibility
    const adminToken = process.env.ADMIN_API_TOKEN;
    const expected = adminToken ? `Bearer ${adminToken}` : '';
    if (!adminToken || auth !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.admin.listUsers();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const users = data.users.map((user: any) => ({
      id: user.id,
      email: user.email,
      nama: user.user_metadata?.full_name || user.user_metadata?.nama || '',
      role: user.app_metadata?.role || null,
      apotikIds: user.app_metadata?.apotikIds || [],
      isSuperAdmin: user.app_metadata?.isSuperAdmin || false,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      email_confirmed_at: user.email_confirmed_at,
    }));

    return NextResponse.json({ users }, { status: 200 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
