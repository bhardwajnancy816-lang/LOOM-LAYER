import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const AuthContext = createContext({
  user: null,
  session: null,
  loading: true,
  error: null,
  isConfigured: false,
  signInWithGoogle: async () => {},
  signOut: async () => {}
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!isMounted) return;
      if (error) {
        console.warn('[Auth] Error getting initial session:', error.message);
        setError(error.message);
      } else {
        setSession(session);
        setUser(session?.user ?? null);
      }
      setLoading(false);
    }).catch((err) => {
      if (!isMounted) return;
      console.warn('[Auth] Unexpected error on getSession:', err);
      setLoading(false);
    });

    // 2. Subscribe to auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        if (!isMounted) return;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Supabase is not configured.' };
    }

    setError(null);
    try {
      const redirectUrl = typeof window !== 'undefined' ? window.location.origin : undefined;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });

      if (error) {
        console.error('[Auth] Google Sign-in error:', error.message);
        setError(error.message);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (err) {
      console.error('[Auth] Unexpected error during Google Sign-in:', err);
      setError(err.message || 'Failed to sign in with Google');
      return { success: false, error: err.message };
    }
  };

  const signOut = async () => {
    if (!isSupabaseConfigured || !supabase) return;
    setError(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[Auth] Sign-out error:', error.message);
        setError(error.message);
      } else {
        setUser(null);
        setSession(null);
      }
    } catch (err) {
      console.error('[Auth] Unexpected error during sign-out:', err);
      setError(err.message);
    }
  };

  const value = {
    user,
    session,
    loading,
    error,
    isConfigured: isSupabaseConfigured,
    signInWithGoogle,
    signOut
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
