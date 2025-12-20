import React from 'react';
import {render} from '@testing-library/react-native';
import {BlocksRenderer} from '../components/renderers/BlocksRenderer';

// Mock navigation
const mockedNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
	const actualNav = jest.requireActual('@react-navigation/native');
	return {
		...actualNav,
		useNavigation: () => ({
			navigate: mockedNavigate,
		}),
	};
});

describe('BlocksRenderer', () => {
	beforeEach(() => {
		mockedNavigate.mockClear();
	});
	it('renders HeroBlock correctly', () => {
		const blocks = [
			{
				type: 'hero',
				props: {
					headline: 'Die Heldenreise',
					subline: 'Ein Abenteuer beginnt',
					image_url: 'https://example.com/hero.png'
				}
			}
		];
		const {getByText} = render(<BlocksRenderer blocks={blocks} />);
		expect(getByText('Die Heldenreise')).toBeTruthy();
		expect(getByText('Ein Abenteuer beginnt')).toBeTruthy();
	});

	it('renders TextBlock correctly', () => {
		const blocks = [
			{
				type: 'text',
				props: {
					text: 'Dies ist ein einfacher Textblock.'
				}
			}
		];
		const {getByText} = render(<BlocksRenderer blocks={blocks} />);
		expect(getByText('Dies ist ein einfacher Textblock.')).toBeTruthy();
	});

	it('renders OfferGridBlock correctly', () => {
		const blocks = [
			{
				type: 'offer_grid',
				props: {
					title: 'Unsere Angebote',
					items: [
						{sku: 'S1', title: 'Angebot 1', price: 9.99},
						{sku: 'S2', title: 'Angebot 2', price: 19.99}
					]
				}
			}
		];
		const {getByText} = render(<BlocksRenderer blocks={blocks} />);
		expect(getByText('Unsere Angebote')).toBeTruthy();
		expect(getByText('Angebot 1')).toBeTruthy();
		expect(getByText('9.99 €')).toBeTruthy();
		expect(getByText('Angebot 2')).toBeTruthy();
		expect(getByText('19.99 €')).toBeTruthy();
	});

	it('renders FallbackBlock for unknown types', () => {
		const blocks = [
			{
				type: 'future_tech',
				props: { foo: 'bar' }
			}
		];
		const {getByText} = render(<BlocksRenderer blocks={blocks} />);
		expect(getByText(/Unbekannter Inhaltstyp: future_tech/)).toBeTruthy();
	});
});
