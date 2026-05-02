import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import {
  BackHandler,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';

import {
  AddReminderSheet,
  type AddReminderSheetMethods,
} from '../components/AddReminderSheet';
import { ReminderItem } from '../components/ReminderItem';
import { useRemindersStore } from '../utils/remindersStore';
import { useNudoTheme } from '../utils/theme';

export default function Index() {
  const reminders = useRemindersStore((s) => s.reminders);
  const completeReminder = useRemindersStore((s) => s.completeReminder);
  const deleteReminder = useRemindersStore((s) => s.deleteReminder);

  const sheetRef = useRef<AddReminderSheetMethods>(null);

  const { palette, effective, mode } = useNudoTheme();
  const toggleTheme = useRemindersStore((s) => s.toggleTheme);
  const isDark = effective === 'dark';

  /**
   * Salir con doble back en la pantalla principal. Sólo Android — en iOS
   * no hay botón "atrás" físico en la home. Si el sheet está abierto, su
   * propio handler interceptará el back antes de que llegue aquí.
   */
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let lastBackPress = 0;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const now = Date.now();
      if (now - lastBackPress < 1000) {
        // Segundo tap dentro del segundo: dejamos que Android salga.
        return false;
      }
      lastBackPress = now;
      ToastAndroid.show('Pulsa de nuevo para salir', ToastAndroid.SHORT);
      return true; // consumido
    });
    return () => sub.remove();
  }, []);

  const handleToggleTheme = () => {
    toggleTheme(isDark);
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        screen: { flex: 1, backgroundColor: palette.background },
        listContent: { paddingBottom: 120, paddingTop: 16 },
        emptyText: {
          color: palette.textMuted,
          marginTop: 24,
          textAlign: 'center',
          paddingHorizontal: 16,
        },
        fab: {
          position: 'absolute',
          right: 24,
          bottom: 32,
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: palette.primary,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        },
        fabPressed: { backgroundColor: palette.primaryPressed },
        headerButton: { marginRight: 8, padding: 8 },
      }),
    [palette],
  );

  // Pequeña etiqueta auxiliar para el icono según el modo elegido.
  const themeIconName: keyof typeof Ionicons.glyphMap =
    mode === 'system'
      ? isDark
        ? 'moon-outline'
        : 'sunny-outline'
      : isDark
        ? 'sunny'
        : 'moon';

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: 'Mis Recordatorios',
          headerStyle: { backgroundColor: palette.surface },
          headerTintColor: palette.text,
          headerTitleStyle: { color: palette.text },
          headerRight: () => (
            <Pressable
              onPress={handleToggleTheme}
              style={styles.headerButton}
              accessibilityLabel="Cambiar tema"
            >
              <Ionicons name={themeIconName} size={24} color={palette.text} />
            </Pressable>
          ),
        }}
      />

      <FlatList
        contentContainerStyle={styles.listContent}
        data={reminders}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No hay recordatorios todavía. Pulsa + para crear el primero.
          </Text>
        }
        renderItem={({ item }) => (
          <ReminderItem
            reminder={item}
            onComplete={completeReminder}
            onDelete={deleteReminder}
            onEdit={(r) => sheetRef.current?.open(r)}
          />
        )}
      />

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={() => sheetRef.current?.open()}
        accessibilityLabel="Crear recordatorio"
      >
        <Ionicons name="add" size={32} color="#fff" />
      </Pressable>

      <AddReminderSheet ref={sheetRef} />
    </View>
  );
}
