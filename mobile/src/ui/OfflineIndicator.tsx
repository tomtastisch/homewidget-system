import React, {useEffect, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';

/**
 * OfflineIndicator zeigt eine Warnung an, wenn keine Netzwerkverbindung besteht.
 * 
 * Nutzt die native Browser-API für Netzwerk-Status-Erkennung (navigator.onLine).
 * 
 * HINWEIS: Für native React Native Apps (iOS/Android) sollte stattdessen
 * @react-native-community/netinfo verwendet werden. Diese Implementierung
 * funktioniert nur für Web (Expo Web).
 */
export function OfflineIndicator() {
	const [isOffline, setIsOffline] = useState(false);
	
	useEffect(() => {
		// Prüfe initialen Status
		const checkOnline = () => {
			// Für Web: Nutze navigator.onLine
			if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
				setIsOffline(!navigator.onLine);
			}
		};
		
		checkOnline();
		
		// Event Listener für Netzwerk-Status-Änderungen
		const handleOnline = () => setIsOffline(false);
		const handleOffline = () => setIsOffline(true);
		
		if (typeof window !== 'undefined') {
			window.addEventListener('online', handleOnline);
			window.addEventListener('offline', handleOffline);
			
			return () => {
				window.removeEventListener('online', handleOnline);
				window.removeEventListener('offline', handleOffline);
			};
		}
	}, []);
	
	if (!isOffline) {
		return null;
	}
	
	return (
		<View style={styles.container} testID="status.offline">
			<Text style={styles.text}>⚠️ Offline – Keine Netzwerkverbindung</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#fff3cd',
		borderBottomWidth: 1,
		borderBottomColor: '#ffc107',
		padding: 8,
		alignItems: 'center',
	},
	text: {
		color: '#856404',
		fontSize: 14,
		fontWeight: '500',
	},
});
