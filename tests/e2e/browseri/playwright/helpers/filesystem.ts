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
	const s = new Set<string>(['CON', 'PRN', 'AUX', 'NUL']);
	for (let i = 1; i <= 9; i += 1) {
		s.add(`COM${i}`);
		s.add(`LPT${i}`);
	}
	return s;
})();

export type SanitizeFilenameOptions = Readonly<{
	/**
	 * Ersetzungszeichen/-string für nicht erlaubte Zeichen.
	 * Muss nicht-leer sein und darf keine Pfadseparatoren enthalten.
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
	 * Fügt einen deterministischen Hash-Suffix hinzu, um Kollisionen zu vermeiden.
	 * Default: true
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

/**
 * Sanitiert einen String für die Verwendung als Dateiname.
 *
 * Eigenschaften:
 * - Entfernt Pfadanteile (Windows + POSIX), um Traversal zu verhindern.
 * - Unicode-Normalisierung (NFKC) zur Reduktion von Homoglyph-/Normalization-Effekten.
 * - Whitespace wird konsistent auf `replacement` reduziert.
 * - Verwendet `filenamify` zur plattformübergreifenden Zeichensicherheit.
 * - Entfernt problematische Endzeichen (Punkte/Spaces) und reduziert Mehrfach-Trenner.
 * - Schützt vor Windows-Reserved-Names (CON, NUL, COM1, LPT1 ...).
 * - Optional: deterministischer Hash-Suffix (Kollisionsschutz), standardmäßig aktiv.
 *
 * Hinweis zur Implementierungs-Entscheidung: Die Längenbegrenzung erfolgt ausschließlich
 * in dieser Funktion; `filenamify` wird nur mit `replacement` aufgerufen (kein `maxLength`),
 * um das Verhalten klar und stabil zu halten.
 *
 * @param name - Eingabestring (potenziell beliebig/unsicher).
 * @param opts - Optionale Parameter.
 * @returns Sicherer Dateiname (ohne Pfadanteile).
 * @throws Error wenn Ergebnis leer/ungültig ist oder Optionen unsicher sind.
 */
export function sanitizeFilename(name: string, opts: SanitizeFilenameOptions = {}): string {
	const replacement = validateReplacement(opts.replacement ?? '_');
	const maxLength = clampInt(opts.maxLength ?? 160, 16, 255);
	const unique = opts.unique ?? true;
	const hashLength = clampInt(opts.hashLength ?? 10, 6, 64);
	const suffixSeparator = validateSeparator(opts.suffixSeparator ?? '-');
	
	// Pfadanteile entfernen (ohne OS-Abhängigkeit).
	const basename = name.replace(/^.*[\\\/]/, '');
	
	// Unicode + Trim (u. a. für Windows trailing spaces relevant).
	const normalized = basename.normalize('NFKC').trim();
	
	// Whitespace vereinheitlichen.
	const preprocessed = normalized.replace(/\s+/g, replacement);
	
	// Verbote Zeichen entfernen/ersetzen. Nur `replacement` wird gesetzt (siehe Hinweis oben).
	let out = filenamify(preprocessed, {replacement});
	
	// Aufräumen: Mehrfach-Trenner, trailing dots/spaces, äußere Trenner.
	out = cleanupSeparators(out, replacement);
	
	if (!out || out === '.' || out === '..') {
		throw new Error(`Sanitized filename is empty for input: "${name}"`);
	}
	
	// Windows-Reserved-Names gelten auch mit Extension.
	out = avoidWindowsReserved(out, replacement);
	
	if (!unique) {
		return out;
	}
	
	// Kollisionsschutz: Hash wird VOR Extension eingefügt (falls vorhanden).
	const {base, ext} = splitExtension(out);
	const suffix = `${suffixSeparator}${stableHash(name).slice(0, hashLength)}`;
	
	// Länge beachten: base ggf. kürzen, aber Extension behalten.
	const maxBaseLen = Math.max(1, maxLength - ext.length - suffix.length);
	const truncatedBase = base.length > maxBaseLen ? base.slice(0, maxBaseLen) : base;
	
	let uniqueOut = `${truncatedBase}${suffix}${ext}`;
	uniqueOut = uniqueOut.slice(0, maxLength); // finale Kappe (Safety)
	uniqueOut = cleanupSeparators(uniqueOut, replacement);
	uniqueOut = avoidWindowsReserved(uniqueOut, replacement);
	
	if (!uniqueOut || uniqueOut === '.' || uniqueOut === '..') {
		throw new Error(`Sanitized filename is empty for input: "${name}"`);
	}
	
	return uniqueOut;
}

/**
 * @brief Erzeugt einen stabilen, deterministischen Hash aus dem Original-Input.
 */
function stableHash(input: string): string {
	return createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * @brief Entfernt trailing dots/spaces und räumt Mehrfach-Separatoren auf.
 */
function cleanupSeparators(value: string, replacement: string): string {
	const rep = escapeRegExp(replacement);
	return value
		.replace(new RegExp(`${rep}{2,}`, 'g'), replacement)
		.replace(/[. ]+$/g, '')
		.replace(new RegExp(`^${rep}+|${rep}+$`, 'g'), '');
}

/**
 * @brief Verhindert Windows-reservierte Basenames.
 */
function avoidWindowsReserved(value: string, replacement: string): string {
	const baseUpper = (value.split('.')[0] ?? value).toUpperCase();
	return WINDOWS_RESERVED.has(baseUpper) ? `${replacement}${value}` : value;
}

/**
 * @brief Trennt Extension ab (letzter Punkt), ohne „dotfiles“ als Extension zu behandeln.
 */
function splitExtension(filename: string): { base: string; ext: string } {
	const lastDot = filename.lastIndexOf('.');
	if (lastDot <= 0 || lastDot === filename.length - 1) {
		return {base: filename, ext: ''};
	}
	return {base: filename.slice(0, lastDot), ext: filename.slice(lastDot)};
}

/**
 * @brief Validiert `replacement`, um neue Pfad-/NUL-Probleme zu vermeiden.
 */
function validateReplacement(replacement: string): string {
	const r = replacement.trim();
	if (!r) throw new Error('sanitizeFilename: replacement must not be empty.');
	if (/[\\\/]/.test(r) || r.includes('\0')) {
		throw new Error('sanitizeFilename: replacement must not contain path separators or NUL.');
	}
	return r;
}

/**
 * @brief Validiert den Separator zwischen Basisname und Hash.
 */
function validateSeparator(sep: string): string {
	const s = sep.trim();
	if (!s) throw new Error('sanitizeFilename: suffixSeparator must not be empty.');
	if (/[\\\/]/.test(s) || s.includes('\0')) {
		throw new Error('sanitizeFilename: suffixSeparator must not contain path separators or NUL.');
	}
	return s;
}

function clampInt(value: number, min: number, max: number): number {
	const n = Math.trunc(value);
	return Math.min(max, Math.max(min, n));
}

/**
 * @brief Escaped einen String für die Verwendung in RegExp.
 */
function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
