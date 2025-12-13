import React from 'react';
import {Pressable} from 'react-native';
import {type BottomTabBarButtonProps, createBottomTabNavigator} from '@react-navigation/bottom-tabs';

import AccountScreen from '../screens/AccountScreen';
import HomeScreen from '../screens/HomeScreen';

/**
 * Param-Liste der Tabs im authentifizierten Bereich.
 *
 * Hinweis: `undefined` bedeutet, dass die Route keine Params erwartet.
 */
export type AuthedTabParamList = {
    Home: undefined;
    Account: undefined;
};

const Tab = createBottomTabNavigator<AuthedTabParamList>();

/**
 * Props für den Tab-Button.
 */
type TabButtonProps = BottomTabBarButtonProps & {
    /**
     * Eindeutige Kennung für UI/E2E-Tests.
     * Beispiel: `navigation.home`, `navigation.account`.
     */
    testID: string;
};

/**
 * TabBar-Button basierend auf `Pressable`.
 *
 * Wichtiger Punkt:
 * - `ref` wird aus den Props entfernt, um TS2322 (Ref-Inkompatibilität) zu vermeiden.
 */
function TabButton({children, testID, ...props}: TabButtonProps) {
    // `ref` explizit entfernen (React Navigation / RN Typdefinitionen können es enthalten).
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {ref: _ignoredRef, ...rest} = props as BottomTabBarButtonProps & { ref?: unknown };

    return (
        <Pressable {...rest} testID={testID}>
            {children}
        </Pressable>
    );
}

/**
 * Authentifizierte Tabs.
 *
 * Test-IDs:
 * - Home Tab: `navigation.home`
 * - Account Tab: `navigation.account`
 */
export function AuthedTabs() {
    return (
        <Tab.Navigator>
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{
                    title: 'Home',
                    tabBarButton: (props) =>
                        <TabButton {...props} testID="navigation.home"/>,
                }}
            />
            <Tab.Screen
                name="Account"
                component={AccountScreen}
                options={{
                    title: 'Account',
                    tabBarButton: (props) =>
                        <TabButton {...props} testID="navigation.account"/>,
                }}
            />
        </Tab.Navigator>
    );
}
