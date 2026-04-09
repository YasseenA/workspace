import { useSettingsStore } from '../store/settings';

export const lightColors = {
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  primaryLight: '#e0e7ff',
  accent: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  bg: '#f8fafc',
  bgSecondary: '#ffffff',
  card: '#ffffff',
  border: '#e2e8f0',
  text: '#0f172a',
  textSecondary: '#475569',
  textTertiary: '#94a3b8',
};

export const darkColors = {
  primary: '#818cf8',
  primaryDark: '#6366f1',
  primaryLight: '#1e1b4b',
  accent: '#a78bfa',
  success: '#34d399',
  warning: '#fbbf24',
  error: '#f87171',
  info: '#60a5fa',
  bg: '#0f172a',
  bgSecondary: '#1e293b',
  card: '#1e293b',
  border: '#334155',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  textTertiary: '#64748b',
};

// Static fallback for StyleSheet.create() outside components
export const colors = lightColors;

// Hook for inside components — returns reactive colors
export function useColors() {
  const darkMode = useSettingsStore(s => s.darkMode);
  return darkMode ? darkColors : lightColors;
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 6, md: 10, lg: 14, xl: 20, full: 999 };
export const shadow = {
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
};
