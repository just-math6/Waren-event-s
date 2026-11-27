import { afterEach, expect, it, vi } from 'vitest';
import { getSupabaseConfig } from '../lib/supabase/config';
import { authReturnUrl } from '../lib/secure-url';
import { publicTicketUrl } from '../lib/ticket-delivery';

afterEach(() => vi.unstubAllEnvs());

it('rejects insecure backend and email return URLs in production, including loopback', () => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'public-test-key');
  for (const url of ['http://app.example', 'http://127.0.0.1:54321', 'https://user:pass@app.example']) {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', url);
    expect(() => getSupabaseConfig()).toThrow();
    expect(() => authReturnUrl(url, '/equipe')).toThrow();
  }
  expect(authReturnUrl('https://app.example', '/equipe/mot-de-passe'))
    .toBe('https://app.example/equipe/mot-de-passe');
});

it('allows local HTTP auth in development but never issues an HTTP ticket link', () => {
  vi.stubEnv('NODE_ENV', 'development');
  expect(authReturnUrl('http://localhost:3000', '/equipe')).toBe('http://localhost:3000/equipe');
  expect(() => authReturnUrl('http://localhost.example', '/equipe')).toThrow();
  expect(() => publicTicketUrl('aa'.repeat(32), 'http://localhost:3000')).toThrow();
});
