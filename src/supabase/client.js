import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const judgeClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'artfest-judge-auth',
  },
})

// Throwaway client used to re-verify judge credentials without disturbing the
// judge panel's active session (no persistence, no token swap).
// Unique storageKey avoids colliding with the main `supabase` client's default
// key ("sb-<project>-auth-token"), which would trigger the
// "Multiple GoTrueClient instances" warning and undefined behavior.
export const verifyJudgeClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    storageKey: 'artfest-verify-auth',
  },
})