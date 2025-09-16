import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY; // ✅ matches your .env

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL or Key is missing! Make sure VITE_SUPABASE_URL and VITE_SUPABASE_KEY are set in .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
