import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Button,
  PermissionsAndroid,
  Platform,
  FlatList,
  StyleSheet,
  ActivityIndicator, // Import ActivityIndicator for loading state
  Linking, // To open app settings if permission is permanently denied
  AppState, // To re-check permission when app returns to foreground
} from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import { processSmsList } from '../utils/smsProcessor'; // Adjust path if needed

// --- Permission Request Logic ---
async function requestReadSmsPermission() {
  if (Platform.OS !== 'android') {
    // SMS reading is only available on Android
    return false;
  }
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
    } else if (status === PermissionsAndroid.RESULTS.DENIED) {
      console.log('READ_SMS permission denied');
      return false;
    } else if (status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      console.log('READ_SMS permission denied permanently');
      // Optionally guide user to settings
      // Linking.openSettings();
      return false;
    }
    return false;
  } catch (err) {
    console.warn('Error requesting READ_SMS permission:', err);
    return false;
  }
}

// --- Component ---
export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Start loading initially
  const [error, setError] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // --- Fetch SMS Data ---
  const fetchSms = async () => {
    // Only proceed if permission is granted
    if (!permissionGranted) {
      setError('SMS permission is required.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const filter = {
      box: 'inbox', // 'inbox' (received), 'sent', 'draft'
      // You can add more filters here if needed:
      // indexFrom: 0, // start from index 0
      maxCount: 500, // Fetch a reasonable number for processing
    };

    SmsAndroid.list(
      JSON.stringify(filter),
      (fail) => {
        console.error('Failed to get SMS list: ' + fail);
        setError('Failed to fetch SMS messages. Please ensure the app has SMS permission.');
        setIsLoading(false);
      },
      (count, smsListString) => {
        console.log('Raw SMS Count received: ', count);
        try {
          // Guard against empty or invalid JSON strings
          const rawMessages = smsListString ? JSON.parse(smsListString) : [];
          if (!Array.isArray(rawMessages)) {
             throw new Error("Received invalid data format for SMS list.");
          }
          console.log(`Processing ${rawMessages.length} raw messages...`);
          // Process the raw messages using our utility function
          const processedData = processSmsList(rawMessages);
          console.log('Processed Transactions Count:', processedData.length);
          setTransactions(processedData);
        } catch (e) {
          console.error('Error parsing or processing SMS list: ', e);
          setError('Failed to process SMS messages.');
        } finally {
          setIsLoading(false);
        }
      },
    );
  };

  // --- Check Permission on Initial Load and App State Change ---
  const checkAndFetch = async () => {
     setIsLoading(true); // Show loading while checking/requesting
     const granted = await requestReadSmsPermission();
     setPermissionGranted(granted);
     if (granted) {
       fetchSms(); // Fetch only if permission is confirmed granted
     } else {
        setError('SMS permission is required to view transactions.');
        setIsLoading(false); // Stop loading if permission not granted
     }
  };


  useEffect(() => {
    // Initial check and fetch
    checkAndFetch();

    // Add listener for app state changes (e.g., returning from background)
    // This helps re-check permission if the user granted it in settings
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('App has come to the foreground!');
         // Re-check permission status without necessarily re-requesting immediately
        PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS).then(
            (hasPermission) => {
                setPermissionGranted(hasPermission);
                if (hasPermission && transactions.length === 0 && !isLoading) {
                    // Fetch SMS only if permission is now granted and we don't have data
                    fetchSms();
                } else if (!hasPermission) {
                     setError('SMS permission is required.');
                     setTransactions([]); // Clear data if permission revoked
                     setIsLoading(false);
                }
            }
        );
      }
    });

    // Cleanup listener on component unmount
    return () => {
      subscription.remove();
    };
  }, []); // Run only once on mount

  // --- Render Logic ---
  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>Loading Transactions...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          {!permissionGranted && Platform.OS === 'android' && (
            <>
              <Button title="Grant SMS Permission" onPress={checkAndFetch} />
              <Button title="Open App Settings" onPress={Linking.openSettings} />
            </>
          )}
           {permissionGranted && <Button title="Retry Fetching SMS" onPress={fetchSms} />}
        </View>
      );
    }

    return (
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
            <Text>No transactions found in your SMS inbox.</Text>
            <Button title="Refresh SMS" onPress={fetchSms} />
          </View>
        }
        // Optional: Add pull-to-refresh
        // onRefresh={fetchSms}
        // refreshing={isLoading}
      />
    );
  };

  return <View style={styles.container}>{renderContent()}</View>;
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', // Or use theme color
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f8f8', // Slightly different background for centered states
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
    alignItems: 'center',
  },
  date: {
    fontSize: 13,
    color: '#666',
  },
  amount: {
    fontSize: 16,
    fontWeight: '600', // Slightly bolder
  },
  credit: {
    color: '#2e7d32', // Darker green
  },
  debit: {
    color: '#c62828', // Darker red
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