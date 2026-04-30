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
 */
export type Reminder = {
  id: string;
  title: string;
  targetDate: Date;
  imageUri?: string;
  notificationIds: string[];
  isCompleted: boolean;
};

/**
 * Datos necesarios para crear un recordatorio. El store se encarga de generar
 * `id`, inicializar `notificationIds` y poner `isCompleted` en `false`.
 */
export type NewReminderInput = {
  title: string;
  targetDate: Date;
  imageUri?: string;
  notificationIds?: string[];
};
