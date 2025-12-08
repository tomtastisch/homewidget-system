/*
 Central logging module for the mobile app (log4*-like via loglevel).

 Goals:
 - simple API: debug/info/warn/error
 - env-aware levels (dev: debug, prod: warn)
 - no sensitive data in production logs
 - optional remote forwarding hook
*/

import log from 'loglevel';

type LogLevel = log.LogLevelDesc;

type LogEntry = {
  ts: string;
  level: string;
  logger: string;
  message: string;
  data?: Record<string, unknown>;
};

let remoteSender: ((entry: LogEntry) => void) | null = null;

function nowIso(): string {
  return new Date().toISOString();
}

function getDefaultLevel(): LogLevel {
  const env = (process.env.EXPO_PUBLIC_ENV || process.env.NODE_ENV || 'development').toLowerCase();
  const explicit = (process.env.EXPO_PUBLIC_LOG_LEVEL || '').toLowerCase();
  if (explicit) return explicit as LogLevel;
  return env === 'production' ? 'warn' : 'debug';
}

export function configureLogger(level?: LogLevel) {
  log.setLevel(level || getDefaultLevel());
}

export function setRemoteSender(fn: ((entry: LogEntry) => void) | null) {
  remoteSender = fn;
}

// Optional redaction helper for potential sensitive fields
export function redact<T extends Record<string, any>>(obj: T, fields: string[] = ['password', 'token', 'access_token', 'refresh_token', 'authorization']): T {
  const clone: any = Array.isArray(obj) ? [...(obj as any)] : { ...(obj || {}) };
  for (const key of Object.keys(clone)) {
    if (fields.includes(key.toLowerCase())) {
      clone[key] = '[REDACTED]';
    } else if (typeof clone[key] === 'object' && clone[key] !== null) {
      clone[key] = redact(clone[key], fields);
    }
  }
  return clone;
}

export type ILogger = {
  debug: (message: string, data?: Record<string, unknown>) => void;
  info: (message: string, data?: Record<string, unknown>) => void;
  warn: (message: string, data?: Record<string, unknown>) => void;
  error: (message: string, data?: Record<string, unknown>) => void;
};

export function createLogger(name: string): ILogger {
  const base = log.getLogger(name);
  // Ensure level propagation
  (base as any).setLevel(log.getLevel());

  const emit = (level: LogLevel, message: string, data?: Record<string, unknown>) => {
    // Never include tokens/sensitive
    const safeData = data ? redact(data) : undefined;
    const entry: LogEntry = {
      ts: nowIso(),
      level: String(level).toUpperCase(),
      logger: name,
      message,
      data: safeData,
    };
    // Console
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
    // Remote forwarding (optional)
    if (remoteSender) {
      try { remoteSender(entry); } catch { /* ignore */ }
    }
  };

  return {
    debug: (m, d) => emit('debug', m, d),
    info: (m, d) => emit('info', m, d),
    warn: (m, d) => emit('warn', m, d),
    error: (m, d) => emit('error', m, d),
  };
}

// Default global configuration
configureLogger();

// Convenience default app logger
export const logger = createLogger('mobile.app');
