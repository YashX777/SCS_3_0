import React, { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, View, Dimensions, Platform } from 'react-native';
// import ThemeProvider from './src/contexts/ThemeContext';
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
        return <HomeScreen />;
    }
  };

  return (
    <ThemeProvider>
      <UserProvider>
        <SafeAreaView style={styles.safe}>
          <TopBar currentRoute={route} onNavigate={setRoute} />
          <View style={styles.container}>{renderScreen()}</View>
        </SafeAreaView>
      </UserProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  safe: { 
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 25 : 0, // Add padding for Android status bar
  },
  container: { 
    flex: 1,
    maxWidth: 800, // Maximum width for tablet/larger screens
    alignSelf: 'center',
    width: '100%',
  },
});
