import React, { useState } from 'react';
import { View, Text, Button, FlatList, StyleSheet, TouchableOpacity } from 'react-native';

// Minimal sample transactions. Real implementation: read SMS messages on Android and parse.
const SAMPLE = [
  { id: '1', text: 'Paid ₹250 to Cafe Mocha', amount: -250, date: '2025-10-20' },
  { id: '2', text: 'Salary credited ₹50,000', amount: 50000, date: '2025-10-01' },
  { id: '3', text: 'UPI txn ₹1200 to Grocery Mart', amount: -1200, date: '2025-10-18' },
];

export default function TransactionsScreen() {
  const [txns, setTxns] = useState(SAMPLE);

  const fetchSmsPlaceholder = () => {
    // Placeholder: this should call native module / package such as 'react-native-get-sms-android'
    // and then parse transaction SMS into structured items.
    // For now we append a fake item to show the UI.
    const newItem = { id: String(Date.now()), text: 'UPI txn ₹99 to Bhaiya Store', amount: -99, date: '2025-10-24' };
    setTxns((s) => [newItem, ...s]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <Button title="Fetch SMS (placeholder)" onPress={fetchSmsPlaceholder} />
      </View>

      <FlatList
        data={txns}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.text}>{item.text}</Text>
              <Text style={styles.date}>{item.date}</Text>
            </View>
            <Text style={[styles.amount, { color: item.amount < 0 ? '#c33' : '#0a0' }]}>
              {item.amount < 0 ? `-₹${Math.abs(item.amount)}` : `₹${item.amount}`}
            </Text>
          </View>
        )}
      />

      <View style={styles.noteBox}>
        <Text style={styles.noteTitle}>SMS fetching</Text>
        <Text style={styles.noteText}>
          To fetch SMS on Android, install a package (for example: react-native-get-sms-android) and request
          READ_SMS permission. iOS does not allow SMS reading.
        </Text>
        <TouchableOpacity onPress={() => {}} style={styles.docBtn}>
          <Text style={{ color: '#fff' }}>Docs / Setup</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  controls: { marginBottom: 8 },
  row: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
  text: { fontWeight: '600' },
  date: { color: '#888', marginTop: 4, fontSize: 12 },
  amount: { marginLeft: 12, fontWeight: '700' },
  noteBox: { marginTop: 12, padding: 12, backgroundColor: '#f3f3f3', borderRadius: 8 },
  noteTitle: { fontWeight: '700', marginBottom: 6 },
  noteText: { color: '#444' },
  docBtn: { marginTop: 8, backgroundColor: '#007AFF', padding: 8, borderRadius: 6, alignSelf: 'flex-start' },
});
