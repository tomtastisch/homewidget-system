import React, {useCallback, useEffect, useMemo} from 'react';
import {
	ActivityIndicator,
	Alert,
	Button,
	FlatList,
	RefreshControl,
	StyleSheet,
	Text,
	TouchableOpacity,
	View
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {type BackendWidget} from '../api/homeApi';
import type {RootStackParamList} from '../App';
import {useAuth} from '../auth/AuthContext';
import {parseBackendWidget, type ParsedWidget} from '../types/widgets';
import {WidgetBanner, WidgetCard} from '../components/widgets';
import {useToast} from '../ui/ToastContext';
import {useHomeFeed} from '../hooks/useHomeFeed';
import {TID} from '../testing/testids';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const DEMO_WIDGETS: BackendWidget[] = [
	{
		id: 1,
		name: 'Sommer Sale',
		created_at: new Date(0).toISOString(),
		config_json: JSON.stringify({
			type: 'banner',
			title: '-20 % auf alles',
			description: 'Nur heute',
			cta_label: 'Shop',
			cta_target: 'shop://summer',
		}),
	},
	{
		id: 2,
		name: 'Kreditkarte',
		created_at: new Date(0).toISOString(),
		config_json: JSON.stringify({
			type: 'card',
			title: 'Premium Card',
			description: 'Mit Bonuspunkten',
			cta_label: 'Jetzt beantragen',
			cta_target: 'product://card',
		}),
	},
];

export default function HomeScreen({ navigation }: Props) {
	const {status, role} = useAuth();
	const {showError} = useToast();
	const isAuthed = status === 'authenticated';
	
	const feedQuery = useHomeFeed({enabled: isAuthed});
	
	const widgets: BackendWidget[] = useMemo(() => {
		return isAuthed ? (feedQuery.data || []) : DEMO_WIDGETS;
	}, [isAuthed, feedQuery.data]);
	
	const loading = isAuthed ? feedQuery.isFetching : false;
	const error: string | null = useMemo(() => {
		if (!isAuthed) return null;
		if (feedQuery.isError) {
			const e: any = feedQuery.error as any;
			return e?.message || 'Fehler beim Laden des Feeds.';
		}
		return null;
	}, [isAuthed, feedQuery.isError, feedQuery.error]);
	
	// Zeige den Fehler-Toast nur, wenn sich der Fehlerstatus ändert
	useEffect(() => {
		if (!isAuthed) return;
		if (feedQuery.isError) {
			const e: any = feedQuery.error as any;
			const msg = e?.message || 'Fehler beim Laden des Feeds.';
			showError(msg);
		}
	}, [isAuthed, feedQuery.isError, showError]);
	
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
		<View style={styles.container} testID={TID.home.screen}>
			<View style={styles.header}>
				<View style={{flexDirection: 'row', alignItems: 'center'}}>
					<Text style={styles.title} testID={TID.home.header.title}>Home‑Feed</Text>
					<View
						style={[styles.badge, !isAuthed ? styles.badgeDemo : role === 'premium' ? styles.badgePremium : styles.badgeCommon]}
						testID={TID.home.role.badge}>
						<Text style={styles.badgeText}>{!isAuthed ? 'DEMO' : (role || 'user').toUpperCase()}</Text>
					</View>
				</View>
				<Button title="Neu laden" onPress={() => {
					if (isAuthed) {
						feedQuery.refetch();
					}
				}}/>
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
					<TouchableOpacity onPress={() => navigation.navigate('Login')} testID={TID.home.loginLink}>
						<Text style={styles.link}>Einloggen oder Registrieren</Text>
					</TouchableOpacity>
				)}
			</View>
			{!!error && (
				<View style={styles.errorBox}>
					<Text style={styles.errorText}>{error}</Text>
					<View style={{marginTop: 8}}>
						<Button title="Erneut versuchen" onPress={() => feedQuery.refetch()}/>
					</View>
				</View>
			)}
			{loading && !error && (
				<View style={styles.loadingContainer} testID={TID.home.loading}>
					<ActivityIndicator size="large" color="#0066cc" testID="loading.spinner"/>
					<Text style={styles.loadingText}>Laden...</Text>
				</View>
			)}
			<FlatList
				testID={TID.home.widgets.list}
				data={parsed}
				keyExtractor={(w) => String(w.id)}
				refreshControl={<RefreshControl refreshing={loading} onRefresh={() => feedQuery.refetch()}/>} 
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
				ListEmptyComponent={!loading && !error ?
					<Text testID={TID.home.empty}>Aktuell keine Widgets verfügbar.</Text> : null}
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
