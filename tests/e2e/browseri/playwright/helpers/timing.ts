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

/**
 * Liefert die geladenen PUBLIC-Timings.
 * Lazy-initialisiert beim ersten Zugriff, damit Test-Setup-Code
 * die HW_PROFILE-Umgebungsvariable vor dem Import setzen kann.
 */
export function rawPublic(): TimingPublic {
	return loadTimingPublic().public;
}

// Abgeleitete Timeouts & Budgets für E2E-Spezifikationen
// Faustregeln:
// - networkMs: direkt aus PUBLIC.network.requestTimeoutMs
// - uiDefaultMs: etwas unter networkMs, aber nie kleiner als 2s
// - slowUiMs: großzügiger Puffer für Warm-Ups/Reloads
// - budgets: spezifische Anwendungsfälle auf Basis obiger Werte

// Timeout-Grenzen: Minimale und maximale Werte für UI-Interaktionen
const TIMEOUT_UI_MIN_MS = 2000; // Minimale UI-Antwortzeit (Basis für schnelle Interaktionen)
const TIMEOUT_UI_DEFAULT_MAX_MS = 10_000; // Maximale Standard-UI-Wartezeit
const TIMEOUT_SLOW_UI_MIN_MS = 5000; // Minimale Wartezeit für langsame UI-Operationen (Warm-Up, Reload)
const TIMEOUT_SLOW_UI_MAX_MS = 20_000; // Maximale Wartezeit für langsame Operationen

// Budget-Parameter: Faktoren und Grenzen für spezifische E2E-Anwendungsfälle
const BUDGET_MIN_MS = 3000; // Mindestens 3s für Login/Navigation (Netzwerk + Rendering + Auth-Flow)
const BUDGET_FEED_MIN_MS = 4000; // Mindestens 4s für Feed-Laden (Netzwerk + Rendering + Datentransformation)
const BUDGET_MAX_MS = 15_000; // Maximal 15s für komplexe Operationen (Login, Feed)
const BUDGET_NAVIGATION_MAX_MS = 12_000; // Maximal 12s für einfache Navigationen
const BUDGET_API_MAX_MS = 10_000; // Maximal 10s für reine API-Calls ohne UI
const BUDGET_NETWORK_MULTIPLIER = 1.5; // Netzwerk-Timeout × 1.5 für Puffer (Auth-Roundtrips, Retries)

function computeTimeouts() {
	const pub = rawPublic();
	return Object.freeze({
		networkMs: pub.network.requestTimeoutMs,
		uiDefaultMs: Math.max(TIMEOUT_UI_MIN_MS, Math.min(pub.network.requestTimeoutMs, TIMEOUT_UI_DEFAULT_MAX_MS)),
		slowUiMs: Math.max(TIMEOUT_SLOW_UI_MIN_MS, Math.min(pub.network.requestTimeoutMs * 2, TIMEOUT_SLOW_UI_MAX_MS)),
	});
}

function computeBudgets(t: ReturnType<typeof computeTimeouts>) {
	return Object.freeze({
		loginMs: Math.min(Math.max(BUDGET_MIN_MS, Math.round(t.networkMs * BUDGET_NETWORK_MULTIPLIER)), BUDGET_MAX_MS),
		navigationMs: Math.min(Math.max(BUDGET_MIN_MS, t.uiDefaultMs), BUDGET_NAVIGATION_MAX_MS),
		apiCallMs: Math.min(t.networkMs, BUDGET_API_MAX_MS),
		feedLoadMs: Math.min(Math.max(BUDGET_FEED_MIN_MS, Math.round(t.networkMs * BUDGET_NETWORK_MULTIPLIER)), BUDGET_MAX_MS),
	});
}

let cachedTimeouts: ReturnType<typeof computeTimeouts> | null = null;
let cachedBudgets: ReturnType<typeof computeBudgets> | null = null;

function ensureTimeouts(): ReturnType<typeof computeTimeouts> {
	if (!cachedTimeouts) cachedTimeouts = computeTimeouts();
	return cachedTimeouts;
}

function ensureBudgets(): ReturnType<typeof computeBudgets> {
	if (!cachedBudgets) {
		const t = ensureTimeouts();
		cachedBudgets = computeBudgets(t);
	}
	return cachedBudgets;
}

/**
 * Lazy-initialisierter Proxy für Timeout-Werte.
 * Lädt Timing-Konfiguration erst beim ersten Zugriff, nicht bei Modulimport.
 * Implementiert vollständige Proxy-Traps für transparente Object-Semantik.
 */
export const timeouts = new Proxy({} as ReturnType<typeof computeTimeouts>, {
	get(_target, prop) {
		return ensureTimeouts()[prop as keyof ReturnType<typeof computeTimeouts>];
	},
	// Property-Existenz-Check ('prop in obj') delegieren für korrekte Laufzeitsemantik
	has(_target, prop) {
		return prop in ensureTimeouts();
	},
	ownKeys() {
		return Reflect.ownKeys(ensureTimeouts());
	},
	getOwnPropertyDescriptor(_target, prop) {
		return Reflect.getOwnPropertyDescriptor(ensureTimeouts(), prop);
	},
});

/**
 * Lazy-initialisierter Proxy für Budget-Werte (abgeleitete Timeouts für spezifische Use Cases).
 * Lädt Timing-Konfiguration erst beim ersten Zugriff, nicht bei Modulimport.
 * Implementiert vollständige Proxy-Traps für transparente Object-Semantik.
 */
export const budgets = new Proxy({} as ReturnType<typeof computeBudgets>, {
	get(_target, prop) {
		return ensureBudgets()[prop as keyof ReturnType<typeof computeBudgets>];
	},
	// Property-Existenz-Check ('prop in obj') delegieren für korrekte Laufzeitsemantik
	has(_target, prop) {
		return prop in ensureBudgets();
	},
	ownKeys() {
		return Reflect.ownKeys(ensureBudgets());
	},
	getOwnPropertyDescriptor(_target, prop) {
		return Reflect.getOwnPropertyDescriptor(ensureBudgets(), prop);
	},
});

export function __resetTimingCacheForTests() {
	cached = null;
	cachedTimeouts = null;
	cachedBudgets = null;
}
