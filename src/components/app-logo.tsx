import { Image, type ImageProps } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';

let cachedSource: ImageProps['source'] = null;
try {
  cachedSource = require('@/../assets/brand/zelo-logo-mark-v2.svg');
} catch {
  cachedSource = null;
}

export function AppLogo({ width = 96 }: { width?: number }) {
  return (
    <View
      accessibilityLabel="Logomarca Zelo"
      style={{ width, height: width, alignItems: 'center', justifyContent: 'center' }}>
      {cachedSource ? (
        <Image
          contentFit="contain"
          source={cachedSource}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <Text accessibilityElementsHidden style={{ color: colors.primary, fontSize: width * 0.5, fontWeight: '800' }}>
          Z
        </Text>
      )}
    </View>
  );
}
