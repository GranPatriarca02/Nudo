import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, {
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { useNudoTheme } from '../utils/theme';
import type { Reminder } from '../utils/types';

type Props = {
  reminder: Reminder;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (reminder: Reminder) => void;
};

const SWIPE_ACTION_WIDTH = 100;

const computeRemaining = (target: Date | string): number => {
  const dateObj = typeof target === 'string' ? new Date(target) : target;
  return dateObj.getTime() - Date.now();
};

const formatCountdown = (msRemaining: number): string => {
  if (msRemaining <= 0) return 'Vencido';
  const totalSeconds = Math.floor(msRemaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `Faltan ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

const HOUR_MS = 60 * 60 * 1000;

/**
 * Acción que se revela al deslizar hacia la derecha. Es un `Pressable`
 * con un icono de check: el usuario primero desliza para revelarlo y
 * luego tiene que pulsarlo para confirmar la acción de "completado".
 */
function CompleteAction({
  drag,
  onPress,
  bg,
}: {
  prog: SharedValue<number>;
  drag: SharedValue<number>;
  onPress: () => void;
  bg: string;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: drag.value - SWIPE_ACTION_WIDTH }],
  }));
  return (
    <Reanimated.View
      style={[
        {
          width: SWIPE_ACTION_WIDTH,
          backgroundColor: bg,
          justifyContent: 'center',
          alignItems: 'center',
        },
        animatedStyle,
      ]}
    >
      <Pressable
        onPress={onPress}
        hitSlop={8}
        accessibilityLabel="Marcar como completado"
        style={({ pressed }) => ({
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: pressed ? 'rgba(255,255,255,0.25)' : 'transparent',
          justifyContent: 'center',
          alignItems: 'center',
        })}
      >
        <Ionicons name="checkmark-circle" size={42} color="#fff" />
      </Pressable>
    </Reanimated.View>
  );
}

export function ReminderItem({
  reminder,
  onComplete,
  onDelete,
  onEdit,
}: Props) {
  const { palette } = useNudoTheme();
  const styles = useStyles();

  const [remaining, setRemaining] = useState<number>(() =>
    computeRemaining(reminder.targetDate),
  );
  const swipeableRef = useRef<SwipeableMethods>(null);

  // Contador en tiempo real. Se reinicia si cambia la fecha o el estado.
  useEffect(() => {
    if (reminder.isCompleted) return;
    const tick = () => setRemaining(computeRemaining(reminder.targetDate));
    tick();
    const initial = computeRemaining(reminder.targetDate);
    if (initial <= 0) return;
    const intervalId = setInterval(() => {
      const r = computeRemaining(reminder.targetDate);
      setRemaining(r);
      if (r <= 0) clearInterval(intervalId);
    }, 1000);
    return () => clearInterval(intervalId);
  }, [reminder.targetDate, reminder.isCompleted]);

  /**
   * Al pulsar el check revelado por el swipe: completar y cerrar el panel.
   * Importante: no completamos automáticamente al cruzar el umbral; el
   * usuario tiene que hacer un segundo gesto explícito (el tap).
   */
  const handleConfirmComplete = () => {
    onComplete(reminder.id);
    swipeableRef.current?.close();
  };

  const isInAlertWindow = useMemo(() => {
    if (reminder.isCompleted) return false;
    if (reminder.alertOffsetHours.length === 0) return false;
    const maxOffset = Math.max(...reminder.alertOffsetHours);
    return remaining <= maxOffset * HOUR_MS && remaining > 0;
  }, [remaining, reminder.alertOffsetHours, reminder.isCompleted]);

  const isExpired = !reminder.isCompleted && remaining <= 0;
  const countdownText = reminder.isCompleted
    ? 'Completado'
    : formatCountdown(remaining);
  const titleColor = reminder.isCompleted
    ? palette.itemCompletedText
    : isInAlertWindow || isExpired
      ? palette.itemAlertText
      : palette.itemDefaultText;
  const countdownColor = titleColor;

  const confirmDelete = () => {
    Alert.alert(
      'Eliminar recordatorio',
      `¿Seguro que quieres eliminar "${reminder.title}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => onDelete(reminder.id),
        },
      ],
    );
  };

  const offsetsLabel =
    reminder.alertOffsetHours.length > 0 && !reminder.isCompleted
      ? `  ·  Avisos: ${[...reminder.alertOffsetHours]
          .sort((a, b) => b - a)
          .map((h) => `${h}h`)
          .join(', ')}`
      : '';

  // Una vez completado el recordatorio queda inmutable: no se puede editar
  // tocándolo y tampoco se puede deslizar para volver a "completar".
  const handleRowPress = reminder.isCompleted
    ? undefined
    : () => onEdit(reminder);

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      friction={2}
      leftThreshold={SWIPE_ACTION_WIDTH * 0.6}
      // Mantenemos el panel abierto al cruzar el umbral en lugar de
      // disparar la acción: el usuario tiene que pulsar el check para
      // confirmar que quiere completar.
      overshootLeft={false}
      enabled={!reminder.isCompleted}
      renderLeftActions={(prog, drag) => (
        <CompleteAction
          prog={prog}
          drag={drag}
          onPress={handleConfirmComplete}
          bg={palette.success}
        />
      )}
    >
      <Pressable
        onPress={handleRowPress}
        disabled={reminder.isCompleted}
        style={({ pressed }) => [
          styles.row,
          pressed &&
            !reminder.isCompleted && {
              backgroundColor: palette.surfaceElevated,
            },
        ]}
      >
        <View style={styles.info}>
          <Text
            style={[
              styles.title,
              {
                color: titleColor,
                textDecorationLine: reminder.isCompleted
                  ? 'line-through'
                  : 'none',
              },
            ]}
            numberOfLines={1}
          >
            {reminder.title}
          </Text>
          <Text style={[styles.countdown, { color: countdownColor }]}>
            {countdownText}
          </Text>
          <Text style={styles.targetDate}>
            {new Date(reminder.targetDate).toLocaleString()}
            {offsetsLabel}
          </Text>
        </View>

        <Pressable
          onPress={confirmDelete}
          hitSlop={8}
          style={styles.actionButton}
          accessibilityLabel="Eliminar"
        >
          <Ionicons name="trash-outline" size={22} color={palette.danger} />
        </Pressable>
      </Pressable>
    </ReanimatedSwipeable>
  );
}

function useStyles() {
  const { palette } = useNudoTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        row: {
          backgroundColor: palette.surface,
          paddingVertical: 14,
          paddingHorizontal: 16,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: palette.border,
          flexDirection: 'row',
          alignItems: 'center',
        },
        info: { flex: 1 },
        title: { fontSize: 16, fontWeight: '600' },
        countdown: {
          marginTop: 4,
          fontSize: 14,
          fontVariant: ['tabular-nums'],
        },
        targetDate: {
          marginTop: 2,
          fontSize: 12,
          color: palette.textMuted,
        },
        actionButton: {
          paddingHorizontal: 6,
          paddingVertical: 4,
        },
      }),
    [palette],
  );
}
