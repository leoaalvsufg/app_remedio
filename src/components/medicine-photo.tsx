import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '@/constants/theme';

export function MedicinePhoto({ uri, size = 56 }: { uri: string | null; size?: number }) {
  if (uri) {
    return (
      <Image
        accessibilityLabel="Foto do medicamento"
        contentFit="cover"
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: Math.min(radius.lg, size / 4) }}
      />
    );
  }
  return (
    <View
      accessibilityLabel="Medicamento sem foto"
      style={[styles.placeholder, { width: size, height: size, borderRadius: Math.min(radius.lg, size / 4) }]}>
      <View style={[styles.pill, { transform: [{ rotate: '-35deg' }], width: size * 0.54, height: size * 0.25 }]}>
        <View style={styles.pillHalf} />
        <View style={styles.pillOther} />
      </View>
      <Text accessibilityElementsHidden style={styles.hiddenText}>Remédio</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { backgroundColor: '#E6F2FF', alignItems: 'center', justifyContent: 'center' },
  pill: { flexDirection: 'row', borderRadius: 999, overflow: 'hidden', borderWidth: 1, borderColor: colors.primary },
  pillHalf: { flex: 1, backgroundColor: colors.primary },
  pillOther: { flex: 1, backgroundColor: colors.surface },
  hiddenText: { position: 'absolute', opacity: 0, fontSize: 1 },
});
