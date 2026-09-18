'use client';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { matchesBuyer } from '@/lib/attendance';
import { acknowledgeScan, effectiveTickets, loadScanTickets, reserveScan, scanToken, type ScanCache, type ScanResult } from '@/lib/checkin';
import { changeScanCache } from '@/lib/checkin-store';
import Camera from './camera';

const time = (value?: string | null) => value ? new Date(value).toLocaleString('fr-FR') : 'heure indisponible';
function Result({ result }: { result: ScanResult }) {
  const color = result.outcome === 'accepted' ? 'border-green-600 text-green-600' : result.outcome === 'duplicate' ? 'border-amber-600 text-amber-600' : 'border-red-600 text-red-600';
  return <div role="status" className={`rounded-xl border p-5 ${color}`}>
    {result.name && <p className="font-semibold">{result.name}</p>}
    <p>{result.outcome === 'accepted' ? 'Entrée autorisée' : result.outcome === 'duplicate' ? `Déjà utilisé — premier scan : ${time(result.used_at)}` : result.outcome === 'cancelled' ? 'Billet annulé — entrée refusée' : 'Billet introuvable'}</p>
    {result.pending && <p className="mt-2 text-sm text-amber-600">Validation locale — en attente de synchronisation.</p>}
  </div>;
}

export default function Scanner({ eventId, adminId }: { eventId: string; adminId: string }) {
  const [cache, setCache] = useState<ScanCache | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [message, setMessage] = useState('');
  const [online, setOnline] = useState(true);
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const scanBusy = useRef(false);
  const service = useRef<{ scan: (raw: string) => Promise<void>; sync: () => Promise<void> } | null>(null);

  useEffect(() => {
    const client = createClient();
    const key = `${adminId}:${eventId}`;
    let disposed = false;
    let denied = false;
    let running: Promise<void> | null = null;
    let requested = false;
    const receipts = new Map<string, ScanResult>();
    const update = async (change: (state: ScanCache) => ScanCache) => {
      const next = await changeScanCache(key, change);
      if (!disposed && !denied) setCache(next);
      return next;
    };
    function deny() { denied = true; if (!disposed) { setLocked(true); setCache(null); setResult(null); setMessage('Session expirée. Reconnectez-vous pour poursuivre et synchroniser les scans conservés.'); } }
    async function cycle() {
      do {
        requested = false;
        if (disposed || denied || !navigator.onLine) { if (!disposed) setOnline(false); return; }
        try {
          let state = await update(value => value);
          while (state.queue.length && !disposed && !denied) {
            const scan = state.queue[0];
            const { data, error } = await client.rpc('check_in_ticket', { p_event_id: eventId, p_token: scan.token, p_request_id: scan.id, p_scanned_at: scan.scannedAt }).abortSignal(AbortSignal.timeout(8000));
            if (error) {
              if (['42501', 'PGRST301', 'PGRST303'].includes(error.code)) deny();
              throw error;
            }
            const reply = data as ScanResult;
            if (!reply || !['accepted', 'duplicate', 'cancelled', 'missing'].includes(reply.outcome)) throw new Error('Réponse invalide');
            state = await update(current => acknowledgeScan(current, scan, reply));
            receipts.set(scan.id, reply);
            if (!disposed) setResult(current => current?.pending && current.used_at === scan.scannedAt ? reply : current);
          }
          if (disposed || denied) return;
          const tickets = await loadScanTickets(client, eventId);
          await update(current => ({ ...current, tickets, cachedAt: new Date().toISOString() }));
          if (!disposed) { setOnline(true); setMessage(''); }
        } catch {
          if (!disposed && !denied) { setOnline(false); setMessage('Synchronisation indisponible. Les scans enregistrés restent sur cet appareil.'); }
          return;
        }
      } while (requested && !disposed && !denied);
    }
    function sync() {
      if (running) { requested = true; return running; }
      running = cycle().finally(() => { running = null; });
      return running;
    }
    async function scan(raw: string) {
      if (denied || disposed) return;
      const token = scanToken(raw);
      if (!token) { setResult({ outcome: 'missing' }); return; }
      let state = await update(current => current);
      if (!state.tickets.some(ticket => ticket.token === token) && navigator.onLine) { await sync(); state = await update(current => current); }
      if (denied || disposed) return;
      if (!state.cachedAt) throw new Error('Chargez les billets en ligne avant de commencer.');
      const pending = { id: crypto.randomUUID(), token, scannedAt: new Date().toISOString() };
      let local: ScanResult = { outcome: 'missing' };
      await update(current => {
        const reserved = reserveScan(current, pending);
        local = reserved.result;
        return reserved.cache;
      });
      // Never display acceptance until the IndexedDB transaction has committed.
      if (navigator.onLine) await sync();
      if (!disposed && !denied) setResult(receipts.get(pending.id) ?? local);
    }
    service.current = { scan, sync };
    const onOnline = () => { void sync(); };
    const onOffline = () => setOnline(false);
    const onVisible = () => { if (document.visibilityState === 'visible') void sync(); };
    const { data: auth } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || (session && session.user.id !== adminId)) deny();
    });
    const channel = client.channel(`checkin:${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets', filter: `event_id=eq.${eventId}` }, onOnline)
      .subscribe(status => { if (status === 'SUBSCRIBED') onOnline(); });
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(onVisible, 15000);
    void update(current => current).then(() => sync()).catch(() => {
      if (!disposed) { setLocked(true); setMessage('Stockage local indisponible. Autorisez le stockage dans ce navigateur pour scanner.'); }
    });
    return () => {
      disposed = true; service.current = null;
      window.clearInterval(timer);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisible);
      auth.subscription.unsubscribe();
      void client.removeChannel(channel);
    };
  }, [adminId, eventId]);

  async function scan(raw: string) {
    if (scanBusy.current || locked || !service.current) return;
    scanBusy.current = true; setBusy(true); setResult(null);
    try { await service.current.scan(raw); }
    catch { setMessage('Scan non confirmé : impossible de l’enregistrer sur cet appareil. Réessayez avant d’autoriser l’entrée.'); }
    finally { scanBusy.current = false; setBusy(false); }
  }
  const tickets = cache ? effectiveTickets(cache) : [];
  const sold = tickets.filter(ticket => ticket.status !== 'annule');
  const matches = query.trim() ? tickets.filter(ticket => matchesBuyer({ ...ticket, ticket_type: null }, query)) : [];
  const disabled = locked || busy || !cache?.cachedAt;
  return <section className="space-y-5">
    <div className="card" aria-live="polite"><p className="text-2xl font-semibold">{cache?.cachedAt ? `${sold.filter(ticket => ticket.status === 'utilise').length} / ${sold.length}` : '— / —'} scannés</p><p className="mt-2 text-sm text-gray-500">{cache?.queue.length ?? 0} scan(s) en attente de synchronisation</p></div>
    {message && <p role="alert" className={locked ? 'text-sm text-red-600' : 'text-sm text-amber-600'}>{message}</p>}
    {!online && <p className="card text-sm text-amber-600">Mode hors connexion : seuls les billets déjà chargés sont vérifiables. Les scans des autres appareils et les annulations récentes peuvent manquer.</p>}
    <p className="text-sm text-gray-500">{cache?.cachedAt ? `Liste enregistrée sur cet appareil le ${time(cache.cachedAt)}.` : 'Préparation du cache hors connexion…'} Gardez cette page ouverte pendant une coupure.</p>
    <Camera onScan={scan} disabled={disabled} />
    {busy && <p role="status" className="text-sm text-gray-500">Validation du billet…</p>}
    {result && <Result result={result} />}
    {!!cache?.conflicts.length && <div className="space-y-3"><h2 className="font-semibold text-amber-600">Conflits de synchronisation à vérifier</h2>{cache.conflicts.map(conflict => <Result key={conflict.id} result={conflict} />)}</div>}
    <div className="card space-y-4"><h2 className="font-semibold">Recherche manuelle</h2><label htmlFor="scan-search" className="block text-sm text-gray-500">Nom ou téléphone</label><input className="input" id="scan-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Rechercher un acheteur" />
      <ul className="divide-y divide-gray-200">{matches.map(ticket => <li key={ticket.id} className="space-y-2 py-3"><p className="font-medium">{ticket.buyer_name}</p><p className="text-sm text-gray-500">{ticket.buyer_phone}{ticket.status === 'utilise' ? ` · Déjà utilisé : ${time(ticket.used_at)}` : ticket.status === 'annule' ? ' · Annulé' : ''}</p><button className="button" disabled={disabled || ticket.status !== 'valide'} onClick={() => void scan(ticket.token)}>Marquer comme utilisé</button></li>)}</ul>
      {query.trim() && !matches.length && <p className="text-sm text-gray-500">Aucun billet trouvé dans la liste chargée.</p>}
    </div>
    <button className="button" disabled={busy || locked} onClick={() => void service.current?.sync()}>Synchroniser maintenant</button>
  </section>;
}
