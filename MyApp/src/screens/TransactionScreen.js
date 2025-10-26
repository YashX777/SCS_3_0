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
  Alert,
} from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import { processSmsList } from '../utils/smsProcessor';
import {
  getDBConnection,
  createTransactionsTable,
  saveTransactions,
  getAllTransactions,
} from '../utils/db';

export default function TransactionsScreen() {
  const [db, setDb] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // --- Request SMS Permission ---
  const requestReadSmsPermission = async () => {
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
      return status === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('Error requesting READ_SMS permission:', err);
      return false;
    }
  };

  // --- Initialize DB ---
  useEffect(() => {
    (async () => {
      try {
        const dbConn = await getDBConnection();
        await createTransactionsTable(dbConn);
        setDb(dbConn);

        const stored = await getAllTransactions(dbConn);
        setTransactions(stored);
        console.log(`Loaded ${stored.length} transactions from DB`);

        await checkAndFetch(dbConn);
      } catch (err) {
        console.error('DB initialization error:', err);
        setError('Failed to initialize database.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // --- Listen for app coming back from background ---
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async state => {
      if (state === 'active' && Platform.OS === 'android' && db) {
        const hasPermission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
        setPermissionGranted(hasPermission);
        if (hasPermission) {
          const stored = await getAllTransactions(db);
          if (stored.length === 0) fetchSms(db);
        }
      }
    });
    return () => subscription.remove();
  }, [db]);

  // --- Process SMS and save to DB ---
  const processAndSaveSms = async (rawMessages) => {
    try {
      const processed = processSmsList(rawMessages);
      if (processed.length > 0) await saveTransactions(db, processed);

      const updated = await getAllTransactions(db);
      setTransactions(updated);

      console.log(`✅ Saved ${processed.length} transactions`);
    } catch (e) {
      console.error('Error processing SMS:', e);
      setError('Failed to process SMS messages.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Fetch SMS ---
  const fetchSms = async (dbInstance = db) => {
    if (!permissionGranted || !dbInstance) {
      setError('SMS permission and database are required.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const filter = { box: 'inbox', maxCount: 500 };
    const timeout = setTimeout(() => {
      setError('SMS fetch timed out.');
      setIsLoading(false);
    }, 10000); // 10s timeout

    SmsAndroid.list(
      JSON.stringify(filter),
      fail => {
        clearTimeout(timeout);
        console.error('SMS fetch failed:', fail);
        setError('Failed to fetch SMS messages.');
        setIsLoading(false);
      },
      (count, smsListString) => {
        clearTimeout(timeout);
        try {
          const rawMessages = smsListString ? JSON.parse(smsListString) : [];
          processAndSaveSms(rawMessages);
        } catch (e) {
          console.error('Error parsing SMS list:', e);
          setError('Failed to parse SMS messages.');
          setIsLoading(false);
        }
      },
    );
  };

  // --- Check permission & fetch ---
  const checkAndFetch = async (dbInstance = db) => {
    setIsLoading(true);
    const granted = await requestReadSmsPermission();
    setPermissionGranted(granted);

    if (granted && dbInstance) {
      setError(null);
      await fetchSms(dbInstance);
    } else {
      setError('SMS permission is required to fetch transactions.');
      setIsLoading(false);
    }
  };

  // --- Render ---
  const renderContent = () => {
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
              <Text style={styles.description} numberOfLines={1}>{item.description}</Text>
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

        <View style={{ padding: 10 }}>
          <Button
            title="Print DB Contents"
            onPress={async () => {
              if (!db) return Alert.alert('DB not ready');
              const all = await getAllTransactions(db);
              console.log('🧾 Full DB dump:', all);
              Alert.alert(`DB has ${all.length} transactions. Check console.`);
            }}
          />
        </View>
      </View>
    );
  };

  return <View style={styles.container}>{renderContent()}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 10, fontSize: 16, color: '#555' },
  errorText: { color: 'red', textAlign: 'center', marginBottom: 20, fontSize: 16 },
  transactionItem: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  date: { fontSize: 13, color: '#666' },
  amount: { fontSize: 16, fontWeight: '600' },
  credit: { color: '#2e7d32' },
  debit: { color: '#c62828' },
  description: { fontSize: 15, color: '#333', marginBottom: 4 },
  category: { fontSize: 13, color: '#888', fontStyle: 'italic' },
});