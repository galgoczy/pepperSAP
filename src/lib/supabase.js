import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Check for missing environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!', {
    VITE_SUPABASE_URL: supabaseUrl ? 'set' : 'MISSING',
    VITE_SUPABASE_ANON_KEY: supabaseAnonKey ? 'set' : 'MISSING',
  });
}

// Check if we had a previous timeout (set by AuthContext)
const hadPreviousTimeout = localStorage.getItem('supabase_session_timeout') === 'true';
if (hadPreviousTimeout) {
  console.log('Previous session timeout detected, clearing all auth data...');
  // Clear all Supabase-related data
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('supabase') || key.includes('sb-'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
  // Also try to clear IndexedDB
  try {
    indexedDB.deleteDatabase('supabase-auth');
  } catch (e) {
    console.log('Could not clear IndexedDB:', e);
  }
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder', {
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
