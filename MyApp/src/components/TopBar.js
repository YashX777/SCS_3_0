import React, { useContext } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { ThemeContext } from '../contexts/ThemeContext';

const logo = require('../../assets/images/main.jpeg');

export default function TopBar({ currentRoute, onNavigate }) {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const styles = themedStyles(theme);

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Image source={logo} style={styles.logo} />
        <Text style={styles.title}>FinTrack</Text>
      </View>

      <View style={styles.right}>
        <Switch value={theme === 'dark'} onValueChange={toggleTheme} />
      </View>

      <View style={styles.bottomNav}>
        <TouchableOpacity 
          onPress={() => onNavigate('Home')} 
          style={[styles.navBtn, currentRoute === 'Home' && styles.activeNavBtn]}>
          <Text style={[styles.navText, currentRoute === 'Home' && styles.activeNavText]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => onNavigate('Transactions')} 
          style={[styles.navBtn, currentRoute === 'Transactions' && styles.activeNavBtn]}>
          <Text style={[styles.navText, currentRoute === 'Transactions' && styles.activeNavText]}>Transactions</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => onNavigate('Categorize')} 
          style={[styles.navBtn, currentRoute === 'Categorize' && styles.activeNavBtn]}>
          <Text style={[styles.navText, currentRoute === 'Categorize' && styles.activeNavText]}>Categories</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => onNavigate('Profile')} 
          style={[styles.navBtn, currentRoute === 'Profile' && styles.activeNavBtn]}>
          <Text style={[styles.navText, currentRoute === 'Profile' && styles.activeNavText]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const themedStyles = (theme) =>
  StyleSheet.create({
    container: {
      paddingTop: 8,
      backgroundColor: theme === 'dark' ? '#222' : '#fff',
      borderBottomWidth: 1,
      borderBottomColor: theme === 'dark' ? '#333' : '#eee',
    },
    left: { 
      flexDirection: 'row', 
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    logo: { 
      width: 32, 
      height: 32, 
      resizeMode: 'cover', 
      borderRadius: 6 
    },
    title: { 
      marginLeft: 8, 
      fontWeight: '700', 
      fontSize: 16,
      color: theme === 'dark' ? '#fff' : '#111' 
    },
    right: { 
      position: 'absolute',
      right: 16,
      top: 12,
    },
    bottomNav: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: theme === 'dark' ? '#333' : '#eee',
    },
    navBtn: { 
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    activeNavBtn: {
      backgroundColor: theme === 'dark' ? '#444' : '#eee',
    },
    navText: { 
      color: theme === 'dark' ? '#ddd' : '#333',
      fontSize: 13,
    },
    activeNavText: {
      color: theme === 'dark' ? '#fff' : '#000',
      fontWeight: '600',
    },
  });
