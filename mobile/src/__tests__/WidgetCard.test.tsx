import React from 'react';
import {render} from '@testing-library/react-native';
import {WidgetCard} from '../components/widgets';

describe('WidgetCard', () => {
	it('renders title, description and CTA', () => {
		const {getByText, toJSON} = render(
			<WidgetCard title="Hello" description="World" ctaLabel="Go" onPress={() => {
			}}/>
		);
		expect(getByText('Hello')).toBeTruthy();
		expect(getByText('World')).toBeTruthy();
		expect(getByText('Go')).toBeTruthy();
		expect(toJSON()).toMatchSnapshot();
	});
});
