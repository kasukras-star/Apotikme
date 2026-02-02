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

export async function PATCH(req: Request) {
  const isAuthorized = await checkAdminAuth(req);
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const userId = body?.userId as string | undefined;
  const email = body?.email as string | undefined;
  const password = body?.password as string | undefined;
  const nama = body?.nama as string | undefined;
  const role = body?.role as string | undefined;
  const apotikIds = body?.apotikIds as string[] | undefined;
  const isSuperAdmin = body?.isSuperAdmin as boolean | undefined;
  const statusAktif = body?.statusAktif as boolean | undefined;

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  // Validate apotikIds if provided
  if (apotikIds !== undefined && !Array.isArray(apotikIds)) {
    return NextResponse.json({ error: 'apotikIds must be an array' }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdmin();
    
    const { data: userData, error: getUserError } = await admin.auth.admin.getUserById(userId);
    const existing = userData?.user;
    if (getUserError || !existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updateData: any = {};
    
    if (email !== undefined) {
      updateData.email = email;
    }
    
    if (password !== undefined) {
      updateData.password = password;
    }
    
    if (nama !== undefined) {
      updateData.user_metadata = { ...(existing.user_metadata || {}), full_name: nama };
    }
    
    // Handle app_metadata updates
    if (role !== undefined || apotikIds !== undefined || isSuperAdmin !== undefined) {
      updateData.app_metadata = { ...existing.app_metadata };
      if (role !== undefined) {
        updateData.app_metadata.role = role;
      }
      if (apotikIds !== undefined) {
        updateData.app_metadata.apotikIds = apotikIds;
      }
      if (isSuperAdmin !== undefined) {
        updateData.app_metadata.isSuperAdmin = isSuperAdmin;
      }
    }
    
    // Handle status aktif (ban/unban user)
    if (statusAktif !== undefined) {
      if (statusAktif === false) {
        // Ban user
        updateData.ban_duration = '876000h'; // ~100 years
      } else {
        // Unban user
        updateData.ban_duration = 'none';
      }
    }

    const { data, error } = await admin.auth.admin.updateUserById(userId, updateData);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ 
      user: {
        id: data.user.id,
        email: data.user.email,
        role: data.user.app_metadata?.role || null,
        apotikIds: data.user.app_metadata?.apotikIds || [],
        isSuperAdmin: data.user.app_metadata?.isSuperAdmin || false,
        created_at: data.user.created_at,
        last_sign_in_at: data.user.last_sign_in_at,
      }
    }, { status: 200 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
