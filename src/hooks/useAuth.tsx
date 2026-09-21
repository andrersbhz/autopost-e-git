import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // IMPORTANT: this function must never be awaited from inside onAuthStateChange.
  // Supabase Auth holds an internal Web Lock while firing auth callbacks. Starting
  // another Supabase request from the callback can deadlock or make a competing
  // request steal the auth-token lock.
  const refreshAdminRole = useCallback(async (userId: string | null) => {
    if (!userId) {
      setIsAdmin(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) throw error;
      setIsAdmin(!!data);
    } catch (err) {
      console.error('[useAuth] Admin check error:', err);
      setIsAdmin(false);
    }
  }, []);

  const applySession = useCallback((nextSession: Session | null) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);
    setLoading(false);

    // Defer every Supabase/database call until the auth callback has completely
    // released its internal lock. setTimeout(0) intentionally crosses that boundary.
    window.setTimeout(() => {
      void refreshAdminRole(nextSession?.user?.id ?? null);
    }, 0);
  }, [refreshAdminRole]);

  useEffect(() => {
    let isMounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!isMounted) return;

      console.log('[useAuth] Auth state changed:', event, !!nextSession);

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      if (
        event === 'INITIAL_SESSION' ||
        event === 'SIGNED_IN' ||
        event === 'TOKEN_REFRESHED' ||
        event === 'USER_UPDATED'
      ) {
        // Keep this callback synchronous. Do not await Supabase calls here.
        applySession(nextSession);
      }
    });

    // INITIAL_SESSION is emitted by Supabase after subscription. Avoid calling
    // getSession() in parallel here; doing both caused competing auth-token locks.
    const timeoutId = window.setTimeout(() => {
      if (!isMounted) return;
      setLoading((current) => {
        if (current) {
          console.warn('[useAuth] Safety timeout: auth initialization took too long, forcing ready');
        }
        return false;
      });
    }, 10000); // Increased to 10s but guaranteed to flip loading to false

    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [applySession]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      session: null,
      loading: true,
      isAdmin: false,
      signIn: async () => {},
      signUp: async () => {},
      signOut: async () => {},
    };
  }
  return context;
};
