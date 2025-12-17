import sanitize from 'sanitize-filename';

/**
 * Sanitiert einen String für die Verwendung als Dateiname.
 * Entfernt oder ersetzt Zeichen, die in Dateinamen problematisch sein können.
 * 
 * Verwendet das `sanitize-filename` npm-Paket, das umfassende plattformübergreifende
 * Dateinamen-Sanitization bietet und alle problematischen Zeichen für Windows, macOS
 * und Linux behandelt.
 * 
 * @param name - Der zu sanitierende String
 * @returns Sicherer Dateiname ohne problematische Zeichen
 * @throws Error wenn der sanitierte Name leer wäre
 */
export function sanitizeFilename(name: string): string {
	const sanitized = sanitize(name).replace(/\s+/g, '_');
	
	if (!sanitized) {
		throw new Error(`Sanitized filename is empty for input: "${name}"`);
	}
	
	return sanitized;
}
