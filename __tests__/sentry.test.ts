describe('lib/sentry', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('../lib/env');
    jest.dontMock('@sentry/react-native');
  });

  it('is a safe no-op when no DSN is configured', () => {
    jest.doMock('../lib/env', () => ({ env: { SENTRY_DSN: '' } }));

    let sentryModule: typeof import('../lib/sentry');
    jest.isolateModules(() => {
      sentryModule = require('../lib/sentry');
    });

    expect(sentryModule!.sentryAvailable).toBe(false);
    expect(() => sentryModule!.captureException(new Error('boom'))).not.toThrow();
    expect(() => sentryModule!.installGlobalErrorHandlers()).not.toThrow();
  });

  it('degrades gracefully when the native module is unavailable (e.g. Expo Go)', () => {
    jest.doMock('../lib/env', () => ({ env: { SENTRY_DSN: 'https://example@sentry.io/1' } }));
    jest.doMock('@sentry/react-native', () => {
      throw new Error("Cannot find native module 'RNSentry'");
    });

    let sentryModule: typeof import('../lib/sentry');
    expect(() => {
      jest.isolateModules(() => {
        sentryModule = require('../lib/sentry');
      });
    }).not.toThrow();

    expect(sentryModule!.sentryAvailable).toBe(false);
    expect(() => sentryModule!.captureException(new Error('boom'))).not.toThrow();
  });

  it('initializes and forwards captureException when the DSN and native module are present', () => {
    const init = jest.fn();
    const captureException = jest.fn();
    jest.doMock('../lib/env', () => ({ env: { SENTRY_DSN: 'https://example@sentry.io/1' } }));
    jest.doMock('@sentry/react-native', () => ({ init, captureException }));

    let sentryModule: typeof import('../lib/sentry');
    jest.isolateModules(() => {
      sentryModule = require('../lib/sentry');
    });

    expect(init).toHaveBeenCalledWith(expect.objectContaining({ dsn: 'https://example@sentry.io/1' }));
    expect(sentryModule!.sentryAvailable).toBe(true);

    const err = new Error('boom');
    sentryModule!.captureException(err, { scope: 'test' });
    expect(captureException).toHaveBeenCalledWith(err, { extra: { scope: 'test' } });
  });
});
