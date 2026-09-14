import { router, type Href } from 'expo-router';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MedicinePhoto } from '@/components/medicine-photo';
import { Badge, Button, Card, Field, LoadingState, Screen } from '@/components/ui';
import { colors, radius, spacing, type } from '@/constants/theme';
import { useApp } from '@/context/app-context';
import { useAuth } from '@/context/auth-context';
import { useHealthProfile } from '@/context/health-profile-context';
import {
  askHealthAssistant,
  MEDICAL_DISCLAIMER,
  type AssistantMode,
  type AssistantResponse,
} from '@/services/ai-service';
import type { MedicineWithSchedule } from '@/types/models';
import { pickAssistantImage, type AssistantImage, type AssistantImageSource } from '@/services/assistant-image';
import { PhotoPermissionError } from '@/services/photo-errors';

const MODES: { value: AssistantMode; label: string; title: string; description: string }[] = [
  { value: 'leaflet', label: 'Bula', title: 'Resumo de bula', description: 'Entenda os pontos principais em linguagem simples.' },
  { value: 'interactions', label: 'Interações', title: 'Análise preliminar', description: 'Revise os medicamentos registrados como tomados nos últimos 30 dias.' },
  { value: 'timing', label: 'Horário', title: 'Orientação de horário', description: 'Veja cuidados gerais sobre alimentação e horários.' },
  { value: 'chat', label: 'Perguntar', title: 'Pergunte ao assistente', description: 'Tire dúvidas educativas sobre seu tratamento.' },
];

const accountRoute = '/conta' as Href;

export default function AssistantScreen() {
  const { user } = useAuth();
  const { service, revision } = useApp();
  const { profile: healthProfile, loading: healthLoading, error: healthError, refresh: refreshHealth } = useHealthProfile();
  const [mode, setMode] = useState<AssistantMode>('interactions');
  const [medicines, setMedicines] = useState<MedicineWithSchedule[]>([]);
  const [medicineId, setMedicineId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingContext, setLoadingContext] = useState(true);
  const [response, setResponse] = useState<AssistantResponse | null>(null);
  const [assistantImage, setAssistantImage] = useState<AssistantImage | null>(null);
  const [imageAction, setImageAction] = useState<AssistantImageSource | null>(null);

  useEffect(() => {
    let active = true;
    service.listMedicines().then((medicineList) => {
      if (!active) return;
      setMedicines(medicineList);
      setMedicineId((current) => current ?? medicineList[0]?.id ?? null);
      setLoadingContext(false);
    });
    return () => {
      active = false;
    };
  }, [revision, service, user]);

  const selectedMode = MODES.find((item) => item.value === mode) ?? MODES[0];
  const needsMedicine = mode === 'leaflet' || mode === 'timing';

  async function ask() {
    if (!user) {
      router.push(accountRoute);
      return;
    }
    if (needsMedicine && !medicineId) {
      Alert.alert('Escolha um medicamento', 'Cadastre ou escolha o medicamento para continuar.');
      return;
    }
    if (mode === 'chat' && question.trim().length < 5 && !assistantImage) {
      Alert.alert('Escreva ou fotografe', 'Faça uma pergunta com pelo menos 5 caracteres ou envie a foto do medicamento.');
      return;
    }
    setLoading(true);
    setResponse(null);
    try {
      const result = await askHealthAssistant({
        mode,
        medicineId: needsMedicine ? medicineId ?? undefined : undefined,
        question: mode === 'chat' && question.trim() ? question.trim() : undefined,
        imageBase64: mode === 'chat' ? assistantImage?.base64 : undefined,
        imageMimeType: mode === 'chat' ? assistantImage?.mimeType : undefined,
      });
      setResponse(result);
      setAssistantImage(null);
    } catch (error) {
      Alert.alert('Não foi possível consultar', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function selectAssistantImage(source: AssistantImageSource) {
    if (imageAction) return;
    setImageAction(source);
    try {
      const image = await pickAssistantImage(source);
      if (image) {
        setAssistantImage(image);
        setResponse(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Tente novamente.';
      if (error instanceof PhotoPermissionError && Platform.OS !== 'web') {
        Alert.alert('Permissão necessária', message, [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir ajustes', onPress: () => Linking.openSettings() },
        ]);
      } else {
        Alert.alert('Não foi possível adicionar a foto', message);
      }
    } finally {
      setImageAction(null);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.warning}>
            <Text style={styles.warningTitle}>Orientação educativa</Text>
            <Text style={styles.warningText}>A IA pode errar e não substitui médico, farmacêutico ou a bula oficial. Não altere doses ou horários sem orientação profissional.</Text>
          </View>

          {!user ? (
            <Card style={styles.signInCard}>
              <Text style={styles.cardTitle}>Entre para usar o assistente</Text>
              <Text style={styles.body}>Sua sessão protege o acesso às informações enviadas para análise.</Text>
              <Button onPress={() => router.push(accountRoute)}>Entrar ou criar conta</Button>
            </Card>
          ) : null}

          <View accessibilityRole="tablist" style={styles.modes}>
            {MODES.map((item) => (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === item.value }}
                key={item.value}
                onPress={() => { setMode(item.value); setResponse(null); if (item.value !== 'chat') setAssistantImage(null); }}
                style={[styles.mode, mode === item.value && styles.modeActive]}>
                <Text style={[styles.modeText, mode === item.value && styles.modeTextActive]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.heading}>
            <Text style={styles.title}>{selectedMode.title}</Text>
            <Text style={styles.body}>{selectedMode.description}</Text>
          </View>

          {loadingContext ? <LoadingState /> : (
            <>
              {needsMedicine ? (
                <View style={styles.selection}>
                  <Text style={styles.cardTitle}>Medicamento</Text>
                  {medicines.map((medicine) => (
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ checked: medicineId === medicine.id }}
                      key={medicine.id}
                      onPress={() => setMedicineId(medicine.id)}
                      style={[styles.medicine, medicineId === medicine.id && styles.medicineSelected]}>
                      <MedicinePhoto size={48} uri={medicine.photoUri} />
                      <View style={styles.medicineText}>
                        <Text style={styles.medicineName}>{medicine.name}</Text>
                        <Text style={styles.medicineDose}>{medicine.dosage}</Text>
                      </View>
                      {medicineId === medicine.id ? <Badge tone="primary">Selecionado</Badge> : null}
                    </Pressable>
                  ))}
                  {!medicines.length ? <Button onPress={() => router.push('/medicamento/novo')} variant="secondary">Cadastrar medicamento</Button> : null}
                </View>
              ) : null}

              {mode === 'chat' ? (
                <>
                  <View style={styles.regulatoryInfo}>
                    <Text style={styles.regulatoryTitle}>Tarja e exigência de receita</Text>
                    <Text style={styles.regulatoryText}>Ao perguntar sobre um medicamento, informe nome, concentração e apresentação. A resposta indicará tarja e receita quando for possível confirmar. A faixa amarela identifica genéricos e não define sozinha a exigência de receita.</Text>
                  </View>
                  <Card style={styles.imageCard}>
                    <Text style={styles.cardTitle}>Foto do medicamento</Text>
                    <Text style={styles.body}>Fotografe a frente da embalagem com nome, concentração e tarja visíveis. A imagem é enviada para análise e não é salva no seu perfil.</Text>
                    {assistantImage ? <Image accessibilityLabel="Foto selecionada para análise" contentFit="contain" source={{ uri: assistantImage.uri }} style={styles.assistantImage} /> : null}
                    <View style={styles.imageActions}>
                      <Button compact loading={imageAction === 'camera'} disabled={imageAction !== null} onPress={() => selectAssistantImage('camera')} style={styles.imageButton}>Fotografar</Button>
                      <Button compact loading={imageAction === 'library'} disabled={imageAction !== null} onPress={() => selectAssistantImage('library')} style={styles.imageButton} variant="secondary">Escolher foto</Button>
                    </View>
                    {assistantImage ? <Button compact onPress={() => setAssistantImage(null)} variant="text">Remover foto</Button> : null}
                  </Card>
                  <Field label="Sua dúvida" multiline numberOfLines={5} onChangeText={setQuestion} placeholder="Ex: O medicamento X 10 mg exige receita e qual é sua tarja?" value={question} />
                </>
              ) : null}

              <Card style={styles.healthCard}>
                <View style={styles.responseHeader}>
                  <Text style={styles.cardTitle}>Perfil de saúde usado na análise</Text>
                  <Button compact onPress={() => router.push('/saude/editar' as Href)} variant="text">Editar</Button>
                </View>
                {healthLoading ? (
                  <Text style={styles.body}>Carregando informações...</Text>
                ) : healthError ? (
                  <>
                    <Text accessibilityRole="alert" style={styles.healthError}>{healthError}</Text>
                    <Button compact onPress={refreshHealth} variant="secondary">Tentar novamente</Button>
                  </>
                ) : (
                  <Text style={styles.body}>
                    {[
                      healthProfile?.conditions && `Condições: ${healthProfile.conditions}`,
                      healthProfile?.allergies && `Alergias: ${healthProfile.allergies}`,
                      healthProfile?.additionalNotes && `Outras informações: ${healthProfile.additionalNotes}`,
                    ].filter(Boolean).join('\n') || 'Nenhuma informação de saúde cadastrada.'}
                  </Text>
                )}
              </Card>

              <Button disabled={!user || healthLoading || Boolean(healthError)} loading={loading} onPress={ask}>Consultar assistente</Button>
            </>
          )}

          {response ? (
            <Card style={styles.response}>
              <View style={styles.responseHeader}>
                <Text style={styles.cardTitle}>Resposta</Text>
                <Badge tone="primary">Gemma 4</Badge>
              </View>
              <Text selectable style={styles.answer}>{response.answer}</Text>
              <View style={styles.disclaimer}>
                <Text style={styles.disclaimerTitle}>Aviso médico importante</Text>
                <Text style={styles.disclaimerText}>{response.disclaimer || MEDICAL_DISCLAIMER}</Text>
              </View>
            </Card>
          ) : null}

          <Text style={styles.emergency}>Em caso de falta de ar, desmaio, suspeita de overdose, reação alérgica grave ou outro sintoma intenso, procure imediatamente o serviço de emergência da sua região.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.huge, gap: spacing.lg },
  warning: { backgroundColor: colors.warningSoft, borderRadius: radius.md, borderWidth: 1, borderColor: '#EBC68B', padding: spacing.md, gap: spacing.xs },
  warningTitle: { color: colors.warning, fontSize: type.small, lineHeight: 20, fontWeight: '800' },
  warningText: { color: colors.text, fontSize: type.small, lineHeight: 20 },
  signInCard: { gap: spacing.md },
  modes: { flexDirection: 'row', backgroundColor: colors.disabledSurface, borderRadius: radius.md, padding: 4, gap: 3 },
  mode: { flex: 1, minHeight: 48, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  modeActive: { backgroundColor: colors.surface },
  modeText: { color: colors.textSecondary, fontSize: type.caption, lineHeight: 16, fontWeight: '700', textAlign: 'center' },
  modeTextActive: { color: colors.primaryDark },
  heading: { gap: spacing.xs },
  title: { color: colors.text, fontSize: type.title, lineHeight: 32, fontWeight: '800' },
  body: { color: colors.textSecondary, fontSize: type.body, lineHeight: 23 },
  cardTitle: { color: colors.text, fontSize: type.body, lineHeight: 22, fontWeight: '800' },
  selection: { gap: spacing.sm },
  medicine: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: spacing.md },
  medicineSelected: { borderColor: colors.primary, borderWidth: 2 },
  medicineText: { flex: 1, gap: 2 },
  medicineName: { color: colors.text, fontSize: type.body, fontWeight: '800' },
  medicineDose: { color: colors.textSecondary, fontSize: type.small },
  healthCard: { gap: spacing.md },
  healthError: { color: colors.danger, fontSize: type.small, lineHeight: 20 },
  regulatoryInfo: { backgroundColor: '#E6F2FF', borderRadius: radius.md, borderWidth: 1, borderColor: '#B8D9FF', padding: spacing.md, gap: spacing.xs },
  regulatoryTitle: { color: colors.primaryDark, fontSize: type.small, lineHeight: 20, fontWeight: '800' },
  regulatoryText: { color: colors.textSecondary, fontSize: type.small, lineHeight: 20 },
  imageCard: { gap: spacing.md },
  assistantImage: { width: '100%', height: 220, borderRadius: radius.md, backgroundColor: colors.background },
  imageActions: { flexDirection: 'row', gap: spacing.md },
  imageButton: { flex: 1 },
  response: { gap: spacing.lg },
  responseHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  answer: { color: colors.text, fontSize: type.body, lineHeight: 25 },
  disclaimer: { backgroundColor: colors.dangerSoft, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.danger, padding: spacing.md, gap: spacing.xs },
  disclaimerTitle: { color: colors.danger, fontSize: type.small, lineHeight: 20, fontWeight: '800' },
  disclaimerText: { color: colors.danger, fontSize: type.small, lineHeight: 20, fontWeight: '600' },
  emergency: { color: colors.danger, fontSize: type.caption, lineHeight: 18, fontWeight: '700', textAlign: 'center' },
});
