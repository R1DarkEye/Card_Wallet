import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!supabaseConfigured) {
  console.warn('Supabase env vars missing: NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

const buildClient = (accessToken?: string | null) =>
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      : undefined
  });

export let supabase = supabaseConfigured ? buildClient(null) : (null as any);

let activeUserId: string | null = null;

export const setActiveUserId = (userId: string | null) => {
  activeUserId = userId;
};

export const getActiveUserId = () => activeUserId;

export const setSupabaseAuthToken = (accessToken: string | null) => {
  if (!supabaseConfigured) return;
  supabase = buildClient(accessToken);
};
