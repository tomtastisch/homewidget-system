import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {QueryClientProvider} from '@tanstack/react-query';

import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import {AuthProvider, useAuth} from './auth/AuthContext';
import {queryClient} from './query/queryClient';
import {OfflineIndicator} from './ui/OfflineIndicator';
import {ToastProvider} from './ui/ToastContext';
import {AuthedTabs} from './navigation/AuthedTabs';

export type RootStackParamList = {
    Main: undefined;
    Home: undefined;
    Login: undefined;
    Register: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function Router() {
    const {status} = useAuth();
    const isAuthed = status === 'authenticated';

    return (
        <NavigationContainer>
            {isAuthed ? (
                <Stack.Navigator>
                    <Stack.Screen name="Main" component={AuthedTabs} options={{headerShown: false}}/>
                </Stack.Navigator>
            ) : (
                <Stack.Navigator>
                    <Stack.Screen name="Home" component={HomeScreen} options={{title: 'Home'}}/>
                    <Stack.Screen name="Login" component={LoginScreen} options={{title: 'Login'}}/>
                    <Stack.Screen name="Register" component={RegisterScreen} options={{title: 'Registrieren'}}/>
                </Stack.Navigator>
            )}
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
