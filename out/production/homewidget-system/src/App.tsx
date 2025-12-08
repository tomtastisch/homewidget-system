import React, { useEffect, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import { api } from './api/client';
import { clearTokens } from './storage/tokens';

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const navRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  useEffect(() => {
    api.configure({
      onUnauthorized: async () => {
        await clearTokens();
        // Sicherstellen, dass Navigation existiert
        if (navRef.current) {
          navRef.current.reset({ index: 0, routes: [{ name: 'Login' }] });
        }
      },
    });
  }, []);

  return (
    <NavigationContainer ref={navRef}>
      <Stack.Navigator>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
