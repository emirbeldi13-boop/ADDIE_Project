import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { AuthContext } from '../../hooks/useAuth';

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    setProfileLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, is_active')
      .eq('id', userId)
      .maybeSingle();
    setProfileLoading(false);
    if (error) {
      console.error('[auth] failed to load profile:', error);
      setProfile(null);
      return;
    }
    setProfile(data ?? null);
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      setLoading(false);
      if (data.session?.user?.id) loadProfile(data.session.user.id);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
      if (newSession?.user?.id) loadProfile(newSession.user.id);
      else setProfile(null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error };
    return { data };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const sendPasswordReset = useCallback(async (email) => {
    const redirectTo = `${window.location.origin}/set-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    return { error };
  }, []);

  const updatePassword = useCallback(async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    return { data, error };
  }, []);

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    role: profile?.role ?? null,
    isSuperAdmin: profile?.role === 'super_admin',
    isAuthenticated: !!session,
    loading,
    profileLoading,
    signIn,
    signOut,
    sendPasswordReset,
    updatePassword,
    refreshProfile: () => loadProfile(session?.user?.id),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
