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
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  Switch,
  useColorScheme,
} from 'react-native';

import { useRemindersStore } from '../utils/remindersStore';
import type { Reminder } from '../utils/types';

export type AddReminderSheetMethods = {
  open: (reminderToEdit?: Reminder) => void;
  close: () => void;
};

/**
 * Devuelve un `Date` por defecto: la próxima hora en punto, así el formulario
 * arranca con un valor razonable y siempre futuro.
 */
const getDefaultTargetDate = (): Date => {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
};

export const AddReminderSheet = forwardRef<AddReminderSheetMethods>(
  (_props, ref) => {
    const sheetRef = useRef<BottomSheet>(null);
    const addReminder = useRemindersStore((s) => s.addReminder);
    const updateReminder = useRemindersStore((s) => s.updateReminder);

    const theme = useRemindersStore(s => s.theme);
    const systemScheme = useColorScheme();
    const isDark = theme === 'system' ? systemScheme === 'dark' : theme === 'dark';

    const [editingId, setEditingId] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [targetDate, setTargetDate] = useState<Date>(getDefaultTargetDate());
    const [isPermanent, setIsPermanent] = useState(true);
    const [alertOffsetHours, setAlertOffsetHours] = useState(24);
    
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const snapPoints = useMemo(() => ['85%'], []);

    useImperativeHandle(ref, () => ({
      open: (reminderToEdit?: Reminder) => {
        if (reminderToEdit) {
          setEditingId(reminderToEdit.id);
          setTitle(reminderToEdit.title);
          setTargetDate(new Date(reminderToEdit.targetDate));
          setIsPermanent(reminderToEdit.isPermanent ?? true);
          setAlertOffsetHours(reminderToEdit.alertOffsetHours ?? 24);
        } else {
          setEditingId(null);
          setTitle('');
          setTargetDate(getDefaultTargetDate());
          setIsPermanent(true);
          setAlertOffsetHours(24);
        }
        setShowDatePicker(false);
        setShowTimePicker(false);
        sheetRef.current?.expand();
      },
      close: () => sheetRef.current?.close(),
    }));

    /** Backdrop oscuro que cierra el sheet al pulsarse fuera. */
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
      // En Android el picker se cierra solo tras elegir/cancelar.
      if (Platform.OS === 'android') setShowDatePicker(false);
      if (event.type === 'set' && selectedDate) {
        // Conservamos la hora actual del state y solo cambiamos el día.
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

    const showPremiumLockedAlert = (label: string) => {
      Alert.alert(
        `${label} es Premium`,
        'Esta función estará disponible al actualizar a Nudo Premium.',
        [{ text: 'Entendido' }],
      );
    };

    const canSubmit = title.trim().length > 0 && targetDate.getTime() > Date.now();

    const handleSubmit = () => {
      if (!canSubmit) {
        Alert.alert(
          'Datos incompletos',
          'Necesitas un título y una fecha futura para crear el recordatorio.',
        );
        return;
      }
      if (editingId) {
        updateReminder(editingId, {
          title: title.trim(),
          targetDate,
          isPermanent,
          alertOffsetHours,
        });
      } else {
        addReminder({
          title: title.trim(),
          targetDate,
          isPermanent,
          alertOffsetHours,
        });
      }
      sheetRef.current?.close();
    };

    const bgColor = isDark ? '#222' : '#fff';
    const textColor = isDark ? '#eee' : '#111';
    const mutedColor = isDark ? '#aaa' : '#555';
    const inputBg = isDark ? '#333' : '#fafafa';
    const borderColor = isDark ? '#444' : '#ddd';

    return (
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: bgColor }}
        handleIndicatorStyle={{ backgroundColor: isDark ? '#888' : '#ccc' }}
      >
        <BottomSheetView style={styles.container}>
          <Text style={[styles.heading, { color: textColor }]}>
            {editingId ? 'Editar recordatorio' : 'Nuevo recordatorio'}
          </Text>

          <Text style={[styles.label, { color: mutedColor }]}>Título</Text>
          <BottomSheetTextInput
            style={[styles.input, { backgroundColor: inputBg, color: textColor, borderColor }]}
            placeholder="Ej. Llamar a mamá"
            placeholderTextColor="#aaa"
            value={title}
            onChangeText={setTitle}
            autoCapitalize="sentences"
            returnKeyType="done"
          />

          <Text style={[styles.label, { color: mutedColor }]}>Fecha y hora</Text>
          <View style={styles.dateRow}>
            <Pressable
              style={[styles.dateButton, { backgroundColor: inputBg, borderColor }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={18} color={textColor} />
              <Text style={[styles.dateButtonText, { color: textColor }]}>
                {targetDate.toLocaleDateString()}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.dateButton, { backgroundColor: inputBg, borderColor }]}
              onPress={() => setShowTimePicker(true)}
            >
              <Ionicons name="time-outline" size={18} color={textColor} />
              <Text style={[styles.dateButtonText, { color: textColor }]}>
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

          <View style={[styles.settingsRow, { marginTop: 24 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: textColor, marginTop: 0 }]}>Notificación Permanente</Text>
              <Text style={[styles.helperText, { color: mutedColor }]}>No se podrá eliminar la notificación hasta que se complete o elimine el recordatorio</Text>
            </View>
            <Switch
              value={isPermanent}
              onValueChange={setIsPermanent}
              trackColor={{ true: '#2a8', false: borderColor }}
            />
          </View>

          <Text style={[styles.label, { color: mutedColor, marginTop: 24 }]}>Avisarme antes de la meta</Text>
          <View style={styles.dateRow}>
            {[24, 12, 6].map((hours) => (
              <Pressable
                key={hours}
                style={[
                  styles.dateButton,
                  { backgroundColor: inputBg, borderColor },
                  alertOffsetHours === hours && { backgroundColor: '#2a8', borderColor: '#2a8' }
                ]}
                onPress={() => setAlertOffsetHours(hours)}
              >
                <Text style={[
                  styles.dateButtonText, 
                  { color: textColor, textAlign: 'center', width: '100%' },
                  alertOffsetHours === hours && { color: '#fff', fontWeight: '700' }
                ]}>
                  {hours}h
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={[
              styles.submitButton,
              !canSubmit && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            <Text style={styles.submitButtonText}>
              {editingId ? 'Guardar cambios' : 'Crear recordatorio'}
            </Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheet>
    );
  },
);

AddReminderSheet.displayName = 'AddReminderSheet';

type PremiumLockedRowProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
};

/**
 * Fila visual para una función Premium bloqueada: muestra el icono de la
 * función a la izquierda, el texto al centro y un candado a la derecha.
 * Al pulsarse muestra un aviso en lugar de ejecutar nada.
 */
function PremiumLockedRow({ icon, label, onPress }: PremiumLockedRowProps) {
  return (
    <Pressable style={styles.premiumRow} onPress={onPress}>
      <Ionicons name={icon} size={20} color="#888" />
      <Text style={styles.premiumLabel}>{label}</Text>
      <View style={styles.premiumBadge}>
        <Ionicons name="lock-closed" size={12} color="#fff" />
        <Text style={styles.premiumBadgeText}>Premium</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    color: '#111',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginTop: 12,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fafafa',
    color: '#111',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fafafa',
  },
  dateButtonText: {
    fontSize: 15,
    color: '#111',
  },
  premiumGroup: {
    marginTop: 20,
    gap: 8,
  },
  premiumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: '#f6f6f6',
  },
  premiumLabel: {
    flex: 1,
    fontSize: 15,
    color: '#666',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#b88600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  premiumBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  submitButton: {
    marginTop: 24,
    backgroundColor: '#2a8',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#a8d8c4',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  helperText: {
    fontSize: 12,
  },
});
