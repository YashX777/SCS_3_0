import React, { useContext } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { ThemeContext } from '../contexts/ThemeContext';
import { UserContext } from '../contexts/UserContext';
// Note: Removed Chat import from here as TopBar shouldn't import screens directly
// import {Chat} from '../screens/ChatScreen';

const logo = require('../../assets/images/empty.jpeg'); // Assuming you have this image

export default function TopBar({ currentRoute, onNavigate }) {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { user } = useContext(UserContext); // user object with photo (Google URL) if logged in
  const styles = themedStyles(theme);

  return (
    <View style={styles.container}>
      {/* Left logo and title */}
      <View style={styles.left}>
        <Image source={logo} style={styles.logo} />
        <Text style={styles.title}>FinTrack</Text>
      </View>

      {/* Theme toggle */}
      <View style={styles.right}>
        <Switch value={theme === 'dark'} onValueChange={toggleTheme} />
      </View>

      {/* Bottom navigation */}
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

        {/* --- ADDED CHAT BUTTON --- */}
        <TouchableOpacity
          onPress={() => onNavigate('Chat')}
          style={[styles.navBtn, currentRoute === 'Chat' && styles.activeNavBtn]}>
          <Text style={[styles.navText, currentRoute === 'Chat' && styles.activeNavText]}>Chat</Text>
        </TouchableOpacity>
        {/* --- END OF ADDED CHAT BUTTON --- */}


        {/* Profile tab */}
        <TouchableOpacity
          onPress={() => onNavigate('Profile')}
          style={[styles.navBtn, currentRoute === 'Profile' && styles.activeNavBtn]}>

          {user?.photo ? (
            // Google profile photo
            <Image
              source={{ uri: user.photo }}
              style={[
                styles.profileImage,
                currentRoute === 'Profile' && styles.activeProfileImage
              ]}
            />
          ) : (
            // Default avatar (circle + semicircle)
            <View style={styles.defaultAvatarContainer}> {/* Added container for centering */}
                 <View style={styles.defaultAvatar}>
                     <View style={styles.head} />
                     <View style={styles.body} />
                 </View>
             </View>
          )}
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
      paddingHorizontal: 8,
      paddingVertical: 8,
    },
    logo: {
      width: 50,
      height: 50,
      resizeMode: 'contain',
      borderRadius: 3
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
      alignItems: 'center', // Align items vertically
    },
    navBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 32, // Ensure consistent height for buttons
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
    // Google profile image
    profileImage: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme === 'dark' ? '#fff' : '#333',
    },
    activeProfileImage: {
      borderColor: theme === 'dark' ? '#6DA06F' : '#4a8f4f', // highlight when active
    },
    // Default avatar
     defaultAvatarContainer: { // Added container
         width: 32,
         height: 32,
         justifyContent: 'center',
         alignItems: 'center',
     },
    defaultAvatar: {
      // Removed fixed width/height, let container handle it
      alignItems: 'center',
      justifyContent: 'center',
    },
    head: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: theme === 'dark' ? '#ccc' : '#666',
    },
    body: {
      width: 18,
      height: 9, // Slightly reduced height
      borderTopLeftRadius: 9,
      borderTopRightRadius: 9,
      backgroundColor: theme === 'dark' ? '#ccc' : '#666',
      marginTop: 2,
    },
    // Removed duplicate activeTab and tabText styles - use navText/activeNavText
    // activeTab: { ... },
    // tabText: { ... },
  });

