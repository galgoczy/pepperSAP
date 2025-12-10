import { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase, onAuthError } from '../lib/supabase';

export const AuthContext = createContext(null);

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

  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
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

      if (error) throw error;

      setProfile({
        ...data,
        unit_name: data.units?.name,
        unit_type: data.units?.type,
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

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

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
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
          await fetchProfile(session.user.id);
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
    unitId: profile?.unit_id,
    role: profile?.role,
    refetchProfile: () => user && fetchProfile(user.id),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
