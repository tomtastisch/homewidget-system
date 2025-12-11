import * as SecureStore from 'expo-secure-store';
import {Platform} from 'react-native';

// WICHTIG: Nur den Refresh‑Token sicher persistieren.
// Der Access‑Token wird ausschließlich im Speicher (State) gehalten.
//
// Plattformabhängige Storage-Implementierung:
// - Native (iOS/Android): expo-secure-store (verschlüsselt)
// - Web: localStorage (keine Verschlüsselung, aber funktional)

const REFRESH_KEY = 'hw_refresh_token';

/**
 * Speichert das Refresh-Token plattformabhängig.
 * - Native: SecureStore (verschlüsselt)
 * - Web: localStorage (unverschlüsselt, da SecureStore auf Web nicht verfügbar)
 */
export async function saveRefreshToken(refresh: string): Promise<void> {
	if (Platform.OS === 'web') {
		localStorage.setItem(REFRESH_KEY, refresh);
	} else {
		await SecureStore.setItemAsync(REFRESH_KEY, refresh);
	}
}

/**
 * Liest das Refresh-Token plattformabhängig.
 * - Native: SecureStore
 * - Web: localStorage
 */
export async function getRefreshToken(): Promise<string | null> {
	if (Platform.OS === 'web') {
		return Promise.resolve(localStorage.getItem(REFRESH_KEY));
	} else {
		return SecureStore.getItemAsync(REFRESH_KEY);
	}
}

/**
 * Löscht alle auth-bezogenen Tokens plattformabhängig.
 * - Native: SecureStore
 * - Web: localStorage
 */
export async function clearTokens(): Promise<void> {
	if (Platform.OS === 'web') {
		localStorage.removeItem(REFRESH_KEY);
		// Für Abwärtskompatibilität auch andere mögliche Keys löschen
		localStorage.removeItem('access_token');
		localStorage.removeItem('refreshToken');
	} else {
		// Für Abwärtskompatibilität: löscht alle auth‑bezogenen Einträge.
		await SecureStore.deleteItemAsync(REFRESH_KEY);
	}
}
