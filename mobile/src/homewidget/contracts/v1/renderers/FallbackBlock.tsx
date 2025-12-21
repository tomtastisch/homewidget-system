import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

interface FallbackBlockProps {
	type: string;
}

/**
 * FallbackBlock Renderer
 * 
 * Wird angezeigt, wenn ein unbekannter Block-Typ empfangen wird.
 * Verhindert Abstürze der App.
 */
export const FallbackBlock: React.FC<FallbackBlockProps> = ({type}) => {
	return (
		<View style={styles.container}>
			<Text style={styles.text}>Unbekannter Inhaltstyp: {type}</Text>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		padding: 12,
		backgroundColor: '#fff3cd',
		borderColor: '#ffeeba',
		borderWidth: 1,
		borderRadius: 8,
		marginBottom: 16,
	},
	text: {
		color: '#856404',
		fontSize: 14,
		fontStyle: 'italic',
	},
});
