import AsyncStorage from '@react-native-async-storage/async-storage';
export const storage = {
  get: async <T>(key: string): Promise<T | null> => {
    try { const v = await AsyncStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; }
  },
  set: async (key: string, value: any) => {
    try { await AsyncStorage.setItem(key, JSON.stringify(value)); } catch(e) { console.error('storage.set', e); }
  },
  remove: async (key: string) => { try { await AsyncStorage.removeItem(key); } catch {} },
  clear: async () => { try { await AsyncStorage.clear(); } catch {} },
};
