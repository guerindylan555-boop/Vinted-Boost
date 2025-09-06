import 'react-native-url-polyfill/auto';
import { createClient, processLock } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL as string,
  process.env.EXPO_PUBLIC_SUPABASE_KEY as string,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
  }
);
