import { router, Tabs, type Href } from 'expo-router';
import { type ColorValue, Pressable, StyleSheet, Text } from 'react-native';

import { colors, type } from '@/constants/theme';

function TabIcon({ symbol, color }: { symbol: string; color: ColorValue }) {
  return <Text style={[styles.icon, { color }]}>{symbol}</Text>;
}

const accountRoute = '/conta' as Href;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.text, fontSize: type.heading, fontWeight: '800' },
        headerShadowVisible: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: { fontSize: type.caption, fontWeight: '700' },
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 64 },
        headerRight: () => (
          <Pressable accessibilityLabel="Abrir minha conta" accessibilityRole="button" onPress={() => router.push(accountRoute)} style={styles.account}>
            <Text style={styles.accountText}>Conta</Text>
          </Pressable>
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Início', tabBarIcon: ({ color }) => <TabIcon color={color} symbol="⌂" /> }}
      />
      <Tabs.Screen
        name="medicamentos"
        options={{ title: 'Medicamentos', tabBarIcon: ({ color }) => <TabIcon color={color} symbol="+" /> }}
      />
      <Tabs.Screen
        name="assistente"
        options={{ title: 'Assistente', tabBarIcon: ({ color }) => <TabIcon color={color} symbol="✦" /> }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  icon: { fontSize: 25, lineHeight: 28, fontWeight: '700' },
  account: { minWidth: 60, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  accountText: { color: colors.primary, fontSize: type.small, fontWeight: '800' },
});
