import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Field, LoadingState } from '@/components/ui';
import { AppLogo } from '@/components/app-logo';
import { colors, maxContentWidth, radius, spacing, type } from '@/constants/theme';
import { useApp } from '@/context/app-context';
import { useAuth } from '@/context/auth-context';

type AuthMode = 'signin' | 'signup';

export default function WelcomeScreen() {
  const { enableNotifications, showToast } = useApp();
  const { session, loading, configured, signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) router.replace('/(tabs)');
  }, [session]);

  if (loading) return <LoadingState />;

  async function authenticate() {
    if (!email.trim() || !password) {
      Alert.alert('Confira os dados', 'Informe seu e-mail e sua senha.');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      Alert.alert('Confira os dados', 'Informe como você gostaria de ser chamado.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
        await enableNotifications();
        router.replace('/(tabs)');
      } else {
        const result = await signUp(name, email, password);
        if (result === 'confirmation') {
          Alert.alert('Confira seu e-mail', 'Enviamos um link para confirmar sua conta.');
          setMode('signin');
        } else {
          router.replace('/(tabs)');
        }
      }
    } catch (error) {
      Alert.alert('Não foi possível continuar', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  async function forgotPassword() {
    try {
      await resetPassword(email);
      Alert.alert('E-mail enviado', 'Confira sua caixa de entrada para redefinir a senha.');
    } catch (error) {
      Alert.alert('Não foi possível enviar', error instanceof Error ? error.message : 'Tente novamente.');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View accessibilityLabel="Zelo" style={styles.brand}>
            <AppLogo />
            <Text style={styles.eyebrow}>ZELO</Text>
          </View>

          <View style={styles.heading}>
            <Text style={styles.title}>{mode === 'signin' ? 'Bem-vindo de volta' : 'Crie sua conta'}</Text>
            <Text style={styles.subtitle}>Seus medicamentos sincronizados com segurança.</Text>
          </View>

          <View style={styles.modeSwitch}>
            <Button compact onPress={() => setMode('signin')} variant={mode === 'signin' ? 'primary' : 'text'} style={styles.modeButton}>Entrar</Button>
            <Button compact onPress={() => setMode('signup')} variant={mode === 'signup' ? 'primary' : 'text'} style={styles.modeButton}>Cadastrar</Button>
          </View>

          <Card style={styles.loginCard}>
            {mode === 'signup' ? <Field autoCapitalize="words" label="Nome" onChangeText={setName} placeholder="Como podemos chamar você?" value={name} /> : null}
            <Field autoCapitalize="none" autoComplete="email" keyboardType="email-address" label="E-mail" onChangeText={setEmail} placeholder="seuemail@exemplo.com" value={email} />
            <Field autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} label="Senha" onChangeText={setPassword} placeholder="Mínimo de 6 caracteres" secureTextEntry value={password} />
            {!configured ? (
              <View style={styles.phaseNote}>
                <Text style={styles.phaseNoteText}>A sincronização ainda não está configurada neste build.</Text>
              </View>
            ) : null}
            <Button disabled={!configured} loading={busy} onPress={authenticate}>
              {mode === 'signin' ? 'Entrar' : 'Criar conta'}
            </Button>
            {mode === 'signin' ? <Button disabled={busy} onPress={forgotPassword} variant="text">Esqueci minha senha</Button> : null}
            {Platform.OS !== 'web' ? (
              <Button onPress={() => { showToast('Modo offline ativado.'); router.replace('/(tabs)'); }} variant="text">
                Continuar sem conta
              </Button>
            ) : null}
          </Card>

          <Text style={styles.footer}>Ao continuar, você aceita os termos de uso e privacidade.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  content: { width: '100%', maxWidth: Math.min(maxContentWidth, 480), alignSelf: 'center', gap: spacing.xl },
  brand: { alignItems: 'center', gap: spacing.md },
  eyebrow: { color: colors.primaryDark, fontSize: type.caption, letterSpacing: 2.2, fontWeight: '800' },
  heading: { gap: spacing.sm },
  title: { color: colors.text, fontSize: 30, lineHeight: 38, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: colors.textSecondary, fontSize: type.body, lineHeight: 24, textAlign: 'center' },
  modeSwitch: { flexDirection: 'row', gap: spacing.sm },
  modeButton: { flex: 1 },
  loginCard: { gap: spacing.lg },
  phaseNote: { backgroundColor: '#E6F2FF', borderRadius: radius.md, padding: spacing.md },
  phaseNoteText: { color: colors.primaryDark, fontSize: type.small, lineHeight: 20 },
  footer: { color: colors.textSecondary, fontSize: type.caption, lineHeight: 18, textAlign: 'center' },
});
