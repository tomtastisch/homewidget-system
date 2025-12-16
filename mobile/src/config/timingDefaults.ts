// Gemeinsame Default-Werte für PUBLIC-Timings.
// Diese sollen mit dem "dev" Profil in config/timing.public.json synchron bleiben.

export const DEFAULT_TIMING_PUBLIC = Object.freeze({
	query: {staleTimeMs: 5_000, gcTimeMs: 60_000},
	network: {requestTimeoutMs: 20_000},
	retry: {baseDelayMs: 300, maxDelayMs: 3_000, maxRetries: 2},
	offline: {staleBannerAfterMs: 5_000},
	prefetch: {visiblePlusN: 5},
});

export type DefaultTimingPublic = typeof DEFAULT_TIMING_PUBLIC;
