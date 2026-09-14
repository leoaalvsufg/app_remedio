import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, type } from '@/constants/theme';
import { pickAndPersistPhoto, recoverPendingPhoto, type PhotoSource } from '@/services/photos';
import { PhotoPermissionError } from '@/services/photo-errors';
import type { MedicineInput, MedicineWithSchedule, ScheduleType } from '@/types/models';
import { endOfDay, isValidTime, parseDateInput, toDateInput, weekdayShort } from '@/utils/date';
import { Button, Card, Field, SectionTitle } from './ui';
import { MedicinePhoto } from './medicine-photo';

interface MedicineFormProps {
  initial?: MedicineWithSchedule;
  onSubmit(input: MedicineInput): Promise<void>;
}

function maskDate(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('/');
}

function maskTime(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
}

export function MedicineForm({ initial, onSubmit }: MedicineFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [dosage, setDosage] = useState(initial?.dosage ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(initial?.photoUri ?? null);
  const [scheduleType, setScheduleType] = useState<ScheduleType>(initial?.schedule.type ?? 'fixed_times');
  const [times, setTimes] = useState(initial?.schedule.times.length ? initial.schedule.times : ['08:00']);
  const [intervalHours, setIntervalHours] = useState(String(initial?.schedule.intervalHours ?? 8));
  const [startTime, setStartTime] = useState(initial?.schedule.startTime ?? '08:00');
  const [weekdays, setWeekdays] = useState<number[]>(initial?.schedule.weekdays ?? [1, 2, 3, 4, 5]);
  const [startDate, setStartDate] = useState(() => toDateInput(initial?.schedule.startDate ?? Date.now()));
  const [endDate, setEndDate] = useState(initial?.schedule.endDate ? toDateInput(initial.schedule.endDate) : '');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoAction, setPhotoAction] = useState<PhotoSource | null>(null);

  useEffect(() => {
    let active = true;
    recoverPendingPhoto()
      .then((uri) => {
        if (active && uri) setPhotoUri(uri);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const parsedStartDate = parseDateInput(startDate);
  const parsedEndDate = endDate ? parseDateInput(endDate) : null;
  const timeError = times.some((timeValue) => !isValidTime(timeValue));
  const interval = Number(intervalHours);
  const errors = {
    name: !name.trim() ? 'Informe o nome do medicamento.' : '',
    dosage: !dosage.trim() ? 'Informe a dosagem.' : '',
    times: scheduleType !== 'interval' && (times.length === 0 || timeError) ? 'Use horários válidos no formato HH:MM.' : '',
    interval: scheduleType === 'interval' && (!Number.isInteger(interval) || interval < 1 || interval > 24) ? 'Informe um intervalo entre 1 e 24 horas.' : '',
    startTime: scheduleType === 'interval' && !isValidTime(startTime) ? 'Use um horário válido no formato HH:MM.' : '',
    weekdays: scheduleType === 'weekly' && weekdays.length === 0 ? 'Escolha pelo menos um dia da semana.' : '',
    startDate: !parsedStartDate ? 'Informe uma data válida.' : '',
    endDate: endDate && !parsedEndDate ? 'Informe uma data válida.' : parsedStartDate && parsedEndDate && parsedEndDate < parsedStartDate ? 'A data final deve ser depois da data inicial.' : '',
  };
  const valid = !Object.values(errors).some(Boolean);

  function updateTime(index: number, value: string) {
    setTimes((current) => current.map((item, itemIndex) => itemIndex === index ? maskTime(value) : item));
  }

  function toggleWeekday(day: number) {
    setWeekdays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day]);
  }

  async function selectPhoto(source: PhotoSource) {
    if (photoAction) return;
    setPhotoAction(source);
    try {
      const uri = await pickAndPersistPhoto(source);
      if (uri) setPhotoUri(uri);
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
      setPhotoAction(null);
    }
  }

  async function save() {
    setSubmitted(true);
    if (!valid || parsedStartDate === null) return;
    setSaving(true);
    try {
      await onSubmit({
        name,
        dosage,
        notes,
        photoUri,
        schedule: {
          type: scheduleType,
          times: scheduleType === 'interval' ? [] : times,
          intervalHours: scheduleType === 'interval' ? interval : null,
          startTime: scheduleType === 'interval' ? startTime : null,
          weekdays: scheduleType === 'weekly' ? weekdays : [],
          startDate: parsedStartDate,
          endDate: parsedEndDate === null ? null : endOfDay(parsedEndDate),
        },
      });
    } catch (error) {
      Alert.alert('Não foi possível salvar', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityLabel="Abrir a câmera para fotografar o medicamento" accessibilityRole="button" disabled={photoAction !== null} onPress={() => selectPhoto('camera')} style={styles.photoArea}>
          {photoUri ? <Image contentFit="cover" source={{ uri: photoUri }} style={styles.photo} /> : <MedicinePhoto size={120} uri={null} />}
          <Text style={styles.photoText}>{photoUri ? 'Toque para tirar outra foto' : 'Toque para abrir a câmera'}</Text>
          <Text style={styles.photoHint}>Câmera ou galeria, até 5 MB</Text>
        </Pressable>
        <View style={styles.photoActions}>
          <Button compact loading={photoAction === 'camera'} disabled={photoAction !== null} onPress={() => selectPhoto('camera')} style={styles.photoButton}>Tirar foto</Button>
          <Button compact loading={photoAction === 'library'} disabled={photoAction !== null} onPress={() => selectPhoto('library')} style={styles.photoButton} variant="secondary">Escolher foto</Button>
        </View>
        {photoUri ? <Button compact disabled={photoAction !== null} onPress={() => setPhotoUri(null)} variant="text">Remover foto</Button> : null}

        <Card style={styles.section}>
          <Field error={submitted ? errors.name : ''} label="Nome" onChangeText={setName} placeholder="Ex: Losartana" value={name} />
          <Field error={submitted ? errors.dosage : ''} label="Dosagem" onChangeText={setDosage} placeholder="Ex: 1 comprimido, 10 mg" value={dosage} />
          <Field label="Observações" multiline numberOfLines={4} onChangeText={setNotes} optional placeholder="Ex: tomar após o café" value={notes ?? ''} />
        </Card>

        <View style={styles.frequencyHeader}>
          <SectionTitle>Frequência</SectionTitle>
          <Text style={styles.required}>Obrigatório</Text>
        </View>
        <View accessibilityRole="tablist" style={styles.segmented}>
          {([
            ['fixed_times', 'Horários fixos'],
            ['interval', 'A cada N horas'],
            ['weekly', 'Dias da semana'],
          ] as const).map(([value, label]) => (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: scheduleType === value }}
              key={value}
              onPress={() => setScheduleType(value)}
              style={[styles.segment, scheduleType === value && styles.segmentSelected]}>
              <Text style={[styles.segmentText, scheduleType === value && styles.segmentTextSelected]}>{label}</Text>
            </Pressable>
          ))}
        </View>

        <Card style={styles.section}>
          {scheduleType === 'interval' ? (
            <>
              <Field error={submitted ? errors.interval : ''} keyboardType="number-pad" label="A cada quantas horas?" maxLength={2} onChangeText={setIntervalHours} value={intervalHours} />
              <Field error={submitted ? errors.startTime : ''} keyboardType="number-pad" label="Começando às" maxLength={5} onChangeText={(value) => setStartTime(maskTime(value))} placeholder="08:00" value={startTime} />
            </>
          ) : (
            <>
              {scheduleType === 'weekly' ? (
                <View style={styles.weekWrap}>
                  <Text style={styles.fieldLabel}>Dias da semana</Text>
                  <View style={styles.weekdays}>
                    {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: weekdays.includes(day) }}
                        key={day}
                        onPress={() => toggleWeekday(day)}
                        style={[styles.day, weekdays.includes(day) && styles.daySelected]}>
                        <Text style={[styles.dayText, weekdays.includes(day) && styles.dayTextSelected]}>{weekdayShort(day)}</Text>
                      </Pressable>
                    ))}
                  </View>
                  {submitted && errors.weekdays ? <Text style={styles.error}>{errors.weekdays}</Text> : null}
                </View>
              ) : null}
              {times.map((timeValue, index) => (
                <View key={`${index}`} style={styles.timeRow}>
                  <View style={styles.timeField}>
                    <Field keyboardType="number-pad" label={`Horário ${index + 1}`} maxLength={5} onChangeText={(value) => updateTime(index, value)} placeholder="08:00" value={timeValue} />
                  </View>
                  {times.length > 1 ? (
                    <Pressable accessibilityLabel={`Remover horário ${index + 1}`} accessibilityRole="button" hitSlop={6} onPress={() => setTimes((current) => current.filter((_, itemIndex) => itemIndex !== index))} style={styles.remove}>
                      <Text style={styles.removeText}>×</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
              {submitted && errors.times ? <Text style={styles.error}>{errors.times}</Text> : null}
              <Button compact onPress={() => setTimes((current) => [...current, '12:00'])} variant="secondary">Adicionar horário</Button>
            </>
          )}
        </Card>

        <Card style={styles.section}>
          <Field error={submitted ? errors.startDate : ''} keyboardType="number-pad" label="Data de início" maxLength={10} onChangeText={(value) => setStartDate(maskDate(value))} placeholder="DD/MM/AAAA" value={startDate} />
          <Field error={submitted ? errors.endDate : ''} keyboardType="number-pad" label="Data de fim" maxLength={10} onChangeText={(value) => setEndDate(maskDate(value))} optional placeholder="Sem data final" value={endDate} />
        </Card>

        <View style={styles.actions}>
          <Button disabled={!valid} loading={saving} onPress={save}>Salvar</Button>
          <Button disabled={saving} onPress={() => router.back()} variant="text">Cancelar</Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', padding: spacing.lg, paddingBottom: spacing.huge, gap: spacing.lg },
  photoArea: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: radius.lg, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.border, backgroundColor: colors.surface },
  photo: { width: 120, height: 120, borderRadius: radius.lg },
  photoText: { color: colors.primaryDark, fontSize: type.body, lineHeight: 22, fontWeight: '700' },
  photoHint: { color: colors.textSecondary, fontSize: type.caption, lineHeight: 18 },
  photoActions: { flexDirection: 'row', gap: spacing.md },
  photoButton: { flex: 1 },
  section: { gap: spacing.lg },
  frequencyHeader: { marginTop: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  required: { color: colors.textSecondary, fontSize: type.caption },
  segmented: { flexDirection: 'row', backgroundColor: colors.disabledSurface, borderRadius: radius.md, padding: 4, gap: 4 },
  segment: { flex: 1, minHeight: 48, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  segmentSelected: { backgroundColor: colors.surface },
  segmentText: { color: colors.textSecondary, fontSize: 13, lineHeight: 17, textAlign: 'center', fontWeight: '600' },
  segmentTextSelected: { color: colors.primaryDark, fontWeight: '800' },
  weekWrap: { gap: spacing.sm },
  fieldLabel: { color: colors.text, fontSize: type.small, lineHeight: 20, fontWeight: '700' },
  weekdays: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  day: { minWidth: 44, minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm },
  daySelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { color: colors.textSecondary, fontSize: type.caption, fontWeight: '700' },
  dayTextSelected: { color: colors.surface },
  timeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  timeField: { flex: 1 },
  remove: { width: 48, height: 52, borderRadius: radius.md, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center' },
  removeText: { color: colors.danger, fontSize: 30, lineHeight: 34 },
  error: { color: colors.danger, fontSize: type.small, lineHeight: 20 },
  actions: { gap: spacing.sm },
});
