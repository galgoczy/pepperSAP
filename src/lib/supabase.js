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

// Check for orphaned PKCE code verifier (incomplete OAuth flow)
// This can cause getSession() to hang waiting for a token exchange that never completes
const hasCodeVerifier = localStorage.getItem('supabase.auth.token-code-verifier');
const hasSessionToken = localStorage.getItem('supabase.auth.token');
if (hasCodeVerifier && !hasSessionToken) {
  console.log('Found orphaned PKCE code verifier without session, clearing...');
  localStorage.removeItem('supabase.auth.token-code-verifier');
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
  // Clear the flag
  localStorage.removeItem('supabase_session_timeout');
}

// Custom fetch with timeout for Safari compatibility
const fetchWithTimeout = (url, options = {}) => {
  console.log('Supabase fetch:', url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  return fetch(url, {
    ...options,
    signal: controller.signal,
  })
    .then(response => {
      console.log('Supabase fetch response:', url, response.status);
      return response;
    })
    .catch(error => {
      console.error('Supabase fetch error:', url, error.message);
      throw error;
    })
    .finally(() => clearTimeout(timeout));
};

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder', {
  auth: {
    autoRefreshToken: !hadPreviousTimeout, // Disable auto refresh if we had timeout
    persistSession: !hadPreviousTimeout,   // Disable persistence if we had timeout
    detectSessionInUrl: true,
    flowType: 'pkce', // Explicit PKCE flow for better cross-browser compatibility
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'supabase.auth.token',
  },
  global: {
    headers: {
      'x-client-info': 'pepper-house-app',
    },
    fetch: fetchWithTimeout,
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
