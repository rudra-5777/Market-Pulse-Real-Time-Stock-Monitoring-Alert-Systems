import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.REACT_APP_SUPABASE_URL  ?? '';
const supabaseKey  = process.env.REACT_APP_SUPABASE_ANON_KEY ?? '';

/**
 * Returns true when both Supabase env vars are populated.
 * Used by hooks to decide whether to use real data or fall back to mocks.
 */
export const isSupabaseConfigured =
  supabaseUrl.startsWith('https://') && supabaseKey.length > 10;

/**
 * Typed Supabase client singleton.
 * When credentials are missing the client is still created but every
 * request will fail; callers should guard with `isSupabaseConfigured`.
 */
export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder');
