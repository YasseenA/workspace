/**
 * Platform-aware key/value store.
 * Web  → localStorage (unchanged from before)
 * iOS  → AsyncStorage with an in-memory cache so reads stay synchronous
 *
 * Call initKeystore() once at app startup on native.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const cache: Record<string, string> = {};

/** Populate the in-memory cache from AsyncStorage. Call once in _layout.tsx. */
export async function initKeystore(keys: string[]) {
  if (Platform.OS === 'web') return;
  const values = await Promise.all(keys.map(k => AsyncStorage.getItem(k)));
  keys.forEach((k, i) => { if (values[i] !== null) cache[k] = values[i]!; });
}

/** Synchronous read — works on both platforms once initKeystore has run. */
export function getKey(key: string): string | null {
  if (Platform.OS === 'web') {
    try { return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null; } catch { return null; }
  }
  return cache[key] ?? null;
}

/** Async write — updates both the cache and the underlying storage. */
export async function setKey(key: string, value: string | null) {
  if (Platform.OS === 'web') {
    try {
      if (typeof localStorage === 'undefined') return;
      if (value !== null) localStorage.setItem(key, value);
      else localStorage.removeItem(key);
    } catch {}
    return;
  }
  if (value !== null) {
    cache[key] = value;
    await AsyncStorage.setItem(key, value);
  } else {
    delete cache[key];
    await AsyncStorage.removeItem(key);
  }
}
