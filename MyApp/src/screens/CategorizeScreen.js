import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';

// very small rule-based categorizer
function categorize(tx) {
  const text = tx.text.toLowerCase();
  if (text.includes('grocery') || text.includes('mart') || text.includes('store')) return 'Groceries';
  if (text.includes('salary') || text.includes('credited')) return 'Income';
  if (text.includes('cafe') || text.includes('coffee')) return 'Eating Out';
  if (text.includes('upi')) return 'UPI Payments';
  return 'Other';
}

const SAMPLE = [
  { id: '1', text: 'Paid ₹250 to Cafe Mocha', amount: -250, date: '2025-10-20' },
  { id: '2', text: 'Salary credited ₹50,000', amount: 50000, date: '2025-10-01' },
  { id: '3', text: 'UPI txn ₹1200 to Grocery Mart', amount: -1200, date: '2025-10-18' },
  { id: '4', text: 'UPI txn ₹99 to Bhaiya Store', amount: -99, date: '2025-10-24' },
];

export default function CategorizeScreen() {
  const [data] = useState(SAMPLE);

  const groups = data.reduce((acc, t) => {
    const cat = categorize(t);
    acc[cat] = acc[cat] || [];
    acc[cat].push(t);
    return acc;
  }, {});

  const cats = Object.keys(groups);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Categories</Text>
      <FlatList
        data={cats}
        keyExtractor={(c) => c}
        renderItem={({ item }) => (
          <View style={styles.catRow}>
            <Text style={styles.catTitle}>{item}</Text>
            <Text style={styles.catCount}>{groups[item].length} txns</Text>
            <View style={styles.preview}>
              {groups[item].slice(0, 2).map((t) => (
                <Text key={t.id} style={styles.previewText}>• {t.text}</Text>
              ))}
            </View>
          </View>
        )}
      />

      <TouchableOpacity style={styles.hintBtn} onPress={() => {}}>
        <Text style={{ color: '#fff' }}>Improve categorization rules</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  title: { fontWeight: '700', fontSize: 18, marginBottom: 12 },
  catRow: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  catTitle: { fontWeight: '700' },
  catCount: { color: '#666', marginTop: 4 },
  preview: { marginTop: 6 },
  previewText: { color: '#444' },
  hintBtn: { marginTop: 16, backgroundColor: '#007AFF', padding: 10, borderRadius: 6, alignItems: 'center' },
});
