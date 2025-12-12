import * as SecureStore from 'expo-secure-store';
import {Platform} from 'react-native';

// WICHTIG: Nur den Refresh‑Token sicher persistieren.
// Der Access‑Token wird ausschließlich im Speicher (State) gehalten.
//
// Plattformabhängige Storage-Implementierung:
// - Native (iOS/Android): expo-secure-store (verschlüsselt)
// - Web: localStorage (keine Verschlüsselung, aber funktional)

const REFRESH_KEY = 'hw_refresh_token';

// Kleine Abstraktionsschicht für plattformspezifischen Storage
type RefreshStorage = {
	set: (value: string) => Promise<void>;
	get: () => Promise<string | null>;
	clear: () => Promise<void>;
};

const refreshStorage: RefreshStorage = Platform.OS === 'web'
	? {
		set: async (value: string) => {
			localStorage.setItem(REFRESH_KEY, value);
		},
		get: async () => {
			return localStorage.getItem(REFRESH_KEY);
		},
		clear: async () => {
			localStorage.removeItem(REFRESH_KEY);
		},
	}
	: {
		set: (value: string) => SecureStore.setItemAsync(REFRESH_KEY, value),
		get: () => SecureStore.getItemAsync(REFRESH_KEY),
		clear: () => SecureStore.deleteItemAsync(REFRESH_KEY),
	};

/**
 * Speichert das Refresh-Token plattformabhängig.
 * - Native: SecureStore (verschlüsselt)
 * - Web: localStorage (unverschlüsselt, da SecureStore auf Web nicht verfügbar)
 */
export async function saveRefreshToken(refresh: string): Promise<void> {
	await refreshStorage.set(refresh);
}

/**
 * Liest das Refresh-Token plattformabhängig.
 * - Native: SecureStore
 * - Web: localStorage
 */
export async function getRefreshToken(): Promise<string | null> {
	return refreshStorage.get();
}

/**
 * Löscht alle auth-bezogenen Tokens plattformabhängig.
 * - Native: SecureStore
 * - Web: localStorage
 */
export async function clearTokens(): Promise<void> {
	await refreshStorage.clear();
}
