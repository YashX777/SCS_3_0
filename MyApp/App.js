import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, View, Dimensions, Platform } from 'react-native';
import ThemeProvider from './src/contexts/ThemeContext';
import UserProvider from './src/contexts/UserContext';
import TopBar from './src/components/TopBar';
import LoadingScreen from './src/screens/LoadingScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import CategorizeScreen from './src/screens/CategorizeScreen';

export default function App() {
  const [route, setRoute] = useState('Loading');

  useEffect(() => {
    // noop here; LoadingScreen will switch route after splash
  }, []);

  const renderScreen = () => {
    switch (route) {
      case 'Loading':
        // Pass the function to change the route when the animation finishes
        return <LoadingScreen onFinish={() => setRoute('Home')} />;
      case 'Home':
        return <HomeScreen />;
      case 'Profile':
        return <ProfileScreen />;
      case 'Transactions':
        return <TransactionsScreen />;
      case 'Categorize':
        return <CategorizeScreen />;
      default:
        // Default to Home if route is unknown
        return <HomeScreen />;
    }
  };

  return (
    <ThemeProvider>
      <UserProvider>
        {/* SafeAreaView provides padding for notches/status bars */}
        <SafeAreaView style={styles.safe}>
          {/* --- Conditional Rendering for TopBar --- */}
          {/* Only render TopBar if the route is NOT 'Loading' */}
          {route !== 'Loading' && (
            <TopBar currentRoute={route} onNavigate={setRoute} />
          )}
          {/* --- End Conditional Rendering --- */}

          {/* Container for the main screen content */}
          <View style={styles.container}>{renderScreen()}</View>
        </SafeAreaView>
      </UserProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    // Add padding top specifically for Android status bar
    paddingTop: Platform.OS === 'android' ? 25 : 0,
    // Set a default background color (can be overridden by ThemeProvider)
    backgroundColor: '#f2fce7', // Match LoadingScreen bg initially
  },
  container: {
    flex: 1,
    // Limit width on larger screens for better layout
    maxWidth: 800,
    // Center the container horizontally
    alignSelf: 'center',
    // Ensure it takes full width up to the maxWidth
    width: '100%',
  },
});
