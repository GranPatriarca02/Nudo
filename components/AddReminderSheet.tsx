import { Ionicons } from '@expo/vector-icons';
import BottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetTextInput,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  AppState,
  BackHandler,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useRemindersStore } from '../utils/remindersStore';
import { useNudoTheme } from '../utils/theme';
import {
  ALERT_OFFSET_OPTIONS,
  type AlertOffsetHours,
  DEFAULT_ALERT_OFFSETS,
  type Reminder,
} from '../utils/types';

export type AddReminderSheetMethods = {
  /**
   * Abre el sheet. Si se pasa un `reminder`, entra en modo edición y
   * precarga los campos. Sin argumentos, abre vacío para crear uno nuevo.
   */
  open: (reminder?: Reminder) => void;
  close: () => void;
};

const getDefaultTargetDate = (): Date => {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
};

export const AddReminderSheet = forwardRef<AddReminderSheetMethods>(
  (_props, ref) => {
    const sheetRef = useRef<BottomSheet>(null);
    const { palette } = useNudoTheme();

    const addReminder = useRemindersStore((s) => s.addReminder);
    const updateReminder = useRemindersStore((s) => s.updateReminder);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [targetDate, setTargetDate] = useState<Date>(getDefaultTargetDate);
    const [selectedOffsets, setSelectedOffsets] = useState<
      AlertOffsetHours[]
    >([...DEFAULT_ALERT_OFFSETS]);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [sheetIndex, setSheetIndex] = useState(-1);

    const snapPoints = useMemo(() => ['80%'], []);
    const isSheetOpen = sheetIndex >= 0;
    const isEditing = editingId !== null;

    /** Restablece todos los campos al estado de "crear vacío". */
    const resetForm = useCallback(() => {
      setEditingId(null);
      setTitle('');
      setTargetDate(getDefaultTargetDate());
      setSelectedOffsets([...DEFAULT_ALERT_OFFSETS]);
      setShowDatePicker(false);
      setShowTimePicker(false);
    }, []);

    useImperativeHandle(ref, () => ({
      open: (reminder) => {
        if (reminder) {
          // Defensivo: targetDate puede llegar como string desde MMKV.
          setEditingId(reminder.id);
          setTitle(reminder.title);
          setTargetDate(new Date(reminder.targetDate));
          setSelectedOffsets(
            reminder.alertOffsetHours.length > 0
              ? [...reminder.alertOffsetHours]
              : [...DEFAULT_ALERT_OFFSETS],
          );
        } else {
          resetForm();
        }
        setShowDatePicker(false);
        setShowTimePicker(false);
        sheetRef.current?.expand();
      },
      close: () => {
        Keyboard.dismiss();
        sheetRef.current?.close();
      },
    }));

    /**
     * Si la app pasa a segundo plano con el sheet abierto, lo cerramos y
     * disipamos el teclado. Evita el bug de "se reabre la app y aparece
     * el creador desplegado con el teclado a medio camino".
     */
    useEffect(() => {
      const sub = AppState.addEventListener('change', (state) => {
        if (state !== 'active') {
          Keyboard.dismiss();
          sheetRef.current?.close();
        }
      });
      return () => sub.remove();
    }, []);

    /**
     * Mientras el sheet está abierto, el botón atrás de Android lo cierra
     * en lugar de salir de la app. Sólo se registra el handler cuando hace
     * falta para no interferir con el handler de doble-tap-salir de la
     * pantalla principal.
     */
    useEffect(() => {
      if (Platform.OS !== 'android' || !isSheetOpen) return;
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        Keyboard.dismiss();
        sheetRef.current?.close();
        return true; // consumido
      });
      return () => sub.remove();
    }, [isSheetOpen]);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          pressBehavior="close"
        />
      ),
      [],
    );

    const handleDateChange = (
      event: DateTimePickerEvent,
      selectedDate?: Date,
    ) => {
      if (Platform.OS === 'android') setShowDatePicker(false);
      if (event.type === 'set' && selectedDate) {
        const merged = new Date(targetDate);
        merged.setFullYear(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate(),
        );
        setTargetDate(merged);
      }
    };

    const handleTimeChange = (
      event: DateTimePickerEvent,
      selectedTime?: Date,
    ) => {
      if (Platform.OS === 'android') setShowTimePicker(false);
      if (event.type === 'set' && selectedTime) {
        const merged = new Date(targetDate);
        merged.setHours(
          selectedTime.getHours(),
          selectedTime.getMinutes(),
          0,
          0,
        );
        setTargetDate(merged);
      }
    };

    const toggleOffset = (offset: AlertOffsetHours) => {
      setSelectedOffsets((prev) => {
        if (prev.includes(offset)) {
          // No permitimos dejar el array vacío: al menos uno seleccionado.
          if (prev.length === 1) return prev;
          return prev.filter((o) => o !== offset);
        }
        return [...prev, offset].sort((a, b) => b - a);
      });
    };

    const canSubmit =
      title.trim().length > 0 && targetDate.getTime() > Date.now();

    const handleSubmit = async () => {
      if (!canSubmit) {
        Alert.alert(
          'Datos incompletos',
          'Necesitas un título y una fecha futura para crear el recordatorio.',
        );
        return;
      }
      const payload = {
        title: title.trim(),
        targetDate,
        alertOffsetHours: selectedOffsets,
      };
      try {
        if (editingId) {
          await updateReminder(editingId, payload);
        } else {
          await addReminder(payload);
        }
      } finally {
        Keyboard.dismiss();
        sheetRef.current?.close();
      }
    };

    const styles = useStyles();

    return (
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        backdropComponent={renderBackdrop}
        onChange={setSheetIndex}
        backgroundStyle={{ backgroundColor: palette.surface }}
        handleIndicatorStyle={{ backgroundColor: palette.border }}
      >
        <BottomSheetView style={styles.container}>
          <Text style={styles.heading}>
            {isEditing ? 'Editar recordatorio' : 'Nuevo recordatorio'}
          </Text>

          <Text style={styles.label}>Título</Text>
          <BottomSheetTextInput
            style={styles.input}
            placeholder="Ej. Llamar a mamá"
            placeholderTextColor={palette.textMuted}
            value={title}
            onChangeText={setTitle}
            autoCapitalize="sentences"
            returnKeyType="done"
          />

          <Text style={styles.label}>Fecha y hora</Text>
          <View style={styles.dateRow}>
            <Pressable
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons
                name="calendar-outline"
                size={18}
                color={palette.text}
              />
              <Text style={styles.dateButtonText}>
                {targetDate.toLocaleDateString()}
              </Text>
            </Pressable>
            <Pressable
              style={styles.dateButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Ionicons name="time-outline" size={18} color={palette.text} />
              <Text style={styles.dateButtonText}>
                {targetDate.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </Pressable>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={targetDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              minimumDate={new Date()}
              onChange={handleDateChange}
            />
          )}
          {showTimePicker && (
            <DateTimePicker
              value={targetDate}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
            />
          )}

          <Text style={styles.label}>Avisarme con antelación</Text>
          <View style={styles.chipsRow}>
            {ALERT_OFFSET_OPTIONS.map((offset) => {
              const isSelected = selectedOffsets.includes(offset);
              return (
                <Pressable
                  key={offset}
                  onPress={() => toggleOffset(offset)}
                  style={[styles.chip, isSelected && styles.chipSelected]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      isSelected && styles.chipTextSelected,
                    ]}
                  >
                    {offset}h
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.helperText}>
            Puedes elegir varios; sonará una notificación por cada uno.
          </Text>

          <Pressable
            style={[
              styles.submitButton,
              !canSubmit && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            <Text style={styles.submitButtonText}>
              {isEditing ? 'Guardar cambios' : 'Crear recordatorio'}
            </Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheet>
    );
  },
);

AddReminderSheet.displayName = 'AddReminderSheet';

/**
 * Hook que devuelve estilos teñidos por el tema actual. Memoizado para
 * no recrear el StyleSheet en cada render.
 */
function useStyles() {
  const { palette } = useNudoTheme();
  return useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          paddingHorizontal: 20,
          paddingBottom: 24,
        },
        heading: {
          fontSize: 20,
          fontWeight: '700',
          marginBottom: 16,
          color: palette.text,
        },
        label: {
          fontSize: 13,
          fontWeight: '600',
          color: palette.textSecondary,
          marginTop: 12,
          marginBottom: 6,
          textTransform: 'uppercase',
        },
        input: {
          borderWidth: 1,
          borderColor: palette.border,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          fontSize: 16,
          backgroundColor: palette.inputBackground,
          color: palette.text,
        },
        dateRow: { flexDirection: 'row', gap: 8 },
        dateButton: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          borderWidth: 1,
          borderColor: palette.border,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 12,
          backgroundColor: palette.inputBackground,
        },
        dateButtonText: { fontSize: 15, color: palette.text },
        chipsRow: { flexDirection: 'row', gap: 8 },
        chip: {
          flex: 1,
          alignItems: 'center',
          paddingVertical: 10,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: palette.border,
          backgroundColor: palette.inputBackground,
        },
        chipSelected: {
          backgroundColor: palette.chipSelected,
          borderColor: palette.chipSelected,
        },
        chipText: {
          fontSize: 15,
          fontWeight: '600',
          color: palette.text,
        },
        chipTextSelected: {
          color: palette.chipSelectedText,
        },
        helperText: {
          marginTop: 6,
          fontSize: 12,
          color: palette.textMuted,
        },
        submitButton: {
          marginTop: 24,
          backgroundColor: palette.primary,
          borderRadius: 10,
          paddingVertical: 14,
          alignItems: 'center',
        },
        submitButtonDisabled: {
          opacity: 0.5,
        },
        submitButtonText: {
          color: '#fff',
          fontSize: 16,
          fontWeight: '700',
        },
      }),
    [palette],
  );
}
