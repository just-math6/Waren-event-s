'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { loadAttendance, matchesBuyer, type AttendanceTicket } from '@/lib/attendance';

export default function TicketList({ eventId, initialTickets }: { eventId: string; initialTickets: AttendanceTicket[] | null }) {
  const [tickets, setTickets] = useState(initialTickets);
  const [query, setQuery] = useState('');
  const [error, setError] = useState(initialTickets === null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const client = createClient();
    let disposed = false;
    let running = false;
    let pending = false;
    // Serialize refreshes so a slower response cannot overwrite newer data.
    async function refresh() {
      if (disposed) return;
      if (running) { pending = true; return; }
      running = true;
      do {
        pending = false;
        try {
          const rows = await loadAttendance(client, eventId);
          if (!disposed) { setTickets(rows); setError(false); }
        } catch { if (!disposed) setError(true); }
      } while (pending && !disposed);
      running = false;
    }
    const channel = client.channel(`attendance:${eventId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tickets', filter: `event_id=eq.${eventId}` }, () => { void refresh(); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tickets', filter: `event_id=eq.${eventId}` }, () => { void refresh(); })
      // DELETE cannot be filtered by event_id; refetch only this event under RLS.
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'tickets' }, () => { void refresh(); })
      .subscribe(status => {
        if (disposed) return;
        setConnected(status === 'SUBSCRIBED');
        // Reconcile changes between server render and subscription, and after reconnect.
        if (status === 'SUBSCRIBED') void refresh();
      });
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onVisible);
    const timer = window.setInterval(onVisible, 30000);
    void refresh();
    return () => {
      disposed = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onVisible);
      void client.removeChannel(channel);
    };
  }, [eventId]);

  const sold = tickets?.filter(ticket => ticket.status !== 'annule');
  const present = sold?.filter(ticket => ticket.status === 'utilise').length;
  const filtered = sold?.filter(ticket => matchesBuyer(ticket, query));
  return <section className="space-y-5" aria-label="Billets et présences">
    <dl className="grid grid-cols-2 gap-4" aria-live="polite">
      <div className="card"><dt className="text-sm text-gray-500">Vendus</dt><dd className="mt-2 text-2xl font-semibold">{sold?.length ?? '—'}</dd></div>
      <div className="card"><dt className="text-sm text-gray-500">Présents</dt><dd className="mt-2 text-2xl font-semibold text-green-600">{present ?? '—'} <span className="text-sm font-normal text-gray-500">/ {sold?.length ?? '—'}</span></dd></div>
    </dl>
    <div><label htmlFor="buyer-search" className="mb-2 block text-sm text-gray-500">Rechercher par nom ou téléphone</label><input id="buyer-search" type="search" className="input" placeholder="Nom ou numéro de téléphone" value={query} onChange={event => setQuery(event.target.value)} /></div>
    {error && <p role="alert" className="text-sm text-red-600">Impossible d’actualiser les billets. {tickets ? 'Les dernières données sont conservées.' : 'Chargement indisponible.'} Nouvelle tentative automatique.</p>}
    {!connected && <p role="status" className="text-sm text-amber-600">Connexion en direct en cours. Actualisation automatique toutes les 30 secondes.</p>}
    <p className="text-sm text-gray-500" aria-live="polite">{filtered ? `${filtered.length} billet(s) affiché(s)` : 'Chargement des billets…'}</p>
    {filtered?.length === 0 ? <p className="card text-sm text-gray-500">{sold?.length ? 'Aucun billet ne correspond à votre recherche.' : 'Aucun billet vendu pour cet événement.'}</p> : <ul className="divide-y divide-gray-200">{filtered?.map(ticket => {
      const used = ticket.status === 'utilise';
      return <li key={ticket.id} className="flex items-center justify-between gap-3 py-4">
        <div className="min-w-0"><p className="break-words font-medium">{ticket.buyer_name}</p><p className="mt-1 break-words text-sm text-gray-500">{ticket.buyer_phone} · {ticket.ticket_type?.name ?? 'Type indisponible'}</p></div>
        <span className={`flex shrink-0 items-center gap-1.5 text-sm ${used ? 'text-green-600' : 'text-gray-500'}`}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><circle cx="12" cy="12" r="9" />{used ? <path d="m8 12 3 3 5-6" /> : <path d="M12 7v5l3 2" />}</svg>{used ? 'Venu' : 'Pas venu'}</span>
      </li>;
    })}</ul>}
  </section>;
}
