/*
 * Zentraler Timing-Helper für Playwright E2E.
 *
 * - Liest ausschließlich PUBLIC-Timings aus config/timing.public.json
 * - Profilwahl via HW_PROFILE (Fallback: "dev")
 * - Bietet abgeleitete timeouts/budgets für Specs und Helfer
 * - Keine Specs sollen JSON direkt parsen – stattdessen diese API verwenden
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

type TimingPublic = {
	query: { staleTimeMs: number; gcTimeMs: number };
	network: { requestTimeoutMs: number };
	retry: { baseDelayMs: number; maxDelayMs: number; maxRetries: number };
	offline: { staleBannerAfterMs: number };
	prefetch: { visiblePlusN: number };
};

type TimingTop = {
	version: string;
	profiles: Record<string, { public: TimingPublic }>;
};

let cached: { profile: string; public: TimingPublic } | null = null;

function getProfile(): string {
	const p = (process.env && process.env.HW_PROFILE) || 'dev';
	return String(p);
}

function tryLoadJson(filePath: string): unknown | null {
	try {
		const raw = fs.readFileSync(filePath, 'utf-8');
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

function resolveConfigPath(): string | null {
	const candidates = [
		// Vom Helper (tests/e2e/browseri/playwright/helpers) 5x nach oben zum Repo-Root
		path.resolve(__dirname, '../../../../../config/timing.public.json'),
		// Von aktuellem Arbeitsverzeichnis (CI ruft in der Regel im Playwright-Ordner auf)
		path.resolve(process.cwd(), 'config/timing.public.json'),
		// Falls Tests aus tests/e2e/browseri/playwright gestartet werden
		path.resolve(__dirname, '../config/timing.public.json'),
	];
	for (const p of candidates) {
		if (fs.existsSync(p)) return p;
	}
	return null;
}

function minimalValidateTop(obj: any): obj is TimingTop {
	return (
		obj &&
		typeof obj === 'object' &&
		typeof obj.version === 'string' &&
		obj.profiles &&
		typeof obj.profiles === 'object'
	);
}

function minimalValidatePublic(obj: any): obj is TimingPublic {
	try {
		return (
			obj &&
			typeof obj === 'object' &&
			obj.network && typeof obj.network.requestTimeoutMs === 'number' &&
			obj.query && typeof obj.query.staleTimeMs === 'number' &&
			obj.retry && typeof obj.retry.maxRetries === 'number' &&
			obj.offline && typeof obj.offline.staleBannerAfterMs === 'number' &&
			obj.prefetch && typeof obj.prefetch.visiblePlusN === 'number'
		);
	} catch {
		return false;
	}
}

function clamp(n: number, min: number, max: number): number {
	if (!Number.isFinite(n)) return min;
	return Math.min(max, Math.max(min, Math.floor(n)));
}

function loadTimingPublic(): { profile: string; public: TimingPublic } {
	if (cached) return cached;
	
	const configPath = resolveConfigPath();
	if (!configPath) {
		// Fallback: harte, konservative Defaults für Notfälle (halten Tests am Laufen)
		const fallback: TimingPublic = {
			query: {staleTimeMs: 0, gcTimeMs: 1000},
			network: {requestTimeoutMs: 5000},
			retry: {baseDelayMs: 0, maxDelayMs: 0, maxRetries: 0},
			offline: {staleBannerAfterMs: 0},
			prefetch: {visiblePlusN: 1},
		};
		cached = {profile: getProfile(), public: fallback};
		return cached;
	}
	
	const raw = tryLoadJson(configPath);
	if (!raw || !minimalValidateTop(raw)) {
		throw new Error(`Ungültige timing.public.json @ ${configPath}`);
	}
	const top = raw as TimingTop;
	const profile = getProfile();
	let pub = top.profiles[profile]?.public;
	if (!minimalValidatePublic(pub)) {
		// Fallback auf 'dev' falls Profil e2e/etc. fehlt
		pub = top.profiles['dev']?.public;
	}
	if (!minimalValidatePublic(pub)) {
		// Letzte Rettung: konservative Defaults
		pub = {
			query: {staleTimeMs: 0, gcTimeMs: 1000},
			network: {requestTimeoutMs: 5000},
			retry: {baseDelayMs: 0, maxDelayMs: 0, maxRetries: 0},
			offline: {staleBannerAfterMs: 0},
			prefetch: {visiblePlusN: 1},
		};
	}
	// Sanitizen gegen Ausreißer
	const sane: TimingPublic = {
		query: {
			staleTimeMs: clamp(pub.query.staleTimeMs, 0, 60_000),
			gcTimeMs: clamp(pub.query.gcTimeMs, 0, 600_000),
		},
		network: {
			requestTimeoutMs: clamp(pub.network.requestTimeoutMs, 1000, 60_000),
		},
		retry: {
			baseDelayMs: clamp(pub.retry.baseDelayMs, 0, 30_000),
			maxDelayMs: clamp(pub.retry.maxDelayMs, 0, 120_000),
			maxRetries: clamp(pub.retry.maxRetries, 0, 10),
		},
		offline: {
			staleBannerAfterMs: clamp(pub.offline.staleBannerAfterMs, 0, 60_000),
		},
		prefetch: {
			visiblePlusN: clamp(pub.prefetch.visiblePlusN, 0, 20),
		},
	};
	cached = {profile, public: sane};
	return cached;
}

export function currentProfile(): string {
	return loadTimingPublic().profile;
}

export const rawPublic = (() => loadTimingPublic().public)();

// Abgeleitete Timeouts & Budgets für E2E-Spezifikationen
// Faustregeln:
// - networkMs: direkt aus PUBLIC.network.requestTimeoutMs
// - uiDefaultMs: etwas unter networkMs, aber nie kleiner als 2s
// - slowUiMs: großzügiger Puffer für Warm-Ups/Reloads
// - budgets: spezifische Anwendungsfälle auf Basis obiger Werte

export const timeouts = Object.freeze({
	networkMs: rawPublic.network.requestTimeoutMs,
	uiDefaultMs: Math.max(2000, Math.min(rawPublic.network.requestTimeoutMs, 10_000)),
	slowUiMs: Math.max(5000, Math.min(rawPublic.network.requestTimeoutMs * 2, 20_000)),
});

export const budgets = Object.freeze({
	loginMs: Math.min(Math.max(3000, Math.round(timeouts.networkMs * 1.5)), 15_000),
	navigationMs: Math.min(Math.max(3000, timeouts.uiDefaultMs), 12_000),
	apiCallMs: Math.min(timeouts.networkMs, 10_000),
	feedLoadMs: Math.min(Math.max(4000, Math.round(timeouts.networkMs * 1.5)), 15_000),
});

export function __resetTimingCacheForTests() {
	cached = null;
}
