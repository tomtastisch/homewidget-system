import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {QueryClientProvider} from '@tanstack/react-query';

import AccountScreen from './screens/AccountScreen';
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import {AuthProvider, useAuth} from './auth/AuthContext';
import {queryClient} from './query/queryClient';
import {OfflineIndicator} from './ui/OfflineIndicator';
import {ToastProvider} from './ui/ToastContext';

export type RootStackParamList = {
    Login: undefined;
    Register: undefined;
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
        <QueryClientProvider client={queryClient}>
            <ToastProvider>
                <AuthProvider>
                    <OfflineIndicator/>
                    <Router/>
                </AuthProvider>
            </ToastProvider>
        </QueryClientProvider>
    );
}
