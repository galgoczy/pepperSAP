import { createContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Session refresh function
  const refreshSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Session refresh error:', error);
        // If refresh fails, sign out
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
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
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
      console.log('Auth event:', event);

      if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
      }

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    // Set up periodic session check (every 4 minutes)
    const sessionCheckInterval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session && user) {
        // Session expired, try to refresh
        console.log('Session expired, attempting refresh...');
        await refreshSession();
      }
    }, 4 * 60 * 1000);

    // Set up visibility change handler to refresh on tab focus
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && user) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log('Tab focused but session expired, refreshing...');
          await refreshSession();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      subscription.unsubscribe();
      clearInterval(sessionCheckInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, refreshSession]);

  const fetchProfile = async (userId) => {
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
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setProfile(null);
    }
    return { error };
  };

  const value = {
    user,
    profile,
    loading,
    signIn,
    signOut,
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
