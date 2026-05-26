import { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase, onAuthError } from '../lib/supabase';

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null);

// Predefined user roles based on email
const EMAIL_ROLE_MAP = {
  // Admins
  'gergo@pepperhouse.hu': { role: 'admin', unit_name: null },
  'info@pepperhouse.hu': { role: 'admin', unit_name: null },
  'penzugy@pepperhouse.hu': { role: 'admin', unit_name: null },
  'iroda@pepperhouse.hu': { role: 'admin', unit_name: null },
  'hr@pepperhouse.hu': { role: 'admin', unit_name: null },

  // Unit users
  'szentkiralyi@pepperhouse.hu': { role: 'unit', unit_name: 'Szentkirályi' },
  'allamkincstar@pepperhouse.hu': { role: 'unit', unit_name: 'Államkincstár' },
  'knorr69@pepperhouse.hu': { role: 'unit', unit_name: 'Knorr 69' },
  'knorr86@pepperhouse.hu': { role: 'unit', unit_name: 'Knorr 86' },
  'knorr105@pepperhouse.hu': { role: 'unit', unit_name: 'Knorr 105' },
  'kti@pepperhouse.hu': { role: 'unit', unit_name: 'KTI' },
  'rsr@pepperhouse.hu': { role: 'unit', unit_name: 'RSR' },

  // Events
  'rendezveny@pepperhouse.hu': { role: 'events', unit_name: 'Rendezvény Egység' },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState(false);
  const [viewAsRole, setViewAsRole] = useState(null); // For testing: 'admin', 'unit', 'events', or null
  const [viewAsUnit, setViewAsUnit] = useState(null); // Simulated unit for testing
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

    // Create new profile
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

    // DEBUG: Skip auth with ?skip_auth=true URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('skip_auth') === 'true') {
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

    console.log('AuthContext: Starting session fetch...');
    console.log('AuthContext: Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
    console.log('AuthContext: Anon key set:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
    console.log('AuthContext: localStorage keys:', Object.keys(localStorage));
    console.log('AuthContext: Browser:', navigator.userAgent);

    // Check if we're in an OAuth callback (code in URL) - handle manually for Safari compatibility
    const authCode = urlParams.get('code');
    if (authCode) {
      console.log('AuthContext: OAuth callback detected, manually exchanging code...');

      supabase.auth.exchangeCodeForSession(authCode)
        .then(({ data, error }) => {
          console.log('AuthContext: exchangeCodeForSession result:', { hasSession: !!data?.session, error });

          // Clear the URL params regardless of result
          window.history.replaceState({}, '', window.location.pathname);

          if (!mounted) return;

          if (error) {
            console.error('AuthContext: Code exchange failed:', error);
            setLoading(false);
            return;
          }

          if (data?.session) {
            console.log('AuthContext: Session established via manual exchange');
            setUser(data.session.user);
            fetchProfile(data.session.user.id, data.session.user);
          } else {
            console.log('AuthContext: No session after exchange');
            setLoading(false);
          }
        })
        .catch(err => {
          console.error('AuthContext: exchangeCodeForSession error:', err);
          window.history.replaceState({}, '', window.location.pathname);
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
            } catch (e) {
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
      if (document.visibilityState === 'visible' && userRef.current) {
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

  // Determine effective role (actual or simulated)
  const isTestAdmin = profile?.role === 'admin' &&
    (user?.email === 'gergo@pepperhouse.hu' ||
     user?.email === 'info@pepperhouse.hu' ||
     user?.email === 'admin@test.local');
  const effectiveRole = viewAsRole || profile?.role;
  const effectiveUnitId = viewAsRole ? viewAsUnit : profile?.unit_id;

  // Function to set view mode (only for test admin)
  const setViewMode = (role, unitId = null) => {
    if (!isTestAdmin) return;
    setViewAsRole(role);
    setViewAsUnit(unitId);
  };

  // Function to reset to admin view
  const resetViewMode = () => {
    setViewAsRole(null);
    setViewAsUnit(null);
  };

  const value = {
    user,
    profile,
    loading,
    sessionError,
    signIn,
    signOut,
    forceLogout,
    isAuthenticated: !!user,
    // Role checks use effective role when viewing as another role
    isAdmin: effectiveRole === 'admin',
    isUnit: effectiveRole === 'unit',
    isEvents: effectiveRole === 'events',
    isAccountant: effectiveRole === 'accountant',
    canEdit: effectiveRole !== 'accountant',
    canViewAllUnits: effectiveRole === 'admin' || effectiveRole === 'accountant',
    unitId: effectiveUnitId,
    role: effectiveRole,
    // Keep original role available
    actualRole: profile?.role,
    actualIsAdmin: profile?.role === 'admin',
    // View mode functions (only work for test admin)
    isTestAdmin,
    viewAsRole,
    setViewMode,
    resetViewMode,
    refetchProfile: () => user && fetchProfile(user.id),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
