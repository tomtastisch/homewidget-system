import React, {useEffect, useState} from 'react';
import {Alert, Button, StyleSheet, Text, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../App';
import {useAuth} from '../auth/AuthContext';
import {useToast} from '../ui/ToastContext';
import {authUpgradeToPremium} from '../api/client';

type Props = NativeStackScreenProps<RootStackParamList, 'Account'>;

export default function AccountScreen(_: Props) {
	const {user, role, loadMe, logout, isDemo, isCommon, isPremium} = useAuth();
	const {showError, showSuccess} = useToast();
	const [upgrading, setUpgrading] = useState(false);
	
	useEffect(() => {
		if (!user) {
			loadMe().catch(() => void 0);
		}
	}, [user, loadMe]);
	
	const handleUpgradePremium = async () => {
		if (isPremium()) {
			Alert.alert('Info', 'Du hast bereits Premium!');
			return;
		}
		
		setUpgrading(true);
		try {
			// Rufe Backend-Endpoint auf, um zu Premium zu upgraden
			await authUpgradeToPremium();
			
			showSuccess('🎉 Willkommen zu Premium! Geniße 20% Rabatt!');
			
			// Lade Profil neu, um neue Rolle zu sehen
			await loadMe();
			
			Alert.alert(
				'Premium aktiviert!',
				'Du erhältst jetzt 20% Rabatt auf alle Produkte.\n\nViel Erfolg!',
				[{text: 'OK'}]
			);
		} catch (error: any) {
			showError(error?.message || 'Upgrade fehlgeschlagen');
			
		} finally {
			setUpgrading(false);
		}
	};
	
	return (
		<View style={styles.container}>
			<Text style={styles.title}>Account</Text>
			{user ? (
				<View>
					<View style={styles.card}>
						<Text style={styles.label}>E‑Mail</Text>
						<Text style={styles.value}>{user.email}</Text>
						<Text style={styles.label}>Rolle</Text>
						<Text style={[styles.value, {fontWeight: '700', fontSize: 16}]} testID="account.role">
							{role === 'common' ? '👤 Common' : role === 'premium' ? '👑 Premium' : '🎭 Demo'}
						</Text>
						<View style={{marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#eee'}}>
							<Text style={{fontSize: 12, color: '#666'}}>isDemo: {String(isDemo())}</Text>
							<Text style={{fontSize: 12, color: '#666'}}>isCommon: {String(isCommon())}</Text>
							<Text style={{fontSize: 12, color: '#666'}}>isPremium: {String(isPremium())}</Text>
						</View>
					</View>
					
					{/* Premium Upgrade Card - nur für Common User sichtbar */}
					{isCommon() && !isPremium() && (
						<View style={[styles.card, styles.premiumCard]} testID="account.premium.card">
							<Text style={styles.premiumTitle} testID="account.premium.title">✨ Premium Upgrade</Text>
							<Text style={styles.premiumDescription} testID="account.premium.description">
								Upgrade zu Premium und erhalte 20% Rabatt auf alle Produkte!
							</Text>
							<Button
								title="Zu Premium upgraden"
								onPress={handleUpgradePremium}
								disabled={upgrading}
							/>
						</View>
					)}
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
	premiumCard: {
		borderColor: '#8a2be2',
		backgroundColor: '#f9f5ff',
		borderWidth: 2,
	},
	premiumTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#8a2be2',
		marginBottom: 8,
	},
	premiumDescription: {
		fontSize: 14,
		color: '#666',
		marginBottom: 12,
		lineHeight: 20,
	},
	label: {fontWeight: '600', marginTop: 4},
	value: {marginBottom: 8},
});
