import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), refresh: false }));
vi.mock('@supabase/ssr', () => ({ createServerClient: (_url: string, _key: string, options: { cookies: { setAll: (cookies: unknown[], headers: Record<string, string>) => void } }) => {
  if (mocks.refresh) options.cookies.setAll([{ name: 'session', value: 'refreshed', options: { path: '/' } }], {});
  return { auth: { getUser: mocks.getUser } };
} }));
import { proxy } from '../proxy';
import { isAdmin } from '../lib/admin-access';
beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'public-test-key');
  vi.stubEnv('ADMIN_USER_ID', 'admin');
  mocks.refresh = false;
  mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
});
describe('admin route protection', () => {
  it.each(['/admin', '/admin/events', '/admin/login/nested'])('redirects unauthenticated %s', async path => {
    const result = await proxy(new NextRequest('https://app.test' + path));
    expect(result.headers.get('location')).toBe('https://app.test/admin/login');
  });
  it('keeps login public without a redirect loop', async () => {
    expect((await proxy(new NextRequest('https://app.test/admin/login'))).status).toBe(200);
  });
  it('rejects a signed-in non-admin', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'other' } }, error: null });
    expect((await proxy(new NextRequest('https://app.test/admin'))).headers.get('location')).toContain('/admin/login?error=access');
  });
  it('allows admin and preserves refresh cookies on redirect', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'admin' } }, error: null });
    mocks.refresh = true;
    expect((await proxy(new NextRequest('https://app.test/admin'))).status).toBe(200);
    const result = await proxy(new NextRequest('https://app.test/admin/login'));
    expect(result.headers.get('location')).toBe('https://app.test/admin');
    expect(result.cookies.get('session')?.value).toBe('refreshed');
    expect(result.headers.get('cache-control')).toContain('no-store');
  });
  it('rejects a verification error even if a user is returned', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'admin' } }, error: { message: 'invalid token' } });
    expect((await proxy(new NextRequest('https://app.test/admin'))).status).toBe(307);
  });
  it('fails closed without configured admin or with anonymous user', () => {
    expect(isAdmin({ id: 'admin' }, undefined)).toBe(false);
    expect(isAdmin({ id: 'admin', is_anonymous: true }, 'admin')).toBe(false);
  });
});
