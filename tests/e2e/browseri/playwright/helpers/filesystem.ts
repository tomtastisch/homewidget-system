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
 * Entfernt oder ersetzt Zeichen, die in Dateinamen problematisch sein können.
 * 
 * @param name - Der zu sanitierende String
 * @returns Sicherer Dateiname ohne problematische Zeichen
 * @throws Error wenn der sanitierte Name leer wäre
 */
export function sanitizeFilename(name: string): string {
	const sanitized = name
		.replace(/\s+/g, '_')             // Leerzeichen durch Unterstrich ersetzen
		.replace(/[/\\:*?<>|`]/g, '')     // Ungültige Dateinamen-Zeichen entfernen
		.replace(/['"„""]/g, '')          // Anführungszeichen entfernen
		.replace(/\.+$/g, '');            // Abschließende Punkte entfernen
	
	if (!sanitized) {
		throw new Error(`Sanitized filename is empty for input: "${name}"`);
	}
	
	return sanitized;
}
