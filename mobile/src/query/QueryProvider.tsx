import React, {PropsWithChildren, useEffect} from 'react';
import {AppState, Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import {focusManager, onlineManager} from '@tanstack/react-query';
import {PersistQueryClientProvider} from '@tanstack/react-query-persist-client';
import {createAsyncStoragePersister} from '@tanstack/query-async-storage-persister';
import {getQueryClient} from './queryClient';

const persister = createAsyncStoragePersister({
	storage: AsyncStorage as any,
	key: 'hw_rq_cache_v1',
	throttleTime: 1000,
});

function setupReactNativeIntegrations() {
	// Fokus-Management (nur native; Web via window focus bereits abgedeckt)
	if (Platform.OS !== 'web') {
		const sub = AppState.addEventListener('change', (status) => {
			focusManager.setFocused(status === 'active');
		});
		// Cleanup beim HMR/Unmount
		return () => {
			sub.remove();
		};
	}
	return () => {
	};
}

function setupOnlineManager() {
	return NetInfo.addEventListener((state) => {
		const online = Boolean(state.isConnected && state.isInternetReachable !== false);
		onlineManager.setOnline(online);
	});
}

export function QueryProvider({children}: PropsWithChildren) {
	const client = getQueryClient();
	
	useEffect(() => {
		const cleanupFocus = setupReactNativeIntegrations();
		const cleanupNet = setupOnlineManager();
		return () => {
			cleanupFocus?.();
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
