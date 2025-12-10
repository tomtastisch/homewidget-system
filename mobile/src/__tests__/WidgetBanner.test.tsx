import React from 'react';
import {render} from '@testing-library/react-native';
import {WidgetBanner} from '../components/widgets';

describe('WidgetBanner', () => {
	it('renders title, description and CTA', () => {
		const {getByText, toJSON} = render(
			<WidgetBanner title="Big Promo" description="Save 20%" ctaLabel="Jetzt" onPress={() => {
			}}/>
		);
		expect(getByText('Big Promo')).toBeTruthy();
		expect(getByText('Save 20%')).toBeTruthy();
		expect(getByText('Jetzt')).toBeTruthy();
		expect(toJSON()).toMatchSnapshot();
	});
});
