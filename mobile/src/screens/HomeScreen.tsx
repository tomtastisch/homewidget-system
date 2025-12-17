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
import type {RootStackParamList} from '../App';
import {useAuth} from '../auth/AuthContext';
import {WidgetCard} from '../components/widgets';
import {useToast} from '../ui/ToastContext';
import {useHomeFeedInfinite} from '../hooks/useHomeFeedInfinite';
import {useHomeFeed} from '../hooks/useHomeFeed';
import type {WidgetContractV1} from '../api/schemas/v1';
import {TID} from '../testing/testids';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

// Temporäres Widget-Interface für Authenticated-Flow bis Migration abgeschlossen
interface LegacyWidget {
	id: number;
	name: string;
}

export default function HomeScreen({ navigation }: Props) {
	const {status, role} = useAuth();
	const {showError} = useToast();
	const isAuthed = status === 'authenticated';
	
	// Demo-Flow (unauth): Nutze InfiniteQuery auf feed_v1
	const demoFeedQuery = useHomeFeedInfinite(20, !isAuthed);
	
	// Auth-Flow: Nutze vorerst alte Query (Übergangsphase)
	const authFeedQuery = useHomeFeed({enabled: isAuthed});
	
	// Flatten pages zu einer Liste von Widgets (Demo-Flow)
	const demoWidgets: WidgetContractV1[] = useMemo(() => {
		if (!demoFeedQuery.data?.pages) return [];
		return demoFeedQuery.data.pages.flatMap(page => page.items);
	}, [demoFeedQuery.data]);
	
	// Auth-Flow Widgets (alte Struktur)
	const authWidgets: LegacyWidget[] = useMemo(() => {
		return (authFeedQuery.data || []).map(w => ({id: w.id, name: w.name}));
	}, [authFeedQuery.data]);
	
	// Kombiniere zu einheitlicher Liste
	const widgets: LegacyWidget[] = useMemo(() => {
		return isAuthed ? authWidgets : demoWidgets;
	}, [isAuthed, authWidgets, demoWidgets]);
	
	const loading = isAuthed 
		? authFeedQuery.isFetching 
		: (demoFeedQuery.isFetching && !demoFeedQuery.isFetchingNextPage);
	
	const error: string | null = useMemo(() => {
		const query = isAuthed ? authFeedQuery : demoFeedQuery;
		if (query.isError) {
			const e: any = query.error as any;
			return e?.message || 'Fehler beim Laden des Feeds.';
		}
		return null;
	}, [isAuthed, authFeedQuery.isError, authFeedQuery.error, demoFeedQuery.isError, demoFeedQuery.error]);
	
	// Zeige den Fehler-Toast nur, wenn sich der Fehlerstatus ändert
	useEffect(() => {
		const query = isAuthed ? authFeedQuery : demoFeedQuery;
		if (query.isError) {
			const e: any = query.error as any;
			const msg = e?.message || 'Fehler beim Laden des Feeds.';
			showError(msg);
		}
	}, [isAuthed, authFeedQuery.isError, demoFeedQuery.isError, showError]);
	
	const onPressWidget = useCallback((widgetId: number) => {
		// Placeholder für Navigation zu Widget-Detail
		Alert.alert('Widget', `Widget ${widgetId} angeklickt`);
		console.log('Widget pressed', widgetId);
	}, []);
	
	const handleLoadMore = useCallback(() => {
		if (!isAuthed && demoFeedQuery.hasNextPage && !demoFeedQuery.isFetchingNextPage) {
			demoFeedQuery.fetchNextPage();
		}
	}, [isAuthed, demoFeedQuery]);
	
	const handleRefresh = useCallback(() => {
		if (isAuthed) {
			authFeedQuery.refetch();
		} else {
			demoFeedQuery.refetch();
		}
	}, [isAuthed, authFeedQuery, demoFeedQuery]);
	
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
				<Button title="Neu laden" onPress={handleRefresh}/>
			</View>
			{!isAuthed && (
				<View style={styles.demoBanner} testID={TID.home.demoBanner}>
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
						<Button title="Erneut versuchen" onPress={handleRefresh}/>
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
				data={widgets}
				keyExtractor={(w) => String(w.id)}
				refreshControl={<RefreshControl refreshing={loading} onRefresh={handleRefresh}/>} 
				onEndReached={handleLoadMore}
				onEndReachedThreshold={0.5}
				renderItem={({item}) => (
					<WidgetCard
						title={item.name}
						description={`Widget #${item.id}`}
						ctaLabel="Details ansehen"
						onPress={() => onPressWidget(item.id)}
					/>
				)}
				ListEmptyComponent={!loading && !error ?
					<Text testID={TID.home.empty}>Aktuell keine Widgets verfügbar.</Text> : null}
				ListFooterComponent={
					!isAuthed && demoFeedQuery.isFetchingNextPage ? (
						<View style={styles.loadingContainer}>
							<ActivityIndicator size="small" color="#0066cc" />
							<Text style={styles.loadingText}>Weitere Widgets laden...</Text>
						</View>
					) : null
				}
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
