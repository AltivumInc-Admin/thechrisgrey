/**
 * Structured logger for the frontend application.
 *
 * Mirrors the Lambda fleet's `lambda/shared/logger.mjs` pattern: scoped
 * loggers with levels, PII redaction, and structured output. In the browser,
 * logs are written to the console (for devtools) and forwarded as breadcrumbs
 * to Sentry and CloudWatch RUM when those services are active.
 *
 * Key differences from the Lambda logger:
 *  - Output is human-readable in development (prefixed console calls), not
 *    raw JSON, because browser devtools format objects natively.
 *  - Error-level logs forward to Sentry/RUM breadcrumbs for error context.
 *  - PII redaction uses the same patterns (email, phone, sensitive keys).
 *  - Log level is controlled by VITE_LOG_LEVEL (debug|info|warn|error),
 *    defaulting to debug in dev and warn in production.
 *
 * Usage:
 *   import { createLogger } from '@/utils/logger';
 *   const log = createLogger('ChatEngine', { component: 'ChatWidget' });
 *   log.info('message_sent', { length: 42 });
 *   log.error('stream_error', { error: err.message });
 */

import { addBreadcrumb } from './rum';
import { addSentryBreadcrumb, captureSentryError, isSentryInitialized } from './sentry';

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 } as const;
type LevelName = keyof typeof LEVELS;
type Level = (typeof LEVELS)[LevelName];

const ENV = import.meta.env.MODE;
const IS_DEV = import.meta.env.DEV ?? false;
const IS_TEST = ENV === 'test' || !!import.meta.env.VITEST;

const CONFIGURED_LEVEL = (import.meta.env.VITE_LOG_LEVEL as string | undefined)?.toLowerCase() ?? '';
const DEFAULT_LEVEL: Level = LEVELS[CONFIGURED_LEVEL as LevelName] ?? (IS_DEV ? LEVELS.debug : LEVELS.warn);

// PII redaction patterns (mirrors lambda/shared/logger.mjs).
const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const PHONE_RE = /(?:\+?\d[\s().-]*){10,}/g;
const REDACTED = '[REDACTED]';

const SENSITIVE_KEYS = new Set([
  'authorization',
  'token',
  'accesstoken',
  'secret',
  'password',
  'signingkey',
  'sessiontokenkey',
  'apikey',
  'chat signing key',
]);

/**
 * Deep-clone a value and redact PII in string fields. Mirrors the Lambda
 * redact() implementation for consistency across frontend and backend.
 */
function redact(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    return value.replace(EMAIL_RE, REDACTED).replace(PHONE_RE, REDACTED);
  }
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(redact);

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      out[key] = REDACTED;
    } else {
      out[key] = redact(val);
    }
  }
  return out;
}

interface LogContext {
  readonly scope: string;
  readonly context: Record<string, unknown>;
}

type Extra = Record<string, unknown>;

function emit(levelNum: Level, levelName: LevelName, ctx: LogContext, event: string, extra?: Extra): void {
  if (levelNum < DEFAULT_LEVEL) return;

  // Hold the caller's own `error` value before redact() runs. redact() rebuilds
  // every object as a plain record and an Error's own properties (message,
  // stack) are non-enumerable, so `sanitized.error` is always an empty `{}` —
  // testing `instanceof Error` against it can never be true. The Sentry capture
  // below therefore has to test the pre-redaction reference.
  const rawError = extra?.error;
  const sanitized = extra ? (redact(extra) as Extra) : undefined;
  const ts = new Date().toISOString();

  // Console output: readable prefix in dev, structured JSON in production.
  if (IS_DEV || IS_TEST) {
    const prefix = `[${levelName.toUpperCase()}][${ctx.scope}] ${event}`;
    const consoleFn = levelNum >= LEVELS.error ? console.error : levelNum >= LEVELS.warn ? console.warn : console.log;
    if (sanitized && Object.keys(sanitized).length > 0) {
      consoleFn(prefix, sanitized);
    } else {
      consoleFn(prefix);
    }
  } else {
    const payload = {
      level: levelName,
      scope: ctx.scope,
      event,
      ts,
      ...ctx.context,
      ...(sanitized ?? {}),
    };
    const line = JSON.stringify(payload);
    if (levelNum >= LEVELS.error) {
      console.error(line);
    } else if (levelNum >= LEVELS.warn) {
      console.warn(line);
    } else {
      console.log(line);
    }
  }

  // Forward to Sentry/RUM breadcrumbs for error context tracing.
  if (!IS_TEST) {
    const breadcrumbType = levelNum >= LEVELS.error ? 'error' : levelNum >= LEVELS.warn ? 'console' : 'custom';
    addBreadcrumb(breadcrumbType, `${ctx.scope}: ${event}`, sanitized);

    if (isSentryInitialized()) {
      addSentryBreadcrumb(breadcrumbType, `${ctx.scope}: ${event}`, sanitized);
    }

    // Capture actual Error objects at error level in Sentry. The Error goes in
    // raw (Sentry needs the real instance to read message/stack and group the
    // issue); everything else the caller passed goes in redacted, minus the
    // `error` key itself, whose redacted form is the empty clone described above.
    if (levelNum >= LEVELS.error && rawError instanceof Error) {
      const redactedExtra: Extra = { ...sanitized };
      delete redactedExtra.error;
      captureSentryError(rawError, { scope: ctx.scope, event, ...ctx.context, ...redactedExtra });
    }
  }
}

export interface Logger {
  debug: (event: string, extra?: Extra) => void;
  info: (event: string, extra?: Extra) => void;
  warn: (event: string, extra?: Extra) => void;
  error: (event: string, extra?: Extra) => void;
  child: (context: Record<string, unknown>) => Logger;
}

/**
 * Create a scoped, structured logger.
 *
 * @param scope - Module or component name (e.g. "ChatEngine", "BlogPost")
 * @param context - Static fields attached to every log line from this logger
 */
export function createLogger(scope: string, context: Record<string, unknown> = {}): Logger {
  // Redact context once at creation time so PII in static fields is scrubbed
  // from every log line without per-call overhead.
  const ctx: LogContext = { scope, context: redact(context) as Record<string, unknown> };

  return {
    debug(event, extra) {
      emit(LEVELS.debug, 'debug', ctx, event, extra);
    },
    info(event, extra) {
      emit(LEVELS.info, 'info', ctx, event, extra);
    },
    warn(event, extra) {
      emit(LEVELS.warn, 'warn', ctx, event, extra);
    },
    error(event, extra) {
      emit(LEVELS.error, 'error', ctx, event, extra);
    },
    child(additionalContext) {
      return createLogger(scope, { ...context, ...additionalContext });
    },
  };
}

export { redact, LEVELS };
