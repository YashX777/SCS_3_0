import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

const logo = require('../../assets/images/main.jpeg');

export default function LoadingScreen({ onFinish }) {
  useEffect(() => {
    const t = setTimeout(() => {
      onFinish && onFinish();
    }, 1100);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.container}>
      <Image source={logo} style={styles.logo} />
      <Text style={styles.title}>FinTrack</Text>
      <Text style={styles.sub}>Personal finance, simplified.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { width: 160, height: 160, borderRadius: 8 },
  title: { marginTop: 12, fontSize: 22, fontWeight: '700' },
  sub: { marginTop: 6, color: '#666' },
});
