import React from 'react';
import {describe, expect, it} from '@jest/globals';
import {render} from '@testing-library/react-native';
import {MainContentContainer} from '../components/MainContentContainer';

describe('MainContentContainer', () => {
	it('renders with default slot count', () => {
		const {getByTestId} = render(<MainContentContainer />);
		
		// Hauptcontainer sollte sichtbar sein
		expect(getByTestId('home.mainContent')).toBeTruthy();
		
		// Standard-Anzahl (3) Slots sollten vorhanden sein
		expect(getByTestId('home.mainContent.slot.0')).toBeTruthy();
		expect(getByTestId('home.mainContent.slot.1')).toBeTruthy();
		expect(getByTestId('home.mainContent.slot.2')).toBeTruthy();
	});
	
	it('renders with custom slot count', () => {
		const {getByTestId, queryByTestId} = render(<MainContentContainer slotCount={2} />);
		
		// Container sollte sichtbar sein
		expect(getByTestId('home.mainContent')).toBeTruthy();
		
		// Nur 2 Slots sollten vorhanden sein
		expect(getByTestId('home.mainContent.slot.0')).toBeTruthy();
		expect(getByTestId('home.mainContent.slot.1')).toBeTruthy();
		expect(queryByTestId('home.mainContent.slot.2')).toBeNull();
	});
	
	it('renders with custom content in slots', () => {
		const {Text} = require('react-native');
		const customSlots = [
			{content: <Text>Custom Content 1</Text>},
			{content: <Text>Custom Content 2</Text>},
		];
		
		const {getByTestId, getByText} = render(<MainContentContainer slots={customSlots} />);
		
		// Container sollte sichtbar sein
		expect(getByTestId('home.mainContent')).toBeTruthy();
		
		// Custom Content sollte vorhanden sein
		expect(getByText('Custom Content 1')).toBeTruthy();
		expect(getByText('Custom Content 2')).toBeTruthy();
	});
	
	it('shows placeholder text in empty slots', () => {
		const {getByText} = render(<MainContentContainer slotCount={2} />);
		
		// Placeholder-Text sollte sichtbar sein
		expect(getByText('Slot 1')).toBeTruthy();
		expect(getByText('Slot 2')).toBeTruthy();
	});
});
