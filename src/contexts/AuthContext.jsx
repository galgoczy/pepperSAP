import { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase, onAuthError } from '../lib/supabase';

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null);

// Ensures a given single-use OAuth `code` is only exchanged once, even if the
// effect runs twice within the same page load (e.g. React StrictMode). A code
// that has already been consumed fails on the second exchange attempt.
let handledOAuthCode = null;

// Predefined user roles based on email. This is the login whitelist: a user
// with no profile row yet can only sign in if their email appears here (the
// profile is then created with the given role/unit). Keep this in sync with the
// real user_profiles table + units.name values.
const EMAIL_ROLE_MAP = {
  // Admins
  'gergo@pepperhouse.hu': { role: 'admin', unit_name: null },
  'info@pepperhouse.hu': { role: 'admin', unit_name: null },
  'hr@pepperhouse.hu': { role: 'admin', unit_name: null },
  'iroda@pepperhouse.hu': { role: 'admin', unit_name: null },
  'penzugy@pepperhouse.hu': { role: 'admin', unit_name: null },
  'admin@test.local': { role: 'admin', unit_name: null },
  // Events
  'events@pepperhouse.hu': { role: 'events', unit_name: 'Rendezvény Egység' },
  'rendezveny@pepperhouse.hu': { role: 'events', unit_name: 'Rendezvény Egység' },
  // Units (unit_name MUST exactly match units.name)
  'unit@pepperhouse.hu': { role: 'unit', unit_name: 'Szentkirályi' },
  'szentkiralyi@pepperhouse.hu': { role: 'unit', unit_name: 'Szentkirályi' },
  'knorr105@pepperhouse.hu': { role: 'unit', unit_name: 'Knorr 105' },
  'knorr69@pepperhouse.hu': { role: 'unit', unit_name: 'Knorr 69' },
  'rsr@pepperhouse.hu': { role: 'unit', unit_name: 'RSR' },
  // Accountant (read-only)
  'konyveles@pepperhouse.hu': { role: 'accountant', unit_name: null },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState(false);
  const userRef = useRef(null);
  const isSigningOut = useRef(false);

  // Keep userRef in sync with user state
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Create or update user profile based on email
  const ensureUserProfile = useCallback(async (authUser) => {
    const email = authUser.email?.toLowerCase();
    const roleConfig = EMAIL_ROLE_MAP[email];

    if (!roleConfig) {
      console.warn('Unknown user email:', email);
      // Don't create profile for unknown users
      return null;
    }

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (existingProfile) {
      return existingProfile;
    }

    // Get unit_id if needed
    let unitId = null;
    if (roleConfig.unit_name) {
      const { data: unit } = await supabase
        .from('units')
        .select('id')
        .eq('name', roleConfig.unit_name)
        .single();
      unitId = unit?.id || null;
    }

    // Create new profile. Note: user_profiles has no email column (email lives
    // on auth.users), so we must not send it or the insert fails.
    const newProfile = {
      id: authUser.id,
      full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || email.split('@')[0],
      role: roleConfig.role,
      unit_id: unitId,
    };

    const { data: createdProfile, error } = await supabase
      .from('user_profiles')
      .insert(newProfile)
      .select()
      .single();

    if (error) {
      console.error('Error creating user profile:', error);
      return null;
    }

    return createdProfile;
  }, []);

  const fetchProfile = useCallback(async (userId, authUser = null) => {
    try {
      let { data, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          units (
            id,
            name,
            type
          )
        `)
        .eq('id', userId)
        .single();

      // If profile doesn't exist and we have authUser, try to create it
      if (error && authUser) {
        const newProfile = await ensureUserProfile(authUser);
        if (newProfile) {
          // Fetch again with unit relation
          const { data: refetchedData } = await supabase
            .from('user_profiles')
            .select(`
              *,
              units (
                id,
                name,
                type
              )
            `)
            .eq('id', userId)
            .single();
          data = refetchedData;
        }
      }

      if (data) {
        setProfile({
          ...data,
          unit_name: data.units?.name,
          unit_type: data.units?.type,
        });
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [ensureUserProfile]);

  // Session refresh function
  const refreshSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Session refresh error:', error);
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        return null;
      }
      return session;
    } catch (error) {
      console.error('Session refresh failed:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // DEBUG: Skip auth with ?skip_auth=true URL parameter (development builds only)
    const urlParams = new URLSearchParams(window.location.search);
    if (import.meta.env.DEV && urlParams.get('skip_auth') === 'true') {
      console.log('DEBUG: Skipping auth, using mock admin user');
      setUser({ id: 'debug-user', email: 'debug@pepperhouse.hu' });
      setProfile({
        id: 'debug-user',
        role: 'admin',
        full_name: 'Debug Admin',
        email: 'debug@pepperhouse.hu'
      });
      setLoading(false);
      return;
    }

    if (import.meta.env.DEV) {
      console.log('AuthContext: Starting session fetch...');
      console.log('AuthContext: Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
      console.log('AuthContext: Anon key set:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
      console.log('AuthContext: localStorage keys:', Object.keys(localStorage));
      console.log('AuthContext: Browser:', navigator.userAgent);
    }

    // Check if we're in an OAuth callback (code in URL) - handle manually for Safari compatibility
    const authCode = urlParams.get('code');
    const authError = urlParams.get('error');
    const authErrorDesc = urlParams.get('error_description');

    if (authError) {
      console.error('AuthContext: OAuth error in URL:', authError, authErrorDesc);
      window.history.replaceState({}, '', window.location.pathname);
      setLoading(false);
      return () => { mounted = false; };
    }

    if (authCode) {
      // Guard against exchanging the same single-use code twice (StrictMode
      // double-invoke, remounts) - a consumed code fails on the second attempt.
      if (handledOAuthCode === authCode) {
        return () => { mounted = false; };
      }
      handledOAuthCode = authCode;

      console.log('AuthContext: OAuth callback detected, completing exchange...');

      // Remove the code from the URL up front so a reload/remount can't reuse it.
      window.history.replaceState({}, '', window.location.pathname);

      const clearPkceState = () => {
        try {
          localStorage.removeItem('supabase.auth.token-code-verifier');
        } catch {
          /* ignore storage errors */
        }
      };

      // Safety timeout: never let a stalled exchange leave the user on an
      // infinite spinner. Falls back to the login screen and clears the stale
      // PKCE verifier so the next attempt starts from a clean state.
      const exchangeTimeout = setTimeout(() => {
        if (mounted) {
          console.error('AuthContext: OAuth exchange timed out - showing login');
          clearPkceState();
          setLoading(false);
        }
      }, 12000);

      supabase.auth.exchangeCodeForSession(authCode)
        .then(({ data, error }) => {
          clearTimeout(exchangeTimeout);
          if (!mounted) return;

          if (error) {
            console.error('AuthContext: Code exchange failed:', error.message || error);
            clearPkceState();
            setLoading(false);
            return;
          }

          if (data?.session) {
            setUser(data.session.user);
            fetchProfile(data.session.user.id, data.session.user);
          } else {
            console.warn('AuthContext: No session after code exchange');
            setLoading(false);
          }
        })
        .catch(err => {
          clearTimeout(exchangeTimeout);
          console.error('AuthContext: exchangeCodeForSession exception:', err?.message || err);
          clearPkceState();
          if (mounted) setLoading(false);
        });

      // Don't run the normal getSession flow when handling OAuth callback
      return () => { mounted = false; };
    }

    // Get initial session with timeout
    const sessionTimeout = setTimeout(async () => {
      if (mounted && loading) {
        console.error('Session fetch timeout - clearing data and showing login');
        // Clear all storage
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('supabase') || key.includes('sb-'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        sessionStorage.clear();
        // Try to clear IndexedDB (Safari-compatible)
        try {
          // indexedDB.databases() is not supported in Safari
          // So we try to delete known Supabase database names directly
          const knownDatabases = [
            'supabase-auth',
            'supabase.auth.token',
            'supabase-local-storage'
          ];
          knownDatabases.forEach(dbName => {
            try {
              indexedDB.deleteDatabase(dbName);
            } catch {
              // Ignore individual deletion errors
            }
          });

          // Also try the enumeration method for browsers that support it
          if (typeof indexedDB.databases === 'function') {
            const dbs = await indexedDB.databases();
            for (const db of dbs) {
              if (db.name) indexedDB.deleteDatabase(db.name);
            }
          }
        } catch (e) {
          console.log('Could not clear IndexedDB:', e);
        }
        // Show login page
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    }, 5000); // 5 second timeout

    console.log('AuthContext: Calling supabase.auth.getSession()...');
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        console.log('AuthContext: getSession resolved', { hasSession: !!session, error });
        clearTimeout(sessionTimeout);
        if (!mounted) return;
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id, session.user);
        } else {
          setLoading(false);
        }
      })
      .catch((error) => {
        clearTimeout(sessionTimeout);
        console.error('Session fetch failed:', error);
        if (mounted) setLoading(false);
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id, session.user);
        }
      }
    });

    // Set up periodic session check (every 4 minutes)
    const sessionCheckInterval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session && userRef.current) {
        console.log('Session expired, attempting refresh...');
        await refreshSession();
      }
    }, 4 * 60 * 1000);

    // Set up visibility change handler to refresh on tab focus
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') {
        // Tab hidden: stop the auto-refresh timer. Browsers heavily throttle
        // timers in background tabs, so the built-in refresh can miss and the
        // access token silently expires - which is what makes the app load so
        // slowly (or hang) when you come back after being idle.
        supabase.auth.stopAutoRefresh();
        return;
      }

      // Tab visible again: resume proactive token refresh and immediately make
      // sure we have a valid session, so the queries that fire on focus don't
      // stall on an expired token (no manual page reload needed).
      supabase.auth.startAutoRefresh();

      if (userRef.current) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            console.log('Tab focused but session expired, refreshing...');
            const newSession = await refreshSession();
            if (!newSession) {
              console.log('Could not refresh session, forcing logout');
              setUser(null);
              setProfile(null);
              setSessionError(true);
              setLoading(false);
            }
          }
        } catch (error) {
          console.error('Error checking session on visibility change:', error);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Listen for auth errors from API calls
    const unsubscribeAuthError = onAuthError((error) => {
      console.log('Auth error detected in API call:', error);
      if (userRef.current && !isSigningOut.current) {
        // Session is invalid, force logout
        setUser(null);
        setProfile(null);
        setSessionError(true);
        setLoading(false);
        supabase.auth.signOut().catch(() => {});
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearInterval(sessionCheckInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      unsubscribeAuthError();
    };
  }, [fetchProfile, refreshSession]);

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = useCallback(async () => {
    // Prevent multiple simultaneous signout attempts
    if (isSigningOut.current) return { error: null };
    isSigningOut.current = true;

    try {
      // Always clear local state first, regardless of API response
      setUser(null);
      setProfile(null);
      setSessionError(false);
      setLoading(false);

      // Then try to sign out from Supabase (might fail if session already expired)
      await supabase.auth.signOut().catch(() => {
        // Ignore errors - we've already cleared local state
      });

      // Clear any cached data
      localStorage.removeItem('supabase.auth.token');

      return { error: null };
    } finally {
      isSigningOut.current = false;
    }
  }, []);

  // Force logout - used when session is completely invalid
  const forceLogout = useCallback(() => {
    setUser(null);
    setProfile(null);
    setSessionError(true);
    setLoading(false);
    // Try to clear Supabase session without waiting
    supabase.auth.signOut().catch(() => {});
  }, []);

  const value = {
    user,
    profile,
    loading,
    sessionError,
    signIn,
    signOut,
    forceLogout,
    isAuthenticated: !!user,
    isAdmin: profile?.role === 'admin',
    isUnit: profile?.role === 'unit',
    isEvents: profile?.role === 'events',
    isAccountant: profile?.role === 'accountant',
    canEdit: profile?.role !== 'accountant',
    canViewAllUnits: profile?.role === 'admin' || profile?.role === 'accountant',
    unitId: profile?.unit_id,
    role: profile?.role,
    refetchProfile: () => user && fetchProfile(user.id),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
