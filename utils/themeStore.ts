import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { mmkvZustandStorage } from './storage';

export type ThemeMode = 'system' | 'light' | 'dark';

type ThemeState = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  /**
   * Avanza al siguiente modo (system → light → dark → system…). Útil para
   * un único botón en la cabecera que rota entre las tres opciones.
   */
  cycleMode: () => void;
};

const ORDER: ThemeMode[] = ['system', 'light', 'dark'];

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'system',
      setMode: (mode) => set({ mode }),
      cycleMode: () => {
        const current = get().mode;
        const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
        set({ mode: next });
      },
    }),
    {
      name: 'theme',
      storage: createJSONStorage(() => mmkvZustandStorage),
    },
  ),
);
