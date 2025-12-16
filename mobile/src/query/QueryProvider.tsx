import React, {PropsWithChildren, useEffect} from 'react';
import {AppState, Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import {focusManager, onlineManager} from '@tanstack/react-query';
import {PersistQueryClientProvider} from '@tanstack/react-query-persist-client';
import {createAsyncStoragePersister} from '@tanstack/query-async-storage-persister';
import {getQueryClient} from './queryClient';

const persister = createAsyncStoragePersister({
	storage: {
		getItem: (key: string) => AsyncStorage.getItem(key),
		setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
		removeItem: (key: string) => AsyncStorage.removeItem(key),
	},
	key: 'hw_rq_cache_v1',
	throttleTime: 1000,
});

/**
 * Richtet Fokus-Integrationen für React Native ein.
 *
 * Zweck:
 * - Steuert den Fokuszustand von React Query auf nativen Plattformen (iOS/Android)
 *   basierend auf dem `AppState` der RN‑App. Im Web wird der Fokus bereits über
 *   das `window`‑Fokusereignis von React Query gehandhabt.
 *
 * Rückgabewert:
 * - Immer eine Cleanup‑Funktion, die die registrierten Listener entfernt. Auf Web
 *   ist diese Funktion ein No‑Op, da kein Listener registriert wird.
 *
 * Plattform‑Spezifika:
 * - Native: registriert einen `AppState`‑Listener und synchronisiert `focusManager`.
 * - Web: gibt eine leere Cleanup‑Funktion zurück (kein zusätzlicher Listener nötig).
 */
function setupReactNativeIntegrations() {
	// Web: Fokus via Window bereits abgedeckt → kein Listener nötig
	if (Platform.OS === 'web') {
		return () => {
		};
	}
	// Native: Fokus per AppState an React Query melden
	const sub = AppState.addEventListener('change', (status) => {
		focusManager.setFocused(status === 'active');
	});
	// Cleanup beim HMR/Unmount
	return () => {
		sub.remove();
	};
}

function setupOnlineManager() {
	return NetInfo.addEventListener((state) => {
		const online = Boolean(state.isConnected && state.isInternetReachable !== false);
		onlineManager.setOnline(online);
	});
}

/**
 * QueryProvider
 *
 * Zweck:
 * - Zentrale Bereitstellung des React‑Query‑Clients inkl. Persistenz der Query‑Daten.
 *
 * Props:
 * - `children`: Die Kinder, die innerhalb des `PersistQueryClientProvider` gerendert werden.
 *
 * Besonderheiten:
 * - Persistenz: Nutzt `AsyncStorage` über den `createAsyncStoragePersister`, damit Cache‑Daten
 *   über App‑Neustarts erhalten bleiben (mit Buster/MaxAge).
 * - Netzwerk‑Integration: Verknüpft `@react-native-community/netinfo` mit `onlineManager`, um
 *   den Online‑Status von React Query aktuell zu halten.
 * - Fokus‑Integration: Meldet App‑Fokus (RN `AppState`) an `focusManager`, damit Hintergrund/
 *   Vordergrundwechsel korrekt berücksichtigt werden.
 */
export function QueryProvider({children}: PropsWithChildren) {
	const client = getQueryClient();
	
	useEffect(() => {
		const cleanupFocus = setupReactNativeIntegrations();
		const cleanupNet = setupOnlineManager();
		return () => {
			cleanupFocus();
			cleanupNet();
		};
	}, []);
	
	return (
		<PersistQueryClientProvider
			client={client}
			persistOptions={{
				persister,
				buster: 'v1',
				maxAge: 24 * 60 * 60 * 1000, // 24h
			}}
		>
			{children}
		</PersistQueryClientProvider>
	);
}
