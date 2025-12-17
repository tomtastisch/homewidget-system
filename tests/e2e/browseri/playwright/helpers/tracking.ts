/**
 * Zentrale Tracking-Konstanten für temporär übersprungene Tests.
 * Vereinheitlicht die Gründe/Tickets und erleichtert die Suche in der Codebasis.
 */
export const TRACKING = Object.freeze({
	BACKEND_RATE_LIMIT:
		'PRODUCT-DEFECT: Backend Login-Rate-Limiting nicht implementiert. Ticket: TODO-CREATE-BACKEND-RATE-LIMIT-TICKET',
	STORAGE_LIMITATION:
		'BLOCKED: Expo-Web benötigt localStorage für Token-Persistenz; stabiler Storage-Fallback fehlt/unsicher im Test-Setup.',
	ACCESSIBILITY_AUTOFOCUS:
		'BLOCKED: Auto-Fokus auf erstem Input-Feld ist im LoginScreen aktuell nicht implementiert (kein autoFocus/Focus-Management).',
	KEYBOARD_ACCESSIBILITY:
		'BLOCKED-UI: Keyboard-Navigation-Highlighting nicht sichtbar implementiert. Entfernen sobald Keyboard-Accessibility vorhanden ist.',
	FEED_CACHING:
		'BLOCKED: Clientseitiges Feed-Caching (TTL/Store) im Mobile-Client fehlt – HomeScreen lädt Feed auf jedem Mount/Reload neu.',
});
