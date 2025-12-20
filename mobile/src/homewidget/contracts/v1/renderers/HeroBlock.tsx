import React from 'react';
import {StyleSheet, Text, View, Image} from 'react-native';

interface HeroBlockProps {
	headline: string;
	subline?: string;
	image_url?: string;
}

/**
 * HeroBlock Renderer
 * 
 * Zeigt eine große Überschrift, eine optionale Unterüberschrift und ein optionales Bild.
 */
export const HeroBlock: React.FC<HeroBlockProps> = ({headline, subline, image_url}) => {
	return (
		<View style={styles.container}>
			{!!image_url && (
				<Image 
					source={{uri: image_url}} 
					style={styles.image} 
					resizeMode="cover" 
				/>
			)}
			<View style={styles.textContainer}>
				<Text style={styles.headline}>{headline}</Text>
				{!!subline && <Text style={styles.subline}>{subline}</Text>}
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		marginBottom: 16,
		borderRadius: 12,
		overflow: 'hidden',
		backgroundColor: '#f8f9fa',
		borderWidth: 1,
		borderColor: '#e9ecef',
	},
	image: {
		width: '100%',
		height: 180,
	},
	textContainer: {
		padding: 16,
	},
	headline: {
		fontSize: 20,
		fontWeight: 'bold',
		color: '#212529',
	},
	subline: {
		fontSize: 14,
		color: '#6c757d',
		marginTop: 4,
	},
});
