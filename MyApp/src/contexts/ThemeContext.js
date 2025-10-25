import React, { createContext, useState } from 'react';
import { Appearance } from 'react-native';

export const ThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => {},
});

export default function ThemeProvider({ children }) {
  const colorScheme = Appearance.getColorScheme() || 'light';
  const [theme, setTheme] = useState(colorScheme === 'dark' ? 'dark' : 'light');

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  const value = { theme, toggleTheme };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
