import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;
let startupError: Error | null = null;

try {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your deployment environment.');
  }

  client = createClient(url, key);
} catch (error) {
  startupError = error instanceof Error ? error : new Error('Failed to initialize Supabase client.');
  console.error(startupError.message);
}

export const supabase = client;

export function getSupabaseError() {
  return startupError;
}
