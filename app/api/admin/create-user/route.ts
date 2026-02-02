import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';

async function checkAdminAuth(req: Request): Promise<boolean> {
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
        return userRole === 'Admin' || userRole === 'Manager';
      }
    }
  }
  
  // Fallback to ADMIN_API_TOKEN
  const adminToken = process.env.ADMIN_API_TOKEN;
  const expected = adminToken ? `Bearer ${adminToken}` : '';
  return !!(adminToken && auth === expected);
}

export async function POST(req: Request) {
  const isAuthorized = await checkAdminAuth(req);
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const email = body?.email as string | undefined;
  const password = body?.password as string | undefined;
  const nama = body?.nama as string | undefined;
  const role = body?.role as string | undefined;
  const apotikIds = body?.apotikIds as string[] | undefined;
  const isSuperAdmin = body?.isSuperAdmin as boolean | undefined;

  if (!email || !password) {
    return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
  }

  // Validate apotikIds if provided
  if (apotikIds && !Array.isArray(apotikIds)) {
    return NextResponse.json({ error: 'apotikIds must be an array' }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdmin();
    
    // Build app_metadata
    const appMetadata: any = {};
    if (role) {
      appMetadata.role = role;
    }
    if (apotikIds && apotikIds.length > 0) {
      appMetadata.apotikIds = apotikIds;
    }
    if (isSuperAdmin !== undefined) {
      appMetadata.isSuperAdmin = isSuperAdmin;
    }
    
    const userMetadata = nama ? { full_name: nama } : undefined;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userMetadata,
      app_metadata: Object.keys(appMetadata).length > 0 ? appMetadata : undefined,
    });
    if (error) {
      if (error.message && error.message.includes('already been registered')) {
        const { data: listData, error: listError } = await admin.auth.admin.listUsers();
        if (listError) {
          return NextResponse.json({ error: listError.message }, { status: 400 });
        }
        const existing = listData?.users?.find((u: { email?: string }) => u.email === email);
        if (!existing) {
          return NextResponse.json({ error: 'User exists but not found in list' }, { status: 404 });
        }
        // Build app_metadata for update
        const updateMetadata: any = { ...existing.app_metadata };
        if (role) {
          updateMetadata.role = role;
        }
        if (apotikIds && apotikIds.length > 0) {
          updateMetadata.apotikIds = apotikIds;
        }
        if (isSuperAdmin !== undefined) {
          updateMetadata.isSuperAdmin = isSuperAdmin;
        }
        
        const { data: updData, error: updError } = await admin.auth.admin.updateUserById(existing.id, {
          password,
          email_confirm: true,
          app_metadata: updateMetadata,
        });
        if (updError) {
          return NextResponse.json({ error: updError.message }, { status: 400 });
        }
        return NextResponse.json({ user: updData.user, updated: true }, { status: 200 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ user: data.user }, { status: 200 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
