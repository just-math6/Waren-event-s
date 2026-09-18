import type { SupabaseClient } from '@supabase/supabase-js';
import { validTicketToken } from './public-ticket';

export type ScanTicket = { id: string; token: string; buyer_name: string; buyer_phone: string; status: 'valide' | 'utilise' | 'annule'; used_at: string | null };
export type PendingScan = { id: string; token: string; scannedAt: string };
export type ScanResult = { outcome: 'accepted' | 'duplicate' | 'missing' | 'cancelled'; name?: string; used_at?: string | null; pending?: boolean };
export type ScanCache = { tickets: ScanTicket[]; queue: PendingScan[]; conflicts: (ScanResult & { id: string })[]; cachedAt: string | null };
export const emptyScanCache = (): ScanCache => ({ tickets: [], queue: [], conflicts: [], cachedAt: null });
export function scanToken(value: string): string | null {
  const token = value.trim();
  return validTicketToken(token) ? token : null;
}
export function effectiveTickets(cache: ScanCache): ScanTicket[] {
  const pending = new Map(cache.queue.map(scan => [scan.token, scan]));
  return cache.tickets.map(ticket => {
    const scan = pending.get(ticket.token);
    return scan && ticket.status === 'valide' ? { ...ticket, status: 'utilise', used_at: scan.scannedAt } : ticket;
  });
}
export function reserveScan(cache: ScanCache, scan: PendingScan): { cache: ScanCache; result: ScanResult } {
  const ticket = effectiveTickets(cache).find(ticket => ticket.token === scan.token);
  if (!ticket) return { cache, result: { outcome: 'missing' } };
  if (ticket.status === 'annule') return { cache, result: { outcome: 'cancelled', name: ticket.buyer_name } };
  if (ticket.status === 'utilise') return { cache, result: { outcome: 'duplicate', name: ticket.buyer_name, used_at: ticket.used_at } };
  return { cache: { ...cache, queue: [...cache.queue, scan] }, result: { outcome: 'accepted', name: ticket.buyer_name, used_at: scan.scannedAt, pending: true } };
}
export function acknowledgeScan(cache: ScanCache, scan: PendingScan, result: ScanResult): ScanCache {
  const conflict = result.outcome !== 'accepted';
  return {
    ...cache,
    queue: cache.queue.filter(item => item.id !== scan.id),
    conflicts: conflict && !cache.conflicts.some(item => item.id === scan.id) ? [...cache.conflicts, { ...result, id: scan.id }] : cache.conflicts,
    tickets: cache.tickets.filter(ticket => result.outcome !== 'missing' || ticket.token !== scan.token).map(ticket => ticket.token !== scan.token ? ticket : {
      ...ticket, status: result.outcome === 'cancelled' ? 'annule' : 'utilise', used_at: result.used_at ?? ticket.used_at,
    }),
  };
}
export async function loadScanTickets(client: SupabaseClient, eventId: string): Promise<ScanTicket[]> {
  const rows: ScanTicket[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client.from('tickets').select('id,token,buyer_name,buyer_phone,status,used_at')
      .eq('event_id', eventId).order('id').range(offset, offset + 499).abortSignal(AbortSignal.timeout(8000));
    if (error) throw error;
    rows.push(...data as ScanTicket[]);
    if (data.length < 500) return rows;
  }
}
