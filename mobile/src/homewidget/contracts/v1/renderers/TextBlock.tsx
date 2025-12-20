import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

interface TextBlockProps {
	text: string;
}

/**
 * TextBlock Renderer
 * 
 * Zeigt einen einfachen Textblock an.
 */
export const TextBlock: React.FC<TextBlockProps> = ({text}) => {
	return (
		<View style={styles.container}>
			<Text style={styles.text}>{text}</Text>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		marginBottom: 16,
		paddingHorizontal: 4,
	},
	text: {
		fontSize: 16,
		lineHeight: 24,
		color: '#495057',
	},
});
