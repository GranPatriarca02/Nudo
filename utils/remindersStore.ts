import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  dateReplacer,
  dateReviver,
  mmkvZustandStorage,
} from './storage';
import type { NewReminderInput, Reminder } from './types';

type RemindersState = {
  reminders: Reminder[];

  /**
   * Crea un recordatorio nuevo y lo persiste. Devuelve el recordatorio
   * resultante para que el llamador pueda, por ejemplo, programar las
   * notificaciones y luego guardar los IDs con `setNotificationIds`.
   */
  addReminder: (input: NewReminderInput) => Reminder;

  /** Marca un recordatorio como completado. */
  completeReminder: (id: string) => void;

  /** Elimina un recordatorio del almacenamiento. */
  deleteReminder: (id: string) => void;
};

/**
 * Genera un ID razonablemente único sin depender de `crypto.randomUUID`,
 * que no está disponible en todos los entornos de React Native.
 */
const generateId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const useRemindersStore = create<RemindersState>()(
  persist(
    (set) => ({
      reminders: [],

      addReminder: (input) => {
        const reminder: Reminder = {
          id: generateId(),
          title: input.title,
          targetDate: input.targetDate,
          imageUri: input.imageUri,
          notificationIds: input.notificationIds ?? [],
          isCompleted: false,
        };

        set((state) => ({ reminders: [...state.reminders, reminder] }));
        return reminder;
      },

      completeReminder: (id) =>
        set((state) => ({
          reminders: state.reminders.map((r) =>
            r.id === id ? { ...r, isCompleted: true } : r,
          ),
        })),

      deleteReminder: (id) =>
        set((state) => ({
          reminders: state.reminders.filter((r) => r.id !== id),
        })),
    }),
    {
      name: 'reminders',
      storage: createJSONStorage(() => mmkvZustandStorage, {
        replacer: dateReplacer,
        reviver: dateReviver,
      }),
      // Solo persistimos el array de recordatorios; las acciones se
      // reconstruyen al crear el store.
      partialize: (state) => ({ reminders: state.reminders }),
      version: 1,
    },
  ),
);
