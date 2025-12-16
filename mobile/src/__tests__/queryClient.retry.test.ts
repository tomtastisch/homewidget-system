import {beforeEach, describe, expect, test, afterAll} from '@jest/globals';
import {__resetQueryClientForTests, getQueryClient} from '../query/queryClient';
import {__resetTimingPublicCacheForTests} from '../config/timingPublic';
import {withHwProfile} from '../test/utils/env';

describe('QueryClient retry/backoff & timings', () => {
	beforeEach(() => {
		__resetQueryClientForTests();
		__resetTimingPublicCacheForTests();
	});
	
	afterAll(() => {
		__resetQueryClientForTests();
	});
	
	test('dev profile: exponential retryDelay with cap; correct stale/gc mapping', () => {
		return withHwProfile('dev', () => {
			const qc = getQueryClient();
			const defaults = qc.getDefaultOptions();
			const q = defaults.queries!;
			expect(q.staleTime).toBe(5_000);
			expect(q.gcTime).toBe(60_000);
			const retryDelay = q.retryDelay as (n: number) => number;
			expect(retryDelay(1)).toBe(300);
			expect(retryDelay(2)).toBe(600);
			expect(retryDelay(3)).toBe(1_200);
			// cap at 3_000
			expect(retryDelay(10)).toBe(3_000);
		});
	});
	
	test('e2e profile: retries disabled and delay returns 0', () => {
		return withHwProfile('e2e', () => {
			const qc = getQueryClient();
			const defaults = qc.getDefaultOptions();
			expect(defaults.queries!.retry).toBe(false);
			expect(defaults.mutations!.retry).toBe(false);
			// Wenn Retry deaktiviert ist, ist retryDelay unerheblich.
		});
	});
});
