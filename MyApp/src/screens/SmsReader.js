import React, { useEffect, useState } from 'react';
import { View, Text, Button, PermissionsAndroid, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';

export default function SmsReader() {
  const [smsList, setSmsList] = useState([]);
  const [loading, setLoading] = useState(false);

  // Request SMS permission
  const requestSmsPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        {
          title: "SMS Access Permission",
          message: "This app needs access to read your SMS messages",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK"
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn(err);
      return false;
    }
  };

  // Fetch latest SMS messages
  const loadSms = async () => {
    const hasPermission = await requestSmsPermission();
    if (!hasPermission) {
      alert('SMS permission denied!');
      return;
    }

    setLoading(true);

    const maxCount = 50; // number of messages to fetch

    // Step 1: Get total message count
    SmsAndroid.list(
      JSON.stringify({ box: 'inbox', indexFrom: 0, maxCount: 1 }),
      (fail) => {
        console.log('Failed to get total count: ' + fail);
        setLoading(false);
      },
      (count) => {
        const totalCount = parseInt(count, 10);
        const startIndex = totalCount > maxCount ? totalCount - maxCount : 0;

        // Step 2: Fetch latest messages
        SmsAndroid.list(
          JSON.stringify({ box: 'inbox', indexFrom: startIndex, maxCount }),
          (fail2) => {
            console.log('Failed to fetch messages: ' + fail2);
            setLoading(false);
          },
          (count2, smsListStr) => {
            let smsArr = JSON.parse(smsListStr);

            // Sort messages by date descending (newest first)
            smsArr.sort((a, b) => b.date - a.date);

            setSmsList(smsArr);
            setLoading(false);
          }
        );
      }
    );
  };

  useEffect(() => {
    loadSms();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SMS Inbox</Text>
      <Button title="Refresh SMS" onPress={loadSms} />
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={smsList}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <View style={styles.smsItem}>
              <Text style={styles.sender}>{item.address}</Text>
              <Text style={styles.body}>{item.body}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, marginTop: 40 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  smsItem: { borderBottomWidth: 1, borderBottomColor: '#ccc', paddingVertical: 10 },
  sender: { fontWeight: 'bold' },
  body: { marginTop: 4 },
});