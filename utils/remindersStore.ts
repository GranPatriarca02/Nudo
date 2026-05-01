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
import {
  DEFAULT_ALERT_OFFSET,
  type NewReminderInput,
  type Reminder,
  type UpdateReminderInput,
} from './types';

type RemindersState = {
  reminders: Reminder[];

  /**
   * Crea un recordatorio nuevo y programa su notificación. Si la
   * programación falla (sin permisos, error nativo) el recordatorio se
   * guarda igualmente con `notificationIds: []` para no perder los datos.
   */
  addReminder: (input: NewReminderInput) => Promise<Reminder>;

  /**
   * Aplica cambios a un recordatorio existente. Cancela las notificaciones
   * antiguas y programa las nuevas, ya que el title/targetDate/offset/
   * permanent pueden haber cambiado.
   */
  updateReminder: (id: string, input: UpdateReminderInput) => Promise<void>;

  /** Marca como completado y cancela cualquier notificación pendiente. */
  completeReminder: (id: string) => Promise<void>;

  /** Elimina el recordatorio y cancela cualquier notificación pendiente. */
  deleteReminder: (id: string) => Promise<void>;

  /** Tema visual preferido de la aplicación. */
  theme: 'system' | 'light' | 'dark';
  setTheme: (theme: 'system' | 'light' | 'dark') => void;
};

const generateId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const useRemindersStore = create<RemindersState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
      reminders: [],

      addReminder: async (input) => {
        const id = generateId();
        // Defensivo: aunque `input.targetDate` debería llegar como Date desde
        // el formulario, lo reconstruimos por si en algún punto se serializa.
        const targetDate = new Date(input.targetDate);

        let notificationIds: string[] = [];
        try {
          notificationIds = await scheduleReminderNotification(
            id,
            input.title,
            targetDate,
            input.alertOffsetHours,
            input.isPermanent,
          );
        } catch (err) {
          console.warn('[Nudo] No se pudo programar la notificación:', err);
        }

        const reminder: Reminder = {
          id,
          title: input.title,
          targetDate,
          imageUri: input.imageUri,
          notificationIds,
          isCompleted: false,
          alertOffsetHours: input.alertOffsetHours,
          isPermanent: input.isPermanent,
        };

        set((state) => ({ reminders: [...state.reminders, reminder] }));
        return reminder;
      },

      updateReminder: async (id, input) => {
        const existing = get().reminders.find((r) => r.id === id);
        if (!existing) return;

        // Cancelamos las viejas antes de programar nuevas para no dejar
        // notificaciones huérfanas si el target o el offset cambian.
        if (existing.notificationIds.length > 0) {
          await cancelReminderNotifications(existing.notificationIds).catch(
            (err) =>
              console.warn(
                '[Nudo] Error cancelando notificaciones al editar:',
                err,
              ),
          );
        }

        const targetDate = new Date(input.targetDate);

        let notificationIds: string[] = [];
        if (!existing.isCompleted) {
          // Solo re-programamos si el recordatorio sigue activo.
          try {
            notificationIds = await scheduleReminderNotification(
              id,
              input.title,
              targetDate,
              input.alertOffsetHours,
              input.isPermanent,
            );
          } catch (err) {
            console.warn(
              '[Nudo] No se pudo re-programar la notificación al editar:',
              err,
            );
          }
        }

        set((state) => ({
          reminders: state.reminders.map((r) =>
            r.id === id
              ? {
                  ...r,
                  title: input.title,
                  targetDate,
                  imageUri: input.imageUri,
                  alertOffsetHours: input.alertOffsetHours,
                  isPermanent: input.isPermanent,
                  notificationIds,
                }
              : r,
          ),
        }));
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
      partialize: (state) => ({ reminders: state.reminders, theme: state.theme }),
      version: 3,
      // Migración v1→v2: añadimos `alertOffsetHours` y `isPermanent` a los
      // recordatorios persistidos antes de existir esos campos. Defaults:
      // 24h de antelación y notificación permanente, que es como se venía
      // comportando la app hasta ahora.
      migrate: (persistedState: unknown, version: number) => {
        let state = persistedState as any;
        if (version < 2 && state) {
          state = {
            ...state,
            reminders: (state.reminders ?? []).map((r: any) => ({
              ...r,
              alertOffsetHours: r.alertOffsetHours ?? DEFAULT_ALERT_OFFSET,
              isPermanent: r.isPermanent ?? true,
            })),
          };
        }
        if (version < 3 && state) {
          state = {
            ...state,
            theme: state.theme ?? 'system',
          };
        }
        return state as RemindersState;
      },
    },
  ),
);
