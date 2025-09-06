import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupaAdmin(): SupabaseClient {
  if (client) return client;
  const url = (process as any)?.env?.SUPABASE_URL as string | undefined;
  const serviceKey = (process as any)?.env?.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
  if (!url) throw new Error('Missing SUPABASE_URL');
  if (!serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  client = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

export function getBucket(): string {
  // Default to 'Image' to match your current bucket name unless overridden via env
  return (process as any)?.env?.SUPABASE_BUCKET || 'Image';
}
