import React, { useContext, useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Image, StyleSheet, ScrollView, Alert } from 'react-native';
import { UserContext } from '../contexts/UserContext';
import { ThemeContext } from '../contexts/ThemeContext';
import { getDBConnection, createUserTable, saveUser, getUser } from '../utils/db';

const defaultPhoto = require('../../assets/images/empty.jpeg');

export default function ProfileScreen() {
  const { user, setUser } = useContext(UserContext);
  const { theme } = useContext(ThemeContext);
  const styles = themedStyles(theme);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [photo, setPhoto] = useState(''); // store photo URI as string
  const [db, setDb] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- Initialize DB and load stored user ---
  useEffect(() => {
    (async () => {
      try {
        const dbConn = await getDBConnection();
        await createUserTable(dbConn);
        setDb(dbConn);

        const storedUser = await getUser(dbConn);
        if (storedUser) {
          setName(storedUser.name || '');
          setEmail(storedUser.email || '');
          setPhoto(storedUser.photo || '');
          setUser(storedUser);
        }
      } catch (err) {
        console.log('Error initializing DB:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // --- Save profile ---
  const saveProfile = async () => {
    try {
      if (!db) {
        Alert.alert('Database not ready yet');
        return;
      }
      const updatedUser = {
        id: 1,
        name,
        email,
        photo: photo || '', // must be string
      };
      await saveUser(db, updatedUser);
      setUser(updatedUser);
      Alert.alert('Profile saved successfully!');
      console.log('Profile saved:', updatedUser);
    } catch (err) {
      console.log('Error saving profile:', err);
      Alert.alert('Error saving profile', err.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: theme === 'dark' ? '#fff' : '#000' }}>Loading Profile...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme === 'dark' ? '#121212' : '#fff' }}>
      <ScrollView contentContainerStyle={[styles.container, { flexGrow: 1 }]}>
        <View style={styles.photoContainer}>
          <Image
            source={photo ? { uri: photo } : defaultPhoto} // string URI or default
            style={styles.photo}
          />
        </View>

        <Text style={styles.title}>Hello, {name || 'there'}!</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholder="Enter your name"
            placeholderTextColor={theme === 'dark' ? '#aaa' : '#888'}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor={theme === 'dark' ? '#aaa' : '#888'}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <View style={styles.btn}>
            <Button
              title="Save Profile"
              onPress={saveProfile}
              color={theme === 'dark' ? '#6DA06F' : '#4a8f4f'}
            />
          </View>
        </View>

        <Text style={styles.hint}>
          Profile is stored in SQLite and will persist across app launches.
        </Text>
      </ScrollView>
    </View>
  );
}

const themedStyles = (theme) =>
  StyleSheet.create({
    container: {
      padding: 20,
      alignItems: 'center',
    },
    photoContainer: {
      backgroundColor: '#f2fce7',
      padding: 16,
      borderRadius: 30,
      marginBottom: 20,
      shadowColor: theme === 'dark' ? '#000' : '#aaa',
      shadowOpacity: 0.1,
      shadowOffset: { width: 0, height: 5 },
      shadowRadius: 10,
      elevation: 5,
    },
    photo: {
      width: 140,
      height: 140,
      borderRadius: 70,
    },
    title: {
      fontSize: 22,
      fontWeight: '700',
      color: theme === 'dark' ? '#fff' : '#3e5f27',
      marginBottom: 20,
    },
    form: {
      width: '100%',
    },
    label: {
      marginTop: 12,
      color: theme === 'dark' ? '#ccc' : '#5a5a5a',
      fontWeight: '600',
    },
    input: {
      borderWidth: 1,
      borderColor: theme === 'dark' ? '#333' : '#ddd',
      padding: 12,
      borderRadius: 12,
      marginTop: 6,
      backgroundColor: theme === 'dark' ? '#1e1e1e' : '#fafafa',
      color: theme === 'dark' ? '#fff' : '#000',
    },
    btn: {
      marginTop: 20,
      borderRadius: 12,
      overflow: 'hidden',
    },
    hint: {
      marginTop: 30,
      color: theme === 'dark' ? '#888' : '#888',
      fontSize: 13,
      textAlign: 'center',
      fontStyle: 'italic',
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });