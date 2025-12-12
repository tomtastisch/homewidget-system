import React, {useEffect} from 'react';
import {View, Text, Button, StyleSheet} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../App';
import {useAuth} from '../auth/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Account'>;

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
					<Text style={styles.label}>E‑Mail</Text>
					<Text style={styles.value}>{user.email}</Text>
					<Text style={styles.label}>Rolle</Text>
					<Text style={styles.value} testID="account.role">{role}</Text>
					<View style={{marginTop: 8}}>
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
		marginBottom: 16
	},
	label: {fontWeight: '600', marginTop: 4},
	value: {marginBottom: 8},
});
