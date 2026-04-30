import {
  Button,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useRemindersStore } from '../utils/remindersStore';
import type { Reminder } from '../utils/types';

export default function Index() {
  const reminders = useRemindersStore((s) => s.reminders);
  const addReminder = useRemindersStore((s) => s.addReminder);
  const completeReminder = useRemindersStore((s) => s.completeReminder);
  const deleteReminder = useRemindersStore((s) => s.deleteReminder);

  const handleAddTestReminder = () => {
    // Recordatorio de prueba: dispara dentro de 1 hora.
    const targetDate = new Date(Date.now() + 60 * 60 * 1000);
    addReminder({
      title: `Recordatorio de prueba ${reminders.length + 1}`,
      targetDate,
    });
  };

  return (
    <View style={{ flex: 1, padding: 16, paddingTop: 64 }}>
      <Text style={{ fontSize: 22, fontWeight: '600', marginBottom: 16 }}>
        Nudo - Mis Recordatorios
      </Text>

      <Button
        title="Crear recordatorio de prueba (+1h)"
        onPress={handleAddTestReminder}
      />

      <FlatList
        style={{ marginTop: 16 }}
        data={reminders}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={{ color: '#888', marginTop: 24 }}>
            No hay recordatorios todavía. Pulsa el botón para crear uno.
          </Text>
        }
        renderItem={({ item }) => (
          <ReminderRow
            reminder={item}
            onComplete={() => completeReminder(item.id)}
            onDelete={() => deleteReminder(item.id)}
          />
        )}
      />
    </View>
  );
}

type ReminderRowProps = {
  reminder: Reminder;
  onComplete: () => void;
  onDelete: () => void;
};

function ReminderRow({ reminder, onComplete, onDelete }: ReminderRowProps) {
  return (
    <View
      style={{
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 16,
            textDecorationLine: reminder.isCompleted ? 'line-through' : 'none',
            color: reminder.isCompleted ? '#888' : '#000',
          }}
        >
          {reminder.title}
        </Text>
        <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
          {reminder.targetDate.toLocaleString()}
        </Text>
      </View>

      {!reminder.isCompleted && (
        <TouchableOpacity onPress={onComplete} style={{ marginRight: 12 }}>
          <Text style={{ color: '#2a8' }}>Hecho</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={onDelete}>
        <Text style={{ color: '#d33' }}>Borrar</Text>
      </TouchableOpacity>
    </View>
  );
}
