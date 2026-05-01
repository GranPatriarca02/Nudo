/**
 * Tiempos válidos de antelación para el aviso de un recordatorio.
 * Mantenemos la lista cerrada para evitar valores arbitrarios y para
 * poder renderizar fácilmente un selector segmentado en el formulario.
 */
export type AlertOffsetHours = 6 | 12 | 24;

export const ALERT_OFFSET_OPTIONS: readonly AlertOffsetHours[] = [
  6, 12, 24,
] as const;

export const DEFAULT_ALERT_OFFSET: AlertOffsetHours = 24;

/**
 * Modelo de datos para un recordatorio.
 *
 * - `id`: identificador único del recordatorio.
 * - `title`: texto que se mostrará al usuario.
 * - `targetDate`: fecha y hora exacta en que debe dispararse el recordatorio.
 * - `imageUri`: URI opcional de una imagen adjunta. Función Premium.
 * - `notificationIds`: identificadores de las notificaciones programadas
 *   (devueltos por `expo-notifications`) para poder cancelarlas más tarde.
 * - `isCompleted`: indica si el usuario ya marcó el recordatorio como hecho.
 * - `alertOffsetHours`: antelación con la que debe sonar el aviso.
 * - `isPermanent`: si la notificación debe ser "ongoing" (no descartable
 *   con swipe ni con tap) o una notificación normal.
 */
export type Reminder = {
  id: string;
  title: string;
  targetDate: Date;
  imageUri?: string;
  notificationIds: string[];
  isCompleted: boolean;
  alertOffsetHours: AlertOffsetHours;
  isPermanent: boolean;
};

/**
 * Datos necesarios para crear un recordatorio. El store se encarga de generar
 * `id`, inicializar `notificationIds` y poner `isCompleted` en `false`.
 */
export type NewReminderInput = {
  title: string;
  targetDate: Date;
  alertOffsetHours: AlertOffsetHours;
  isPermanent: boolean;
  imageUri?: string;
  notificationIds?: string[];
};

/**
 * Cambios aplicables a un recordatorio existente al editarlo. Sólo los
 * campos editables están aquí — el `id` se pasa aparte.
 */
export type UpdateReminderInput = {
  title: string;
  targetDate: Date;
  alertOffsetHours: AlertOffsetHours;
  isPermanent: boolean;
  imageUri?: string;
};
