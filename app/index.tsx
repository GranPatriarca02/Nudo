import { Ionicons } from '@expo/vector-icons';
import { useRef } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

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

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Nudo - Mis Recordatorios</Text>
      </View>

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
    backgroundColor: '#fafafa',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 64,
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#111',
  },
  listContent: {
    paddingBottom: 120,
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
