import { Platform } from 'react-native';

export const colors = {
  primary: '#007AFF',
  primaryDark: '#005BBF',
  success: '#248A3D',
  successSoft: '#E8F7EC',
  danger: '#D70015',
  dangerSoft: '#FDEBEC',
  warning: '#B25000',
  warningSoft: '#FFF2DF',
  background: '#F2F2F7',
  surface: '#FFFFFF',
  text: '#1C1C1E',
  textSecondary: '#636366',
  border: '#D1D1D6',
  disabled: '#AEAEB2',
  disabledSurface: '#E5E5EA',
  overlay: 'rgba(28, 28, 30, 0.45)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  huge: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const type = {
  title: 24,
  heading: 20,
  body: 16,
  small: 14,
  caption: 12,
} as const;

export const cardShadow = Platform.select({
  ios: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  android: { elevation: 2 },
  default: { boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
});

export const maxContentWidth = 760;
