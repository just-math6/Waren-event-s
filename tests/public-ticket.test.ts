import { beforeEach, expect, it, vi } from 'vitest';
import { ticketBadge, validTicketToken } from '../lib/public-ticket';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), create: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.create }));
vi.mock('../lib/supabase/config', () => ({ getSupabaseConfig: () => ({ url: 'https://example.supabase.co', key: 'anon-test' }) }));
import { getPublicTicket } from '../lib/get-public-ticket';
beforeEach(() => { vi.resetAllMocks(); mocks.create.mockReturnValue({ rpc: mocks.rpc }); });
it('supports old and new cryptographic tokens and rejects patterns', () => {
  expect(validTicketToken('a'.repeat(32))).toBe(true);
  expect(validTicketToken('b'.repeat(64))).toBe(true);
  for (const token of ['', '%', 'a'.repeat(33), '../admin', 'a'.repeat(65)]) expect(validTicketToken(token)).toBe(false);
});
it('does not query the database for malformed tokens', async () => {
  expect(await getPublicTicket('%')).toBeNull();
  expect(mocks.create).not.toHaveBeenCalled();
});
it('queries only the exact token through an anonymous client', async () => {
  mocks.rpc.mockResolvedValue({ data: { status: 'valide' }, error: null });
  expect(await getPublicTicket('a'.repeat(64))).toEqual({ status: 'valide' });
  expect(mocks.rpc).toHaveBeenCalledWith('get_public_ticket', { p_token: 'a'.repeat(64) });
  expect(mocks.create).toHaveBeenCalledWith('https://example.supabase.co', 'anon-test', expect.objectContaining({ auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }));
});
it('distinguishes a missing ticket from an unavailable database', async () => {
  mocks.rpc.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({ error: { message: 'offline' } });
  expect(await getPublicTicket('a'.repeat(64))).toBeNull();
  await expect(getPublicTicket('a'.repeat(64))).rejects.toThrow('Ticket lookup unavailable');
});
it('never labels used or cancelled tickets as valid', () => {
  expect(ticketBadge('valide').label).toBe('Valide');
  expect(ticketBadge('utilise').label).toBe('Déjà utilisé');
  expect(ticketBadge('annule').label).toBe('Annulé');
});
