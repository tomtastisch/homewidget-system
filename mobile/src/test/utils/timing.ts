// Test‑Utility: Factory für TimingPublic‑Struktur, ohne JSON zu parsen.
// Verwendet zentrale Defaults und wendet dieselben Limits (Clamp) wie die App an,
// um Abweichungen zwischen Tests und Produktion zu vermeiden.

import {DEFAULT_TIMING_PUBLIC} from '../../config/timingDefaults';
import {clamp, TIMING_LIMITS as LIMITS} from '../../config/timingLimits';

export type TestTimingPublic = {
	query: { staleTimeMs: number; gcTimeMs: number };
	network: { requestTimeoutMs: number };
	retry: { baseDelayMs: number; maxDelayMs: number; maxRetries: number };
	offline: { staleBannerAfterMs: number };
	prefetch: { visiblePlusN: number };
};

export function makeTimingPublic(overrides: Partial<TestTimingPublic> = {}): TestTimingPublic {
	const merged = {
		query: {...DEFAULT_TIMING_PUBLIC.query, ...(overrides.query ?? {})},
		network: {...DEFAULT_TIMING_PUBLIC.network, ...(overrides.network ?? {})},
		retry: {...DEFAULT_TIMING_PUBLIC.retry, ...(overrides.retry ?? {})},
		offline: {...DEFAULT_TIMING_PUBLIC.offline, ...(overrides.offline ?? {})},
		prefetch: {...DEFAULT_TIMING_PUBLIC.prefetch, ...(overrides.prefetch ?? {})},
	} as TestTimingPublic;
	
	// Clamp auf Produktionsgrenzen
	return {
		query: {
			staleTimeMs: clamp(merged.query.staleTimeMs, LIMITS.query.staleTimeMs.min, LIMITS.query.staleTimeMs.max),
			gcTimeMs: clamp(merged.query.gcTimeMs, LIMITS.query.gcTimeMs.min, LIMITS.query.gcTimeMs.max),
		},
		network: {
			requestTimeoutMs: clamp(
				merged.network.requestTimeoutMs,
				LIMITS.requestTimeoutMs.min,
				LIMITS.requestTimeoutMs.max,
			),
		},
		retry: {
			baseDelayMs: clamp(merged.retry.baseDelayMs, LIMITS.retry.delayMs.min, LIMITS.retry.delayMs.max),
			maxDelayMs: clamp(merged.retry.maxDelayMs, LIMITS.retry.delayMs.min, LIMITS.retry.delayMs.max),
			maxRetries: clamp(merged.retry.maxRetries, LIMITS.retry.maxRetries.min, LIMITS.retry.maxRetries.max),
		},
		offline: {
			staleBannerAfterMs: clamp(
				merged.offline.staleBannerAfterMs,
				LIMITS.offline.staleBannerAfterMs.min,
				LIMITS.offline.staleBannerAfterMs.max,
			),
		},
		prefetch: {
			visiblePlusN: Math.max(
				0,
				Number.isFinite(merged.prefetch.visiblePlusN)
					? Math.floor(merged.prefetch.visiblePlusN)
					: 0,
			),
		},
	};
}
