import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import RegisterScreen from './screens/RegisterScreen';
import AccountScreen from './screens/AccountScreen';
import {AuthProvider, useAuth} from './auth/AuthContext';

export type RootStackParamList = {
	// Unauth stack
  Login: undefined;
	Register: undefined;
	// Auth stack
  Home: undefined;
	Account: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function Router() {
	const {status} = useAuth();
	const isAuthed = status === 'authenticated';
  return (
	  <NavigationContainer>
      <Stack.Navigator>
	      {/* Home is accessible for both demo (guest) and authenticated users */}
	      <Stack.Screen name="Home" component={HomeScreen} options={{title: 'Home'}}/>
	      {isAuthed ? (
		      <Stack.Screen name="Account" component={AccountScreen} options={{title: 'Account'}}/>
	      ) : (
		      <>
			      <Stack.Screen name="Login" component={LoginScreen} options={{title: 'Login'}}/>
			      <Stack.Screen name="Register" component={RegisterScreen} options={{title: 'Registrieren'}}/>
		      </>
	      )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
	return (
		<AuthProvider>
			<Router/>
		</AuthProvider>
	);
}
