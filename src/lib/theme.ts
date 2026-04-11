import { useSettingsStore } from '../store/settings';

export const lightColors = {
  primary:       '#7c3aed',   // rich violet
  primaryDark:   '#6d28d9',
  primaryLight:  '#ede9fe',
  accent:        '#f97316',   // orange — warm contrast to violet
  success:       '#10b981',
  warning:       '#f59e0b',
  error:         '#ef4444',
  info:          '#3b82f6',
  bg:            '#f7f7fc',   // barely-there violet tint
  bgSecondary:   '#ffffff',
  card:          '#ffffff',
  border:        '#e8e8f2',
  text:          '#0a0a12',
  textSecondary: '#4b4b6b',
  textTertiary:  '#9595b0',
};

export const darkColors = {
  primary:       '#a78bfa',
  primaryDark:   '#7c3aed',
  primaryLight:  '#1d1535',
  accent:        '#fb923c',
  success:       '#34d399',
  warning:       '#fbbf24',
  error:         '#f87171',
  info:          '#60a5fa',
  bg:            '#0c0c11',   // true dark
  bgSecondary:   '#111118',
  card:          '#18181f',
  border:        '#2a2a38',
  text:          '#f5f5fa',
  textSecondary: '#9595b0',
  textTertiary:  '#65657a',
};

// Static fallback for StyleSheet.create() outside components
export const colors = lightColors;

// Hook for inside components — returns reactive colors
export function useColors() {
  const darkMode = useSettingsStore(s => s.darkMode);
  return darkMode ? darkColors : lightColors;
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius  = { sm: 8, md: 12, lg: 16, xl: 24, full: 999 };
export const shadow  = {
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,  elevation: 2 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 12, elevation: 5 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 20, elevation: 8 },
};
