import React, {useCallback} from 'react';
import {StyleSheet, Text, View, TouchableOpacity} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../App';

interface OfferItem {
	sku: string;
	title: string;
	price: number;
}

interface OfferGridBlockProps {
	title: string;
	items: OfferItem[];
}

/**
 * OfferGridBlock Renderer
 * 
 * Zeigt eine Liste von Angeboten in einem Grid/Liste an.
 * Der CTA navigiert zum OffersScreen.
 */
export const OfferGridBlock: React.FC<OfferGridBlockProps> = ({title, items}) => {
	const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

	const handleCtaPress = useCallback(() => {
		navigation.navigate('Offers');
	}, [navigation]);

	return (
		<View style={styles.container}>
			<Text style={styles.title}>{title}</Text>
			<View style={styles.grid}>
				{items.map((item, index) => (
					<View key={`${item.sku}-${index}`} style={styles.item}>
						<Text style={styles.itemTitle}>{item.title}</Text>
						<Text style={styles.itemPrice}>{item.price.toFixed(2)} €</Text>
						<TouchableOpacity 
							style={styles.cta} 
							onPress={handleCtaPress}
							testID={`offer.cta.${item.sku}`}
						>
							<Text style={styles.ctaText}>Ansehen</Text>
						</TouchableOpacity>
					</View>
				))}
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		marginBottom: 20,
	},
	title: {
		fontSize: 18,
		fontWeight: '600',
		marginBottom: 12,
		color: '#212529',
	},
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
	},
	item: {
		width: '48%',
		backgroundColor: '#fff',
		padding: 12,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#dee2e6',
		marginBottom: 12,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
		elevation: 2,
	},
	itemTitle: {
		fontSize: 14,
		fontWeight: '500',
		marginBottom: 4,
	},
	itemPrice: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#2b8a3e',
		marginBottom: 8,
	},
	cta: {
		backgroundColor: '#0066cc',
		paddingVertical: 6,
		borderRadius: 4,
		alignItems: 'center',
	},
	ctaText: {
		color: '#fff',
		fontSize: 12,
		fontWeight: '600',
	},
});
