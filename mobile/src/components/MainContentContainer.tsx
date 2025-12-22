import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {TID} from '../testing/testids';

/**
 * MainContentContainer – Grid-basierter Container für Haupt-Inhalte oberhalb des Feeds
 * 
 * Stellt eine flexible Grid-Struktur mit konfigurierbaren Slots bereit.
 * Jeder Slot erhält eine eindeutige testID für E2E-Tests.
 */

interface MainContentSlot {
	content?: React.ReactNode;
}

interface MainContentContainerProps {
	slots?: MainContentSlot[];
	slotCount?: number;
}

export function MainContentContainer({slots = [], slotCount = 3}: MainContentContainerProps) {
	// Fülle mit Platzhaltern auf, falls weniger Slots übergeben wurden
	const displaySlots: MainContentSlot[] = [...slots];
	while (displaySlots.length < slotCount) {
		displaySlots.push({});
	}
	
	return (
		<View style={styles.container} testID={TID.home.mainContent}>
			<View style={styles.grid}>
				{displaySlots.map((slot, index) => (
					<View 
						key={index}
						style={styles.slot}
						testID={TID.home.mainContentSlot(index)}
					>
						{slot.content || (
							<View style={styles.placeholder}>
								<Text style={styles.placeholderText}>Slot {index + 1}</Text>
							</View>
						)}
					</View>
				))}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		marginBottom: 16,
	},
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12,
	},
	slot: {
		flex: 1,
		minWidth: 100,
		minHeight: 80,
		borderRadius: 8,
		overflow: 'hidden',
	},
	placeholder: {
		flex: 1,
		backgroundColor: '#f5f5f5',
		borderWidth: 1,
		borderColor: '#e0e0e0',
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 16,
	},
	placeholderText: {
		color: '#999',
		fontSize: 14,
	},
});
