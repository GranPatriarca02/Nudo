import { Button, FlatList, Text, View } from 'react-native';

import { ReminderItem } from '../components/ReminderItem';
import { useRemindersStore } from '../utils/remindersStore';

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
    <View style={{ flex: 1, paddingTop: 64, backgroundColor: '#fafafa' }}>
      <View style={{ paddingHorizontal: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '600', marginBottom: 16 }}>
          Nudo - Mis Recordatorios
        </Text>
        <Button
          title="Crear recordatorio de prueba (+1h)"
          onPress={handleAddTestReminder}
        />
      </View>

      <FlatList
        style={{ marginTop: 16 }}
        data={reminders}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text
            style={{
              color: '#888',
              marginTop: 24,
              textAlign: 'center',
              paddingHorizontal: 16,
            }}
          >
            No hay recordatorios todavía. Pulsa el botón para crear uno.
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
    </View>
  );
}
