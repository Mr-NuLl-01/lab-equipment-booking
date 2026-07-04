export function getSupabaseUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!rawUrl) {
    throw new Error("缺少 NEXT_PUBLIC_SUPABASE_URL，请配置 Supabase 项目 URL");
  }

  try {
    const url = new URL(rawUrl);
    return url.origin;
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL 格式无效，请使用 https://xxx.supabase.co");
  }
}

export function getSupabaseAnonKey() {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) {
    throw new Error("缺少 NEXT_PUBLIC_SUPABASE_ANON_KEY，请配置 Supabase anon key");
  }
  return anonKey;
}
