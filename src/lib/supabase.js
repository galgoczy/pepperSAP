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
// BUT: Don't clear if we're in the middle of an OAuth callback (code in URL)
const hasCodeVerifier = localStorage.getItem('supabase.auth.token-code-verifier');
const hasSessionToken = localStorage.getItem('supabase.auth.token');
const urlParams = new URLSearchParams(window.location.search);
const hashParams = new URLSearchParams(window.location.hash.substring(1));
const hasAuthCodeInUrl = urlParams.has('code') || hashParams.has('access_token');
const hasError = urlParams.has('error') || hashParams.has('error');

if (import.meta.env.DEV) {
  console.log('OAuth debug:', {
    hasCodeVerifier: !!hasCodeVerifier,
    hasSessionToken: !!hasSessionToken,
    hasAuthCodeInUrl,
    hasError,
    urlCode: urlParams.get('code')?.substring(0, 20) + '...',
    urlError: urlParams.get('error'),
    errorDescription: urlParams.get('error_description'),
    hash: window.location.hash ? 'present' : 'none',
    fullUrl: window.location.href.substring(0, 100) + '...'
  });
}

if (hasError) {
  console.error('OAuth error detected:', urlParams.get('error'), urlParams.get('error_description'));
}

if (hasCodeVerifier && !hasSessionToken && !hasAuthCodeInUrl && !hasError) {
  console.log('Found orphaned PKCE code verifier without session (no OAuth callback in progress), clearing...');
  localStorage.removeItem('supabase.auth.token-code-verifier');
} else if (hasCodeVerifier && hasAuthCodeInUrl) {
  console.log('PKCE code verifier found with OAuth callback in URL - completing auth flow...');
}

// Pass-through auth lock.
//
// supabase-js serializes auth operations (getSession, exchangeCodeForSession,
// token refresh) behind a Web Locks (navigator.locks) lock and waits
// indefinitely to acquire it. In this app that lock was the cause of login
// hangs: a contended/stale lock made the OAuth exchange stall, and even after
// we bypassed it on a timeout, every auth operation still burned several
// seconds waiting for the lock first (the repeated "Auth lock not acquired"
// warnings) - which added up to the ~minute-long login delay.
//
// This app is effectively single-tab, so we skip the cross-tab lock entirely
// and run auth operations directly. Each underlying request still has its own
// 10s fetch timeout, so this cannot hang indefinitely.
//
// NOTE: the trade-off is that two browser tabs refreshing the token at the
// exact same moment are no longer serialized. If multi-tab token-refresh races
// ever surface, reintroduce a bounded lock here.
const authLock = async (_name, _acquireTimeout, fn) => fn();

// Custom fetch with timeout for Safari compatibility
const fetchWithTimeout = (url, options = {}) => {
  if (import.meta.env.DEV) console.log('Supabase fetch:', url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  return fetch(url, {
    ...options,
    signal: controller.signal,
  })
    .then(response => {
      if (import.meta.env.DEV) console.log('Supabase fetch response:', url, response.status);
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
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // We complete the OAuth (PKCE) callback manually in AuthContext.
    flowType: 'pkce', // Explicit PKCE flow for better cross-browser compatibility
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'supabase.auth.token',
    lock: authLock, // Bounded lock (see above) to avoid indefinite hangs.
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
