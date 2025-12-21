import React from 'react';
import {StyleSheet, Text, View, ScrollView} from 'react-native';
import {TID} from '../testing/testids';

/**
 * OffersScreen
 * 
 * Zeigt eine Übersicht aller aktuellen Angebote.
 * In Phase 3: Platzhalter-Screen zur Verifikation der Navigation.
 */
export default function OffersScreen() {
	return (
		<ScrollView 
			style={styles.container} 
			testID={TID.offers.screen}
		>
			<View style={styles.content}>
				<Text style={styles.title}>Aktuelle Angebote</Text>
				<Text style={styles.text}>Hier findest du bald alle exklusiven Angebote.</Text>
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#fff',
	},
	content: {
		padding: 20,
		alignItems: 'center',
	},
	title: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 16,
	},
	text: {
		fontSize: 16,
		color: '#666',
		textAlign: 'center',
	},
});
