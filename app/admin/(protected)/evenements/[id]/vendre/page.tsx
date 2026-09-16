import { randomBytes } from 'node:crypto';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { sellerNames } from '@/lib/sellers';
import { isUuid } from '@/lib/sale-input';
import EventDate from '../../event-date';
import SaleForm, { type TicketType } from './sale-form';
export default async function SellPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const supabase = await createClient();
  const { data: event, error } = await supabase.from('events').select('id,title,starts_at').eq('id', id).maybeSingle();
  if (error) return <p role="alert" className="card text-red-600">Impossible de charger l’événement. Réessayez.</p>;
  if (!event) notFound();
  const types: TicketType[] = [];
  let failed = false;
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase.from('ticket_types').select('id,name,price,quantity_total').eq('event_id', id).order('created_at').order('id').range(offset, offset + 499);
    if (error) { failed = true; break; }
    const counted = await Promise.all(data.map(async type => {
      const { count, error } = await supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('ticket_type_id', type.id).neq('status', 'annule');
      if (error || count === null) return null;
      return { id: type.id, name: type.name, price: Number(type.price), remaining: Math.max(0, type.quantity_total - count) };
    }));
    if (counted.some(type => type === null)) failed = true;
    types.push(...counted.filter((type): type is TicketType => type !== null));
    if (failed || data.length < 500) break;
  }
  return <div className="space-y-6"><Link href="/admin/evenements" className="text-sm text-gray-500 underline">Retour aux événements</Link><header><h1 className="text-2xl font-semibold">{event.title}</h1><p className="mt-2 text-sm text-gray-500"><EventDate value={event.starts_at} /></p></header>{failed ? <p role="alert" className="card text-red-600">Impossible de charger les disponibilités. Actualisez la page.</p> : types.length ? <SaleForm eventId={id} types={types} sellers={sellerNames(user.email)} initialToken={randomBytes(32).toString('hex')} /> : <p className="card text-sm text-amber-600">Aucun type de billet pour cet événement.</p>}</div>;
}
