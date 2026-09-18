import { describe, expect, it } from 'vitest';
import { acknowledgeScan, effectiveTickets, emptyScanCache, reserveScan, scanToken, type ScanCache } from '../lib/checkin';

const token = 'a'.repeat(64);
const scan = { id: 'request-one', token, scannedAt: '2026-09-18T12:00:00Z' };
const cache = (): ScanCache => ({ ...emptyScanCache(), cachedAt: '2026-09-18T11:00:00Z', tickets: [{ id: 'ticket-one', token, buyer_name: 'Test', buyer_phone: '+18195550123', status: 'valide', used_at: null }] });
describe('offline check-in', () => {
  it('accepts only exact 32/64 hex tokens', () => {
    expect(scanToken(token)).toBe(token);
    expect(scanToken('a'.repeat(32))).toBe('a'.repeat(32));
    expect(scanToken('https://example.com/billet/' + token)).toBeNull();
    expect(scanToken('unknown')).toBeNull();
  });
  it('queues one admission and refuses a second scan locally', () => {
    const first = reserveScan(cache(), scan);
    expect(first.result).toMatchObject({ outcome: 'accepted', pending: true });
    const second = reserveScan(first.cache, { ...scan, id: 'second' });
    expect(second.result).toMatchObject({ outcome: 'duplicate', used_at: scan.scannedAt });
    expect(second.cache.queue).toHaveLength(1);
    expect(effectiveTickets(second.cache)[0].status).toBe('utilise');
  });
  it('does not admit cancelled or unknown tickets', () => {
    const state = cache(); state.tickets[0].status = 'annule';
    expect(reserveScan(state, scan).result.outcome).toBe('cancelled');
    expect(reserveScan(cache(), { ...scan, token: 'b'.repeat(64) }).result.outcome).toBe('missing');
  });
  it('keeps the queue across fresh server snapshots and serialized reloads', () => {
    const first = reserveScan(cache(), scan).cache;
    const reloaded = JSON.parse(JSON.stringify({ ...first, tickets: cache().tickets }));
    expect(reserveScan(reloaded, { ...scan, id: 'second' }).result.outcome).toBe('duplicate');
  });
  it('acknowledges retries without losing other pending scans', () => {
    const state = reserveScan(cache(), scan).cache;
    state.queue.push({ ...scan, id: 'other', token: 'b'.repeat(64) });
    const acknowledged = acknowledgeScan(state, scan, { outcome: 'accepted', used_at: scan.scannedAt });
    expect(acknowledged.queue.map(item => item.id)).toEqual(['other']);
    expect(acknowledged.conflicts).toEqual([]);
    expect(acknowledged.tickets[0].used_at).toBe(scan.scannedAt);
  });
  it('retains conflicts and uses the first server scan time', () => {
    const state = reserveScan(cache(), scan).cache;
    const reply = { outcome: 'duplicate' as const, name: 'Test', used_at: '2026-09-18T11:59:00Z' };
    const acknowledged = acknowledgeScan(state, scan, reply);
    expect(acknowledged.queue).toEqual([]);
    expect(acknowledged.conflicts[0]).toMatchObject(reply);
    expect(acknowledgeScan(acknowledged, scan, reply).conflicts).toHaveLength(1);
    expect(acknowledged.tickets[0].used_at).toBe(reply.used_at);
  });
  it('removes missing tickets and marks newly cancelled tickets on reconciliation', () => {
    const state = reserveScan(cache(), scan).cache;
    expect(acknowledgeScan(state, scan, { outcome: 'missing' }).tickets).toEqual([]);
    expect(acknowledgeScan(state, scan, { outcome: 'cancelled' }).tickets[0].status).toBe('annule');
  });
});
