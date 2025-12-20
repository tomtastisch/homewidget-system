import React from 'react';
import {
	ActivityIndicator,
	ScrollView,
	StyleSheet,
	Text,
	View
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../App';
import {useDemoDetail} from '../hooks/useDemoDetail';
import {TID} from '../testing/testids';
import {BlocksRenderer} from '../components/renderers/BlocksRenderer';

type Props = NativeStackScreenProps<RootStackParamList, 'WidgetDetail'>;

/**
 * WidgetDetailScreen
 * 
 * Zeigt Details zu einem spezifischen Widget an.
 * In Phase 1: Einfaches Rendering der ID und des Namens.
 */
export default function WidgetDetailScreen({ route }: Props) {
	const { widgetId } = route.params;
	const { data: detail, isLoading, isError, error } = useDemoDetail(widgetId);

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
				<Text style={styles.error}>
					{error instanceof Error ? error.message : 'Fehler beim Laden der Details.'}
				</Text>
			</View>
		);
	}

	return (
		<ScrollView 
			style={styles.container} 
			testID={TID.widgetDetail.screen}
		>
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
		color: 'red',
		fontSize: 16,
	},
});
