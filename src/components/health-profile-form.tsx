import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, radius, spacing, type } from '@/constants/theme';
import type {
  HealthProfile,
  HealthProfileInput,
  OrganFunction,
  PregnancyStatus,
  Sex,
  SubstanceUse,
} from '@/types/health-profile';
import { Button, Card, Field } from './ui';

interface HealthProfileFormProps {
  initial: HealthProfile | null;
  onboarding?: boolean;
  onSave(input: HealthProfileInput): Promise<void>;
  onSkip?: () => Promise<void>;
}

const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'female', label: 'Feminino' },
  { value: 'male', label: 'Masculino' },
  { value: 'intersex', label: 'Intersexo' },
  { value: 'prefer_not_to_say', label: 'Prefiro não dizer' },
];

const PREGNANCY_OPTIONS: { value: PregnancyStatus; label: string }[] = [
  { value: 'not_applicable', label: 'Não se aplica' },
  { value: 'possibly_pregnant', label: 'Possível gestação' },
  { value: 'pregnant', label: 'Gestante' },
  { value: 'breastfeeding', label: 'Amamentando' },
  { value: 'unknown', label: 'Não sei' },
];

const ORGAN_OPTIONS: { value: OrganFunction; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'mild_impairment', label: 'Leve comprometimento' },
  { value: 'moderate_impairment', label: 'Moderado' },
  { value: 'severe_impairment', label: 'Grave' },
  { value: 'unknown', label: 'Não sei' },
];

const SUBSTANCE_OPTIONS: { value: SubstanceUse; label: string }[] = [
  { value: 'none', label: 'Não uso' },
  { value: 'occasional', label: 'Ocasional' },
  { value: 'regular', label: 'Regular' },
  { value: 'unknown', label: 'Prefiro não dizer' },
];

function toIntOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function fromNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

function PillRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T | null) => void;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.pillRow}>
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              key={option.value}
              onPress={() => onChange(selected ? null : option.value)}
              style={[styles.pill, selected && styles.pillSelected]}>
              <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function HealthProfileForm({ initial, onboarding = false, onSave, onSkip }: HealthProfileFormProps) {
  const [conditions, setConditions] = useState(initial?.conditions ?? '');
  const [allergies, setAllergies] = useState(initial?.allergies ?? '');
  const [additionalNotes, setAdditionalNotes] = useState(initial?.additionalNotes ?? '');
  const [ageYearsText, setAgeYearsText] = useState(fromNumber(initial?.ageYears));
  const [weightKgText, setWeightKgText] = useState(fromNumber(initial?.weightKg));
  const [heightCmText, setHeightCmText] = useState(fromNumber(initial?.heightCm));
  const [sex, setSex] = useState<Sex | null>(initial?.sex ?? null);
  const [pregnancy, setPregnancy] = useState<PregnancyStatus | null>(initial?.pregnancy ?? null);
  const [kidneyFunction, setKidneyFunction] = useState<OrganFunction | null>(initial?.kidneyFunction ?? null);
  const [liverFunction, setLiverFunction] = useState<OrganFunction | null>(initial?.liverFunction ?? null);
  const [alcoholUse, setAlcoholUse] = useState<SubstanceUse | null>(initial?.alcoholUse ?? null);
  const [smoking, setSmoking] = useState<SubstanceUse | null>(initial?.smoking ?? null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await onSave({
        conditions,
        allergies,
        additionalNotes,
        ageYears: toIntOrNull(ageYearsText),
        weightKg: toIntOrNull(weightKgText),
        heightCm: toIntOrNull(heightCmText),
        sex,
        pregnancy,
        kidneyFunction,
        liverFunction,
        alcoholUse,
        smoking,
      });
    } finally {
      setBusy(false);
    }
  }

  async function skip() {
    if (!onSkip) return;
    setBusy(true);
    try {
      await onSkip();
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {onboarding ? (
          <View style={styles.heading}>
            <View accessibilityElementsHidden style={styles.healthIcon}>
              <Text style={styles.healthIconText}>+</Text>
            </View>
            <Text style={styles.title}>Conte um pouco sobre sua saúde</Text>
            <Text style={styles.subtitle}>Essas informações ajudam o assistente a oferecer orientações mais relevantes e cuidadosas.</Text>
          </View>
        ) : null}

        <View style={styles.privacy}>
          <Text style={styles.privacyTitle}>Você controla estas informações</Text>
          <Text style={styles.privacyText}>Elas ficam protegidas na sua conta e podem ser alteradas ou removidas quando quiser. Não substituem seu prontuário médico.</Text>
        </View>

        <Card style={styles.form}>
          <Text style={styles.sectionTitle}>Dados básicos</Text>
          <Field keyboardType="number-pad" label="Idade (anos)" maxLength={3} onChangeText={setAgeYearsText} optional placeholder="Ex: 64" value={ageYearsText} />
          <View style={styles.row}>
            <View style={styles.halfRow}>
              <Field keyboardType="decimal-pad" label="Peso (kg)" maxLength={6} onChangeText={setWeightKgText} optional placeholder="Ex: 70" value={weightKgText} />
            </View>
            <View style={styles.halfRow}>
              <Field keyboardType="number-pad" label="Altura (cm)" maxLength={3} onChangeText={setHeightCmText} optional placeholder="Ex: 165" value={heightCmText} />
            </View>
          </View>
          <PillRow label="Sexo biológico (para ajustes posológicos)" options={SEX_OPTIONS} value={sex} onChange={setSex} />
          <PillRow label="Gestação ou amamentação" options={PREGNANCY_OPTIONS} value={pregnancy} onChange={setPregnancy} />

          <Text style={styles.sectionTitle}>Saúde</Text>
          <Field
            label="Condições de saúde"
            multiline
            numberOfLines={4}
            onChangeText={setConditions}
            optional
            placeholder="Ex: hipertensão, diabetes, asma"
            value={conditions}
          />
          <Field
            label="Alergias"
            multiline
            numberOfLines={4}
            onChangeText={setAllergies}
            optional
            placeholder="Ex: alergia a penicilina"
            value={allergies}
          />
          <PillRow label="Função renal" options={ORGAN_OPTIONS} value={kidneyFunction} onChange={setKidneyFunction} />
          <PillRow label="Função hepática" options={ORGAN_OPTIONS} value={liverFunction} onChange={setLiverFunction} />
          <Field
            label="Outras informações importantes"
            multiline
            numberOfLines={4}
            onChangeText={setAdditionalNotes}
            optional
            placeholder="Ex: medicamentos contínuos, cirurgias recentes, observações do médico"
            value={additionalNotes}
          />

          <Text style={styles.sectionTitle}>Estilo de vida</Text>
          <PillRow label="Consumo de álcool" options={SUBSTANCE_OPTIONS} value={alcoholUse} onChange={setAlcoholUse} />
          <PillRow label="Tabagismo" options={SUBSTANCE_OPTIONS} value={smoking} onChange={setSmoking} />
        </Card>

        <Text style={styles.footer}>Não inclua documentos, números de identificação ou informações de outras pessoas.</Text>
      </ScrollView>
      <View style={styles.actions}>
        <Button loading={busy} onPress={submit}>{onboarding ? 'Salvar e continuar' : 'Salvar alterações'}</Button>
        {onSkip ? <Button compact disabled={busy} onPress={skip} variant="text">Prefiro informar depois</Button> : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, width: '100%', maxWidth: 620, alignSelf: 'center', padding: spacing.lg, paddingBottom: spacing.huge, gap: spacing.lg },
  heading: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xl },
  healthIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.successSoft },
  healthIconText: { color: colors.success, fontSize: 46, lineHeight: 50, fontWeight: '300' },
  title: { color: colors.text, fontSize: 28, lineHeight: 36, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: colors.textSecondary, fontSize: type.body, lineHeight: 24, textAlign: 'center' },
  privacy: { borderRadius: radius.md, borderWidth: 1, borderColor: '#B8D9FF', backgroundColor: '#E6F2FF', padding: spacing.md, gap: spacing.xs },
  privacyTitle: { color: colors.primaryDark, fontSize: type.small, lineHeight: 20, fontWeight: '800' },
  privacyText: { color: colors.textSecondary, fontSize: type.small, lineHeight: 20 },
  form: { gap: spacing.md },
  sectionTitle: { color: colors.text, fontSize: type.body, lineHeight: 22, fontWeight: '800', marginTop: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  halfRow: { flex: 1 },
  fieldWrap: { gap: spacing.sm },
  fieldLabel: { color: colors.text, fontSize: type.small, lineHeight: 20, fontWeight: '700' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: { minHeight: 44, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  pillSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  pillText: { color: colors.textSecondary, fontSize: type.caption, lineHeight: 16, fontWeight: '700' },
  pillTextSelected: { color: colors.surface },
  actions: { gap: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface, padding: spacing.lg },
  footer: { color: colors.textSecondary, fontSize: type.caption, lineHeight: 18, textAlign: 'center' },
});
