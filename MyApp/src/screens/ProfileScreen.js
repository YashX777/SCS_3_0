import React, { useContext, useState } from 'react';
import { View, Text, TextInput, Button, Image, StyleSheet, ScrollView } from 'react-native';
import { UserContext } from '../contexts/UserContext';
const defaultPhoto = require('../../assets/images/main.jpeg');

export default function ProfileScreen() {
  const { user, setUser } = useContext(UserContext);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');

  const save = () => {
    setUser((prev) => ({ ...prev, name, email, photo: prev?.photo || defaultPhoto }));
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image source={user?.photo || defaultPhoto} style={styles.photo} />
      <Text style={styles.label}>Name</Text>
      <TextInput value={name} onChangeText={setName} style={styles.input} />

      <Text style={styles.label}>Email</Text>
      <TextInput value={email} onChangeText={setEmail} style={styles.input} keyboardType="email-address" />

      <View style={styles.btn}>
        <Button title="Save Profile" onPress={save} />
      </View>

      <Text style={styles.hint}>Note: Profile is stored in-memory. Add AsyncStorage to persist across launches.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, alignItems: 'center' },
  photo: { width: 140, height: 140, borderRadius: 10, marginBottom: 12 },
  label: { alignSelf: 'stretch', marginTop: 8, color: '#444' },
  input: { alignSelf: 'stretch', borderWidth: 1, borderColor: '#ddd', padding: 8, borderRadius: 6, marginTop: 6 },
  btn: { marginTop: 14, alignSelf: 'stretch' },
  hint: { marginTop: 18, color: '#888', fontSize: 12 },
});
