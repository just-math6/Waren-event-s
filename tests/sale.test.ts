import { beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizePhone, validPhone, whatsappLink } from '../lib/sale-input';
const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), maybeSingle: vi.fn(), insert: vi.fn(), range: vi.fn() }));
vi.mock('../lib/auth', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('../lib/sellers', () => ({ sellerNames: () => ['Admin'] }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('../lib/supabase/server', () => ({ createClient: async () => ({ from: () => { const builder = { select: () => builder, eq: () => builder, order: () => builder, range: mocks.range, maybeSingle: mocks.maybeSingle, insert: mocks.insert }; return builder; } }) }));
import { checkPhone, confirmSale } from '../app/admin/(protected)/evenements/[id]/vendre/actions';
const input = { eventId: '11111111-1111-1111-1111-111111111111', typeId: '22222222-2222-2222-2222-222222222222', buyerName: 'Alice Dupont', phone: '+1 819 555 0123', seller: 'Admin', token: 'a'.repeat(64) };
beforeEach(() => { vi.resetAllMocks(); mocks.requireAdmin.mockResolvedValue({ email: 'admin@example.com' }); mocks.insert.mockResolvedValue({ error: null }); });
describe('sale', () => {
  it('normalizes international phone formatting without guessing a country', () => {
    expect(normalizePhone('+1 (819) 555-0123')).toBe('18195550123');
    expect(normalizePhone('001 819 555 0123')).toBe('18195550123');
    expect(validPhone('hello18195550123')).toBe(false);
  });
  it('encodes the first name and link for WhatsApp', () => {
    const url = new URL(whatsappLink(input.phone, ' Alice Dupont ', 'https://example.com/billet/abc'));
    expect(url.pathname).toBe('/18195550123');
    expect(url.searchParams.get('text')).toBe('Bonjour Alice, voici votre billet : https://example.com/billet/abc');
  });
  it('detects a previously formatted phone', async () => {
    mocks.range.mockResolvedValue({ data: [{ buyer_phone: '+1 819 555 0123' }] });
    expect(await checkPhone(input.eventId, '18195550123')).toEqual({ exists: true });
  });
  it('reports a failed duplicate check without claiming there is no ticket', async () => {
    mocks.range.mockResolvedValue({ error: { message: 'offline' } });
    expect((await checkPhone(input.eventId, input.phone)).error).toBeTruthy();
  });
  it('uses the server price and normalized phone', async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: null }).mockResolvedValueOnce({ data: { id: input.typeId, price: 12.50 } });
    expect(await confirmSale(input)).toEqual({ token: input.token });
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ price_paid: 12.50, buyer_phone: '18195550123', status: 'valide' }));
  });
  it('rejects a type outside the event', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null });
    expect((await confirmSale(input)).error).toContain('cet événement');
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it('returns the existing sale when retrying a lost response', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { token: input.token, event_id: input.eventId, ticket_type_id: input.typeId, buyer_name: input.buyerName, buyer_phone: '18195550123', sold_by: input.seller } });
    expect(await confirmSale(input)).toEqual({ token: input.token });
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it('displays a clean quota error', async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: null }).mockResolvedValueOnce({ data: { id: input.typeId, price: 12.50 } });
    mocks.insert.mockResolvedValue({ error: { message: 'Plus de billets disponibles pour ce type de billet' } });
    expect((await confirmSale(input)).error).toContain('Choisissez un autre type');
  });
  it('requires authorization before inserting', async () => {
    mocks.requireAdmin.mockRejectedValue(new Error('Unauthorized'));
    await expect(confirmSale(input)).rejects.toThrow('Unauthorized');
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
