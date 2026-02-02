/**
 * Load data from API (Supabase via app_config), fallback to localStorage.
 * Call with getSupabaseClient().auth.getSession() token and keys for main + pengajuan.
 */
export async function loadFromApi<T = unknown>(
  token: string,
  key: string,
  pengajuanKey?: string
): Promise<{ data: T[]; pengajuan: unknown[] }> {
  const [dataRes, pengajuanRes] = await Promise.all([
    fetch(`/api/data/${key}`, { headers: { Authorization: `Bearer ${token}` } }),
    pengajuanKey
      ? fetch(`/api/data/${pengajuanKey}`, { headers: { Authorization: `Bearer ${token}` } })
      : Promise.resolve(null),
  ]);
  const dataArr: T[] = dataRes.ok ? await dataRes.json() : [];
  const pengajuanArr: unknown[] =
    pengajuanRes && pengajuanRes.ok ? await pengajuanRes.json() : [];
  return { data: Array.isArray(dataArr) ? dataArr : [], pengajuan: Array.isArray(pengajuanArr) ? pengajuanArr : [] };
}

/**
 * POST value to API for the given key.
 */
export async function saveToApi(token: string, key: string, value: unknown): Promise<boolean> {
  const res = await fetch(`/api/data/${key}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ value }),
  });
  return res.ok;
}
