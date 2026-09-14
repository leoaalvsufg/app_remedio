import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button, Card, Field, Screen } from '@/components/ui';
import { colors, spacing, type } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';

export default function ResetPasswordScreen() {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    if (password !== confirmation) {
      Alert.alert('Confira as senhas', 'As duas senhas precisam ser iguais.');
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
      Alert.alert('Senha atualizada', 'Sua nova senha já pode ser usada.', [
        { text: 'Continuar', onPress: () => router.replace('/(tabs)') },
      ]);
    } catch (error) {
      Alert.alert('Não foi possível atualizar', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={styles.content}>
        <View style={styles.heading}>
          <Text style={styles.title}>Crie uma nova senha</Text>
          <Text style={styles.text}>Use pelo menos 6 caracteres e não reutilize senhas de outros serviços.</Text>
        </View>
        <Card style={styles.card}>
          <Field autoComplete="new-password" label="Nova senha" onChangeText={setPassword} secureTextEntry value={password} />
          <Field autoComplete="new-password" label="Confirmar senha" onChangeText={setConfirmation} secureTextEntry value={confirmation} />
          <Button loading={busy} onPress={save}>Salvar nova senha</Button>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.xl },
  heading: { gap: spacing.sm },
  title: { color: colors.text, fontSize: type.title, lineHeight: 32, fontWeight: '800' },
  text: { color: colors.textSecondary, fontSize: type.body, lineHeight: 23 },
  card: { gap: spacing.lg },
});
