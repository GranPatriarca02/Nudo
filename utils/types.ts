/**
 * Tiempos válidos de antelación para los avisos de un recordatorio.
 * Un recordatorio puede tener varios offsets a la vez (p.ej. avisar a 24h
 * y a 1h del evento), por eso en `Reminder.alertOffsetHours` guardamos
 * un array de estos valores.
 */
export type AlertOffsetHours = 1 | 6 | 12 | 24;

export const ALERT_OFFSET_OPTIONS: readonly AlertOffsetHours[] = [
  1, 6, 12, 24,
] as const;

export const DEFAULT_ALERT_OFFSETS: readonly AlertOffsetHours[] = [24] as const;

/**
 * Modelo de datos para un recordatorio.
 *
 * - `id`: identificador único.
 * - `title`: texto que se mostrará al usuario.
 * - `targetDate`: fecha y hora exacta del evento.
 * - `imageUri`: URI opcional de imagen adjunta. Función Premium.
 * - `notificationIds`: identificadores devueltos por `expo-notifications`
 *   para poder cancelar las notificaciones programadas.
 * - `isCompleted`: si el usuario ya marcó la tarea como hecha.
 * - `alertOffsetHours`: array con las antelaciones elegidas (1, 6, 12, 24h).
 *   Por cada elemento hay una notificación programada.
 */
export type Reminder = {
  id: string;
  title: string;
  targetDate: Date;
  imageUri?: string;
  notificationIds: string[];
  isCompleted: boolean;
  alertOffsetHours: AlertOffsetHours[];
};

/**
 * Datos necesarios para crear un recordatorio. El store rellena `id`,
 * `notificationIds` (tras programar) e `isCompleted: false`.
 */
export type NewReminderInput = {
  title: string;
  targetDate: Date;
  alertOffsetHours: AlertOffsetHours[];
  imageUri?: string;
};

/**
 * Cambios aplicables a un recordatorio existente al editarlo.
 */
export type UpdateReminderInput = {
  title: string;
  targetDate: Date;
  alertOffsetHours: AlertOffsetHours[];
  imageUri?: string;
};
