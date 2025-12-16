// Zentrale Grenzen (Clamp) für PUBLIC-Timings.
// Diese Konstanten werden sowohl im Loader als auch in Test-Utilities verwendet,
// um Duplikate und Abweichungen zu vermeiden.
import {logger} from '../logging/logger';

export const TIMING_LIMITS = {
	requestTimeoutMs: {min: 2_000, max: 60_000},
	retry: {
		maxRetries: {min: 0, max: 5},
		delayMs: {min: 100, max: 30_000}, // gilt für baseDelayMs & maxDelayMs
	},
	query: {
		staleTimeMs: {min: 0, max: 86_400_000}, // 24h
		gcTimeMs: {min: 0, max: 86_400_000},
	},
	offline: {
		staleBannerAfterMs: {min: 0, max: 300_000}, // 5min
	},
} as const;

export type TimingLimits = typeof TIMING_LIMITS;

/**
 * Sicheres Clamp mit Eingabevalidierung und Schutz vor NaN/undefinierten Werten.
 *
 * Regeln:
 * - Nicht-numerische Werte werden auf den unteren Grenzwert (min) zurückgesetzt.
 * - min/max werden validiert; falls vertauscht oder ungültig, werden sie korrigiert (geswappt) bzw. mit 0/Infinity ersetzt.
 * - Bei Korrekturen wird eine Warnung geloggt, um Misskonfigurationen sichtbar zu machen.
 */
export const clamp = (value: number, min: number, max: number): number => {
	let v = Number(value);
	let lo = Number(min);
	let hi = Number(max);
	
	// Fallbacks für nicht-finite Grenzen
	if (!Number.isFinite(lo)) {
		logger.warn('timing.clamp_invalid_min', {min});
		lo = 0;
	}
	if (!Number.isFinite(hi)) {
		logger.warn('timing.clamp_invalid_max', {max});
		hi = Number.POSITIVE_INFINITY;
	}
	
	// Sicherstellen, dass min <= max
	if (lo > hi) {
		logger.warn('timing.clamp_swapped_bounds', {min: lo, max: hi});
		const tmp = lo;
		lo = hi;
		hi = tmp;
	}
	
	// Ungültiger Wert → auf min zurücksetzen
	if (!Number.isFinite(v)) {
		logger.warn('timing.clamp_invalid_value', {value});
		v = lo;
	}
	
	return Math.max(lo, Math.min(hi, v));
};
