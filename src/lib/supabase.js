import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'x-client-info': 'pepper-house-app',
    },
  },
  // Add reasonable timeouts to prevent hanging
  realtime: {
    timeout: 10000,
  },
})

// Helper to check if an error is an auth error
export function isAuthError(error) {
  if (!error) return false;
  const authErrorCodes = ['PGRST301', 'PGRST302', '401', '403'];
  const authErrorMessages = ['JWT', 'token', 'unauthorized', 'not authenticated', 'session'];

  const errorString = JSON.stringify(error).toLowerCase();
  return (
    authErrorCodes.some(code => error.code === code || error.status === parseInt(code)) ||
    authErrorMessages.some(msg => errorString.includes(msg))
  );
}

// Event emitter for auth errors
const authErrorListeners = new Set();

export function onAuthError(callback) {
  authErrorListeners.add(callback);
  return () => authErrorListeners.delete(callback);
}

export function emitAuthError(error) {
  authErrorListeners.forEach(callback => callback(error));
}
