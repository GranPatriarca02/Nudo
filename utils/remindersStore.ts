import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  cancelReminderNotifications,
  scheduleReminderNotification,
} from './notifications';
import {
  dateReplacer,
  dateReviver,
  mmkvZustandStorage,
} from './storage';
import type { NewReminderInput, Reminder } from './types';

type RemindersState = {
  reminders: Reminder[];

  /**
   * Crea un recordatorio nuevo, programa la notificación local sticky
   * 24h antes (o 1h antes como respaldo si falta menos de 24h) y guarda
   * el ID resultante en `notificationIds`. Es asíncrono porque
   * `scheduleNotificationAsync` lo es.
   */
  addReminder: (input: NewReminderInput) => Promise<Reminder>;

  /** Marca como completado y cancela cualquier notificación pendiente. */
  completeReminder: (id: string) => Promise<void>;

  /** Elimina el recordatorio y cancela cualquier notificación pendiente. */
  deleteReminder: (id: string) => Promise<void>;
};

const generateId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const useRemindersStore = create<RemindersState>()(
  persist(
    (set, get) => ({
      reminders: [],

      addReminder: async (input) => {
        const id = generateId();

        // Defensivo: aunque `input.targetDate` debería llegar como Date desde
        // el formulario, lo reconstruimos por si en algún punto se serializa.
        const targetDate = new Date(input.targetDate);

        // Programar la notificación ANTES de guardar el recordatorio para
        // que quede atómico: si falla la programación, no añadimos el item.
        let notificationIds: string[] = [];
        try {
          notificationIds = await scheduleReminderNotification(
            id,
            input.title,
            targetDate,
          );
        } catch (err) {
          // Si fallan los permisos o el servicio, seguimos guardando el
          // recordatorio sin notificación; el usuario lo ve en la lista.
          console.warn('[Nudo] No se pudo programar la notificación:', err);
        }

        const reminder: Reminder = {
          id,
          title: input.title,
          targetDate,
          imageUri: input.imageUri,
          notificationIds,
          isCompleted: false,
        };

        set((state) => ({ reminders: [...state.reminders, reminder] }));
        return reminder;
      },

      completeReminder: async (id) => {
        const reminder = get().reminders.find((r) => r.id === id);
        if (reminder && reminder.notificationIds.length > 0) {
          await cancelReminderNotifications(reminder.notificationIds).catch(
            (err) =>
              console.warn(
                '[Nudo] Error cancelando notificaciones al completar:',
                err,
              ),
          );
        }
        set((state) => ({
          reminders: state.reminders.map((r) =>
            r.id === id
              ? { ...r, isCompleted: true, notificationIds: [] }
              : r,
          ),
        }));
      },

      deleteReminder: async (id) => {
        const reminder = get().reminders.find((r) => r.id === id);
        if (reminder && reminder.notificationIds.length > 0) {
          await cancelReminderNotifications(reminder.notificationIds).catch(
            (err) =>
              console.warn(
                '[Nudo] Error cancelando notificaciones al eliminar:',
                err,
              ),
          );
        }
        set((state) => ({
          reminders: state.reminders.filter((r) => r.id !== id),
        }));
      },
    }),
    {
      name: 'reminders',
      storage: createJSONStorage(() => mmkvZustandStorage, {
        replacer: dateReplacer,
        reviver: dateReviver,
      }),
      partialize: (state) => ({ reminders: state.reminders }),
      version: 1,
    },
  ),
);
