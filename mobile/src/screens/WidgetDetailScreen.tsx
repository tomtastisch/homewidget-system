import React from 'react';
import {
	ActivityIndicator,
	Button,
	ScrollView,
	StyleSheet,
	Text,
	View
} from 'react-native';
import {useNetInfo} from '@react-native-community/netinfo';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../App';
import {useDemoDetail} from '../hooks/useDemoDetail';
import {TID} from '../testing/testids';
import {BlocksRenderer} from '../homewidget/contracts/v1/renderers/BlocksRenderer';

type Props = NativeStackScreenProps<RootStackParamList, 'WidgetDetail'>;

/**
 * WidgetDetailScreen
 * 
 * Zeigt Details zu einem spezifischen Widget an.
 * In Phase 1: Einfaches Rendering der ID und des Namens.
 */
export default function WidgetDetailScreen({ route }: Props) {
	const { widgetId } = route.params;
	const { data: detail, isLoading, isError, error, refetch } = useDemoDetail(widgetId);
	const netInfo = useNetInfo();
	const isOffline = netInfo.isConnected === false;

	if (isLoading) {
		return (
			<View style={styles.center}>
				<ActivityIndicator size="large" color="#0066cc" />
			</View>
		);
	}

	if (isError || !detail) {
		return (
			<View style={styles.center}>
				<Text style={styles.errorTitle}>
					{isOffline ? 'Offline' : 'Fehler'}
				</Text>
				<Text style={styles.error}>
					{isOffline 
						? 'Inhalt nicht im Cache verfügbar. Bitte verbinde dich mit dem Internet.' 
						: (error instanceof Error ? error.message : 'Fehler beim Laden der Details.')}
				</Text>
				{!isOffline && <Button title="Erneut versuchen" onPress={() => refetch()} />}
			</View>
		);
	}

	return (
		<ScrollView 
			style={styles.container} 
			testID={TID.widgetDetail.screen}
		>
			{isOffline && (
				<View style={styles.offlineBanner}>
					<Text style={styles.offlineBannerText}>Offline-Ansicht (Cached)</Text>
				</View>
			)}
			<View style={styles.content}>
				<Text style={styles.title}>{detail.container.title}</Text>
				<Text>{detail.container.description}</Text>
				
				<View style={styles.blocksContainer}>
					<BlocksRenderer blocks={detail.content_spec.blocks} />
				</View>

				<Text style={styles.idText}>ID: {detail.id}</Text>
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
	center: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	content: {
		padding: 20,
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 10,
	},
	idText: {
		marginTop: 10,
		color: '#888',
		fontSize: 12,
	},
	blocksContainer: {
		marginTop: 20,
	},
	error: {
		color: '#b00020',
		fontSize: 16,
		textAlign: 'center',
		marginBottom: 16,
	},
	errorTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#b00020',
		marginBottom: 8,
	},
	offlineBanner: {
		backgroundColor: '#fff9db',
		paddingVertical: 4,
		alignItems: 'center',
		borderBottomWidth: 1,
		borderBottomColor: '#ffe066',
	},
	offlineBannerText: {
		fontSize: 12,
		color: '#856404',
		fontWeight: '500',
	},
});
