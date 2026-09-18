import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { changeScanCache } from '../lib/checkin-store';
import { reserveScan, type ScanResult } from '../lib/checkin';

it('serializes two simultaneous device-tab scans and persists one pending admission', async () => {
  const key = 'test-admin:test-event';
  const token = 'c'.repeat(64);
  await changeScanCache(key, current => ({ ...current, cachedAt: new Date().toISOString(), tickets: [{ id: 'ticket', token, buyer_name: 'Test', buyer_phone: '+18195550123', status: 'valide', used_at: null }] }));
  const outcomes: ScanResult[] = [];
  await Promise.all(['one', 'two'].map(id => changeScanCache(key, current => {
    const reserved = reserveScan(current, { id, token, scannedAt: new Date().toISOString() });
    outcomes.push(reserved.result);
    return reserved.cache;
  })));
  expect(outcomes.map(result => result.outcome).sort()).toEqual(['accepted', 'duplicate']);
  expect((await changeScanCache(key, value => value)).queue).toHaveLength(1);
  expect((await changeScanCache('other-admin:test-event', value => value)).tickets).toEqual([]);
});

it('does not commit a failed local transaction', async () => {
  await expect(changeScanCache('failed-event', () => { throw new Error('storage failure'); })).rejects.toThrow();
  expect((await changeScanCache('failed-event', value => value)).queue).toEqual([]);
});
