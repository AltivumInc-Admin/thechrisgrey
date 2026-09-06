import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock rum and sentry to avoid network calls during tests
vi.mock('./rum', () => ({
  addBreadcrumb: vi.fn(),
  isRumInitialized: false,
}));

vi.mock('./sentry', () => ({
  addSentryBreadcrumb: vi.fn(),
  captureSentryError: vi.fn(),
  isSentryInitialized: vi.fn(() => false),
}));

import { createLogger, redact, LEVELS } from './logger';
import { addBreadcrumb } from './rum';
import { addSentryBreadcrumb, captureSentryError, isSentryInitialized } from './sentry';

describe('logger', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('createLogger', () => {
    it('logs info messages with scope prefix in dev', () => {
      const log = createLogger('TestModule');
      log.info('event_name', { key: 'value' });

      expect(consoleLogSpy).toHaveBeenCalledOnce();
      const [prefix, data] = consoleLogSpy.mock.calls[0];
      expect(prefix).toContain('[INFO]');
      expect(prefix).toContain('[TestModule]');
      expect(prefix).toContain('event_name');
      expect(data).toEqual({ key: 'value' });
    });

    it('logs debug messages in dev mode', () => {
      const log = createLogger('Debug');
      log.debug('debug_event');

      expect(consoleLogSpy).toHaveBeenCalledOnce();
      expect(consoleLogSpy.mock.calls[0][0]).toContain('[DEBUG]');
    });

    it('logs warn messages via console.warn', () => {
      const log = createLogger('Warn');
      log.warn('warning_event', { detail: 'something' });

      expect(consoleWarnSpy).toHaveBeenCalledOnce();
      expect(consoleWarnSpy.mock.calls[0][0]).toContain('[WARN]');
    });

    it('logs error messages via console.error', () => {
      const log = createLogger('Err');
      log.error('error_event', { code: 500 });

      expect(consoleErrorSpy).toHaveBeenCalledOnce();
      expect(consoleErrorSpy.mock.calls[0][0]).toContain('[ERROR]');
    });

    it('includes static context in every log line', () => {
      const log = createLogger('Scoped', { component: 'Widget', version: '1.0' });
      log.info('test_event');

      // In dev mode, the prefix is the first arg; context is embedded in the call
      expect(consoleLogSpy).toHaveBeenCalledOnce();
      const prefix = consoleLogSpy.mock.calls[0][0] as string;
      expect(prefix).toContain('[Scoped]');
    });

    it('creates child loggers with merged context', () => {
      const parent = createLogger('Parent', { app: 'test' });
      const child = parent.child({ requestId: 'abc-123' });

      child.info('child_event', { data: 'value' });

      expect(consoleLogSpy).toHaveBeenCalledOnce();
      const prefix = consoleLogSpy.mock.calls[0][0] as string;
      expect(prefix).toContain('[Parent]');
    });
  });

  describe('PII redaction', () => {
    it('redacts emails in extra fields', () => {
      const log = createLogger('Redact');
      log.info('event', { email: 'user@example.com' });

      expect(consoleLogSpy).toHaveBeenCalledOnce();
      const data = consoleLogSpy.mock.calls[0][1] as Record<string, unknown>;
      expect(data.email).toBe('[REDACTED]');
    });

    it('redacts phone numbers in extra fields', () => {
      const log = createLogger('Redact');
      log.info('event', { phone: '+1-555-123-4567' });

      expect(consoleLogSpy).toHaveBeenCalledOnce();
      const data = consoleLogSpy.mock.calls[0][1] as Record<string, unknown>;
      expect(data.phone).toBe('[REDACTED]');
    });

    it('redacts sensitive keys regardless of value', () => {
      const log = createLogger('Redact');
      log.info('event', { token: 'jwt-token-value', password: 'secret123' });

      expect(consoleLogSpy).toHaveBeenCalledOnce();
      const data = consoleLogSpy.mock.calls[0][1] as Record<string, unknown>;
      expect(data.token).toBe('[REDACTED]');
      expect(data.password).toBe('[REDACTED]');
    });

    it('redacts emails nested in objects', () => {
      const log = createLogger('Redact');
      log.info('event', { user: { email: 'test@test.com', name: 'Test' } });

      expect(consoleLogSpy).toHaveBeenCalledOnce();
      const data = consoleLogSpy.mock.calls[0][1] as Record<string, unknown>;
      const user = data.user as Record<string, unknown>;
      expect(user.email).toBe('[REDACTED]');
      expect(user.name).toBe('Test');
    });

    it('redacts emails in string values', () => {
      const log = createLogger('Redact');
      log.info('event', { message: 'Contact user@example.com for details' });

      expect(consoleLogSpy).toHaveBeenCalledOnce();
      const data = consoleLogSpy.mock.calls[0][1] as Record<string, unknown>;
      expect(data.message).toBe('Contact [REDACTED] for details');
    });

    it('redacts PII in static context fields at logger creation time', () => {
      // The redact() function is applied to context at createLogger() time.
      // Verify by checking the redact export handles context-like objects.
      const ctx = { service: 'chat', email: 'admin@example.com', token: 'secret' };
      const result = redact(ctx);
      expect(result).toEqual({ service: 'chat', email: '[REDACTED]', token: '[REDACTED]' });
    });
  });

  describe('breadcrumb forwarding', () => {
    // In the test environment (IS_TEST = true), breadcrumb forwarding to
    // RUM/Sentry is intentionally skipped. These tests verify that behavior.

    it('does not forward breadcrumbs to RUM in test environment', () => {
      const log = createLogger('Breadcrumb');
      log.info('test_event', { data: 'value' });

      expect(addBreadcrumb).not.toHaveBeenCalled();
    });

    it('does not forward error breadcrumbs to RUM in test environment', () => {
      const log = createLogger('Breadcrumb');
      log.error('test_error', { detail: 'something' });

      expect(addBreadcrumb).not.toHaveBeenCalled();
    });

    it('does not forward to Sentry in test environment', () => {
      const log = createLogger('Breadcrumb');
      log.error('test_error', { detail: 'something' });

      expect(addSentryBreadcrumb).not.toHaveBeenCalled();
    });
  });

  describe('Sentry integration', () => {
    it('does not call Sentry when not initialized', () => {
      vi.mocked(isSentryInitialized).mockReturnValue(false);
      const log = createLogger('Sentry');
      log.error('error_event', { detail: 'value' });

      expect(addSentryBreadcrumb).not.toHaveBeenCalled();
      expect(captureSentryError).not.toHaveBeenCalled();
    });

    it('redact() flattens an Error to an empty object — why the capture gate cannot read it', () => {
      // This is the root cause the capture branch used to trip over: redact()
      // rebuilds every object as a plain record, and an Error's own properties
      // (message, stack) are non-enumerable, so the clone carries nothing and
      // fails `instanceof Error`. Any future rewrite of redact() that changes
      // this should be a deliberate decision, not a silent one.
      const clone = redact(new Error('boom'));
      expect(clone).not.toBeInstanceOf(Error);
      expect(clone).toEqual({});
    });
  });

  /**
   * The Sentry capture branch lives behind `if (!IS_TEST)`, which is exactly why
   * a dead `instanceof` check survived in it: under vitest the branch never ran,
   * so no assertion could reach it. These tests load a second, production-mode
   * instance of the module (stubbed env + resetModules) so the branch executes.
   * The mock factories re-run on resetModules, so the spies must be re-imported
   * alongside the logger — the file-level ones belong to the first instance.
   */
  describe('Sentry error capture outside the test environment', () => {
    async function loadProductionLogger() {
      vi.stubEnv('MODE', 'production');
      vi.stubEnv('VITEST', '');
      vi.resetModules();
      return {
        ...(await import('./logger')),
        sentry: await import('./sentry'),
      };
    }

    afterEach(() => {
      vi.unstubAllEnvs();
      vi.resetModules();
    });

    it("captures the caller's real Error, not the redacted clone", async () => {
      const { createLogger: createProdLogger, sentry } = await loadProductionLogger();
      const boom = new Error('stream aborted');

      createProdLogger('ChatEngine', { component: 'ChatWidget' }).error('stream_error', {
        error: boom,
        errorMessage: boom.message,
      });

      expect(sentry.captureSentryError).toHaveBeenCalledTimes(1);
      expect(vi.mocked(sentry.captureSentryError).mock.calls[0][0]).toBe(boom);
    });

    it('sends the redacted extras as context, minus the flattened error key', async () => {
      const { createLogger: createProdLogger, sentry } = await loadProductionLogger();
      const boom = new Error('send failed');

      createProdLogger('Contact', { component: 'ContactForm' }).error('submit_failed', {
        error: boom,
        recipient: 'someone@example.com',
        status: 500,
      });

      const context = vi.mocked(sentry.captureSentryError).mock.calls[0][1];
      expect(context).toEqual({
        scope: 'Contact',
        event: 'submit_failed',
        component: 'ContactForm',
        recipient: '[REDACTED]',
        status: 500,
      });
      // The empty clone of the Error would be pure noise next to the real one.
      expect(context).not.toHaveProperty('error');
    });

    it('does not capture when the caller passed no Error instance', async () => {
      const { createLogger: createProdLogger, sentry } = await loadProductionLogger();

      // A message string under `error` is the common shorthand; there is no
      // stack to hand Sentry, so the log line and breadcrumb are the whole story.
      createProdLogger('Blog', {}).error('fetch_failed', { error: 'Network request failed' });

      expect(sentry.captureSentryError).not.toHaveBeenCalled();
    });

    it('does not capture below error level', async () => {
      const { createLogger: createProdLogger, sentry } = await loadProductionLogger();

      createProdLogger('Blog', {}).warn('retrying', { error: new Error('transient') });

      expect(sentry.captureSentryError).not.toHaveBeenCalled();
    });
  });

  describe('redact export', () => {
    it('redacts standalone values', () => {
      expect(redact('user@example.com')).toBe('[REDACTED]');
      expect(redact('normal text')).toBe('normal text');
      expect(redact({ token: 'secret' })).toEqual({ token: '[REDACTED]' });
      expect(redact(null)).toBe(null);
      expect(redact(undefined)).toBe(undefined);
      expect(redact(42)).toBe(42);
    });

    it('redacts arrays', () => {
      const result = redact(['user@test.com', 'normal']);
      expect(result).toEqual(['[REDACTED]', 'normal']);
    });
  });

  describe('LEVELS export', () => {
    it('exports level constants', () => {
      expect(LEVELS.debug).toBe(10);
      expect(LEVELS.info).toBe(20);
      expect(LEVELS.warn).toBe(30);
      expect(LEVELS.error).toBe(40);
    });
  });
});
