import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { isUuid } from '@/lib/sale-input';
import { loadAttendance } from '@/lib/attendance';
import EventDate from '../../event-date';
import TicketList from './ticket-list';

export default async function TicketsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const client = await createClient();
  const { data: event, error } = await client.from('events').select('title,starts_at').eq('id', id).maybeSingle();
  if (error) return <p role="alert" className="card text-red-600">Impossible de charger l’événement. Réessayez.</p>;
  if (!event) notFound();
  let tickets;
  try { tickets = await loadAttendance(client, id); } catch { tickets = null; }
  return <div className="space-y-6">
    <Link href="/admin/evenements" className="text-sm text-gray-500 underline">Retour aux événements</Link>
    <header><h1 className="text-2xl font-semibold">Billets — {event.title}</h1><p className="mt-2 text-sm text-gray-500"><EventDate value={event.starts_at} /></p></header>
    <TicketList eventId={id} initialTickets={tickets} />
  </div>;
}
