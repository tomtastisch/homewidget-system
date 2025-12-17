import filenamify from 'filenamify';
import {createHash} from 'node:crypto';

/**
 * @file filesystem.ts
 * @brief Helpers für plattformübergreifend sichere Dateinamen (E2E-Artifact-Handling).
 */

/**
 * Windows-reservierte Basenames (auch mit Extension unzulässig).
 */
const WINDOWS_RESERVED = (() => {
	const s = new Set<string>(['CON', 'PRN', 'AUX', 'NUL', 'CLOCK$']);
	for (let i = 1; i <= 9; i += 1) {
		s.add(`COM${i}`);
		s.add(`LPT${i}`);
	}
	return s;
})();

export type SanitizeFilenameOptions = Readonly<{
	/**
	 * Ersetzungszeichen/-string für nicht erlaubte Zeichen.
	 * Muss nicht-leer sein und darf keine Pfadseparatoren enthalten
	 *
	 * Default: "_"
	 */
	replacement?: string;
	
	/**
	 * Maximale Länge des Dateinamens (ohne Pfad).
	 * Default: 160
	 */
	maxLength?: number;
	
	/**
	 * Fügt ein deterministisches Hash-Suffix hinzu, um Kollisionen zu vermeiden.
	 * Default: false
	 */
	unique?: boolean;
	
	/**
	 * Länge des Hash-Suffix (hex). 8–16 sind üblich.
	 * Default: 10
	 */
	hashLength?: number;
	
	/**
	 * Separator zwischen Basisname und Hash.
	 * Default: "-"
	 */
	suffixSeparator?: string;
}>;

const DEFAULTS: Required<SanitizeFilenameOptions> = {
	replacement: '_',
	maxLength: 160,
	unique: false,
	hashLength: 10,
	suffixSeparator: '-',
};

function clampInt(value: number, min: number, max: number): number {
	if (!Number.isFinite(value)) return min;
	return Math.min(max, Math.max(min, Math.trunc(value)));
}

function assertSafeToken(value: string, name: string): void {
	if (!value.trim()) {
		throw new Error(`${name} must not be empty`);
	}
	if (value.includes('/') || value.includes('\\')) {
		throw new Error(`${name} must not contain path separators`);
	}
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sha256Hex(input: string): string {
	return createHash('sha256').update(input).digest('hex');
}

function splitExtension(filename: string): { base: string; ext: string } {
	const lastDot = filename.lastIndexOf('.');
	if (lastDot <= 0 || lastDot === filename.length - 1) {
		return {base: filename, ext: ''};
	}
	return {base: filename.slice(0, lastDot), ext: filename.slice(lastDot)};
}

function normalizeWindowsReservedBase(base: string, prefix: string): string {
	const key = base.replace(/[.\s]+$/g, '').toUpperCase();
	if (key && WINDOWS_RESERVED.has(key)) {
		return `${prefix}${base}`;
	}
	return base;
}

/**
 * Sanitiert einen String für die Verwendung als Dateiname.
 *
 * Eigenschaften:
 * - Entfernt Pfadanteile ("/" und "\") durch Basename-Extraktion.
 * - Unicode-Normalisierung (NFKC) für stabile Vergleichbarkeit.
 * - Plattformkompatibel (u. a. keine trailing dots/spaces, keine Reserved Names).
 * - Optional: deterministischer Hash-Suffix zur Kollisionsvermeidung.
 *
 * @param name - Eingabe (Titel/Label); Pfadanteile werden verworfen.
 * @param options - Steuerung von Replacement, Länge und Kollisionsschutz.
 * @returns Sanitierter Dateiname.
 * @throws Error bei leerem Ergebnis oder ungültigen Optionen.
 */
export function sanitizeFilename(name: string, options: SanitizeFilenameOptions = {}): string {
	const replacement = options.replacement ?? DEFAULTS.replacement;
	const suffixSeparator = options.suffixSeparator ?? DEFAULTS.suffixSeparator;
	
	assertSafeToken(replacement, 'replacement');
	assertSafeToken(suffixSeparator, 'suffixSeparator');
	
	const maxLength = clampInt(options.maxLength ?? DEFAULTS.maxLength, 8, 255);
	const unique = options.unique ?? DEFAULTS.unique;
	const hashLength = clampInt(options.hashLength ?? DEFAULTS.hashLength, 6, 64);
	
	const raw = String(name);
	const normalizedRaw = raw.normalize('NFKC').trim();
	if (!normalizedRaw) {
		throw new Error(`Sanitized filename is empty for input: "${name}"`);
	}
	
	// Pfadanteile entfernen (Traversal/Directory-Noise verhindern).
	const lastSegment = normalizedRaw.split(/[\\/]/).pop() ?? normalizedRaw;
	
	// Whitespace konsolidieren (explizit in replacement umwandeln).
	const preprocessed = lastSegment.replace(/\s+/g, replacement);
	
	// filenamify: nur offizielle Optionen verwenden (kein maxLength hier).
	let out = filenamify(preprocessed, {replacement});
	
	// Trailing dots/spaces entfernen (Windows-/Tooling-Probleme).
	out = out.replace(/[.\s]+$/g, '');
	
	// Mehrfaches replacement zusammenziehen (auch für multi-char tokens).
	const repEsc = escapeRegExp(replacement);
	out = out.replace(new RegExp(`(?:${repEsc}){2,}`, 'g'), replacement);
	
	// Replacement am Rand entfernen (optisch sauberer), danach erneut trailing cleanup.
	out = out.replace(new RegExp(`^(?:${repEsc})+`, 'g'), '');
	out = out.replace(new RegExp(`(?:${repEsc})+$`, 'g'), '');
	out = out.replace(/[.\s]+$/g, '');
	
	// ".", ".." vermeiden.
	if (out === '.' || out === '..') {
		out = '';
	}
	
	if (!out) {
		throw new Error(`Sanitized filename is empty for input: "${name}"`);
	}
	
	let {base, ext} = splitExtension(out);
	
	// Reserved Names entschärfen (Basename prüfen; Extension ist egal).
	base = base.replace(/[.\s]+$/g, '');
	base = normalizeWindowsReservedBase(base, replacement);
	
	base = base.replace(/[.\s]+$/g, '');
	if (!base) {
		throw new Error(`Sanitized filename base is empty for input: "${name}"`);
	}
	
	const hash = unique ? sha256Hex(normalizedRaw).slice(0, hashLength) : '';
	const suffix = unique ? `${suffixSeparator}${hash}` : '';
	
	// Längenlimit einhalten: <base><suffix><ext>
	const fixedLen = suffix.length + ext.length;
	const allowedBaseLen = maxLength - fixedLen;
	
	if (allowedBaseLen <= 0) {
		throw new Error(
			`maxLength too small (${maxLength}) for suffix/ext (need > ${fixedLen}) for input: "${name}"`,
		);
	}
	
	if (base.length > allowedBaseLen) {
		base = base.slice(0, allowedBaseLen).replace(/[.\s]+$/g, '');
		if (!base) {
			throw new Error(`Sanitized filename base collapsed after truncation for input: "${name}"`);
		}
	}
	
	const result = `${base}${suffix}${ext}`.replace(/[.\s]+$/g, '');
	if (!result) {
		throw new Error(`Sanitized filename is empty after assembly for input: "${name}"`);
	}
	
	return result;
}