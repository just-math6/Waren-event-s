import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { isUuid } from '@/lib/sale-input';
import Scanner from './scanner';

export default async function ScanPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const client = await createClient();
  const { data: event, error } = await client.from('events').select('title').eq('id', id).maybeSingle();
  if (error) return <p className="card text-red-600" role="alert">Impossible de charger l’événement.</p>;
  if (!event) notFound();
  return <div className="space-y-6"><Link className="text-sm text-gray-500 underline" href={`/admin/evenements/${id}/billets`}>Retour aux billets</Link><header><h1 className="text-2xl font-semibold">Contrôle entrée</h1><p className="mt-2 text-sm text-gray-500">{event.title}</p></header><Scanner key={id} eventId={id} adminId={user.id} /></div>;
}
