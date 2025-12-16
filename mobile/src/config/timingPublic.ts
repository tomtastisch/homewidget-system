import {z} from 'zod';
import {clamp, TIMING_LIMITS as LIMITS} from './timingLimits';
import {DEFAULT_TIMING_PUBLIC} from './timingDefaults';
import {logger} from '../logging/logger';

// Hinweis: Es werden ausschließlich PUBLIC‑Timings geladen.
// Quelle: Wird im Prebuild aus ../../config/timing.public.json nach ./_generated.timing.public.json kopiert
// Profilwahl: via ENV `HW_PROFILE` (Fallback: "dev").
// JSON statisch importieren (Build‑time) – kein Zugriff auf serverseitige Timings.
// Der Pfad ist relativ vom mobilen Quellcode zum Monorepo‑Root.
// resolveJsonModule ist in tsconfig aktiviert.
// JSON über require laden – robust in Jest & Metro (RN). Typ wird per Zod validiert.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const RAW_TIMING = require('./_generated.timing.public.json');

/**
 * Loader für timing.public.json (nur PUBLIC‑Werte)
 *
 * Struktur (pro Profil → public):
 * - query: { staleTimeMs, gcTimeMs }
 * - network: { requestTimeoutMs }
 * - retry: { baseDelayMs, maxDelayMs, maxRetries }
 * - offline: { staleBannerAfterMs }
 * - prefetch: { visiblePlusN }
 *
 * Profilwahl:
 * - Via ENV `HW_PROFILE` (zur Build/Runtime je nach Plattform verfügbar). Fallback: "dev".
 * - Hinweis: In React Native/Metro wird process.env typischerweise zur Buildzeit ersetzt.
 *   Ein Profilwechsel zur Laufzeit erfordert daher in der Regel einen Rebuild der App.
 *
 * Validierung:
 * - Striktes Zod‑Schema (unknown keys → Fehler).
 * - Werte werden defensiv geclamped (LIMITS) um Misskonfigurationen abzufedern.
 */

// Zod‑Schemas (strict → unknown keys forbidden)
const QuerySchema = z
	.object({
		staleTimeMs: z.number().int().nonnegative(),
		gcTimeMs: z.number().int().nonnegative(),
	})
	.strict();

const NetworkSchema = z
	.object({
		requestTimeoutMs: z.number().int().nonnegative(),
	})
	.strict();

const RetrySchema = z
	.object({
		baseDelayMs: z.number().int().nonnegative(),
		maxDelayMs: z.number().int().nonnegative(),
		maxRetries: z.number().int().nonnegative(),
	})
	.strict();

const OfflineSchema = z
	.object({
		staleBannerAfterMs: z.number().int().nonnegative(),
	})
	.strict();

const PrefetchSchema = z
	.object({
		visiblePlusN: z.number().int().nonnegative(),
	})
	.strict();

const TimingPublicSchema = z
	.object({
		query: QuerySchema,
		network: NetworkSchema,
		retry: RetrySchema,
		offline: OfflineSchema,
		prefetch: PrefetchSchema,
	})
	.strict();

const TopSchema = z
	.object({
		version: z.string(),
		profiles: z.record(z.object({public: TimingPublicSchema}).strict()),
	})
	.strict();

export type TimingPublic = z.infer<typeof TimingPublicSchema>;

// Clamp‑Grenzen (feste Regeln im Code, um Misskonfiguration zu begrenzen)
// Grenzen kommen zentral aus timingLimits.ts

let cached: TimingPublic | null = null;

function getHwProfile(): string {
	// In Expo/Metro wird process.env zur Buildzeit aufgelöst; Fallback auf "dev" bei fehlendem Wert
	return (typeof process !== 'undefined' && process.env && process.env.HW_PROFILE) || 'dev';
}

function sanitize(raw: TimingPublic): TimingPublic {
	return Object.freeze({
		query: {
			staleTimeMs: clamp(raw.query.staleTimeMs, LIMITS.query.staleTimeMs.min, LIMITS.query.staleTimeMs.max),
			gcTimeMs: clamp(raw.query.gcTimeMs, LIMITS.query.gcTimeMs.min, LIMITS.query.gcTimeMs.max),
		},
		network: {
			requestTimeoutMs: clamp(
				raw.network.requestTimeoutMs,
				LIMITS.requestTimeoutMs.min,
				LIMITS.requestTimeoutMs.max,
			),
		},
		retry: {
			maxRetries: clamp(raw.retry.maxRetries, LIMITS.retry.maxRetries.min, LIMITS.retry.maxRetries.max),
			baseDelayMs: clamp(raw.retry.baseDelayMs, LIMITS.retry.delayMs.min, LIMITS.retry.delayMs.max),
			maxDelayMs: clamp(raw.retry.maxDelayMs, LIMITS.retry.delayMs.min, LIMITS.retry.delayMs.max),
		},
		offline: {
			staleBannerAfterMs: clamp(
				raw.offline.staleBannerAfterMs,
				LIMITS.offline.staleBannerAfterMs.min,
				LIMITS.offline.staleBannerAfterMs.max,
			),
		},
		prefetch: {
			visiblePlusN: Math.max(
				0,
				Number.isFinite(raw.prefetch.visiblePlusN) ? Math.floor(raw.prefetch.visiblePlusN) : 0,
			),
		},
	});
}

export function getTimingPublic(): TimingPublic {
	if (cached) return cached;
	
	const parsedTop = TopSchema.parse(RAW_TIMING);
	const profile = getHwProfile();
	const prof = parsedTop.profiles[profile];
	if (!prof) {
		const available = Object.keys(parsedTop.profiles);
		logger.warn('timing.profile_not_found_fallback_dev', {requested: profile, available});
		// Fallback: 'dev' – falls ebenfalls nicht vorhanden, auf Defaults zurückgreifen
		const dev = parsedTop.profiles['dev'];
		if (!dev) {
			logger.warn('timing.dev_profile_missing_using_defaults');
			const validatedDefaults = TimingPublicSchema.parse(DEFAULT_TIMING_PUBLIC);
			cached = sanitize(validatedDefaults);
			return cached;
		}
		// Mit 'dev' weiterarbeiten
		const mergedDev: unknown = {
			query: {...DEFAULT_TIMING_PUBLIC.query, ...(dev.public?.query ?? {})},
			network: {...DEFAULT_TIMING_PUBLIC.network, ...(dev.public?.network ?? {})},
			retry: {...DEFAULT_TIMING_PUBLIC.retry, ...(dev.public?.retry ?? {})},
			offline: {...DEFAULT_TIMING_PUBLIC.offline, ...(dev.public?.offline ?? {})},
			prefetch: {...DEFAULT_TIMING_PUBLIC.prefetch, ...(dev.public?.prefetch ?? {})},
		};
		const validatedDev = TimingPublicSchema.parse(mergedDev);
		cached = sanitize(validatedDev);
		return cached;
	}
	// Mit Defaults mergen, um fehlende Felder robust zu belegen, dann strikt validieren.
	const merged: unknown = {
		query: {...DEFAULT_TIMING_PUBLIC.query, ...(prof.public?.query ?? {})},
		network: {...DEFAULT_TIMING_PUBLIC.network, ...(prof.public?.network ?? {})},
		retry: {...DEFAULT_TIMING_PUBLIC.retry, ...(prof.public?.retry ?? {})},
		offline: {...DEFAULT_TIMING_PUBLIC.offline, ...(prof.public?.offline ?? {})},
		prefetch: {...DEFAULT_TIMING_PUBLIC.prefetch, ...(prof.public?.prefetch ?? {})},
	};
	// Strict validieren (unknown keys → Fehler) und harte Typprüfung
	const validated = TimingPublicSchema.parse(merged);
	cached = sanitize(validated);
	return cached;
}

export type {TimingPublic as TimingPublicType};

// Nur für Tests: Cache leeren, damit unterschiedliche HW_PROFILE Werte
// innerhalb einer Testsuite evaluiert werden können.
export function __resetTimingPublicCacheForTests() {
	cached = null;
}
