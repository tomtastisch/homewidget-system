import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Alert, Button, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {type BackendWidget, getHomeWidgets} from '../api/homeApi';
import type {RootStackParamList} from '../App';
import {useAuth} from '../auth/AuthContext';
import {parseBackendWidget, type ParsedWidget} from '../types/widgets';
import {WidgetBanner, WidgetCard} from '../components/widgets';
import {useToast} from '../ui/ToastContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
	const {status, role} = useAuth();
	const {showError} = useToast();
	const isAuthed = status === 'authenticated';
	const [widgets, setWidgets] = useState<BackendWidget[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	
	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const data = await getHomeWidgets();
			setWidgets(data);
		} catch (e: any) {
			const msg = e?.message || 'Fehler beim Laden des Feeds.';
			setError(msg);
			showError(msg);
			setWidgets([]);
		} finally {
			setLoading(false);
		}
	}, [showError]);
	
	useEffect(() => {
		// Reload feed when auth status or role changes to reflect personalized content
		load();
	}, [status, role, load]);
	
	const parsed: ParsedWidget[] = useMemo(() => widgets.map(parseBackendWidget), [widgets]);
	
	const onPressCta = useCallback((target?: string) => {
		if (!target) {
			Alert.alert('Aktion', 'Keine Aktion konfiguriert.');
			return;
		}
		// Placeholder; später Deep-Link in Produktjourneys
		Alert.alert('CTA', `Ziel: ${target}`);
		console.log('CTA pressed', target);
	}, []);
	
	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<View style={{flexDirection: 'row', alignItems: 'center'}}>
					<Text style={styles.title}>Home‑Feed</Text>
					<View
						style={[styles.badge, !isAuthed ? styles.badgeDemo : role === 'premium' ? styles.badgePremium : styles.badgeCommon]}>
						<Text style={styles.badgeText}>{!isAuthed ? 'DEMO' : (role || 'user').toUpperCase()}</Text>
					</View>
				</View>
				<Button title="Neu laden" onPress={load}/>
			</View>
			{!isAuthed && (
				<View style={styles.demoBanner}>
					<Text style={styles.demoBannerText}>Demonstrations‑Ansicht – Inhalte sind Beispiele</Text>
				</View>
			)}
			<View style={styles.header}>
				{isAuthed ? (
					<Button title="Account" onPress={() => navigation.navigate('Account')}/>
				) : (
					<TouchableOpacity onPress={() => navigation.navigate('Login')} testID="home.loginLink">
						<Text style={styles.link}>Einloggen oder Registrieren</Text>
					</TouchableOpacity>
				)}
			</View>
			{!!error && (
				<View style={styles.errorBox}>
					<Text style={styles.errorText}>{error}</Text>
					<View style={{marginTop: 8}}>
						<Button title="Erneut versuchen" onPress={load}/>
					</View>
				</View>
			)}
			{loading && !error && (
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color="#0066cc" testID="loading.spinner"/>
					<Text style={styles.loadingText}>Laden...</Text>
				</View>
			)}
			<FlatList
				data={parsed}
				keyExtractor={(w) => String(w.id)}
				refreshControl={<RefreshControl refreshing={loading} onRefresh={load}/>}
				renderItem={({item}) => {
					const cfg = item.config;
					switch (cfg.type) {
						case 'banner':
							return (
								<WidgetBanner
									title={cfg.title || item.name}
									description={cfg.description}
									imageUrl={cfg.image_url}
									ctaLabel={cfg.cta_label}
									onPress={() => onPressCta(cfg.cta_target)}
								/>
							);
						case 'card':
						case 'teaser':
						default:
							return (
								<WidgetCard
									title={cfg.title || item.name}
									description={cfg.description}
									imageUrl={cfg.image_url}
									ctaLabel={cfg.cta_label}
									onPress={() => onPressCta(cfg.cta_target)}
								/>
							);
					}
				}}
				ListEmptyComponent={!loading && !error ? <Text testID="feed.empty">Aktuell keine Widgets verfügbar.</Text> : null}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {flex: 1, padding: 16},
	header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8},
	title: {fontSize: 20, fontWeight: '600'},
	link: {color: '#0066cc'},
	badge: {marginLeft: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12},
	badgeText: {color: '#fff', fontSize: 12, fontWeight: '700'},
	badgeDemo: {backgroundColor: '#666'},
	badgeCommon: {backgroundColor: '#4a90e2'},
	badgePremium: {backgroundColor: '#8a2be2'},
	demoBanner: {
		backgroundColor: '#eef6ff',
		borderColor: '#cfe3ff',
		borderWidth: 1,
		padding: 10,
		borderRadius: 8,
		marginBottom: 8
	},
	demoBannerText: {color: '#1d4ed8'},
	errorBox: {
		backgroundColor: '#fdecea',
		borderColor: '#f5c6cb',
		borderWidth: 1,
		padding: 12,
		borderRadius: 8,
		marginBottom: 8
	},
	errorText: {color: '#b00020'},
	loadingContainer: {
		alignItems: 'center',
		padding: 20,
	},
	loadingText: {
		marginTop: 8,
		color: '#666',
	},
});
