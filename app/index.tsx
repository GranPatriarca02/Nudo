import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useRef } from 'react';
import { Appearance, FlatList, Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';

import {
  AddReminderSheet,
  type AddReminderSheetMethods,
} from '../components/AddReminderSheet';
import { ReminderItem } from '../components/ReminderItem';
import { useRemindersStore } from '../utils/remindersStore';

export default function Index() {
  const reminders = useRemindersStore((s) => s.reminders);
  const completeReminder = useRemindersStore((s) => s.completeReminder);
  const deleteReminder = useRemindersStore((s) => s.deleteReminder);

  const sheetRef = useRef<AddReminderSheetMethods>(null);

  const theme = useRemindersStore((s) => s.theme);
  const setTheme = useRemindersStore((s) => s.setTheme);
  const systemScheme = useColorScheme();
  const isDark = theme === 'system' ? systemScheme === 'dark' : theme === 'dark';

  const bgColor = isDark ? '#111' : '#fafafa';
  const textColor = isDark ? '#eee' : '#111';
  const headerBg = isDark ? '#222' : '#fff';

  const toggleTheme = () => {
    const nextTheme = isDark ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  return (
    <View style={[styles.screen, { backgroundColor: bgColor }]}>
      <Stack.Screen
        options={{
          title: 'Mis Recordatorios',
          headerStyle: { backgroundColor: headerBg },
          headerTintColor: textColor,
          headerRight: () => (
            <Pressable onPress={toggleTheme} style={{ marginRight: 8, padding: 8 }}>
              <Ionicons name={isDark ? 'sunny' : 'moon'} size={24} color={textColor} />
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 120,
    paddingTop: 16,
  },
  emptyText: {
    color: '#888',
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
    backgroundColor: '#2a8',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabPressed: {
    backgroundColor: '#207a5e',
  },
});
