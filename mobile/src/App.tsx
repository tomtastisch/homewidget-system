import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import RegisterScreen from './screens/RegisterScreen';
import AccountScreen from './screens/AccountScreen';
import WidgetDetailScreen from './screens/WidgetDetailScreen';
import OffersScreen from './screens/OffersScreen';
import {AuthProvider, useAuth} from './auth/AuthContext';
import {ToastProvider} from './ui/ToastContext';
import {OfflineIndicator} from './ui/OfflineIndicator';
import {QueryProvider} from './query/QueryProvider';

/**
 * Param-Liste für React-Navigation (Native Stack).
 *
 * Hinweis
 * - Alle Screens erwarten aktuell keine Route-Parameter (`undefined`),
 *   außer WidgetDetail, das eine widgetId benötigt.
 */
export type RootStackParamList = {
	// Unauth-Stack
	Login: undefined;
	Register: undefined;
	// Auth-Stack
	Home: undefined;
	Account: undefined;
	WidgetDetail: { widgetId: number };
	Offers: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Router (Navigation-Root)
 *
 * Logik
 * - "Home" ist immer verfügbar (Demo/Gast + Auth).
 * - Bei Auth: "Account".
 * - Ohne Auth: "Login" + "Register".
 */
function Router() {
	// Auth-Status aus dem globalen Context; steuert, welche Screens sichtbar sind.
	const {status} = useAuth();
	const isAuthed = status === 'authenticated';
  return (
	  <NavigationContainer>
      <Stack.Navigator>
	      {/* Home is accessible for both demo (guest) and authenticated users */}
	      <Stack.Screen name="Home" component={HomeScreen} options={{title: 'Home'}}/>
	      <Stack.Screen
		      name="WidgetDetail"
		      component={WidgetDetailScreen}
		      options={{title: 'Widget-Details'}}
	      />
	      <Stack.Screen name="Offers" component={OffersScreen} options={{title: 'Angebote'}}/>
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

/**
 * App-Root
 *
 * Reihenfolge der Provider
 * - Toast: UI-Feedback global.
 * - Query: Daten-/Cache-Schicht.
 * - Auth: Session-/Token-Status.
 * - OfflineIndicator: Netzstatus-UI über allem.
 */
export default function App() {
	return (
		<ToastProvider>
			<QueryProvider>
				<AuthProvider>
					<OfflineIndicator/>
					<Router/>
				</AuthProvider>
			</QueryProvider>
		</ToastProvider>
	);
}
