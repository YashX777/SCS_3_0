import React, { useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#f2fce7'
  },
  logo: { 
    width: 450, 
    height: 450,
    resizeMode: 'contain'
  },
});