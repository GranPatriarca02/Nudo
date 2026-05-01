import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Platform } from 'react-native';

import type { AlertOffsetHours } from './types';

/**
 * Identificador del canal de Android. Cada notificación que programemos en
 * Android pasará por este canal, así que las opciones de importancia y
 * vibración del canal aplican a todas.
 */
const ANDROID_CHANNEL_ID = 'nudo-reminders';

const HOUR_MS = 60 * 60 * 1000;

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
 * Calcula el momento exacto en que debe sonar la notificación dada la fecha
 * objetivo y la antelación elegida (24h, 12h o 6h). Devuelve `null` si esa
 * fecha resultante ya pasó o está demasiado cerca de ahora (margen 30s)
 * para evitar disparar notificaciones inmediatas que confundirían al
 * usuario.
 */
function computeTriggerDate(
  targetDate: Date,
  alertOffsetHours: AlertOffsetHours,
): Date | null {
  // Defensivo: Zustand/MMKV pueden devolver `targetDate` como string ISO,
  // así que reconstruimos el Date antes de hacer aritmética.
  const target = new Date(targetDate);
  const triggerMs = target.getTime() - alertOffsetHours * HOUR_MS;
  // 30 segundos de colchón para evitar programaciones casi-inmediatas.
  if (triggerMs <= Date.now() + 30 * 1000) return null;
  return new Date(triggerMs);
}

/**
 * Programa la notificación local del recordatorio. Si `isPermanent` es
 * verdadero, en Android la notificación quedará "ongoing": no se podrá
 * descartar deslizando ni se borrará al pulsarla. En iOS estos flags se
 * ignoran (el sistema operativo no permite notificaciones no descartables).
 *
 * Devuelve un array con los IDs (vacío si la fecha está demasiado próxima).
 */
export async function scheduleReminderNotification(
  reminderId: string,
  title: string,
  targetDate: Date,
  alertOffsetHours: AlertOffsetHours,
  isPermanent: boolean,
): Promise<string[]> {
  const triggerDate = computeTriggerDate(targetDate, alertOffsetHours);
  if (!triggerDate) return [];

  const target = new Date(targetDate);

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Nudo - Recordatorio',
      body: title,
      // En Android `sticky:true` ⇒ setOngoing(true). `autoDismiss:false` ⇒
      // no desaparece al pulsar la notificación. Sólo aplicamos ambos
      // cuando el usuario marcó el recordatorio como permanente.
      sticky: isPermanent,
      autoDismiss: !isPermanent,
      data: {
        reminderId,
        targetDate: target.toISOString(),
        alertOffsetHours,
        isPermanent,
      },
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
      Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined),
      Notifications.dismissNotificationAsync(id).catch(() => undefined),
    ]),
  );
}
