import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import NewEvent from './new-event';
import EventDate from './event-date';
export default async function EventsPage() {
  await requireAdmin();
  const supabase = await createClient();
  // Explicit pagination avoids silently truncating lists at the API row limit.
  const events: { id: string; title: string; location: string | null; starts_at: string }[] = [];
  const summaries = new Map<string, { billets_vendus: number; recettes_totales: number }>();
  let failed = false;
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from('events').select('id,title,location,starts_at').order('starts_at', { ascending: false }).order('id').range(offset, offset + 499);
    if (error) { failed = true; break; }
    events.push(...data);
    if (data.length < 500) break;
  }
  if (!failed) for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from('event_summary').select('event_id,billets_vendus,recettes_totales').order('event_id').range(offset, offset + 499);
    if (error) { failed = true; break; }
    for (const row of data) summaries.set(row.event_id, row);
    if (data.length < 500) break;
  }
  const number = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return <div className="space-y-6"><Link href="/admin" className="text-sm text-gray-500 underline">Retour à l’administration</Link><header><p className="mb-2 text-sm text-gray-500">Waren Event’s</p><h1 className="text-2xl font-semibold">Événements</h1><p className="mt-2 text-sm text-gray-500">Ventes et recettes hors billets annulés.</p></header><NewEvent />
    {failed ? <div role="alert" className="card text-sm text-red-600">Impossible de charger les événements et leurs recettes. <Link className="underline" href="/admin/evenements">Réessayer</Link></div> : events.length === 0 ? <p className="card text-sm text-gray-500">Aucun événement pour le moment. Créez votre premier événement.</p> : <ul className="space-y-4">{events.map(event => {
      const summary = summaries.get(event.id);
      return <li key={event.id} className="card space-y-4"><div><h2 className="break-words text-lg font-semibold">{event.title}</h2><p className="mt-1 text-sm text-gray-500"><EventDate value={event.starts_at} /></p><p className="mt-1 break-words text-sm text-gray-500">{event.location || 'Lieu non précisé'}</p></div>{summary ? <dl className="grid grid-cols-2 gap-4"><div><dt className="text-sm text-gray-500">Billets vendus</dt><dd className="mt-1 text-xl font-semibold">{summary.billets_vendus}</dd></div><div><dt className="text-sm text-gray-500">Recettes totales</dt><dd className="mt-1 break-words text-xl font-semibold">{number.format(Number(summary.recettes_totales))}</dd></div></dl> : <p className="text-sm text-amber-600">Statistiques temporairement indisponibles.</p>}<Link className="button block text-center" href={`/admin/evenements/${event.id}/vendre`}>Vendre un billet</Link><Link className="button block text-center" href={`/admin/evenements/${event.id}/billets`}>Voir les billets</Link></li>;
    })}</ul>}
  </div>;
}
