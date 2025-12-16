import {beforeEach, describe, expect, test} from '@jest/globals';
import {__resetTimingPublicCacheForTests, getTimingPublic} from '../config/timingPublic';
import {withHwProfile} from '../test/utils/env';

describe('getTimingPublic profile fallback', () => {
	beforeEach(() => {
		__resetTimingPublicCacheForTests();
	});
	
	test('falls back to dev when unknown profile requested', async () => {
		// Baseline mit dev
		const devTiming = await withHwProfile('dev', () => {
			__resetTimingPublicCacheForTests();
			return getTimingPublic();
		});
		
		// Unbekanntes Profil → sollte identisch zu dev herauskommen
		const unknownTiming = await withHwProfile('profile_does_not_exist', () => {
			__resetTimingPublicCacheForTests();
			return getTimingPublic();
		});
		
		expect(unknownTiming).toEqual(devTiming);
	});
});
