import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Platform } from 'react-native';

import type { AlertOffsetHours } from './types';

/**
 * Identificador del canal de Android. Cada notificación que programemos
 * en Android pasará por este canal: las opciones de importancia y
 * vibración del canal aplican a todas.
 */
const ANDROID_CHANNEL_ID = 'nudo-reminders';

const HOUR_MS = 60 * 60 * 1000;

/**
 * Color del aviso de 1 hora antes (Android colorea el icono pequeño y la
 * cabecera con esto). Para los demás avisos usamos el color por defecto.
 */
const URGENT_COLOR = '#d33a3a';

/**
 * Configuramos cómo se muestran las notificaciones cuando la app está en
 * primer plano. Sin esto Android puede ignorarlas si la app está abierta.
 * Se ejecuta al cargarse el módulo, antes de cualquier scheduleAsync.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    // Estos dos son necesarios en versiones más nuevas; expo-notifications
    // 0.29 los acepta como opcionales sin error.
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Promesa "compartida" para que sólo configuremos el canal una vez. */
let channelReadyPromise: Promise<void> | null = null;

/**
 * Crea (idempotente) el canal Android. La promesa se cachea para que
 * llamadas concurrentes esperen al mismo trabajo. En iOS no hace nada.
 */
export function configureNotifications(): Promise<void> {
  if (channelReadyPromise) return channelReadyPromise;

  channelReadyPromise = (async () => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: 'Recordatorios Nudo',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lockscreenVisibility:
          Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }
  })();
  return channelReadyPromise;
}

/**
 * Pide permiso al usuario para enviar notificaciones. Si ya están
 * concedidos, no muestra prompt. Devuelve `true` si se concedieron.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Texto del cuerpo de la notificación. Como Android no permite actualizar
 * el body cada segundo en una notificación normal, mostramos el offset
 * elegido en lenguaje natural ("Faltan 1 hora", "Faltan 6 horas", …).
 */
function formatOffsetCountdown(offsetHours: AlertOffsetHours): string {
  return offsetHours === 1
    ? 'Faltan 1 hora'
    : `Faltan ${offsetHours} horas`;
}

/**
 * Programa UNA notificación local para un offset concreto. Devuelve el ID
 * o `null` si la fecha resultante ya ha pasado / está demasiado próxima.
 */
/**
 * Programa la notificación que suena justo cuando el recordatorio
 * "termina" (es decir, al alcanzar `targetDate`). Devuelve el ID o
 * `null` si la fecha objetivo ya está pasada.
 */
async function scheduleEnd(
  reminderId: string,
  title: string,
  targetDate: Date,
): Promise<string | null> {
  const target = new Date(targetDate);
  const triggerMs = target.getTime();
  if (triggerMs <= Date.now() + 5 * 1000) return null;
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body: 'Tu recordatorio ha terminado',
      // Color rojo: es el momento de actuar.
      color: URGENT_COLOR,
      data: {
        reminderId,
        targetDate: target.toISOString(),
        kind: 'end',
      },
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DATE,
      date: new Date(triggerMs),
      ...(Platform.OS === 'android' && { channelId: ANDROID_CHANNEL_ID }),
    },
  });
  return id;
}

async function scheduleOne(
  reminderId: string,
  title: string,
  targetDate: Date,
  offsetHours: AlertOffsetHours,
): Promise<string | null> {
  const target = new Date(targetDate);
  const triggerMs = target.getTime() - offsetHours * HOUR_MS;

  // Margen de 5 segundos: evitamos programar notificaciones casi-inmediatas
  // (que en Android pueden disparar antes de tiempo o no llegar a registrarse).
  if (triggerMs <= Date.now() + 5 * 1000) return null;

  const triggerDate = new Date(triggerMs);
  const isUrgent = offsetHours === 1;

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body: formatOffsetCountdown(offsetHours),
      // Color del icono pequeño / acento (sólo Android).
      ...(isUrgent ? { color: URGENT_COLOR } : {}),
      data: {
        reminderId,
        targetDate: target.toISOString(),
        offsetHours,
      },
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
      ...(Platform.OS === 'android' && { channelId: ANDROID_CHANNEL_ID }),
    },
  });

  return id;
}

/**
 * Programa una notificación por cada offset elegido. Si alguno de ellos
 * cae en el pasado se omite. Garantiza que el canal Android esté listo
 * antes de programar.
 */
export async function scheduleReminderNotifications(
  reminderId: string,
  title: string,
  targetDate: Date,
  alertOffsetHours: readonly AlertOffsetHours[],
): Promise<string[]> {
  // Asegurar canal antes de programar (idempotente).
  await configureNotifications();

  const offsetResults = await Promise.all(
    alertOffsetHours.map((offset) =>
      scheduleOne(reminderId, title, targetDate, offset).catch((err) => {
        console.warn('[Nudo] Falló programar notificación', offset, err);
        return null;
      }),
    ),
  );

  // Notificación "fin": exactamente en `targetDate`. Va siempre, además
  // de los avisos previos, para que el usuario sepa que llegó la hora.
  const endResult = await scheduleEnd(reminderId, title, targetDate).catch(
    (err) => {
      console.warn('[Nudo] Falló programar notificación de fin', err);
      return null;
    },
  );

  return [...offsetResults, endResult].filter(
    (id): id is string => id !== null,
  );
}

/**
 * Cancela cualquier notificación pendiente y descarta cualquier
 * notificación ya entregada para los IDs dados. Tolerante a errores.
 */
export async function cancelReminderNotifications(
  notificationIds: string[],
): Promise<void> {
  if (notificationIds.length === 0) return;

  await Promise.all(
    notificationIds.flatMap((id) => [
      Notifications.cancelScheduledNotificationAsync(id).catch(
        () => undefined,
      ),
      Notifications.dismissNotificationAsync(id).catch(() => undefined),
    ]),
  );
}
