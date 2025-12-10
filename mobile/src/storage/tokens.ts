import * as SecureStore from 'expo-secure-store';

// WICHTIG: Nur den Refresh‑Token sicher persistieren.
// Der Access‑Token wird ausschließlich im Speicher (State) gehalten.

const REFRESH_KEY = 'hw_refresh_token';

export async function saveRefreshToken(refresh: string) {
  await SecureStore.setItemAsync(REFRESH_KEY, refresh);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function clearTokens() {
	// Für Abwärtskompatibilität: löscht alle auth‑bezogenen Einträge.
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}
