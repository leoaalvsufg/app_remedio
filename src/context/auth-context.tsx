import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { AppState } from 'react-native';
import { createContext, type PropsWithChildren, useContext, useEffect, useState } from 'react';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  configured: boolean;
  signIn(email: string, password: string): Promise<void>;
  signUp(name: string, email: string, password: string): Promise<'active' | 'confirmation'>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setLoading(false);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    async function handleUrl(url: string | null) {
      if (!url) return;
      const code = new URL(url).searchParams.get('code');
      if (code) await supabase.auth.exchangeCodeForSession(code);
    }
    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => subscription.remove();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error(authErrorMessage(error.message));
  }

  async function signUp(name: string, email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim() },
        emailRedirectTo: Linking.createURL('/auth/callback'),
      },
    });
    if (error) throw new Error(authErrorMessage(error.message));
    return data.session ? 'active' : 'confirmation';
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error('Não foi possível sair da conta.');
  }

  async function resetPassword(email: string) {
    if (!email.trim()) throw new Error('Informe seu e-mail primeiro.');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: Linking.createURL('/auth/redefinir-senha'),
    });
    if (error) throw new Error(authErrorMessage(error.message));
  }

  async function updatePassword(password: string) {
    if (password.length < 6) throw new Error('A senha deve ter pelo menos 6 caracteres.');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(authErrorMessage(error.message));
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        configured: isSupabaseConfigured,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

function authErrorMessage(message: string) {
  const value = message.toLowerCase();
  if (value.includes('invalid login')) return 'E-mail ou senha incorretos.';
  if (value.includes('email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
  if (value.includes('already registered')) return 'Este e-mail já está cadastrado.';
  if (value.includes('password')) return 'A senha deve ter pelo menos 6 caracteres.';
  if (value.includes('rate limit')) return 'Muitas tentativas. Aguarde um pouco e tente novamente.';
  return 'Não foi possível autenticar. Verifique sua conexão e tente novamente.';
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth precisa ser usado dentro de AuthProvider.');
  return value;
}
