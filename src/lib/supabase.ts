import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const CHUNK_SIZE = 1800;

async function getStoredValue(key: string) {
  if (Platform.OS === 'web') {
    return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function setStoredValue(key: string, value: string) {
  if (Platform.OS === 'web') {
    if (typeof globalThis.localStorage !== 'undefined') globalThis.localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteStoredValue(key: string) {
  if (Platform.OS === 'web') {
    if (typeof globalThis.localStorage !== 'undefined') globalThis.localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

async function removeChunks(key: string) {
  const count = Number(await getStoredValue(`${key}.chunks`));
  if (Number.isFinite(count) && count > 0) {
    await Promise.all(
      Array.from({ length: count }, (_, index) => deleteStoredValue(`${key}.${index}`)),
    );
  }
  await deleteStoredValue(`${key}.chunks`);
  await deleteStoredValue(key);
}

export const secureStorage = {
  async getItem(key: string) {
    const count = Number(await getStoredValue(`${key}.chunks`));
    if (!Number.isFinite(count) || count <= 0) return getStoredValue(key);
    const chunks = await Promise.all(
      Array.from({ length: count }, (_, index) => getStoredValue(`${key}.${index}`)),
    );
    return chunks.every((chunk) => chunk !== null) ? chunks.join('') : null;
  },
  async setItem(key: string, value: string) {
    await removeChunks(key);
    const chunks = Array.from(
      { length: Math.ceil(value.length / CHUNK_SIZE) },
      (_, index) => value.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE),
    );
    await Promise.all(
      chunks.map((chunk, index) => setStoredValue(`${key}.${index}`, chunk)),
    );
    await setStoredValue(`${key}.chunks`, String(chunks.length));
  },
  removeItem: removeChunks,
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ?? process.env.EXPO_PUBLIC_SUPABASE_KEY
  ?? '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

if (__DEV__ && !isSupabaseConfigured) {
  console.warn(
    '[supabase] EXPO_PUBLIC_SUPABASE_URL ou EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ausentes no bundle. '
      + 'Reaplique o build apos `vercel env pull` (web) ou revise `eas.json` (nativo).',
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://invalid.supabase.co',
  supabasePublishableKey || 'sb_publishable_missing',
  {
    auth: {
      storage: secureStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
