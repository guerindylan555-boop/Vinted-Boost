import { createClient } from '@supabase/supabase-js';

const url = (process as any)?.env?.SUPABASE_URL as string | undefined;
const serviceKey = (process as any)?.env?.SUPABASE_SERVICE_ROLE_KEY as string | undefined;

if (!url) throw new Error('Missing SUPABASE_URL');
if (!serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');

export const supaAdmin = createClient(url, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const BUCKET = (process as any)?.env?.SUPABASE_BUCKET || 'images';

