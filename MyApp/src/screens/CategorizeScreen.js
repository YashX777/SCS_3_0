import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Pressable, ActivityIndicator, AppState, Alert } from 'react-native';
import { ThemeContext } from '../contexts/ThemeContext';
import { getDBConnection, createTransactionsTable, getAllTransactions, updateTransactions } from '../utils/db'; // Make sure this path is correct

// Rule-based categorizer
function categorize(tx) {
  // Use description first, fall back to text
  const text = (tx.description || tx.text || '').toLowerCase();
  
  // More specific rules first
  if (text.includes('salary')) return 'Income';
  if (text.includes('cafe') || text.includes('coffee') || text.includes('starbucks')) return 'Eating Out';
  if (text.includes('atm') || text.includes('withdraw')) return 'Cash';
  if (text.includes('grocery') || text.includes('mart') || text.includes('market')) return 'Groceries';
  
  // Broader rules
  // 'credited' is too broad if not salary, could be a refund
  if (text.includes('credited') && tx.type === 'credit') return 'Income'; 
  if (text.includes('upi') || text.includes('upi txn')) return 'UPI Payments';

  // Default
  return 'Other';
}

export default function CategorizeScreen() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { theme } = useContext(ThemeContext);
  const styles = themedStyles(theme); // Use themed styles
  const mountedRef = useRef(true);

  const loadAndCategorize = async () => {
    if (!mountedRef.current) return 0; // Prevent updates if unmounted
    setLoading(true);
    let updatedCount = 0;
    try {
      const db = await getDBConnection();
      await createTransactionsTable(db);
      let txs = await getAllTransactions(db);

      // ------------------------------------------------------------------
      // --- FIX #1: THE CORE LOGICAL ERROR WAS HERE ---
      //
      // Old Filter: txs.filter(tx => !tx.category || tx.category === 'Other');
      // This was wrong because it would re-categorize items already set to 'Other',
      // creating an infinite loop.
      //
      // Correct Filter: Only find transactions where 'category' is null or undefined.
      // ------------------------------------------------------------------
      const uncategorized = txs.filter(tx => !tx.category);

      if (uncategorized.length) {
        console.log(`Found ${uncategorized.length} transactions to categorize...`);
        const updated = uncategorized.map(tx => ({
          ...tx,
          category: categorize(tx) // Assign the new category
        }));

        await updateTransactions(db, updated); // Assuming updateTransactions can handle a batch
        updatedCount = updated.length;
        
        // Re-fetch all transactions to get the updated data
        txs = await getAllTransactions(db);
      }

      if (mountedRef.current) {
        setTransactions(txs);
      }
      return updatedCount;

    } catch (e) {
      console.error('Error in loadAndCategorize:', e);
      if (mountedRef.current) setTransactions([]);
      return updatedCount;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  // Load and categorize transactions from DB
  useEffect(() => {
    mountedRef.current = true;
    loadAndCategorize(); // Load on initial mount

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      // Re-load data when app becomes active
      if (nextAppState === 'active') {
        console.log('App became active, re-loading and categorizing...');
        loadAndCategorize();
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.remove();
    };
  }, []); // Empty dependency array ensures this runs once on mount

  // Group transactions by category and compute counts & totals
  const groups = transactions.reduce((acc, t) => {
    // ------------------------------------------------------------------
    // --- FIX #2: UI GROUPING ---
    //
    // Old: const cat = t.category || categorize(t);
    // This re-runs categorization logic on every render and
    // might not match the database value if categorization logic changed.
    //
    // Correct: Trust the database as the single source of truth.
    // ------------------------------------------------------------------
    const cat = t.category || 'Other'; // Fallback for safety

    if (!acc[cat]) acc[cat] = { items: [], total: 0 };
    acc[cat].items.push(t);
    
    // Ensure amount is a number and handle debits/credits correctly
    // We sum absolute values for display, but this might need refinement
    // based on whether 'Income' should be positive and 'Groceries' negative.
    // For simplicity, we sum the raw amounts here.
    acc[cat].total += Number(t.amount || 0);
    return acc;
  }, {});

  // Sort categories: by name, or by total amount (descending)
  const cats = Object.keys(groups).sort((a, b) => {
    // Sort 'Income' to the top, 'Other' to the bottom, then by total
    if (a === 'Income') return -1;
    if (b === 'Income') return 1;
    if (a === 'Other') return 1;
    if (b === 'Other') return -1;
    return Math.abs(groups[b].total) - Math.abs(groups[a].total);
  });

  const colorForCategory = (name) => {
    const map = {
      'Groceries': '#4caf50',
      'Income': '#2e7d32',
      'Eating Out': '#ff7043',
      'UPI Payments': '#1976d2',
      'Cash': '#ffb300',
      'Other': '#9e9e9e'
    };
    return map[name] || '#607d8b'; // Default color
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Categories</Text>
        <TouchableOpacity style={styles.headerAction} onPress={() => { /* open improve modal */ }}>
          <Text style={styles.headerActionText}>Improve rules</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 40 }} color={theme === 'dark' ? '#fff' : '#000'} />
      ) : (
        <FlatList
          data={cats}
          keyExtractor={(c) => c}
          contentContainerStyle={{ padding: 12, paddingBottom: 100 }} // Add padding for FAB
          renderItem={({ item }) => {
            const group = groups[item];
            const totalAmount = group.total;
            // Determine color based on type (e.g., income is green, expense is red)
            const amountColor = totalAmount > 0 ? '#4caf50' : (theme === 'dark' ? '#ddd' : '#333');
            
            return (
              <Pressable
                android_ripple={{ color: '#00000010' }}
                style={({ pressed }) => [styles.card, { opacity: pressed ? 0.95 : 1 }]}
                onPress={() => { /* navigate to category detail */ }}
              >
                <View style={[styles.cardLeft, { backgroundColor: colorForCategory(item) }]} />

                <View style={styles.cardBody}>
                  <View style={styles.cardHead}>
                    <Text style={styles.catTitle}>{item}</Text>
                    {/* Show positive for income, absolute for expenses */}
                    <Text style={[styles.catTotal, { color: amountColor }]}>
                      {totalAmount > 0 ? '+' : ''}₹{Math.abs(Math.round(totalAmount))}
                    </Text>
                  </View>

                  <Text style={styles.catCount}>{group.items.length} txn(s)</Text>

                  <View style={styles.preview}>
                    {/* Show most recent 2 transactions */}
                    {group.items.slice(0, 2).map(t => (
                      <Text key={t.id} style={styles.previewText} numberOfLines={1} ellipsizeMode="tail">
                        • {t.description || t.text}
                      </Text>
                    ))}
                  </View>
                </View>
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                No categories yet — fetch and categorize transactions to see suggested groups.
              </Text>
            </View>
          )}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: '#007AFF' }]}
        onPress={async () => {
          if (loading) return; // Prevent multiple clicks
          const count = await loadAndCategorize();
          Alert.alert('Auto-categorize', count ? `${count} transaction(s) categorized.` : 'No new uncategorized transactions found.');
        }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.fabText}>Auto-categorize</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

// Use a function for themed styles to apply theme context
const themedStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme === 'dark' ? '#0b0b0b' : '#f7f7fb',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    paddingTop: 16, // More space at top
  },
  title: {
    fontWeight: '800',
    fontSize: 20,
    color: theme === 'dark' ? '#fff' : '#111',
  },
  headerAction: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: theme === 'dark' ? '#222' : '#ededff',
  },
  headerActionText: {
    color: theme === 'dark' ? '#8c8cff' : '#3b3bff',
    fontWeight: '700',
  },
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    padding: 12,
    backgroundColor: theme === 'dark' ? '#121212' : '#fff',
  },
  cardLeft: {
    width: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  cardBody: {
    flex: 1,
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme === 'dark' ? '#fff' : '#111',
  },
  catTotal: {
    fontSize: 14,
    fontWeight: '700',
  },
  catCount: {
    marginTop: 6,
    fontSize: 12,
    color: theme === 'dark' ? '#bbb' : '#666',
  },
  preview: {
    marginTop: 8,
  },
  previewText: {
    fontSize: 13,
    color: theme === 'dark' ? '#ddd' : '#555',
  },
  empty: {
    padding: 20,
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    color: theme === 'dark' ? '#ddd' : '#666',
    textAlign: 'center',
    fontSize: 15,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    elevation: 5, // Add elevation for Android
    shadowColor: '#000', // Add shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    minWidth: 100, // Ensure text isn't cramped
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: {
    color: '#fff',
    fontWeight: '700',
  },
});