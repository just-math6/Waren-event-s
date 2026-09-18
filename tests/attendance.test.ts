import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { loadAttendance, matchesBuyer, type AttendanceTicket } from '../lib/attendance';

const ticket: AttendanceTicket = { id: 'one', buyer_name: 'Élodie Kaboré', buyer_phone: '+1 819-555-0123', status: 'valide', ticket_type: { name: 'Standard' } };
describe('attendance', () => {
  it('matches names without accents and formatted phone numbers', () => {
    expect(matchesBuyer(ticket, 'ELODIE')).toBe(true);
    expect(matchesBuyer(ticket, '819555')).toBe(true);
    expect(matchesBuyer(ticket, '+1 (819)')).toBe(true);
    expect(matchesBuyer(ticket, 'inconnu')).toBe(false);
    expect(matchesBuyer(ticket, '   ')).toBe(true);
  });
  it('loads beyond the API page size and excludes cancelled tickets in the query', async () => {
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), neq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), range: vi.fn().mockResolvedValueOnce({ data: Array(500).fill(ticket), error: null }).mockResolvedValueOnce({ data: [ticket], error: null }) };
    const client = { from: vi.fn().mockReturnValue(query) } as unknown as SupabaseClient;
    expect(await loadAttendance(client, 'event-id')).toHaveLength(501);
    expect(query.eq).toHaveBeenCalledWith('event_id', 'event-id');
    expect(query.neq).toHaveBeenCalledWith('status', 'annule');
    expect(query.range).toHaveBeenLastCalledWith(500, 999);
  });
  it('rejects failed refreshes rather than showing an empty list', async () => {
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), neq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), range: vi.fn().mockResolvedValue({ data: null, error: new Error('offline') }) };
    const client = { from: vi.fn().mockReturnValue(query) } as unknown as SupabaseClient;
    await expect(loadAttendance(client, 'event-id')).rejects.toThrow('offline');
  });
});
