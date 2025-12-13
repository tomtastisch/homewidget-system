import React, {useEffect} from 'react';
import {Button, StyleSheet, Text, View} from 'react-native';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';

import {useAuth} from '../auth/AuthContext';
import type {AuthedTabParamList} from '../navigation/AuthedTabs';

type Props = BottomTabScreenProps<AuthedTabParamList, 'Account'>;

export default function AccountScreen(_: Props) {
    const {user, role, loadMe, logout, isDemo, isCommon, isPremium} = useAuth();

    useEffect(() => {
        if (!user) {
            loadMe().catch(() => void 0);
        }
    }, [user, loadMe]);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Account</Text>

            {user ? (
                <View style={styles.card}>
                    <Text style={styles.label}>E-Mail</Text>
                    <Text style={styles.value}>{user.email}</Text>

                    <Text style={styles.label}>Rolle</Text>
                    <Text style={styles.value} testID="account.role">{role}</Text>

                    <View style={styles.flagsBox}>
                        <Text>isDemo: {String(isDemo())}</Text>
                        <Text>isCommon: {String(isCommon())}</Text>
                        <Text>isPremium: {String(isPremium())}</Text>
                    </View>
                </View>
            ) : (
                <Text>Profil wird geladen…</Text>
            )}

            <Button title="Logout" onPress={logout}/>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {flex: 1, padding: 16},
    title: {fontSize: 22, fontWeight: '600', marginBottom: 12},
    card: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        backgroundColor: '#fff',
        marginBottom: 16,
    },
    label: {fontWeight: '600', marginTop: 4},
    value: {marginBottom: 8},
    flagsBox: {marginTop: 8},
});
