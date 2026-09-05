import { describe, expect, it } from 'vitest';
import { assertNoCredentialShapedViteEnv, findCredentialShapedViteEnv } from './assert-no-vite-secrets.mjs';

describe('findCredentialShapedViteEnv', () => {
  it('flags a VITE_-prefixed Discord webhook URL', () => {
    // Deliberately not shaped like a real Discord webhook path (no numeric
    // snowflake IDs) -- this only needs to trip this file's own loose regex,
    // and a fixture shaped like the real thing risks tripping GitHub's push
    // protection on this very commit.
    const env = {
      VITE_WEBHOOK_URL: 'https://discord.com/api/webhooks/not-a-real-id/not-a-real-token',
    };

    expect(findCredentialShapedViteEnv(env)).toEqual(['VITE_WEBHOOK_URL']);
  });

  it('flags a VITE_-prefixed Slack webhook URL regardless of variable name', () => {
    // The check is value-shaped, not name-shaped -- a differently-named
    // variable holding the same kind of credential should still trip it.
    // Same non-realistic-shape caveat as the Discord fixture above.
    const env = {
      VITE_CHAT_NOTIFY: 'https://hooks.slack.com/services/not-a-real-token-fixture',
    };

    expect(findCredentialShapedViteEnv(env)).toEqual(['VITE_CHAT_NOTIFY']);
  });

  it('flags a VITE_-prefixed AWS access key', () => {
    const env = { VITE_ANYTHING: 'AKIAABCDEFGHIJKLMNOP' };

    expect(findCredentialShapedViteEnv(env)).toEqual(['VITE_ANYTHING']);
  });

  it('flags a VITE_-prefixed PEM private key block', () => {
    const env = {
      VITE_KEY: '-----BEGIN PRIVATE KEY-----\nfakefakefake\n-----END PRIVATE KEY-----',
    };

    expect(findCredentialShapedViteEnv(env)).toEqual(['VITE_KEY']);
  });

  it('does not flag a non-VITE_ var holding the same credential shape', () => {
    // Server-side vars are never inlined into the bundle, so they are out of
    // scope for this guard -- flagging them here would just be noise.
    const env = { WEBHOOK_URL: 'https://discord.com/api/webhooks/not-a-real-id/not-a-real-token' };

    expect(findCredentialShapedViteEnv(env)).toEqual([]);
  });

  it('does not flag the write-by-design PostHog project token', () => {
    // Pinning this by name and by example is the point of the whole test:
    // this repo already ships one intentionally-public VITE_ token
    // (frontend/src/.env.example), so the guard has to leave it alone or it
    // fails every build and gets muted.
    const env = {
      VITE_POSTHOG_PROJECT_TOKEN: 'phc_examplenotrealtoken1234567890',
      VITE_POSTHOG_HOST: 'https://us.i.posthog.com',
      VITE_API_URL: 'http://localhost:8080',
    };

    expect(findCredentialShapedViteEnv(env)).toEqual([]);
  });

  it('reports every offending key, not just the first', () => {
    const env = {
      VITE_WEBHOOK_URL: 'https://discord.com/api/webhooks/not-a-real-id/not-a-real-token',
      VITE_KEY: 'AKIAABCDEFGHIJKLMNOP',
      VITE_API_URL: 'http://localhost:8080',
    };

    expect(findCredentialShapedViteEnv(env).sort()).toEqual(['VITE_KEY', 'VITE_WEBHOOK_URL']);
  });
});

describe('assertNoCredentialShapedViteEnv', () => {
  it('throws, naming the offending key, when a VITE_ var looks like a credential', () => {
    const env = { VITE_WEBHOOK_URL: 'https://discord.com/api/webhooks/not-a-real-id/not-a-real-token' };

    expect(() => assertNoCredentialShapedViteEnv(env)).toThrowError(/VITE_WEBHOOK_URL/);
  });

  it('never throws for env that only contains safe values', () => {
    const env = { VITE_API_URL: 'http://localhost:8080' };

    expect(() => assertNoCredentialShapedViteEnv(env)).not.toThrow();
  });
});
