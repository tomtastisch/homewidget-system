import {describe, expect, test} from '@jest/globals';
import {makeTimingPublic} from '../test/utils/timing';
import {TIMING_LIMITS as LIMITS} from '../config/timingLimits';

describe('makeTimingPublic defaults & clamping', () => {
	test('uses defaults when no overrides provided', () => {
		const t = makeTimingPublic();
		expect(t.query.staleTimeMs).toBeGreaterThanOrEqual(LIMITS.query.staleTimeMs.min);
		expect(t.network.requestTimeoutMs).toBeGreaterThanOrEqual(LIMITS.requestTimeoutMs.min);
	});
	
	test('clamps values beyond limits', () => {
		const huge = 9_999_999_999;
		const negative = -12345;
		const t = makeTimingPublic({
			query: {staleTimeMs: huge, gcTimeMs: negative},
			network: {requestTimeoutMs: huge},
			retry: {baseDelayMs: huge, maxDelayMs: negative, maxRetries: huge},
			offline: {staleBannerAfterMs: huge},
			prefetch: {visiblePlusN: negative},
		});
		
		expect(t.query.staleTimeMs).toBe(LIMITS.query.staleTimeMs.max);
		expect(t.query.gcTimeMs).toBe(LIMITS.query.gcTimeMs.min);
		expect(t.network.requestTimeoutMs).toBe(LIMITS.requestTimeoutMs.max);
		expect(t.retry.baseDelayMs).toBe(LIMITS.retry.delayMs.max);
		expect(t.retry.maxDelayMs).toBe(LIMITS.retry.delayMs.min);
		expect(t.retry.maxRetries).toBe(LIMITS.retry.maxRetries.max);
		expect(t.offline.staleBannerAfterMs).toBe(LIMITS.offline.staleBannerAfterMs.max);
		expect(t.prefetch.visiblePlusN).toBe(0);
	});
	
	test('handles undefined/NaN overrides gracefully', () => {
		const weird: any = {
			query: {staleTimeMs: NaN, gcTimeMs: undefined},
			network: {requestTimeoutMs: undefined},
			retry: {baseDelayMs: undefined, maxDelayMs: NaN, maxRetries: undefined},
			offline: {staleBannerAfterMs: undefined},
			prefetch: {visiblePlusN: NaN},
		};
		const t = makeTimingPublic(weird);
		// Alle Werte sollten im erlaubten Bereich liegen und nicht NaN sein.
		expect(Number.isFinite(t.query.staleTimeMs)).toBe(true);
		expect(Number.isFinite(t.query.gcTimeMs)).toBe(true);
		expect(Number.isFinite(t.network.requestTimeoutMs)).toBe(true);
		expect(Number.isFinite(t.retry.baseDelayMs)).toBe(true);
		expect(Number.isFinite(t.retry.maxDelayMs)).toBe(true);
		expect(Number.isFinite(t.retry.maxRetries)).toBe(true);
		expect(Number.isFinite(t.offline.staleBannerAfterMs)).toBe(true);
		expect(Number.isFinite(t.prefetch.visiblePlusN)).toBe(true);
	});
});
