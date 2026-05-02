import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  cancelReminderNotifications,
  scheduleReminderNotifications,
} from './notifications';
import {
  dateReplacer,
  dateReviver,
  mmkvZustandStorage,
} from './storage';
import {
  DEFAULT_ALERT_OFFSETS,
  type AlertOffsetHours,
  type NewReminderInput,
  type Reminder,
  type UpdateReminderInput,
} from './types';

export type ThemeMode = 'system' | 'light' | 'dark';

type RemindersState = {
  reminders: Reminder[];

  /** Tema visual preferido. Persistido junto con los recordatorios. */
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  /** Alterna entre claro y oscuro respetando el sistema operativo si está. */
  toggleTheme: (currentlyDark: boolean) => void;

  /**
   * Crea un recordatorio y programa una notificación local por cada
   * offset elegido. Si la programación falla en su totalidad el item se
   * guarda igualmente con `notificationIds: []` para no perder datos.
   */
  addReminder: (input: NewReminderInput) => Promise<Reminder>;

  /**
   * Aplica cambios a un recordatorio existente. Cancela las notificaciones
   * antiguas y programa nuevas, ya que título, fecha u offsets pueden
   * haber cambiado.
   */
  updateReminder: (id: string, input: UpdateReminderInput) => Promise<void>;

  /** Marca como completado y cancela las notificaciones pendientes. */
  completeReminder: (id: string) => Promise<void>;

  /** Elimina el recordatorio y cancela las notificaciones pendientes. */
  deleteReminder: (id: string) => Promise<void>;
};

const generateId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** Sanitiza el array de offsets: dedupe, ordenado y nunca vacío. */
const normalizeOffsets = (
  offsets: readonly AlertOffsetHours[],
): AlertOffsetHours[] => {
  const unique = Array.from(new Set(offsets));
  if (unique.length === 0) return [...DEFAULT_ALERT_OFFSETS];
  return unique.sort((a, b) => b - a); // 24, 12, 6, 1
};

export const useRemindersStore = create<RemindersState>()(
  persist(
    (set, get) => ({
      reminders: [],

      theme: 'system',
      setTheme: (theme) => set({ theme }),
      toggleTheme: (currentlyDark) =>
        set({ theme: currentlyDark ? 'light' : 'dark' }),

      addReminder: async (input) => {
        const id = generateId();
        // Defensivo: aunque `input.targetDate` debería llegar como Date,
        // lo reconstruimos por si en algún punto se serializa.
        const targetDate = new Date(input.targetDate);
        const alertOffsetHours = normalizeOffsets(input.alertOffsetHours);

        let notificationIds: string[] = [];
        try {
          notificationIds = await scheduleReminderNotifications(
            id,
            input.title,
            targetDate,
            alertOffsetHours,
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
          alertOffsetHours,
        };

        set((state) => ({ reminders: [...state.reminders, reminder] }));
        return reminder;
      },

      updateReminder: async (id, input) => {
        const existing = get().reminders.find((r) => r.id === id);
        if (!existing) return;

        // Cancelamos las viejas antes de programar nuevas.
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
        const alertOffsetHours = normalizeOffsets(input.alertOffsetHours);

        let notificationIds: string[] = [];
        if (!existing.isCompleted) {
          // Sólo re-programamos si el recordatorio sigue activo.
          try {
            notificationIds = await scheduleReminderNotifications(
              id,
              input.title,
              targetDate,
              alertOffsetHours,
            );
          } catch (err) {
            console.warn(
              '[Nudo] No se pudo re-programar al editar:',
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
                  alertOffsetHours,
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
                '[Nudo] Error cancelando al completar:',
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
                '[Nudo] Error cancelando al eliminar:',
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
      partialize: (state) => ({
        reminders: state.reminders,
        theme: state.theme,
      }),
      version: 4,
      // Migraciones acumulativas:
      // v1→v2: añade alertOffsetHours/isPermanent (24h y true por defecto).
      // v2→v3: añade theme = 'system'.
      // v3→v4: alertOffsetHours pasa a ser array; eliminamos isPermanent.
      migrate: (persistedState: unknown, version: number) => {
        let state: any = persistedState ?? {};
        if (version < 2) {
          state = {
            ...state,
            reminders: (state.reminders ?? []).map((r: any) => ({
              ...r,
              alertOffsetHours: r.alertOffsetHours ?? 24,
              isPermanent: r.isPermanent ?? true,
            })),
          };
        }
        if (version < 3) {
          state = { ...state, theme: state.theme ?? 'system' };
        }
        if (version < 4) {
          state = {
            ...state,
            reminders: (state.reminders ?? []).map((r: any) => {
              const { isPermanent, ...rest } = r;
              const offsets = Array.isArray(rest.alertOffsetHours)
                ? rest.alertOffsetHours
                : [rest.alertOffsetHours ?? 24];
              return { ...rest, alertOffsetHours: offsets };
            }),
          };
        }
        return state as RemindersState;
      },
    },
  ),
);
