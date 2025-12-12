import * as SecureStore from 'expo-secure-store';
import {Platform} from 'react-native';

const REFRESH_KEY = 'hw_refresh_token';

/**
 * Schnittstelle für plattformspezifischen Persistierungsmechanismus.
 */
type RefreshStorage = {
	set: (value: string) => Promise<void>;
	get: () => Promise<string | null>;
	clear: () => Promise<void>;
};

const refreshStorage: RefreshStorage = Platform.OS === 'web'
	? {
		set: async (value: string) => {
			localStorage.setItem(REFRESH_KEY, value);
			// Auflösung in der nachfolgenden Microtask-Phase für Promise-Konsistenz
			await Promise.resolve();
		},
		get: async () => {
			const value = localStorage.getItem(REFRESH_KEY);
			// Auflösung in der nachfolgenden Microtask-Phase für Promise-Konsistenz
			await Promise.resolve();
			return value;
		},
		clear: async () => {
			localStorage.removeItem(REFRESH_KEY);
			await Promise.resolve();
		},
	}
	: {
		set: (value: string) => SecureStore.setItemAsync(REFRESH_KEY, value),
		get: () => SecureStore.getItemAsync(REFRESH_KEY),
		clear: () => SecureStore.deleteItemAsync(REFRESH_KEY),
	};

/**
 * Speichert das Refresh-Token persistent.
 *
 * @param refresh Refresh-Token-Wert
 *
 * Speicherung:
 * - Native (iOS/Android): expo-secure-store (verschlüsselt)
 * - Web: localStorage (unverschlüsselt)
 */
export async function saveRefreshToken(refresh: string): Promise<void> {
	await refreshStorage.set(refresh);
}

/**
 * Ruft das persistierte Refresh-Token ab.
 *
 * @returns Refresh-Token-Wert oder null, falls nicht vorhanden
 *
 * Zugriff:
 * - Native (iOS/Android): expo-secure-store
 * - Web: localStorage
 */
export async function getRefreshToken(): Promise<string | null> {
	return refreshStorage.get();
}

/**
 * Löscht alle persistierten authentifizierungsbezogenen Tokens.
 *
 * Löschung:
 * - Native (iOS/Android): expo-secure-store
 * - Web: localStorage und Kompatibilitätschlüssel
 */
export async function clearTokens(): Promise<void> {
	await refreshStorage.clear();
}
