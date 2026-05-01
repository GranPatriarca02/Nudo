import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Identificador del canal de Android. Cada notificación que programemos en
 * Android pasará por este canal, así que las opciones de importancia y
 * vibración del canal aplican a todas.
 */
const ANDROID_CHANNEL_ID = 'nudo-reminders';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Configura cómo se muestran las notificaciones cuando la app está en primer
 * plano. Sin esto, Android puede ignorarlas si la app está abierta. Se llama
 * al cargarse el módulo (no necesita esperar al mount de React).
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Crea (idempotente) el canal de notificaciones en Android. En iOS no hace
 * nada. Llamar en el arranque de la app antes de programar nada.
 */
export async function configureNotifications(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Recordatorios Nudo',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lockscreenVisibility:
        Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
}

/**
 * Pide permiso al usuario para enviar notificaciones. Devuelve `true` si
 * fueron concedidos. Si ya estaban concedidos no muestra prompt.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Decide cuándo debe sonar la notificación. La regla acordada con producto:
 *  - Si quedan 24h o más hasta `targetDate` → 24h antes.
 *  - Si quedan menos de 24h pero más de 1h → 1h antes (respaldo).
 *  - Si quedan menos de 1h → no se programa nada (devuelve null).
 */
function computeTriggerDate(targetDate: Date): Date | null {
  // Defensivo: Zustand/MMKV pueden devolver `targetDate` como string ISO,
  // así que reconstruimos el Date antes de hacer aritmética.
  const target = new Date(targetDate);
  const targetMs = target.getTime();
  const now = Date.now();
  const msUntilTarget = targetMs - now;

  if (msUntilTarget >= DAY_MS) return new Date(targetMs - DAY_MS);
  if (msUntilTarget >= HOUR_MS) return new Date(targetMs - HOUR_MS);
  return null;
}

/**
 * Programa una notificación local "pegajosa" (no descartable) para el
 * recordatorio dado. Devuelve un array con los IDs generados (vacío si la
 * fecha está demasiado próxima/pasada para programar nada).
 *
 * `sticky: true` + `autoDismiss: false` hace que en Android la notificación
 * permanezca en el panel hasta que la app la cancele explícitamente. En iOS
 * estos flags se ignoran (iOS no permite notificaciones no descartables),
 * pero la notificación se programa igualmente.
 */
export async function scheduleReminderNotification(
  reminderId: string,
  title: string,
  targetDate: Date,
): Promise<string[]> {
  const triggerDate = computeTriggerDate(targetDate);
  if (!triggerDate) return [];

  // Defensivo: aseguramos que `targetDate` sea Date para serializar bien.
  const target = new Date(targetDate);

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Nudo - Recordatorio',
      body: title,
      sticky: true,
      autoDismiss: false,
      data: { reminderId, targetDate: target.toISOString() },
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      ...(Platform.OS === 'android' && { channelId: ANDROID_CHANNEL_ID }),
    },
  });

  return [id];
}

/**
 * Cancela cualquier notificación pendiente y descarta cualquier notificación
 * ya mostrada en la bandeja para los IDs dados. Tolerante a errores: si una
 * notificación ya no existe simplemente lo ignora.
 */
export async function cancelReminderNotifications(
  notificationIds: string[],
): Promise<void> {
  if (notificationIds.length === 0) return;

  await Promise.all(
    notificationIds.flatMap((id) => [
      // Cancela las que aún no han sonado.
      Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined),
      // Descarta las ya entregadas (sticky en Android).
      Notifications.dismissNotificationAsync(id).catch(() => undefined),
    ]),
  );
}
