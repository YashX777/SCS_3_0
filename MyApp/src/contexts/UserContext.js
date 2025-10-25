import React, { createContext, useState } from 'react';

export const UserContext = createContext({
  user: null,
  setUser: () => {},
});

export default function UserProvider({ children }) {
  // Minimal in-memory user. You can plug AsyncStorage to persist.
  const [user, setUser] = useState({
    name: 'Guest User',
    email: 'guest@example.com',
    photo: null, // you can set require('../assets/images/main.jpeg') by default in Profile
  });

  return <UserContext.Provider value={{ user, setUser }}>{children}</UserContext.Provider>;
}
