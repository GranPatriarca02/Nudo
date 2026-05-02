import { useColorScheme } from 'react-native';

import { useRemindersStore } from './remindersStore';

/**
 * Paleta de colores semánticos. Los componentes piden colores por su rol
 * (`text`, `surface`, `danger`, …) en lugar de por valor concreto, así el
 * tema se cambia globalmente sin tocar componentes.
 */
export type Palette = {
  background: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  primary: string;
  primaryPressed: string;
  danger: string;
  warning: string;
  success: string;
  premiumGold: string;
  inputBackground: string;
  /** Colores aplicados al item según su estado. */
  itemDefaultText: string;
  itemAlertText: string;
  itemCompletedText: string;
  /** Fondo del chip seleccionado en selectores segmentados. */
  chipSelected: string;
  chipSelectedText: string;
};

export const lightPalette: Palette = {
  background: '#fafafa',
  surface: '#ffffff',
  surfaceElevated: '#ffffff',
  text: '#111111',
  textSecondary: '#555555',
  textMuted: '#888888',
  border: '#e5e5e5',
  primary: '#2a8a6b',
  primaryPressed: '#207a5e',
  danger: '#d33a3a',
  warning: '#e07a00',
  success: '#1f9e6e',
  premiumGold: '#b88600',
  inputBackground: '#fafafa',
  itemDefaultText: '#111111',
  itemAlertText: '#d33a3a',
  itemCompletedText: '#1f9e6e',
  chipSelected: '#2a8a6b',
  chipSelectedText: '#ffffff',
};

export const darkPalette: Palette = {
  background: '#0e0e10',
  surface: '#1a1a1d',
  surfaceElevated: '#26262a',
  text: '#f0f0f0',
  textSecondary: '#bfbfc7',
  textMuted: '#7a7a82',
  border: '#2a2a2e',
  primary: '#3da88a',
  primaryPressed: '#2c8a6e',
  danger: '#ef5d5d',
  warning: '#ff9b30',
  success: '#3da88a',
  premiumGold: '#d4a017',
  inputBackground: '#26262a',
  itemDefaultText: '#f0f0f0',
  itemAlertText: '#ef5d5d',
  itemCompletedText: '#3da88a',
  chipSelected: '#3da88a',
  chipSelectedText: '#0e0e10',
};

export type EffectiveTheme = 'light' | 'dark';

export type ThemeContext = {
  palette: Palette;
  effective: EffectiveTheme;
  /** El modo elegido por el usuario, no el resuelto. */
  mode: 'system' | 'light' | 'dark';
};

/**
 * Hook principal: combina la preferencia del usuario (`useRemindersStore.theme`)
 * con el modo del sistema operativo cuando la preferencia es `'system'`.
 * Devuelve la paleta efectiva ya resuelta.
 */
export function useNudoTheme(): ThemeContext {
  const mode = useRemindersStore((s) => s.theme);
  const systemScheme = useColorScheme();

  const effective: EffectiveTheme =
    mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;

  return {
    palette: effective === 'dark' ? darkPalette : lightPalette,
    effective,
    mode,
  };
}
