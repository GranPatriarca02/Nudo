import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, {
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { useRemindersStore } from '../utils/remindersStore';
import type { Reminder } from '../utils/types';

type Props = {
  reminder: Reminder;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (reminder: Reminder) => void;
};

const SWIPE_ACTION_WIDTH = 120;

/**
 * Calcula la diferencia en milisegundos entre `target` y el momento actual.
 * Devuelve un número que puede ser negativo si la fecha ya pasó.
 */
const computeRemaining = (target: Date | string): number => {
  const dateObj = typeof target === 'string' ? new Date(target) : target;
  return dateObj.getTime() - Date.now();
};

/**
 * Convierte milisegundos restantes en el texto que se muestra al usuario.
 * Si el tiempo ya venció (<=0) devolvemos 'Vencido'. Si no, usamos el
 * formato "Faltan HH:MM:SS". Las horas pueden superar 99 si la fecha está
 * a varios días vista; se muestran tantas como sean necesarias.
 */
const formatCountdown = (msRemaining: number): string => {
  if (msRemaining <= 0) return 'Vencido';

  const totalSeconds = Math.floor(msRemaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `Faltan ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

/**
 * Acción que se revela al deslizar el item hacia la derecha.
 * El fondo verde se "desliza" junto con el dedo gracias a `useAnimatedStyle`.
 */
function CompleteAction({
  drag,
}: {
  prog: SharedValue<number>;
  drag: SharedValue<number>;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    // `drag.value` es positivo cuando arrastramos hacia la derecha. Restamos
    // el ancho para que el fondo aparezca desde fuera de la pantalla.
    transform: [{ translateX: drag.value - SWIPE_ACTION_WIDTH }],
  }));

  return (
    <Reanimated.View style={[styles.completeAction, animatedStyle]}>
      <Ionicons name="checkmark-circle-outline" size={32} color="#fff" />
    </Reanimated.View>
  );
}

export function ReminderItem({ reminder, onComplete, onDelete, onEdit }: Props) {
  const [remaining, setRemaining] = useState<number>(() =>
    computeRemaining(reminder.targetDate),
  );
  const swipeableRef = useRef<SwipeableMethods>(null);
  
  const theme = useRemindersStore(s => s.theme);
  const systemScheme = useColorScheme();
  const isDark = theme === 'system' ? systemScheme === 'dark' : theme === 'dark';

  // Contador en tiempo real. Se reinicia si cambia la fecha objetivo o si el
  // usuario marca/desmarca como completado. Si ya está completado o la fecha
  // ya pasó, no programamos `setInterval` para no gastar batería.
  useEffect(() => {
    if (reminder.isCompleted) return;

    const tick = () => setRemaining(computeRemaining(reminder.targetDate));
    tick(); // actualización inmediata al montar.

    const initial = computeRemaining(reminder.targetDate);
    if (initial <= 0) return;

    const intervalId = setInterval(() => {
      const r = computeRemaining(reminder.targetDate);
      setRemaining(r);
      if (r <= 0) {
        clearInterval(intervalId);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [reminder.targetDate, reminder.isCompleted]);

  const handleSwipeOpen = (direction: 'left' | 'right') => {
    if (direction === 'left') {
      // El usuario arrastró hacia la derecha y reveló la acción de la izquierda.
      onComplete(reminder.id);
      swipeableRef.current?.close();
    }
  };

  const countdownText = reminder.isCompleted
    ? 'Completado'
    : formatCountdown(remaining);
  const isExpired = !reminder.isCompleted && remaining <= 0;
  const isWarning = !reminder.isCompleted && remaining > 0 && remaining <= reminder.alertOffsetHours * 3600000;

  const handleDelete = () => {
    Alert.alert(
      'Eliminar Recordatorio',
      '¿Estás seguro de que quieres eliminar este recordatorio?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => onDelete(reminder.id) },
      ]
    );
  };

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      friction={2}
      leftThreshold={SWIPE_ACTION_WIDTH / 2}
      enabled={!reminder.isCompleted}
      renderLeftActions={(prog, drag) => (
        <CompleteAction prog={prog} drag={drag} />
      )}
      onSwipeableOpen={handleSwipeOpen}
    >
      <View style={[styles.row, { backgroundColor: isDark ? '#222' : '#fff', borderBottomColor: isDark ? '#333' : '#e5e5e5' }]}>
        <TouchableOpacity 
          style={styles.info} 
          onPress={() => {
            if (!reminder.isCompleted) onEdit(reminder);
          }}
        >
          <Text
            style={[
              styles.title,
              { color: isDark ? '#eee' : '#111' },
              reminder.isCompleted && styles.titleCompleted,
            ]}
            numberOfLines={1}
          >
            {reminder.title}
          </Text>
          <Text
            style={[
              styles.countdown,
              reminder.isCompleted && styles.countdownCompleted,
              isWarning && styles.countdownWarning,
              isExpired && styles.countdownExpired,
            ]}
          >
            {countdownText}
          </Text>
          <Text style={styles.targetDate}>
            {new Date(reminder.targetDate).toLocaleString()}
          </Text>
          {!reminder.isCompleted && (
            <Text style={[styles.hintText, { color: isDark ? '#777' : '#999' }]}>
              👉 Desliza a la derecha para completar
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleDelete}
          hitSlop={8}
          style={styles.deleteButton}
        >
          <Ionicons name="trash-outline" size={24} color="#d33" />
        </TouchableOpacity>
      </View>
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  titleCompleted: {
    color: '#888',
    textDecorationLine: 'line-through',
  },
  countdown: {
    marginTop: 4,
    fontSize: 14,
    color: '#666',
    fontVariant: ['tabular-nums'],
  },
  countdownCompleted: {
    color: '#2a8',
    fontWeight: '600',
  },
  countdownWarning: {
    color: '#d33',
    fontWeight: '600',
  },
  countdownExpired: {
    color: '#d33',
    fontWeight: '600',
  },
  targetDate: {
    marginTop: 2,
    fontSize: 12,
    color: '#666',
  },
  hintText: {
    marginTop: 4,
    fontSize: 11,
    fontStyle: 'italic',
  },
  deleteButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deleteButtonText: {
    color: '#d33',
    fontSize: 14,
  },
  completeAction: {
    width: SWIPE_ACTION_WIDTH,
    backgroundColor: '#2a8',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
