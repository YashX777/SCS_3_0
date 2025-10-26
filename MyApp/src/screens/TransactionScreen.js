import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Button,
  PermissionsAndroid,
  Platform,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Linking,
  AppState,
} from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import { processSmsList } from '../utils/smsProcessor';
import {
  getDBConnection,
  createTable,
  saveTransactions,
  getAllTransactions,
} from '../utils/db';

// --- Request SMS Permission ---
async function requestReadSmsPermission() {
  if (Platform.OS !== 'android') return false;
  try {
    const status = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      {
        title: 'SMS Access Required',
        message: 'This app needs access to your SMS messages to track transactions.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      },
    );

    if (status === PermissionsAndroid.RESULTS.GRANTED) {
      console.log('READ_SMS permission granted');
      return true;
    } else {
      console.log('READ_SMS permission denied or permanently denied');
      return false;
    }
  } catch (err) {
    console.warn('Error requesting READ_SMS permission:', err);
    return false;
  }
}

// --- Component ---
export default function TransactionsScreen() {
  const [db, setDb] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // --- Setup DB on Mount ---
  useEffect(() => {
    (async () => {
      const dbConn = await getDBConnection();
      await createTable(dbConn);
      setDb(dbConn);

      const stored = await getAllTransactions(dbConn);
      if (stored.length > 0) {
        console.log(`Loaded ${stored.length} transactions from DB`);
        setTransactions(stored);
        setIsLoading(false);
      }

      checkAndFetch(dbConn);
    })();
  }, []);

  // --- Listen for app returning from background ---
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (state) => {
      if (state === 'active' && Platform.OS === 'android') {
        const hasPermission = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_SMS,
        );
        setPermissionGranted(hasPermission);
        if (hasPermission && db) {
          const stored = await getAllTransactions(db);
          if (stored.length === 0) fetchSms(db);
        }
      }
    });
    return () => subscription.remove();
  }, [db]);

  // --- Process SMS and Save to DB ---
  const processAndSaveSms = async (rawMessages) => {
    try {
      const processed = processSmsList(rawMessages);

      await saveTransactions(db, processed);

      const updated = await getAllTransactions(db);
      setTransactions(updated);

      // ✅ Debug logs
      console.log(`✅ Saved ${processed.length} new transactions`);
      console.log('📦 First 5 entries from DB:', updated.slice(0, 5));
    } catch (e) {
      console.error('Error saving SMS transactions:', e);
      setError('Failed to process SMS messages.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Fetch SMS ---
  const fetchSms = async (dbInstance = db) => {
    if (!permissionGranted || !dbInstance) {
      setError('SMS permission is required.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const filter = { box: 'inbox', maxCount: 500 };

    SmsAndroid.list(
      JSON.stringify(filter),
      fail => {
        console.error('SMS fetch failed:', fail);
        setError('Failed to fetch SMS messages.');
        setIsLoading(false);
      },
      (count, smsListString) => {
        const rawMessages = smsListString ? JSON.parse(smsListString) : [];
        processAndSaveSms(rawMessages);
      }
    );
  };

  // --- Check permission and fetch ---
  const checkAndFetch = async (dbInstance = db) => {
    setIsLoading(true);
    const granted = await requestReadSmsPermission();
    setPermissionGranted(granted);

    if (granted) {
      setError(null);
      await fetchSms(dbInstance);
    } else {
      setError('SMS permission is required to view new transactions.');
      setIsLoading(false);
    }
  };

  // --- UI ---
  const renderContent = () => {
    console.log('permissionGranted:', permissionGranted, 'error:', error);

    if (isLoading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>Loading Transactions...</Text>
        </View>
      );
    }

    if (error && !permissionGranted) {
      return (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          {Platform.OS === 'android' && (
            <>
              <Button title="Grant SMS Permission" onPress={() => checkAndFetch(db)} />
              <Button title="Open App Settings" onPress={Linking.openSettings} />
            </>
          )}
        </View>
      );
    }

    return (
      <View style={{ flex: 1 }}>
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.transactionItem}>
              <View style={styles.row}>
                <Text style={styles.date}>{item.date}</Text>
                <Text style={[styles.amount, item.type === 'credit' ? styles.credit : styles.debit]}>
                  {item.type === 'credit' ? '+' : '-'}₹{item.amount?.toFixed(2) ?? '0.00'}
                </Text>
              </View>
              <Text style={styles.description} numberOfLines={1} ellipsizeMode="tail">
                {item.description}
              </Text>
              <Text style={styles.category}>Category: {item.category}</Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text>No transactions found yet.</Text>
              <Button title="Fetch from SMS" onPress={() => fetchSms(db)} />
            </View>
          }
        />

        {/* Debug button to dump DB anytime */}
        <View style={{ padding: 10 }}>
          <Button
  title="Print DB Contents"
  onPress={async () => {
    if (!db) {
      console.warn('⚠️ DB is not ready yet.');
      return;
    }
    try {
      const all = await getAllTransactions(db);
      console.log('🧾 Full DB dump:', all);
      alert(`DB has ${all.length} transactions. Check console for details.`);
    } catch (e) {
      console.error('Error reading DB:', e);
    }
  }}
/>
        </View>
      </View>
    );
  };

  return <View style={styles.container}>{renderContent()}</View>;
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
  },
  transactionItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  date: {
    fontSize: 13,
    color: '#666',
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
  },
  credit: {
    color: '#2e7d32',
  },
  debit: {
    color: '#c62828',
  },
  description: {
    fontSize: 15,
    color: '#333',
    marginBottom: 4,
  },
  category: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
  },
});