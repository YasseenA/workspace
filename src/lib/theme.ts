import { useSettingsStore } from '../store/settings';
import { Platform } from 'react-native';

// Derive light variants from a hex accent color
function lighten(hex: string, opacity = 0.12): string {
  return hex + Math.round(opacity * 255).toString(16).padStart(2, '0');
}

function makeColors(accent: string, dark: boolean) {
  const primaryLight = dark
    ? lighten(accent, 0.18)
    : lighten(accent, 0.10);

  return {
    primary:       accent,
    primaryDark:   accent,
    primaryLight,
    accent:        '#f97316',
    success:       dark ? '#34d399' : '#10b981',
    warning:       dark ? '#fbbf24' : '#f59e0b',
    error:         dark ? '#f87171' : '#ef4444',
    info:          dark ? '#60a5fa' : '#3b82f6',
    bg:            dark ? '#0c0c11' : '#f7f7fc',
    bgSecondary:   dark ? '#111118' : '#ffffff',
    card:          dark ? '#18181f' : '#ffffff',
    border:        dark ? '#2a2a38' : '#e8e8f2',
    text:          dark ? '#f5f5fa' : '#0a0a12',
    textSecondary: dark ? '#9595b0' : '#4b4b6b',
    textTertiary:  dark ? '#65657a' : '#9595b0',
  };
}

// Static fallback (light + default violet) — used outside components
export const lightColors = makeColors('#7c3aed', false);
export const darkColors  = makeColors('#7c3aed', true);
export const colors      = lightColors;

// Reactive hook — picks up darkMode + accentColor from settings store
export function useColors() {
  const darkMode    = useSettingsStore(s => s.darkMode);
  const accentColor = useSettingsStore(s => s.accentColor) || '#7c3aed';

  // Apply dark mode to web document body
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.body.style.backgroundColor = darkMode ? '#0c0c11' : '#f7f7fc';
    document.body.style.color = darkMode ? '#f5f5fa' : '#0a0a12';
  }

  return makeColors(accentColor, darkMode);
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius  = { sm: 8, md: 12, lg: 16, xl: 24, full: 999 };
export const shadow  = {
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4,  elevation: 2 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 12, elevation: 5 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.14, shadowRadius: 20, elevation: 8 },
};
