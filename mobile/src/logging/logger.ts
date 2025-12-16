/**
 * @file logger.ts
 * @brief Zentrales Logging-Modul der Mobile-App (loglevel, log4*-ähnlich).
 *
 * @details
 * - Einheitliche API: debug/info/warn/error
 * - Umgebungsabhängige Log-Level (Dev: debug, Prod: warn, Test: silent)
 * - Schutz vor sensiblen Daten durch Redaction
 * - Optionales Remote-Forwarding (Hook)
 */

import log from 'loglevel';

/** @brief Zulässige Log-Level gemäß loglevel. */
type LogLevel = log.LogLevelDesc;

/**
 * @brief Serialisierbarer Log-Eintrag für Konsole und optionales Remote-Forwarding.
 */
type LogEntry = {
	ts: string;
	level: string;
	logger: string;
	message: string;
	data?: Record<string, unknown>;
};

/** @brief Optionaler Sender-Hook zum Weiterleiten von Log-Einträgen (z. B. an ein Backend). */
let remoteSender: ((entry: LogEntry) => void) | null = null;

/**
 * @brief Liefert den aktuellen Zeitstempel als ISO-String.
 * @returns ISO-8601-Zeitstempel (UTC).
 */
function nowIso(): string {
	return new Date().toISOString();
}

/**
 * @brief Ermittelt das Default-Log-Level anhand der Umgebung.
 *
 * @details
 * - EXPO_PUBLIC_LOG_LEVEL überschreibt immer (auch in Tests).
 * - Test/Jest: standardmäßig "silent" zur Reduktion von Test-Noise.
 * - Produktion: "warn"; sonst: "debug".
 *
 * @returns Default-Log-Level.
 */
function getDefaultLevel(): LogLevel {
	const env = (process.env.EXPO_PUBLIC_ENV || process.env.NODE_ENV || 'development').toLowerCase();
	const explicit = (process.env.EXPO_PUBLIC_LOG_LEVEL || '').toLowerCase();
	
	// Allow explicit override for all environments (incl. tests)
	if (explicit) return explicit as LogLevel;
	
	// Jest/CI: keep output clean by default (can be overridden via EXPO_PUBLIC_LOG_LEVEL)
	const isJest = typeof process !== 'undefined' && typeof process.env !== 'undefined' && process.env.JEST_WORKER_ID !== undefined;
	if (env === 'test' || isJest) return 'silent';
	
	return env === 'production' ? 'warn' : 'debug';
}

/**
 * @brief Setzt das globale Log-Level für loglevel.
 * @param level Optionales Log-Level; falls nicht gesetzt, wird das Default-Level verwendet.
 */
export function configureLogger(level?: LogLevel) {
	log.setLevel(level || getDefaultLevel());
}

/**
 * @brief Registriert/entfernt einen Remote-Sender für Log-Einträge.
 * @param fn Callback oder null zum Deaktivieren.
 */
export function setRemoteSender(fn: ((entry: LogEntry) => void) | null) {
	remoteSender = fn;
}

/**
 * @brief Reduziert (redact) potenziell sensible Felder rekursiv.
 * @param obj Eingabeobjekt.
 * @param fields Feldnamen (case-insensitive), die maskiert werden.
 * @returns Kopie des Objekts mit maskierten Feldern.
 */
export function redact<T extends Record<string, any>>(obj: T, fields: string[] = ['password', 'token', 'access_token', 'refresh_token', 'authorization']): T {
	const clone: any = Array.isArray(obj) ? [...(obj as any)] : {...(obj || {})};
	for (const key of Object.keys(clone)) {
		if (fields.includes(key.toLowerCase())) {
			clone[key] = '[REDACTED]';
		} else if (typeof clone[key] === 'object' && clone[key] !== null) {
			clone[key] = redact(clone[key], fields);
		}
	}
	return clone;
}

/** @brief Schlankes Logger-Interface zur Entkopplung vom konkreten Logging-Backend. */
export type ILogger = {
	debug: (message: string, data?: Record<string, unknown>) => void;
	info: (message: string, data?: Record<string, unknown>) => void;
	warn: (message: string, data?: Record<string, unknown>) => void;
	error: (message: string, data?: Record<string, unknown>) => void;
};

/**
 * @brief Erstellt einen benannten Logger mit Redaction und optionalem Remote-Forwarding.
 * @param name Logger-Name (Namespace).
 * @returns Logger-Instanz.
 */
export function createLogger(name: string): ILogger {
	const base = log.getLogger(name);
	// Level-Propagation: benannte Logger übernehmen das globale Level.
	(base as any).setLevel(log.getLevel());
	
	const emit = (level: LogLevel, message: string, data?: Record<string, unknown>) => {
		// Schutz: keine Tokens/Sensitives in Logs weiterreichen.
		const safeData = data ? redact(data) : undefined;
		const entry: LogEntry = {
			ts: nowIso(),
			level: String(level).toUpperCase(),
			logger: name,
			message,
			data: safeData,
		};
		// Konsole
		switch (level) {
			case 'trace':
			case 'debug':
				base.debug(message, safeData);
				break;
			case 'info':
				base.info(message, safeData);
				break;
			case 'warn':
				base.warn(message, safeData);
				break;
			case 'error':
			case 'silent':
			default:
				base.error(message, safeData);
				break;
		}
		// Remote-Forwarding (optional)
		if (remoteSender) {
			try {
				remoteSender(entry);
			} catch { /* ignore */
			}
		}
	};
	
	return {
		debug: (m, d) => emit('debug', m, d),
		info: (m, d) => emit('info', m, d),
		warn: (m, d) => emit('warn', m, d),
		error: (m, d) => emit('error', m, d),
	};
}

// Default-Konfiguration: globales Level setzen.
configureLogger();

// Standard-Logger für die App.
export const logger = createLogger('mobile.app');
