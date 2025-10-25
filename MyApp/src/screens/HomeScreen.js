import React, { useContext } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { UserContext } from '../contexts/UserContext';
import { ThemeContext } from '../contexts/ThemeContext';

export default function HomeScreen() {
  const { user } = useContext(UserContext);
  const { theme } = useContext(ThemeContext);

  const styles = themedStyles(theme);

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Hello, {user?.name || 'Friend'} 👋</Text>
      <Text style={styles.sub}>Welcome back to your personal finance tracker.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Net Worth</Text>
        <Text style={styles.cardAmount}>₹ 12,345</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>This month spent</Text>
        <Text style={styles.cardAmount}>₹ 7,890</Text>
      </View>

      <Text style={styles.note}>Tap Transactions to fetch SMS-based transactions (Android requires permission).</Text>
    </View>
  );
}

const themedStyles = (theme) =>
  StyleSheet.create({
    container: { 
      flex: 1, 
      padding: 16, 
      backgroundColor: theme === 'dark' ? '#111' : '#fafafa',
      paddingBottom: 80, // Add space for bottom navigation
    },
    greeting: { 
      fontSize: 24, 
      fontWeight: '700', 
      color: theme === 'dark' ? '#fff' : '#111',
      marginTop: 8,
    },
    sub: { 
      color: theme === 'dark' ? '#ddd' : '#444', 
      marginBottom: 20,
      fontSize: 15,
    },
    card: { 
      backgroundColor: theme === 'dark' ? '#1a1a1a' : '#fff', 
      padding: 20, 
      borderRadius: 12, 
      marginBottom: 16,
      shadowColor: theme === 'dark' ? '#000' : '#888',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    cardTitle: { 
      color: theme === 'dark' ? '#bbb' : '#666',
      fontSize: 15,
    },
    cardAmount: { 
      marginTop: 8, 
      fontSize: 28, 
      fontWeight: '700', 
      color: theme === 'dark' ? '#fff' : '#111' 
    },
    note: { 
      marginTop: 24, 
      color: '#888', 
      fontSize: 14,
      textAlign: 'center',
      paddingHorizontal: 20,
    },
  });
