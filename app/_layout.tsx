import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import {
  configureNotifications,
  requestNotificationPermissions,
} from '../utils/notifications';

export default function RootLayout() {
  useEffect(() => {
    // Disparamos sin await: queremos que la pantalla aparezca de inmediato
    // mientras el sistema gestiona el prompt de permisos en paralelo.
    (async () => {
      try {
        await configureNotifications();
        await requestNotificationPermissions();
      } catch (err) {
        console.warn(
          '[Nudo] Fallo configurando notificaciones al iniciar:',
          err,
        );
      }
    })();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack />
    </GestureHandlerRootView>
  );
}
