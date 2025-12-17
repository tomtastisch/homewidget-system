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
