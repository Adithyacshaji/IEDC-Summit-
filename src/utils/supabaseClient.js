import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://wwsdhwghsbrwgxjobnnd.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_J0aGo2iR9-mR8DEIFMXzTw_H744R4N0";

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    "Supabase configuration missing (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). " +
    "The application will automatically fall back to static local data files."
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
